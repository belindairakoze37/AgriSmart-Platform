from rest_framework import serializers
from .models import AdvisorySession, AdvisoryMessage


class AdvisoryMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdvisoryMessage
        fields = [
            'id', 'sender', 'content', 'intent',
            'confidence', 'sources', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AdvisorySessionSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AdvisorySession
        fields = [
            'id', 'title', 'crop_type', 'location', 'language',
            'is_active', 'last_message', 'message_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'content': last.content[:100],
                'sender': last.sender,
                'created_at': last.created_at.isoformat(),
            }
        return None
    
    def get_message_count(self, obj):
        return obj.messages.count()


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField()
    crop_type = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)