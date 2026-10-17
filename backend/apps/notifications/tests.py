from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Notification

User = get_user_model()


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='+256700000099',
            phone_number='+256700000099',
            password='StrongPass123!',
            first_name='Grace',
            last_name='Farmer',
        )
        self.other_user = User.objects.create_user(
            username='+256700000100',
            phone_number='+256700000100',
            password='StrongPass123!',
            first_name='Other',
            last_name='User',
        )
        self.notification = Notification.objects.create(
            user=self.user,
            title='Maize price update',
            message='Maize prices are trending above your target for this week.',
            notification_type=Notification.NotificationType.MARKET_PRICE,
        )

    def test_notification_list_requires_authentication(self):
        response = self.client.get(reverse('notification-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_their_notifications(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('notification-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_authenticated_user_can_create_notification(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'title': 'Disease alert',
            'message': 'Fungal symptoms reported in nearby farms.',
            'notification_type': Notification.NotificationType.DISEASE,
            'action_url': '/diseases/overview',
        }
        response = self.client.post(reverse('notification-list'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], str(self.user.id))

    def test_mark_all_read_marks_only_current_user_notifications(self):
        Notification.objects.create(
            user=self.other_user,
            title='Other user note',
            message='This should stay unread.',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse('notification-mark-all-read'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        self.assertIsNotNone(self.notification.read_at)

        other_notification = Notification.objects.get(user=self.other_user)
        self.assertFalse(other_notification.is_read)
