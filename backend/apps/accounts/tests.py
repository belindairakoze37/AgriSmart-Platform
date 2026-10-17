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
