from rest_framework import serializers
from .models import DiseaseDetection


class DiseaseDetectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiseaseDetection
        fields = [
            'id', 'image', 'crop_type', 'detected_disease',
            'confidence', 'all_predictions', 'recommendations',
            'is_correct', 'user_notes', 'created_at'
        ]
        read_only_fields = [
            'id', 'detected_disease', 'confidence',
            'all_predictions', 'recommendations', 'created_at'
        ]


class DiseaseDetectionCreateSerializer(serializers.Serializer):
    image = serializers.ImageField()
    crop_type = serializers.CharField(max_length=50)