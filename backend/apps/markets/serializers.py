from rest_framework import serializers
from .models import District, Market, Commodity, MarketPrice, PriceAlert


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name', 'region', 'latitude', 'longitude']


class MarketSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    
    class Meta:
        model = Market
        fields = ['id', 'name', 'district', 'district_name', 'latitude', 'longitude', 'market_type']


class CommoditySerializer(serializers.ModelSerializer):
    class Meta:
        model = Commodity
        fields = ['id', 'name', 'local_names', 'category', 'unit', 'image']


class MarketPriceSerializer(serializers.ModelSerializer):
    market_name = serializers.CharField(source='market.name', read_only=True)
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)
    district_name = serializers.CharField(source='market.district.name', read_only=True)
    
    class Meta:
        model = MarketPrice
        fields = [
            'id', 'market', 'market_name', 'commodity', 'commodity_name',
            'district_name', 'price_per_unit', 'unit', 'price_type',
            'source', 'recorded_date'
        ]


class PriceAlertSerializer(serializers.ModelSerializer):
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)
    market_name = serializers.CharField(source='market.name', read_only=True)
    
    class Meta:
        model = PriceAlert
        fields = [
            'id', 'commodity', 'commodity_name', 'market', 'market_name',
            'target_price', 'condition', 'is_active', 'triggered_at', 'created_at'
        ]
        read_only_fields = ['id', 'triggered_at', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)