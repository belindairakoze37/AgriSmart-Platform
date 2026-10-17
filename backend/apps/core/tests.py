from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import FarmerProfile
from apps.markets.models import District
from apps.notifications.models import Notification

User = get_user_model()


class FarmerWeatherTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='+256700000105',
            phone_number='+256700000105',
            password='StrongPass123!',
        )
        self.profile = FarmerProfile.objects.create(
            user=self.user,
            district='Gulu',
        )
        District.objects.create(
            name='Gulu',
            region='Northern',
            latitude=2.77,
            longitude=32.30,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @override_settings(OPENWEATHER_API_KEY='test-weather-key')
    @patch('apps.core.weather.requests.get')
    def test_returns_location_weather_and_heavy_rain_advisory(self, get_weather):
        start = int(timezone.now().timestamp())
        response = Mock()
        response.json.return_value = {
            'city': {'name': 'Gulu'},
            'list': [
                {
                    'dt': start + 3600,
                    'main': {'temp': 25.2, 'feels_like': 26.1, 'humidity': 82},
                    'weather': [{'description': 'light rain', 'icon': '10d'}],
                    'wind': {'speed': 2.1},
                    'rain': {'3h': 6.5},
                },
                {'dt': start + 7200, 'rain': {'3h': 4.0}},
            ],
        }
        get_weather.return_value = response

        result = self.client.get(reverse('farmer-weather'))

        self.assertEqual(result.status_code, status.HTTP_200_OK)
        self.assertEqual(result.data['district'], 'Gulu')
        self.assertTrue(result.data['heavy_rain_warning'])
        self.assertEqual(result.data['rainfall_next_24h_mm'], 10.5)
        self.assertIn('Avoid spraying pesticides', result.data['advisory'])
        get_weather.assert_called_once()
        self.assertEqual(
            get_weather.call_args.kwargs['params']['appid'],
            'test-weather-key',
        )
        self.assertEqual(
            Notification.objects.filter(
                user=self.user,
                notification_type=Notification.NotificationType.ADVISORY,
            ).count(),
            1,
        )
        self.client.get(reverse('farmer-weather'))
        self.assertEqual(
            Notification.objects.filter(
                user=self.user,
                notification_type=Notification.NotificationType.ADVISORY,
            ).count(),
            1,
        )

    @override_settings(OPENWEATHER_API_KEY='test-weather-key')
    @patch('apps.core.weather.requests.get')
    def test_weather_alert_respects_disabled_preference(self, get_weather):
        self.user.notification_preferences = {'weather_alerts': False}
        self.user.save(update_fields=['notification_preferences'])
        start = int(timezone.now().timestamp())
        get_weather.return_value = Mock(
            json=Mock(return_value={
                'city': {'name': 'Gulu'},
                'list': [
                    {'dt': start + 3600, 'main': {'temp': 25}, 'rain': {'3h': 11}},
                ],
            })
        )

        result = self.client.get(reverse('farmer-weather'))

        self.assertEqual(result.status_code, status.HTTP_200_OK)
        self.assertTrue(result.data['heavy_rain_warning'])
        self.assertFalse(Notification.objects.filter(user=self.user).exists())

    @override_settings(OPENWEATHER_API_KEY='')
    @patch('apps.core.weather.requests.get')
    def test_unconfigured_weather_service_returns_clear_unavailable_error(self, get_weather):
        response = self.client.get(reverse('farmer-weather'))

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertIn('not configured', response.data['error'])
        get_weather.assert_not_called()
