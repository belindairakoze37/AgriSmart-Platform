from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.diseases.models import DiseaseDetection
from apps.marketplace.models import Listing
from apps.markets.models import District
from apps.notifications.models import Notification
from apps.notifications.services import create_user_notification
from .models import FarmerProfile, Farm

User = get_user_model()


class OfficerPortalPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                User.Role.EXTENSION_OFFICER,
                User.Role.ADMIN,
            )
        )


class BulkAdvisorySerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    message = serializers.CharField(max_length=5000)
    district = serializers.CharField(max_length=100, required=False)

    def validate_title(self, value):
        return value.strip()

    def validate_message(self, value):
        return value.strip()


def officer_district(request, requested_district=None):
    if request.user.role == User.Role.ADMIN:
        return requested_district or None
    profile = FarmerProfile.objects.filter(user=request.user).first()
    if not profile or not profile.district.strip():
        return Response(
            {'error': 'Set a district on your officer profile before using the portal.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if requested_district and requested_district.casefold() != profile.district.casefold():
        return Response(
            {'error': 'Extension officers can only access their assigned district.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return profile.district


def farmer_profiles_for(district):
    queryset = FarmerProfile.objects.filter(
        user__role=User.Role.FARMER,
    ).select_related('user')
    if district:
        queryset = queryset.filter(district__iexact=district)
    return queryset


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, OfficerPortalPermission])
def officer_dashboard(request):
    requested_district = request.query_params.get('district')
    district = officer_district(request, requested_district)
    if isinstance(district, Response):
        return district

    profiles = farmer_profiles_for(district)
    farmers = list(
        profiles.annotate(
            farm_count=Count('farms', distinct=True),
            active_listing_count=Count(
                'listings',
                filter=Q(listings__status=Listing.Status.ACTIVE),
                distinct=True,
            ),
        )
        .order_by('district', 'user__last_name', 'user__first_name')
        .values(
            'id',
            'district',
            'farm_size_acres',
            'primary_crops',
            'user__id',
            'user__first_name',
            'user__last_name',
            'user__phone_number',
            'farm_count',
            'active_listing_count',
        )[:100]
    )
    for farmer in farmers:
        farmer['user_id'] = str(farmer.pop('user__id'))
        farmer['full_name'] = (
            f"{farmer.pop('user__first_name')} "
            f"{farmer.pop('user__last_name')}"
        ).strip()
        farmer['phone_number'] = farmer.pop('user__phone_number')
        farmer['farm_size_acres'] = (
            str(farmer['farm_size_acres'])
            if farmer['farm_size_acres'] is not None
            else None
        )
        farmer['id'] = str(farmer['id'])

    cutoff = timezone.now() - timedelta(days=30)
    outbreaks = DiseaseDetection.objects.filter(
        created_at__gte=cutoff,
        detected_disease__gt='',
        user__farmer_profile__in=profiles,
    ).values(
        'crop_type',
        'detected_disease',
        'user__farmer_profile__district',
    ).annotate(
        reports=Count('id'),
        farmers_affected=Count('user_id', distinct=True),
    ).filter(
        farmers_affected__gte=10,
    ).order_by('-farmers_affected', '-reports')

    hotspot_rows = []
    for item in outbreaks:
        district_coordinates = District.objects.filter(
            name__iexact=item['user__farmer_profile__district'],
        ).values('latitude', 'longitude').first()
        hotspot_rows.append({
            'crop_type': item['crop_type'],
            'disease': item['detected_disease'],
            'district': item['user__farmer_profile__district'],
            'reports': item['reports'],
            'farmers_affected': item['farmers_affected'],
            'latitude': (
                float(district_coordinates['latitude'])
                if district_coordinates and district_coordinates['latitude'] is not None
                else None
            ),
            'longitude': (
                float(district_coordinates['longitude'])
                if district_coordinates and district_coordinates['longitude'] is not None
                else None
            ),
        })

    return Response({
        'district': district,
        'farmer_count': profiles.count(),
        'farm_count': Farm.objects.filter(farmer__in=profiles).count(),
        'active_listing_count': Listing.objects.filter(
            farmer__in=profiles,
            status=Listing.Status.ACTIVE,
        ).count(),
        'farmers': farmers,
        'farmers_truncated': profiles.count() > len(farmers),
        'outbreaks': hotspot_rows,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, OfficerPortalPermission])
def send_district_advisory(request):
    serializer = BulkAdvisorySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    district = officer_district(
        request,
        serializer.validated_data.get('district'),
    )
    if isinstance(district, Response):
        return district

    farmers = User.objects.filter(
        role=User.Role.FARMER,
        farmer_profile__in=farmer_profiles_for(district),
        is_active=True,
    )
    eligible_count = 0
    skipped_count = 0
    with transaction.atomic():
        for farmer in farmers.iterator():
            notification = create_user_notification(
                user=farmer,
                title=serializer.validated_data['title'],
                message=serializer.validated_data['message'],
                notification_type=Notification.NotificationType.ADVISORY,
                action_url='/notifications',
                metadata={'district': district or farmer.farmer_profile.district},
            )
            if notification is None:
                skipped_count += 1
            else:
                eligible_count += 1

    return Response({
        'district': district,
        'notified': eligible_count,
        'skipped_by_preferences': skipped_count,
    }, status=status.HTTP_201_CREATED)
