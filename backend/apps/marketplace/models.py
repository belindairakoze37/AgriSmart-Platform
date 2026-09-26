import uuid
from django.db import models


class Listing(models.Model):
    """Farmer's produce listing"""
    
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        SOLD = 'sold', 'Sold'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'
    
    class QualityGrade(models.TextChoices):
        A = 'A', 'Grade A (Premium)'
        B = 'B', 'Grade B (Good)'
        C = 'C', 'Grade C (Fair)'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(
        'accounts.FarmerProfile',
        on_delete=models.CASCADE,
        related_name='listings'
    )
    commodity = models.ForeignKey(
        'markets.Commodity',
        on_delete=models.PROTECT,
        related_name='listings'
    )
    
    # Listing details
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    quality_grade = models.CharField(
        max_length=1,
        choices=QualityGrade.choices,
        default=QualityGrade.B
    )
    expected_price_per_kg = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Availability
    available_from = models.DateField()
    available_until = models.DateField(null=True, blank=True)
    
    # Location
    district = models.ForeignKey('markets.District', on_delete=models.PROTECT)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    pickup_location = models.CharField(max_length=200, blank=True)
    
    # Images
    images = models.JSONField(default=list, blank=True)  # List of image URLs
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )
    views_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'listings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'commodity', 'district']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.farmer.user.get_full_name()}"


class Offer(models.Model):
    """Buyer's offer on a listing"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        WITHDRAWN = 'withdrawn', 'Withdrawn'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='offers')
    buyer = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='offers_made'
    )
    
    offered_price_per_kg = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    pickup_date = models.DateField(null=True, blank=True)
    message = models.TextField(blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'offers'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Offer on {self.listing.title} by {self.buyer.get_full_name()}"


class Transaction(models.Model):
    """Completed transaction"""
    
    class Status(models.TextChoices):
        INITIATED = 'initiated', 'Initiated'
        PAYMENT_PENDING = 'payment_pending', 'Payment Pending'
        PAID = 'paid', 'Paid'
        DELIVERED = 'delivered', 'Delivered'
        COMPLETED = 'completed', 'Completed'
        DISPUTED = 'disputed', 'Disputed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.PROTECT)
    offer = models.OneToOneField(Offer, on_delete=models.PROTECT)
    
    final_price_per_kg = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INITIATED,
        db_index=True
    )
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Transaction {self.id} - {self.status}"