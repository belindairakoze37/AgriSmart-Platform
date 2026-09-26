"""
AI Price Forecasting Service
Uses Facebook Prophet for time-series forecasting with seasonality
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta
from django.db.models import Avg
from prophet import Prophet
from sklearn.metrics import mean_absolute_percentage_error
import logging

from apps.markets.models import MarketPrice, Commodity, Market
from .models import PriceForecast

logger = logging.getLogger(__name__)


class PriceForecastingService:
    """Service for generating price forecasts"""
    
    def __init__(self, commodity_id, market_id=None, district_id=None):
        self.commodity_id = commodity_id
        self.market_id = market_id
        self.district_id = district_id
    
    def get_historical_data(self, months=24):
        """Get historical price data"""
        cutoff = date.today() - timedelta(days=months * 30)
        
        qs = MarketPrice.objects.filter(
            commodity_id=self.commodity_id,
            recorded_date__gte=cutoff
        )
        
        if self.market_id:
            qs = qs.filter(market_id=self.market_id)
        elif self.district_id:
            qs = qs.filter(market__district_id=self.district_id)
        
        # Aggregate by week
        df = pd.DataFrame(
            qs.values('recorded_date', 'price_per_unit')
        )
        
        if df.empty:
            return None
        
        # Convert to weekly averages
        df['recorded_date'] = pd.to_datetime(df['recorded_date'])
        df = df.groupby(pd.Grouper(key='recorded_date', freq='W'))['price_per_unit'].mean().reset_index()
        df.columns = ['ds', 'y']
        df = df.dropna()
        
        return df
    
    def train_and_forecast(self, periods=12, include_history=False):
        """Train Prophet model and generate forecast"""
        df = self.get_historical_data()
        
        if df is None or len(df) < 12:
            logger.warning(f"Insufficient data for commodity {self.commodity_id}")
            return None
        
        try:
            # Configure Prophet
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=False,
                daily_seasonality=False,
                interval_width=0.80,
                changepoint_prior_scale=0.05,
            )
            
            # Add Uganda-specific seasonality
            model.add_seasonality(
                name='harvest_cycle',
                period=180,
                fourier_order=5
            )
            
            # Fit model
            model.fit(df)
            
            # Create future dataframe
            future = model.make_future_dataframe(periods=periods, freq='W')
            
            # Predict
            forecast = model.predict(future)
            
            # Calculate model confidence (based on historical accuracy)
            historical = forecast[forecast['ds'].isin(df['ds'])].copy()
            historical['actual'] = df.set_index('ds')['y'].values[:len(historical)]
            
            # Filter valid rows
            valid = historical.dropna(subset=['actual', 'yhat'])
            
            if len(valid) > 0:
                mape = mean_absolute_percentage_error(valid['actual'], valid['yhat'])
                confidence = max(0.0, min(1.0, 1 - mape))
            else:
                confidence = 0.5
            
            return {
                'forecast': forecast,
                'confidence': round(confidence, 3),
                'model_type': 'prophet',
            }
        
        except Exception as e:
            logger.error(f"Forecasting error: {str(e)}")
            return None
    
    def save_forecasts(self, forecast_result, horizon_weeks=12):
        """Save forecast results to database"""
        if not forecast_result:
            return []
        
        forecast_df = forecast_result['forecast']
        confidence = forecast_result['confidence']
        
        # Only save future predictions
        today = pd.Timestamp(date.today())
        future = forecast_df[forecast_df['ds'] > today].head(horizon_weeks)
        
        saved = []
        for _, row in future.iterrows():
            obj, created = PriceForecast.objects.update_or_create(
                commodity_id=self.commodity_id,
                market_id=self.market_id,
                district_id=self.district_id,
                forecast_date=date.today(),
                target_date=row['ds'].date(),
                defaults={
                    'predicted_price': round(row['yhat'], 2),
                    'lower_bound': round(row['yhat_lower'], 2),
                    'upper_bound': round(row['yhat_upper'], 2),
                    'confidence': confidence,
                    'model_type': 'prophet',
                }
            )
            saved.append(obj)
        
        return saved
    
    def run(self, horizon_weeks=12):
        """Full pipeline: train, forecast, save"""
        result = self.train_and_forecast(periods=horizon_weeks)
        if result:
            return self.save_forecasts(result, horizon_weeks)
        return []


def generate_all_forecasts():
    """Generate forecasts for all commodities"""
    commodities = Commodity.objects.filter(is_active=True)
    results = []
    
    for commodity in commodities:
        # Forecast for national average (all markets)
        service = PriceForecastingService(commodity_id=str(commodity.id))
        forecasts = service.run(horizon_weeks=12)
        results.append({
            'commodity': commodity.name,
            'forecasts_created': len(forecasts),
        })
        logger.info(f"Generated {len(forecasts)} forecasts for {commodity.name}")
    
    return results