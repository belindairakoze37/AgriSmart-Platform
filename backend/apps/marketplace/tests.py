from io import BytesIO
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from PIL import Image

from apps.accounts.models import FarmerProfile
from apps.markets.models import Commodity, District
from apps.notifications.models import Notification
from .models import Listing, Offer, Transaction

User = get_user_model()


def png_bytes():
    image = Image.new('RGB', (2, 2), color=(30, 120, 40))
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


class ListingImageUploadTests(TestCase):
    def setUp(self):
        self.media_directory = TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        media_settings = override_settings(MEDIA_ROOT=self.media_directory.name)
        media_settings.enable()
        self.addCleanup(media_settings.disable)

        self.client = APIClient()
        self.user = User.objects.create_user(
            username='+256700000102',
            phone_number='+256700000102',
            password='StrongPass123!',
        )
        self.client.force_authenticate(self.user)
        self.commodity = Commodity.objects.create(name='Maize', category='cereal')
        self.district = District.objects.create(name='Gulu', region='Northern')

    def test_create_listing_persists_uploaded_photo_and_returns_its_url(self):
        response = self.client.post(
            reverse('listing-list'),
            {
                'commodity': str(self.commodity.id),
                'district': str(self.district.id),
                'title': 'Dried maize',
                'quantity_kg': '250',
                'quality_grade': 'A',
                'expected_price_per_kg': '1800',
                'available_from': '2026-10-17',
                'image_files': [
                    SimpleUploadedFile(
                        'maize.png',
                        png_bytes(),
                        content_type='image/png',
                    )
                ],
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('id', response.data)
        listing = Listing.objects.get(pk=response.data['id'])
        self.assertEqual(len(listing.images), 1)
        self.assertTrue(listing.images[0].startswith('listings/'))
        self.assertTrue(response.data['images'][0].startswith('http://testserver/media/'))


class MarketplaceOfferTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            username='+256700000103',
            phone_number='+256700000103',
            password='StrongPass123!',
        )
        self.buyer = User.objects.create_user(
            username='+256700000104',
            phone_number='+256700000104',
            password='StrongPass123!',
        )
        district = District.objects.create(name='Lira', region='Northern')
        commodity = Commodity.objects.create(name='Beans', category='legume')
        farmer = FarmerProfile.objects.create(user=self.seller, district='Lira')
        self.listing = Listing.objects.create(
            farmer=farmer,
            commodity=commodity,
            district=district,
            title='Dry beans',
            quantity_kg=300,
            expected_price_per_kg=2200,
            available_from='2026-10-17',
        )
        self.offer = Offer.objects.create(
            listing=self.listing,
            buyer=self.buyer,
            offered_price_per_kg=2100,
            quantity_kg=100,
        )

    def test_accepting_offer_updates_state_and_notifies_buyer_once(self):
        self.client.force_authenticate(self.seller)
        response = self.client.patch(
            reverse('offer-detail', kwargs={'pk': self.offer.pk}),
            {'status': Offer.Status.ACCEPTED},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.offer.refresh_from_db()
        self.listing.refresh_from_db()
        self.assertEqual(self.offer.status, Offer.Status.ACCEPTED)
        self.assertEqual(self.listing.status, Listing.Status.SOLD)
        self.assertEqual(Transaction.objects.filter(offer=self.offer).count(), 1)
        self.assertTrue(
            Notification.objects.filter(
                user=self.buyer,
                notification_type=Notification.NotificationType.MARKETPLACE,
                title='Your offer was accepted',
            ).exists()
        )

        repeated = self.client.patch(
            reverse('offer-detail', kwargs={'pk': self.offer.pk}),
            {'status': Offer.Status.ACCEPTED},
            format='json',
        )
        self.assertEqual(repeated.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Transaction.objects.filter(offer=self.offer).count(), 1)

    def test_buyer_cannot_accept_their_own_offer(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.patch(
            reverse('offer-detail', kwargs={'pk': self.offer.pk}),
            {'status': Offer.Status.ACCEPTED},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.status, Offer.Status.PENDING)

    def test_new_offer_notifies_listing_owner(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.post(
            reverse('offer-list'),
            {
                'listing': str(self.listing.pk),
                'offered_price_per_kg': '2300',
                'quantity_kg': '50',
                'message': 'Ready for collection this week.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(
            Notification.objects.filter(
                user=self.seller,
                notification_type=Notification.NotificationType.MARKETPLACE,
                title='New offer on your listing',
            ).exists()
        )
