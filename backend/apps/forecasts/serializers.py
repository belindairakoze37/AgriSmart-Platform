from rest_framework import serializers
from .models import PriceForecast


class PriceForecastSerializer(serializers.ModelSerializer):
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)
    market_name = serializers.CharField(source='market.name', read_only=True)
    
    class Meta:
        model = PriceForecast
        fields = [
            'id', 'commodity', 'commodity_name', 'market', 'market_name',
            'forecast_date', 'target_date', 'predicted_price',
            'lower_bound', 'upper_bound', 'confidence',
            'model_type', 'created_at'
        ]