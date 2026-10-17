import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import FarmerProfile
from apps.markets.models import District
from apps.notifications.models import Notification
from apps.notifications.services import create_user_notification

logger = logging.getLogger(__name__)
OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast'
HEAVY_RAIN_THRESHOLD_MM = 10


def create_weather_alert(user, data):
    if not data['heavy_rain_warning']:
        return
    today = timezone.localdate()
    if Notification.objects.filter(
        user=user,
        notification_type=Notification.NotificationType.ADVISORY,
        title='Heavy rain forecast',
        created_at__date=today,
    ).exists():
        return
    create_user_notification(
        user=user,
        title='Heavy rain forecast',
        message=(
            f"Heavy rain is forecast for {data['district']}. "
            'Avoid spraying pesticides before the rain.'
        ),
        notification_type=Notification.NotificationType.ADVISORY,
        action_url='/',
        metadata={
            'district': data['district'],
            'rainfall_next_24h_mm': data['rainfall_next_24h_mm'],
            'date': today.isoformat(),
        },
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_weather(request):
    api_key = settings.OPENWEATHER_API_KEY
    if not api_key:
        return Response(
            {'error': 'Weather service is not configured.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    profile = FarmerProfile.objects.filter(user=request.user).first()
    if not profile:
        return Response(
            {'error': 'Add your farm location to see local weather.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    latitude = profile.latitude
    longitude = profile.longitude
    district_name = profile.district
    if latitude is None or longitude is None:
        district = District.objects.filter(
            Q(name__iexact=district_name)
            & Q(latitude__isnull=False)
            & Q(longitude__isnull=False)
        ).first()
        if not district:
            return Response(
                {'error': 'Set a district with map coordinates in your farm profile.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        latitude = district.latitude
        longitude = district.longitude
        district_name = district.name

    cache_key = f'agrismart-weather:{float(latitude):.3f}:{float(longitude):.3f}'
    cached = cache.get(cache_key)
    if cached:
        create_weather_alert(request.user, cached)
        return Response(cached)

    try:
        response = requests.get(
            OPENWEATHER_FORECAST_URL,
            params={
                'lat': str(latitude),
                'lon': str(longitude),
                'appid': api_key,
                'units': 'metric',
            },
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError):
        logger.exception('OpenWeatherMap request failed for district %s.', district_name)
        return Response(
            {'error': 'Weather data is temporarily unavailable.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    entries = payload.get('list')
    if not isinstance(entries, list) or not entries or not isinstance(entries[0], dict):
        logger.error('OpenWeatherMap returned an unexpected forecast response.')
        return Response(
            {'error': 'Weather provider returned an invalid response.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    now = timezone.now()
    next_day = now + timedelta(hours=24)
    upcoming = [
        entry for entry in entries
        if isinstance(entry, dict)
        and isinstance(entry.get('dt'), (int, float))
        and now.timestamp() <= entry['dt'] <= next_day.timestamp()
    ]
    rainfall = 0.0
    for entry in upcoming:
        rain = entry.get('rain', {})
        if not isinstance(rain, dict):
            logger.error('OpenWeatherMap returned invalid rainfall data.')
            return Response(
                {'error': 'Weather provider returned an invalid response.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        try:
            rainfall += float(rain.get('3h', 0))
        except (TypeError, ValueError):
            logger.error('OpenWeatherMap returned a non-numeric rainfall value.')
            return Response(
                {'error': 'Weather provider returned an invalid response.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    current = entries[0]
    main = current.get('main', {})
    if not isinstance(main, dict):
        logger.error('OpenWeatherMap returned invalid current conditions.')
        return Response(
            {'error': 'Weather provider returned an invalid response.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    weather = current.get('weather', [])
    conditions = (
        weather[0]
        if isinstance(weather, list) and weather and isinstance(weather[0], dict)
        else {}
    )
    city = payload.get('city', {})
    if not isinstance(city, dict):
        city = {}
    wind = current.get('wind', {})
    if not isinstance(wind, dict):
        wind = {}
    data = {
        'location': city.get('name') or district_name,
        'district': district_name,
        'temperature_c': main.get('temp'),
        'feels_like_c': main.get('feels_like'),
        'humidity_percent': main.get('humidity'),
        'wind_speed_mps': wind.get('speed'),
        'condition': conditions.get('description', ''),
        'icon': conditions.get('icon', ''),
        'rainfall_next_24h_mm': round(rainfall, 1),
        'heavy_rain_warning': rainfall >= HEAVY_RAIN_THRESHOLD_MM,
        'advisory': (
            'Heavy rain is forecast. Avoid spraying pesticides before the rain.'
            if rainfall >= HEAVY_RAIN_THRESHOLD_MM
            else ''
        ),
        'updated_at': now.isoformat(),
    }
    cache.set(cache_key, data, timeout=600)
    create_weather_alert(request.user, data)
    return Response(data)
