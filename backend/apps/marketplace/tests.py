from io import BytesIO
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from PIL import Image

from apps.markets.models import Commodity, District
from .models import Listing

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
