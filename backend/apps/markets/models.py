import uuid
from django.db import models


class District(models.Model):
    """Uganda districts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    region = models.CharField(max_length=50)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    class Meta:
        db_table = 'districts'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Market(models.Model):
    """Physical markets where farmers sell"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='markets')
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    market_type = models.CharField(
        max_length=50,
        choices=[
            ('local', 'Local Market'),
            ('regional', 'Regional Market'),
            ('national', 'National Market'),
            ('border', 'Border Market'),
        ],
        default='local'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'markets'
        ordering = ['name']
        indexes = [
            models.Index(fields=['district', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.district.name})"


class Commodity(models.Model):
    """Agricultural commodities/crops"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    local_names = models.JSONField(default=dict, blank=True)  # {"luganda": "kasooli", "swahili": "mahindi"}
    category = models.CharField(
        max_length=50,
        choices=[
            ('cereal', 'Cereal'),
            ('legume', 'Legume'),
            ('vegetable', 'Vegetable'),
            ('fruit', 'Fruit'),
            ('root', 'Root/Tuber'),
            ('cash_crop', 'Cash Crop'),
            ('livestock', 'Livestock'),
            ('other', 'Other'),
        ]
    )
    unit = models.CharField(max_length=20, default='kg')
    image = models.ImageField(upload_to='commodities/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'commodities'
        ordering = ['name']
        verbose_name_plural = 'Commodities'
    
    def __str__(self):
        return self.name


class MarketPrice(models.Model):
    """Historical and current market prices"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    market = models.ForeignKey(Market, on_delete=models.CASCADE, related_name='prices')
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE, related_name='prices')
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20, default='kg')
    price_type = models.CharField(
        max_length=20,
        choices=[
            ('farm_gate', 'Farm Gate'),
            ('wholesale', 'Wholesale'),
            ('retail', 'Retail'),
        ],
        default='wholesale'
    )
    source = models.CharField(max_length=100, blank=True)  # e.g., "MAAIF", "Farmgain"
    recorded_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'market_prices'
        ordering = ['-recorded_date']
        indexes = [
            models.Index(fields=['commodity', 'market', '-recorded_date']),
            models.Index(fields=['recorded_date']),
        ]
        unique_together = ['market', 'commodity', 'price_type', 'recorded_date']
    
    def __str__(self):
        return f"{self.commodity.name} @ {self.market.name}: {self.price_per_unit}/{self.unit}"


class PriceAlert(models.Model):
    """User price alerts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='price_alerts')
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    market = models.ForeignKey(Market, on_delete=models.CASCADE, null=True, blank=True)
    target_price = models.DecimalField(max_digits=12, decimal_places=2)
    condition = models.CharField(
        max_length=10,
        choices=[('above', 'Above'), ('below', 'Below')],
        default='above'
    )
    is_active = models.BooleanField(default=True)
    triggered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'price_alerts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user} - {self.commodity.name} {self.condition} {self.target_price}"