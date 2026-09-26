import uuid
from django.db import models


class PriceForecast(models.Model):
    """AI-generated price forecasts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commodity = models.ForeignKey(
        'markets.Commodity',
        on_delete=models.CASCADE,
        related_name='forecasts'
    )
    market = models.ForeignKey(
        'markets.Market',
        on_delete=models.CASCADE,
        related_name='forecasts',
        null=True,
        blank=True
    )
    district = models.ForeignKey(
        'markets.District',
        on_delete=models.CASCADE,
        related_name='forecasts',
        null=True,
        blank=True
    )
    
    # Forecast details
    forecast_date = models.DateField(db_index=True)
    target_date = models.DateField(db_index=True)
    predicted_price = models.DecimalField(max_digits=12, decimal_places=2)
    lower_bound = models.DecimalField(max_digits=12, decimal_places=2)
    upper_bound = models.DecimalField(max_digits=12, decimal_places=2)
    confidence = models.FloatField(help_text="Confidence score 0-1")
    
    # Model metadata
    model_version = models.CharField(max_length=50, default='v1.0')
    model_type = models.CharField(max_length=50, default='prophet')
    features_used = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'price_forecasts'
        ordering = ['-forecast_date', 'target_date']
        indexes = [
            models.Index(fields=['commodity', 'market', 'target_date']),
        ]
    
    def __str__(self):
        return f"{self.commodity.name} @ {self.market or self.district}: {self.predicted_price} on {self.target_date}"