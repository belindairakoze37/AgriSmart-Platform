from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.markets.models import Commodity, District, Market, MarketPrice, PriceAlert
from apps.notifications.models import Notification


class MarketsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='+256700000010',
            phone_number='+256700000010',
            password='StrongPass123!',
            role='farmer',
        )
        self.district = District.objects.create(name='Kampala', region='Central', latitude=0.31, longitude=32.58)
        self.market = Market.objects.create(
            name='Nakasero Market',
            district=self.district,
            latitude=0.31,
            longitude=32.58,
            market_type='local',
        )
        self.commodity = Commodity.objects.create(name='Maize', category='cereal', unit='kg')
        self.market_price = MarketPrice.objects.create(
            market=self.market,
            commodity=self.commodity,
            price_per_unit=1200,
            unit='kg',
            price_type='wholesale',
            source='MAAIF',
            recorded_date='2026-10-01',
        )

    def test_markets_list_returns_data(self):
        response = self.client.get(reverse('market-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_price_history_requires_commodity(self):
        response = self.client.get(reverse('price-history'))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('commodity', response.data['error'])

    def test_price_alert_requires_authentication(self):
        response = self.client.get(reverse('alert-list'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_create_price_alert(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'commodity': str(self.commodity.id),
            'market': str(self.market.id),
            'target_price': 1300,
            'condition': 'above',
        }

        response = self.client.post(reverse('alert-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['commodity']), str(self.commodity.id))
        self.assertTrue(PriceAlert.objects.filter(user=self.user).exists())

    def test_price_alert_triggers_once_when_recorded_price_crosses_threshold(self):
        alert = PriceAlert.objects.create(
            user=self.user,
            commodity=self.commodity,
            market=self.market,
            target_price=1300,
            condition='above',
        )

        new_price = MarketPrice.objects.create(
            market=self.market,
            commodity=self.commodity,
            price_per_unit=1300,
            unit='kg',
            price_type='wholesale',
            source='MAAIF',
            recorded_date='2026-10-02',
        )

        alert.refresh_from_db()
        self.assertFalse(alert.is_active)
        self.assertIsNotNone(alert.triggered_at)
        notification = Notification.objects.get(user=self.user)
        self.assertEqual(notification.notification_type, 'market_price')
        self.assertIn('reached UGX 1300', notification.message)

        new_price.source = 'Updated source'
        new_price.save()
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
