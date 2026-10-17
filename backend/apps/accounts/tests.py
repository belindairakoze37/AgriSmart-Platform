from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='+256700000001',
            phone_number='+256700000001',
            password='StrongPass123!',
            first_name='Jane',
            last_name='Farmer',
            email='jane@example.com',
            role='farmer',
        )

    def test_register_creates_user_and_returns_tokens(self):
        payload = {
            'phone_number': '+256700000002',
            'first_name': 'John',
            'last_name': 'Buyer',
            'email': 'john@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'role': 'buyer',
        }

        response = self.client.post(reverse('register'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertTrue(User.objects.filter(phone_number='+256700000002').exists())

    def test_register_cannot_create_privileged_roles(self):
        for role in ('extension_officer', 'admin'):
            with self.subTest(role=role):
                response = self.client.post(
                    reverse('register'),
                    {
                        'phone_number': '+256700000003',
                        'first_name': 'Privileged',
                        'password': 'StrongPass123!',
                        'password_confirm': 'StrongPass123!',
                        'role': role,
                    },
                    format='json',
                )
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertFalse(
                    User.objects.filter(phone_number='+256700000003').exists()
                )

    def test_login_returns_tokens_for_valid_credentials(self):
        payload = {
            'phone_number': '+256700000001',
            'password': 'StrongPass123!',
        }

        response = self.client.post(reverse('login'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])

    def test_profile_requires_authentication(self):
        response = self.client.get(reverse('profile'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_current_user_for_authenticated_client(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('profile'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['phone_number'], '+256700000001')
        self.assertEqual(
            response.data['notification_preferences'],
            {
                'price_alerts': True,
                'weather_alerts': True,
                'advisories': True,
                'marketplace_offers': True,
            },
        )

    def test_profile_updates_notification_preferences(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse('profile'),
            {'notification_preferences': {'price_alerts': False}},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(
            self.user.notification_preferences,
            {
                'price_alerts': False,
                'weather_alerts': True,
                'advisories': True,
                'marketplace_offers': True,
            },
        )

    def test_profile_rejects_unknown_or_non_boolean_preferences(self):
        self.client.force_authenticate(user=self.user)

        for preferences in (
            {'unknown': True},
            {'weather_alerts': 'off'},
        ):
            with self.subTest(preferences=preferences):
                response = self.client.patch(
                    reverse('profile'),
                    {'notification_preferences': preferences},
                    format='json',
                )
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )

    def test_profile_updates_only_supported_language_codes(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse('profile'),
            {'preferred_language': 'lg'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.preferred_language, 'lg')

    def test_profile_cannot_change_account_role(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse('profile'),
            {'role': 'admin'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'farmer')
