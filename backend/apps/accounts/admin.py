from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, FarmerProfile, Farm, Crop, OTPVerification


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['phone_number', 'get_full_name', 'role', 'is_phone_verified', 'is_active']
    list_filter = ['role', 'is_phone_verified', 'is_active', 'is_staff']
    search_fields = ['phone_number', 'first_name', 'last_name', 'email']
    ordering = ['-date_joined']
    
    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'profile_picture')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Verification', {'fields': ('is_phone_verified', 'preferred_language')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'password1', 'password2', 'role'),
        }),
    )


@admin.register(FarmerProfile)
class FarmerProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'district', 'farm_size_acres', 'farming_type']
    list_filter = ['district', 'farming_type']
    search_fields = ['user__phone_number', 'user__first_name', 'user__last_name']


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ['name', 'farmer', 'size_acres', 'created_at']
    search_fields = ['name', 'farmer__user__phone_number']


@admin.register(Crop)
class CropAdmin(admin.ModelAdmin):
    list_display = ['crop_type', 'farm', 'area_acres', 'growth_stage', 'planting_date']
    list_filter = ['crop_type', 'growth_stage']
    search_fields = ['crop_type', 'farm__name']


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'otp_code', 'is_verified', 'created_at']
    list_filter = ['is_verified']