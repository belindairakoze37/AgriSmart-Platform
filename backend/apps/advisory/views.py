from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import AdvisorySession, AdvisoryMessage
from .serializers import (
    AdvisorySessionSerializer, AdvisoryMessageSerializer,
    SendMessageSerializer
)
from .services import AdvisoryService


class SessionListCreateView(generics.ListCreateAPIView):
    """List or create advisory sessions"""
    serializer_class = AdvisorySessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AdvisorySession.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SessionDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a session"""
    serializer_class = AdvisorySessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AdvisorySession.objects.filter(user=self.request.user)


class MessageListView(generics.ListAPIView):
    """List messages in a session"""
    serializer_class = AdvisoryMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        session_id = self.kwargs['session_id']
        return AdvisoryMessage.objects.filter(
            session_id=session_id,
            session__user=self.request.user
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_message(request, session_id=None):
    """Send a message and get AI response"""
    serializer = SendMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # Get or create session
    if session_id:
        try:
            session = AdvisorySession.objects.get(
                id=session_id,
                user=request.user
            )
        except AdvisorySession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        session = AdvisorySession.objects.create(
            user=request.user,
            title=data['content'][:50],
            crop_type=data.get('crop_type', ''),
            location=data.get('location', ''),
        )

    if not session.messages.exists():
        session.title = data['content'][:50]
        session.crop_type = data.get('crop_type') or session.crop_type
        session.location = data.get('location') or session.location
        session.save(update_fields=['title', 'crop_type', 'location', 'updated_at'])
    
    # Save user message
    user_message = AdvisoryMessage.objects.create(
        session=session,
        sender=AdvisoryMessage.Sender.USER,
        content=data['content']
    )
    
    # Get AI response
    service = AdvisoryService()
    advice = service.get_advice(
        message=data['content'],
        crop=data.get('crop_type') or session.crop_type,
        location=data.get('location') or session.location,
        language=session.language,
    )
    
    # Save AI response
    ai_message = AdvisoryMessage.objects.create(
        session=session,
        sender=AdvisoryMessage.Sender.AI,
        content=advice['content'],
        intent=advice['intent'],
        confidence=advice['confidence'],
        sources=advice['sources'],
    )
    
    session.save()  # Update updated_at
    
    return Response({
        'session_id': str(session.id),
        'user_message': AdvisoryMessageSerializer(user_message).data,
        'ai_message': AdvisoryMessageSerializer(ai_message).data,
    }, status=status.HTTP_201_CREATED)