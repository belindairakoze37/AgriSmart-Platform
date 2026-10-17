import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Store user-facing platform notifications."""

    class NotificationType(models.TextChoices):
        MARKET_PRICE = 'market_price', 'Market Price'
        WEATHER = 'weather', 'Weather'
        ADVISORY = 'advisory', 'Advisory'
        DISEASE = 'disease', 'Disease'
        MARKETPLACE = 'marketplace', 'Marketplace'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=255, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} - {self.user}'
