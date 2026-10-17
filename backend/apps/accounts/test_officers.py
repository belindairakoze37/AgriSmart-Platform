from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import FarmerProfile
from apps.diseases.models import DiseaseDetection
from apps.markets.models import District
from apps.notifications.models import Notification

User = get_user_model()


class OfficerPortalAPITests(APITestCase):
    def setUp(self):
        self.officer = User.objects.create_user(
            username='+256700000201',
            phone_number='+256700000201',
            password='StrongPass123!',
            first_name='Grace',
            role=User.Role.EXTENSION_OFFICER,
        )
        FarmerProfile.objects.create(user=self.officer, district='Gulu')
        self.farmers = [
            self.create_farmer(index, 'Gulu')
            for index in range(10)
        ]
        self.other_district_farmer = self.create_farmer(20, 'Lira')
        District.objects.create(name='Gulu', region='Northern', latitude=2.77, longitude=32.30)

    def create_farmer(self, index, district):
        phone = f'+256700000{index + 300:03d}'
        user = User.objects.create_user(
            username=phone,
            phone_number=phone,
            password='StrongPass123!',
            first_name=f'Farmer{index}',
        )
        FarmerProfile.objects.create(user=user, district=district)
        return user

    def test_farmer_cannot_access_officer_portal(self):
        self.client.force_authenticate(user=self.farmers[0])

        response = self.client.get(reverse('officer-dashboard'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_officer_dashboard_is_limited_to_assigned_district(self):
        self.client.force_authenticate(user=self.officer)

        response = self.client.get(reverse('officer-dashboard'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['district'], 'Gulu')
        self.assertEqual(response.data['farmer_count'], 10)
        self.assertEqual(len(response.data['farmers']), 10)
        self.assertNotIn(
            str(self.other_district_farmer.id),
            [farmer['user_id'] for farmer in response.data['farmers']],
        )

    def test_officer_cannot_select_another_district(self):
        self.client.force_authenticate(user=self.officer)

        response = self.client.get(
            reverse('officer-dashboard'),
            {'district': 'Lira'},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bulk_advisory_only_notifies_farmers_in_assigned_district(self):
        self.farmers[0].notification_preferences = {'advisories': False}
        self.farmers[0].save(update_fields=['notification_preferences'])
        self.client.force_authenticate(user=self.officer)

        response = self.client.post(
            reverse('officer-advisory-send'),
            {'title': 'Rain warning', 'message': 'Heavy rain is expected.'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['notified'], 9)
        self.assertEqual(response.data['skipped_by_preferences'], 1)
        self.assertEqual(
            Notification.objects.filter(title='Rain warning').count(),
            9,
        )
        self.assertFalse(
            Notification.objects.filter(user=self.other_district_farmer).exists()
        )

    def test_dashboard_reports_outbreak_after_ten_distinct_farmers(self):
        for farmer in self.farmers:
            DiseaseDetection.objects.create(
                user=farmer,
                image='detections/report.jpg',
                crop_type='tomato',
                detected_disease='Late blight',
            )
        self.client.force_authenticate(user=self.officer)

        response = self.client.get(reverse('officer-dashboard'))

        self.assertEqual(len(response.data['outbreaks']), 1)
        self.assertEqual(response.data['outbreaks'][0]['farmers_affected'], 10)
        self.assertEqual(response.data['outbreaks'][0]['district'], 'Gulu')
        self.assertEqual(response.data['outbreaks'][0]['latitude'], 2.77)
        self.assertEqual(response.data['outbreaks'][0]['longitude'], 32.3)
