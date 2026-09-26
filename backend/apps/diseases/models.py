import uuid
from django.db import models


class DiseaseDetection(models.Model):
    """Record of disease detection from image"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='disease_detections'
    )
    image = models.ImageField(upload_to='disease_detections/%Y/%m/')
    crop_type = models.CharField(max_length=50)
    
    # Detection results
    detected_disease = models.CharField(max_length=200, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    all_predictions = models.JSONField(default=list, blank=True)
    
    # Recommendations
    recommendations = models.JSONField(default=list, blank=True)
    
    # User feedback
    is_correct = models.BooleanField(null=True, blank=True)
    user_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'disease_detections'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.crop_type} - {self.detected_disease}"