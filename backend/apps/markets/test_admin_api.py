from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.marketplace.models import Listing, Transaction
from .models import Commodity, District, Market, MarketPrice

User = get_user_model()


class AdminPortalAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='+256700000401',
            phone_number='+256700000401',
            password='StrongPass123!',
            role=User.Role.ADMIN,
        )
        self.farmer = User.objects.create_user(
            username='+256700000402',
            phone_number='+256700000402',
            password='StrongPass123!',
            role=User.Role.FARMER,
        )
        self.commodity = Commodity.objects.create(
            name='Maize',
            category='cereal',
        )
        district = District.objects.create(name='Gulu', region='Northern')
        self.market = Market.objects.create(
            name='Gulu Main',
            district=district,
        )

    def upload_csv(self, content):
        return SimpleUploadedFile(
            'prices.csv',
            content.encode('utf-8'),
            content_type='text/csv',
        )

    def test_admin_dashboard_reports_persisted_platform_metrics(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(reverse('admin-dashboard'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_users'], 2)
        self.assertEqual(response.data['total_listings'], Listing.objects.count())
        self.assertEqual(
            response.data['completed_transactions'],
            Transaction.objects.filter(status=Transaction.Status.COMPLETED).count(),
        )
        self.assertEqual(response.data['completed_transaction_value_ugx'], '0.00')

    def test_non_admin_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.farmer)

        response = self.client.get(reverse('admin-dashboard'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_and_soft_delete_a_commodity(self):
        self.client.force_authenticate(user=self.admin)
        created = self.client.post(
            reverse('admin-commodity-list'),
            {
                'name': 'Beans',
                'category': 'legume',
                'unit': 'kg',
                'local_names': {'luganda': 'ebijanjaalo'},
            },
            format='json',
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)

        deleted = self.client.delete(
            reverse('admin-commodity-detail', args=[created.data['id']])
        )

        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Commodity.objects.get(pk=created.data['id']).is_active
        )

    def test_import_creates_and_updates_market_prices(self):
        self.client.force_authenticate(user=self.admin)
        content = (
            'market,commodity,price_per_unit,recorded_date,source\n'
            'Gulu Main,Maize,1200,2026-10-17,MAAIF\n'
        )

        created = self.client.post(
            reverse('admin-price-import'),
            {'file': self.upload_csv(content)},
            format='multipart',
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(created.data['created'], 1)
        price = MarketPrice.objects.get()
        self.assertEqual(price.price_per_unit, 1200)
        self.assertEqual(price.unit, 'kg')

        updated = self.client.post(
            reverse('admin-price-import'),
            {'file': self.upload_csv(content.replace(',1200,', ',1350,'))},
            format='multipart',
        )
        self.assertEqual(updated.status_code, status.HTTP_201_CREATED)
        self.assertEqual(updated.data['updated'], 1)
        self.assertEqual(MarketPrice.objects.count(), 1)
        self.assertEqual(MarketPrice.objects.get().price_per_unit, 1350)

    def test_import_rejects_entire_file_when_a_row_is_invalid(self):
        self.client.force_authenticate(user=self.admin)
        content = (
            'market,commodity,price_per_unit,recorded_date\n'
            'Gulu Main,Maize,1200,2026-10-17\n'
            'Unknown Market,Maize,900,2026-10-17\n'
        )

        response = self.client.post(
            reverse('admin-price-import'),
            {'file': self.upload_csv(content)},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MarketPrice.objects.count(), 0)
        self.assertEqual(response.data['row_errors'][0]['row'], 3)
