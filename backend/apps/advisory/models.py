import uuid
from django.db import models


class AdvisorySession(models.Model):
    """Chat session with the AI advisor"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='advisory_sessions'
    )
    title = models.CharField(max_length=200, blank=True)
    crop_type = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=100, blank=True)
    language = models.CharField(max_length=10, default='en')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'advisory_sessions'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.user} - {self.title or 'Untitled'}"


class AdvisoryMessage(models.Model):
    """Individual messages in advisory session"""
    
    class Sender(models.TextChoices):
        USER = 'user', 'User'
        AI = 'ai', 'AI'
        SYSTEM = 'system', 'System'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AdvisorySession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.CharField(max_length=10, choices=Sender.choices)
    content = models.TextField()
    
    # For AI messages
    intent = models.CharField(max_length=50, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    sources = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'advisory_messages'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender}: {self.content[:50]}"