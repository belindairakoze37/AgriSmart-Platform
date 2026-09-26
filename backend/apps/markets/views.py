from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Min, Max, Count
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import District, Market, Commodity, MarketPrice, PriceAlert
from .serializers import (
    DistrictSerializer, MarketSerializer, CommoditySerializer,
    MarketPriceSerializer, PriceAlertSerializer
)


class DistrictListView(generics.ListAPIView):
    """List all districts"""
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Return all districts at once


class MarketListView(generics.ListAPIView):
    """List markets, optionally filtered by district"""
    serializer_class = MarketSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['district', 'market_type']
    search_fields = ['name']
    
    def get_queryset(self):
        return Market.objects.filter(is_active=True).select_related('district')


class CommodityListView(generics.ListAPIView):
    """List all commodities"""
    queryset = Commodity.objects.filter(is_active=True)
    serializer_class = CommoditySerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['category']
    search_fields = ['name']
    pagination_class = None


class MarketPriceListView(generics.ListAPIView):
    """List market prices with filters"""
    serializer_class = MarketPriceSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['commodity', 'market', 'price_type']
    ordering_fields = ['recorded_date', 'price_per_unit']
    ordering = ['-recorded_date']
    
    def get_queryset(self):
        qs = MarketPrice.objects.select_related('market', 'commodity', 'market__district')
        
        # Date range filter
        days = self.request.query_params.get('days')
        if days:
            try:
                days = int(days)
                cutoff = timezone.now().date() - timedelta(days=days)
                qs = qs.filter(recorded_date__gte=cutoff)
            except ValueError:
                pass
        
        return qs


@extend_schema(
    parameters=[
        OpenApiParameter(name='commodity', description='Commodity ID', required=True),
        OpenApiParameter(name='district', description='District ID', required=False),
        OpenApiParameter(name='limit', description='Number of markets', type=int, default=5),
    ]
)
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def current_prices(request):
    """Get current prices for a commodity across markets"""
    commodity_id = request.query_params.get('commodity')
    district_id = request.query_params.get('district')
    limit = int(request.query_params.get('limit', 5))
    
    if not commodity_id:
        return Response(
            {'error': 'commodity parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get latest price for each market
    latest_prices = []
    markets = Market.objects.filter(is_active=True)
    
    if district_id:
        markets = markets.filter(district_id=district_id)
    
    for market in markets[:50]:  # Limit markets to check
        latest = MarketPrice.objects.filter(
            market=market,
            commodity_id=commodity_id
        ).order_by('-recorded_date').first()
        
        if latest:
            # Calculate change from previous price
            previous = MarketPrice.objects.filter(
                market=market,
                commodity_id=commodity_id,
                recorded_date__lt=latest.recorded_date
            ).order_by('-recorded_date').first()
            
            change_pct = None
            if previous and previous.price_per_unit > 0:
                change_pct = float(
                    (latest.price_per_unit - previous.price_per_unit) 
                    / previous.price_per_unit * 100
                )
            
            latest_prices.append({
                'market_id': str(market.id),
                'market_name': market.name,
                'district': market.district.name,
                'latitude': float(market.latitude) if market.latitude else None,
                'longitude': float(market.longitude) if market.longitude else None,
                'price_per_unit': float(latest.price_per_unit),
                'unit': latest.unit,
                'recorded_date': latest.recorded_date.isoformat(),
                'change_percent': round(change_pct, 2) if change_pct else None,
                'source': latest.source,
            })
    
    # Sort by price descending
    latest_prices.sort(key=lambda x: x['price_per_unit'], reverse=True)
    
    return Response({
        'commodity_id': commodity_id,
        'prices': latest_prices[:limit],
        'total_markets': len(latest_prices),
    })


@extend_schema(
    parameters=[
        OpenApiParameter(name='commodity', description='Commodity ID', required=True),
        OpenApiParameter(name='market', description='Market ID', required=False),
        OpenApiParameter(name='district', description='District ID', required=False),
        OpenApiParameter(name='months', description='Months of history', type=int, default=12),
    ]
)
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def price_history(request):
    """Get historical price data for a commodity"""
    commodity_id = request.query_params.get('commodity')
    market_id = request.query_params.get('market')
    district_id = request.query_params.get('district')
    months = int(request.query_params.get('months', 12))
    
    if not commodity_id:
        return Response(
            {'error': 'commodity parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    cutoff = timezone.now().date() - timedelta(days=months * 30)
    
    qs = MarketPrice.objects.filter(
        commodity_id=commodity_id,
        recorded_date__gte=cutoff
    )
    
    if market_id:
        qs = qs.filter(market_id=market_id)
    elif district_id:
        qs = qs.filter(market__district_id=district_id)
    
    # Aggregate by date
    from django.db.models.functions import TruncWeek
    weekly = qs.annotate(week=TruncWeek('recorded_date')).values('week').annotate(
        avg_price=Avg('price_per_unit'),
        min_price=Min('price_per_unit'),
        max_price=Max('price_per_unit'),
        sample_count=Count('id')
    ).order_by('week')
    
    return Response({
        'commodity_id': commodity_id,
        'period_months': months,
        'data': [
            {
                'date': item['week'].isoformat() if item['week'] else None,
                'avg_price': float(item['avg_price']) if item['avg_price'] else None,
                'min_price': float(item['min_price']) if item['min_price'] else None,
                'max_price': float(item['max_price']) if item['max_price'] else None,
                'sample_count': item['sample_count'],
            }
            for item in weekly
        ]
    })


class PriceAlertListCreateView(generics.ListCreateAPIView):
    """List or create price alerts"""
    serializer_class = PriceAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PriceAlert.objects.filter(user=self.request.user)


class PriceAlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Manage price alert"""
    serializer_class = PriceAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PriceAlert.objects.filter(user=self.request.user)