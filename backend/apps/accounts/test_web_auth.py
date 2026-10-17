from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework import status

User = get_user_model()


class BrowserAuthTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = User.objects.create_user(
            username='+256700000001',
            phone_number='+256700000001',
            password='StrongPass123!',
            first_name='Jane',
            last_name='Farmer',
        )
        response = self.client.get(reverse('web-csrf'))
        self.csrf_token = response.json()['csrfToken']
        self.assertIn('csrftoken', response.cookies)

    def post(self, name, data=None):
        return self.client.post(
            reverse(name),
            data or {},
            content_type='application/json',
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )

    def test_login_sets_httponly_refresh_cookie_and_returns_access_only(self):
        response = self.post(
            'web-login',
            {
                'identifier': 'jane farmer',
                'password': 'StrongPass123!',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.json())
        self.assertNotIn('tokens', response.json())
        self.assertNotIn('refresh', response.json())
        cookie = response.cookies['agrismart_refresh']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertEqual(cookie['path'], '/api/v1/auth/web/')

    def test_browser_login_accepts_email(self):
        self.user.email = 'jane@example.com'
        self.user.save(update_fields=['email'])
        response = self.post(
            'web-login',
            {
                'identifier': 'JANE@example.com',
                'password': 'StrongPass123!',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('agrismart_refresh', response.cookies)

    def test_refresh_rotates_cookie_and_returns_access_token(self):
        login_response = self.post(
            'web-login',
            {
                'phone_number': '+256700000001',
                'password': 'StrongPass123!',
            },
        )
        old_refresh = login_response.cookies['agrismart_refresh'].value

        response = self.post('web-refresh')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.json())
        self.assertNotIn('refresh', response.json())
        self.assertNotEqual(
            response.cookies['agrismart_refresh'].value,
            old_refresh,
        )

    def test_browser_access_token_authenticates_the_shared_mobile_profile(self):
        response = self.post(
            'web-login',
            {
                'phone_number': '+256700000001',
                'password': 'StrongPass123!',
            },
        )

        profile = self.client.get(
            reverse('profile'),
            HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}",
        )

        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.json()['id'], str(self.user.id))

    def test_registration_creates_a_shared_account_without_returning_refresh(self):
        response = self.post(
            'web-register',
            {
                'phone_number': '+256700000002',
                'first_name': 'John',
                'last_name': 'Buyer',
                'email': 'john@example.com',
                'password': 'StrongPass123!',
                'password_confirm': 'StrongPass123!',
                'role': 'buyer',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('tokens', response.json())
        self.assertNotIn('refresh', response.json())
        self.assertTrue(User.objects.filter(phone_number='+256700000002').exists())
        self.assertTrue(response.cookies['agrismart_refresh']['httponly'])

    def test_mutating_auth_endpoints_require_csrf(self):
        response = self.client.post(
            reverse('web-login'),
            {
                'phone_number': '+256700000001',
                'password': 'StrongPass123!',
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_clears_refresh_cookie(self):
        login_response = self.post(
            'web-login',
            {
                'phone_number': '+256700000001',
                'password': 'StrongPass123!',
            },
        )
        refresh_token = login_response.cookies['agrismart_refresh'].value

        response = self.post('web-logout')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.cookies['agrismart_refresh'].value, '')
        self.client.cookies['agrismart_refresh'] = refresh_token
        refresh_response = self.post('web-refresh')
        self.assertEqual(
            refresh_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
