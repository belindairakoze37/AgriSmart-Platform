import random
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import FarmerProfile, Farm, Crop, OTPVerification
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    OTPRequestSerializer, OTPVerifySerializer,
    FarmerProfileSerializer, FarmerProfileCreateSerializer,
    FarmSerializer, CropSerializer
)

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """Register a new user"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=LoginSerializer)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """Login with phone number and password"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        phone = serializer.validated_data['phone_number']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(phone_number=phone)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=OTPRequestSerializer)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def request_otp(request):
    """Request OTP for phone verification"""
    serializer = OTPRequestSerializer(data=request.data)
    if serializer.is_valid():
        phone = serializer.validated_data['phone_number']
        
        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        
        # Create OTP record
        OTPVerification.objects.create(
            phone_number=phone,
            otp_code=otp_code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        # TODO: Send OTP via SMS gateway (e.g., Africa's Talking)
        # send_sms(phone, f"Your AgriSmart code is: {otp_code}")
        
        return Response({
            'message': 'OTP sent successfully',
            'phone_number': phone,
            # Remove in production:
            'otp_code': otp_code if settings.DEBUG else None
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=OTPVerifySerializer)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_otp(request):
    """Verify OTP code"""
    serializer = OTPVerifySerializer(data=request.data)
    if serializer.is_valid():
        phone = serializer.validated_data['phone_number']
        otp_code = serializer.validated_data['otp_code']
        
        otp_record = OTPVerification.objects.filter(
            phone_number=phone,
            otp_code=otp_code,
            is_verified=False
        ).order_by('-created_at').first()
        
        if not otp_record:
            return Response(
                {'error': 'Invalid OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if otp_record.is_expired():
            return Response(
                {'error': 'OTP has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if otp_record.attempts >= 5:
            return Response(
                {'error': 'Too many attempts'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        otp_record.is_verified = True
        otp_record.save()
        
        # Mark user as verified
        User.objects.filter(phone_number=phone).update(is_phone_verified=True)
        
        return Response({'message': 'Phone verified successfully'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=['Accounts'], summary='Get current user profile')
class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update current user's profile"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


@extend_schema(tags=['Farmers'], summary='Get or update farmer profile')
class FarmerProfileView(generics.RetrieveUpdateAPIView):
    """Get or update farmer profile"""
    serializer_class = FarmerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, _ = FarmerProfile.objects.get_or_create(user=self.request.user)
        return profile


@extend_schema(tags=['Farmers'], summary='List or create farms for the current farmer')
class FarmListCreateView(generics.ListCreateAPIView):
    """List or create farms for current farmer"""
    serializer_class = FarmSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Farm.objects.filter(farmer__user=self.request.user)
    
    def perform_create(self, serializer):
        profile, _ = FarmerProfile.objects.get_or_create(user=self.request.user)
        serializer.save(farmer=profile)


@extend_schema(tags=['Farmers'], summary='Retrieve, update, or delete a farm')
class FarmDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a farm"""
    serializer_class = FarmSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Farm.objects.filter(farmer__user=self.request.user)


@extend_schema(tags=['Farmers'], summary='List or create crops for the current farmer')
class CropListCreateView(generics.ListCreateAPIView):
    """List or create crops"""
    serializer_class = CropSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['crop_type', 'growth_stage', 'farm']
    
    def get_queryset(self):
        return Crop.objects.filter(farm__farmer__user=self.request.user)
    
    def perform_create(self, serializer):
        # Verify farm ownership
        farm = serializer.validated_data['farm']
        if farm.farmer.user != self.request.user:
            raise PermissionError("You don't own this farm")
        serializer.save()


@extend_schema(tags=['Farmers'], summary='Retrieve, update, or delete a crop')
class CropDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a crop"""
    serializer_class = CropSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Crop.objects.filter(farm__farmer__user=self.request.user)