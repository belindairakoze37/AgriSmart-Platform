from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import FarmerProfile, Farm, Crop

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    preferred_language = serializers.ChoiceField(
        choices=[('en', 'English'), ('lg', 'Luganda'), ('sw', 'Swahili')],
        required=False,
    )
    notification_preferences = serializers.JSONField(required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'preferred_language', 'profile_picture',
            'is_phone_verified', 'date_joined', 'notification_preferences'
        ]
        read_only_fields = ['id', 'date_joined', 'is_phone_verified']
    
    def get_full_name(self, obj):
        return obj.get_full_name()

    def validate_notification_preferences(self, value):
        allowed_preferences = {
            'price_alerts',
            'weather_alerts',
            'marketplace_offers',
        }
        if not isinstance(value, dict) or any(
            key not in allowed_preferences or not isinstance(enabled, bool)
            for key, enabled in value.items()
        ):
            raise serializers.ValidationError(
                'Use boolean values for supported notification preferences.'
            )
        existing = (
            self.instance.notification_preferences
            if self.instance is not None
            else {}
        )
        return {**existing, **value}


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'phone_number', 'password', 'password_confirm',
            'first_name', 'last_name', 'email', 'role'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        validated_data.setdefault('username', validated_data['phone_number'])
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    password = serializers.CharField(write_only=True)


class OTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=17)


class OTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=17)
    otp_code = serializers.CharField(max_length=6)


class FarmerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = FarmerProfile
        fields = [
            'id', 'user', 'district', 'sub_county', 'village',
            'latitude', 'longitude', 'farm_size_acres', 'farming_type',
            'years_of_experience', 'primary_crops', 'has_smartphone',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FarmerProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        fields = [
            'district', 'sub_county', 'village', 'latitude', 'longitude',
            'farm_size_acres', 'farming_type', 'years_of_experience',
            'primary_crops', 'has_smartphone'
        ]


class FarmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farm
        fields = [
            'id', 'name', 'size_acres', 'latitude', 'longitude',
            'soil_type', 'irrigation_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = [
            'id', 'farm', 'crop_type', 'variety', 'area_acres',
            'planting_date', 'expected_harvest_date', 'actual_harvest_date',
            'growth_stage', 'expected_yield_kg', 'actual_yield_kg',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']