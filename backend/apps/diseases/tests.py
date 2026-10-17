from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from PIL import Image

from .models import DiseaseDetection
from .services import DiseaseDetectionService, DiseaseModelUnavailableError

User = get_user_model()


def png_bytes():
    image = Image.new('RGB', (2, 2), color=(30, 120, 40))
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


class DiseaseDetectionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='+256700000101',
            phone_number='+256700000101',
            password='StrongPass123!',
        )
        self.client.force_authenticate(self.user)

    def image(self):
        return SimpleUploadedFile(
            'crop.png',
            png_bytes(),
            content_type='image/png',
        )

    @patch('apps.diseases.views.DiseaseDetectionService')
    def test_detection_returns_unavailable_without_a_trained_model(self, service):
        service.return_value.is_available = False
        response = self.client.post(
            reverse('detect-disease'),
            {'image': self.image(), 'crop_type': 'maize'},
            format='multipart',
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
            response.data,
        )
        self.assertIn('trained model', response.data['error'])
        self.assertEqual(DiseaseDetection.objects.count(), 0)

    def test_detection_rejects_requests_without_an_image(self):
        response = self.client.post(
            reverse('detect-disease'),
            {'crop_type': 'maize'},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', response.data)


class DiseaseDetectionServiceTests(APITestCase):
    def test_missing_model_raises_instead_of_returning_a_random_prediction(self):
        service = DiseaseDetectionService()
        service.model = None

        with self.assertRaises(DiseaseModelUnavailableError):
            service.detect('unused-image.png', 'maize')
