from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'title',
            'message',
            'notification_type',
            'is_read',
            'action_url',
            'metadata',
            'created_at',
            'read_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'read_at']

    def get_user(self, obj):
        return str(obj.user_id)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
