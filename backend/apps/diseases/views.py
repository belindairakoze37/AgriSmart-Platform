from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import DiseaseDetection
from .serializers import DiseaseDetectionCreateSerializer, DiseaseDetectionSerializer
from .services import DiseaseDetectionService, DiseaseModelUnavailableError


class DetectionListView(generics.ListAPIView):
    """List user's disease detections"""
    serializer_class = DiseaseDetectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DiseaseDetection.objects.filter(user=self.request.user)


class DetectionDetailView(generics.RetrieveUpdateAPIView):
    """Get or update a detection (for feedback)"""
    serializer_class = DiseaseDetectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DiseaseDetection.objects.filter(user=self.request.user)


@extend_schema(request=DiseaseDetectionCreateSerializer)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def detect_disease(request):
    """Upload image and detect disease"""
    serializer = DiseaseDetectionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    image = serializer.validated_data['image']
    crop_type = request.data.get('crop_type', '')
    
    # Validate image
    if image.size > 10 * 1024 * 1024:  # 10MB
        return Response(
            {'error': 'Image too large (max 10MB)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    service = DiseaseDetectionService()
    if not service.is_available:
        return Response(
            {'error': DiseaseModelUnavailableError.message},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Create detection record after confirming a model is available.
    detection = DiseaseDetection.objects.create(
        user=request.user,
        image=image,
        crop_type=crop_type,
    )
    
    result = service.detect(detection.image.path, crop_type)
    
    # Update record
    detection.detected_disease = result['detected_disease']
    detection.confidence = result['confidence']
    detection.all_predictions = result['all_predictions']
    detection.recommendations = {
        'immediate_actions': result['immediate_actions'],
        'preventive_measures': result['preventive_measures'],
        'severity': result.get('severity', 'unknown'),
    }
    detection.save()
    
    return Response({
        'detection': DiseaseDetectionSerializer(detection).data,
        'disclaimer': result['disclaimer'],
    }, status=status.HTTP_201_CREATED)