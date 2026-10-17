import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class User(AbstractUser):
    """Custom user model with phone-based authentication"""
    
    class Role(models.TextChoices):
        FARMER = 'farmer', 'Farmer'
        BUYER = 'buyer', 'Buyer'
        EXTENSION_OFFICER = 'extension_officer', 'Extension Officer'
        ADMIN = 'admin', 'Administrator'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+256...'"
    )
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=17,
        unique=True,
        db_index=True
    )
    email = models.EmailField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FARMER)
    is_phone_verified = models.BooleanField(default=False)
    preferred_language = models.CharField(max_length=10, default='en')
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.phone_number
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name() or self.phone_number}"


class FarmerProfile(models.Model):
    """Extended profile for farmers"""
    
    class FarmingType(models.TextChoices):
        SUBSISTENCE = 'subsistence', 'Subsistence'
        SMALLHOLDER = 'smallholder', 'Smallholder'
        COMMERCIAL = 'commercial', 'Commercial'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='farmer_profile'
    )
    
    # Location
    district = models.CharField(max_length=100, db_index=True)
    sub_county = models.CharField(max_length=100, blank=True)
    village = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    # Farm details
    farm_size_acres = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    farming_type = models.CharField(
        max_length=20,
        choices=FarmingType.choices,
        default=FarmingType.SMALLHOLDER
    )
    
    # Metadata
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    primary_crops = models.JSONField(default=list, blank=True)
    has_smartphone = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'farmer_profiles'
        indexes = [
            models.Index(fields=['district']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.district}"


class Farm(models.Model):
    """Individual farm plots"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(
        FarmerProfile,
        on_delete=models.CASCADE,
        related_name='farms'
    )
    name = models.CharField(max_length=100)
    size_acres = models.DecimalField(max_digits=10, decimal_places=2)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    soil_type = models.CharField(max_length=50, blank=True)
    irrigation_type = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'farms'
    
    def __str__(self):
        return f"{self.name} ({self.farmer.user.get_full_name()})"


class Crop(models.Model):
    """Crop planted on a farm"""
    
    class GrowthStage(models.TextChoices):
        PLANNED = 'planned', 'Planned'
        PLANTED = 'planted', 'Planted'
        GERMINATION = 'germination', 'Germination'
        VEGETATIVE = 'vegetative', 'Vegetative'
        FLOWERING = 'flowering', 'Flowering'
        FRUITING = 'fruiting', 'Fruiting'
        MATURITY = 'maturity', 'Maturity'
        HARVESTED = 'harvested', 'Harvested'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='crops')
    crop_type = models.CharField(max_length=50, db_index=True)  # maize, beans, etc.
    variety = models.CharField(max_length=100, blank=True)
    area_acres = models.DecimalField(max_digits=10, decimal_places=2)
    planting_date = models.DateField(null=True, blank=True)
    expected_harvest_date = models.DateField(null=True, blank=True)
    actual_harvest_date = models.DateField(null=True, blank=True)
    growth_stage = models.CharField(
        max_length=20,
        choices=GrowthStage.choices,
        default=GrowthStage.PLANNED
    )
    expected_yield_kg = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    actual_yield_kg = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'crops'
        ordering = ['-planting_date']
        indexes = [
            models.Index(fields=['crop_type', 'growth_stage']),
        ]
    
    def __str__(self):
        return f"{self.crop_type} - {self.farm.name}"


class OTPVerification(models.Model):
    """OTP for phone verification"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=17, db_index=True)
    otp_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'otp_verifications'
        ordering = ['-created_at']
    
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at