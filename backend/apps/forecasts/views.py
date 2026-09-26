from datetime import date
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import PriceForecast
from .serializers import PriceForecastSerializer
from .services import PriceForecastingService


class PriceForecastListView(generics.ListAPIView):
    """List price forecasts"""
    serializer_class = PriceForecastSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['commodity', 'market', 'district']
    ordering = ['target_date']
    
    def get_queryset(self):
        return PriceForecast.objects.filter(
            target_date__gte=date.today()
        ).select_related('commodity', 'market')


@extend_schema(
    parameters=[
        OpenApiParameter(name='commodity', description='Commodity ID', required=True),
        OpenApiParameter(name='market', description='Market ID', required=False),
        OpenApiParameter(name='district', description='District ID', required=False),
        OpenApiParameter(name='horizon', description='Weeks ahead', type=int, default=12),
    ]
)
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_forecast(request):
    """Get price forecast for a commodity"""
    commodity_id = request.query_params.get('commodity')
    market_id = request.query_params.get('market')
    district_id = request.query_params.get('district')
    horizon = int(request.query_params.get('horizon', 12))
    
    if not commodity_id:
        return Response(
            {'error': 'commodity parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check for existing forecasts
    existing = PriceForecast.objects.filter(
        commodity_id=commodity_id,
        market_id=market_id,
        district_id=district_id,
        target_date__gte=date.today(),
        forecast_date__gte=date.today() - __import__('datetime').timedelta(days=7)
    ).order_by('target_date')[:horizon]
    
    if existing.exists():
        return Response({
            'commodity_id': commodity_id,
            'forecasts': PriceForecastSerializer(existing, many=True).data,
            'source': 'cached',
        })
    
    # Generate new forecast
    service = PriceForecastingService(
        commodity_id=commodity_id,
        market_id=market_id,
        district_id=district_id
    )
    forecasts = service.run(horizon_weeks=horizon)
    
    if not forecasts:
        return Response(
            {'error': 'Insufficient data for forecasting'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({
        'commodity_id': commodity_id,
        'forecasts': PriceForecastSerializer(forecasts, many=True).data,
        'source': 'generated',
        'disclaimer': 'This is a forecast based on historical data. Actual prices may vary.',
    })