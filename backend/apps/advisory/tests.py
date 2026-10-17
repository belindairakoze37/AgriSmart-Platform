from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AdvisoryMessage, AdvisorySession
from .services import AdvisoryService


class AdvisoryServiceTests(TestCase):
    @override_settings(OPENAI_API_KEY='')
    def test_rule_based_advice_resolves_crop_from_question_before_profile_list(self):
        advice = AdvisoryService().get_advice(
            'When should I plant maize?',
            crop='Beans, Tomatoes',
        )

        self.assertEqual(advice['intent'], 'planting')
        self.assertIn('March-April', advice['content'])
        self.assertIn('September', advice['content'])
        self.assertEqual(advice['confidence'], 0.7)

    @override_settings(OPENAI_API_KEY='')
    def test_rule_based_advice_resolves_singular_crop_name(self):
        advice = AdvisoryService().get_advice(
            'What fertilizer should I use?',
            crop='Beans',
        )

        self.assertIn('17:17:17', advice['content'])
        self.assertIn('NPK', advice['content'])


class AdvisoryChatAPITests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username='+256700000009',
            phone_number='+256700000009',
            password='StrongPass123!',
            first_name='Advisor',
            last_name='Tester',
        )
        self.client.force_authenticate(self.user)

    @override_settings(OPENAI_API_KEY='')
    def test_chat_uses_profile_context_and_saves_both_messages(self):
        response = self.client.post(
            reverse('chat-new'),
            {
                'content': 'When should I plant maize?',
                'crop_type': 'Beans, Maize',
                'location': 'Gulu',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = AdvisorySession.objects.get(id=response.data['session_id'])
        self.assertEqual(session.crop_type, 'Beans, Maize')
        self.assertEqual(session.location, 'Gulu')
        self.assertEqual(session.messages.count(), 2)
        self.assertEqual(response.data['user_message']['content'], 'When should I plant maize?')
        self.assertIn('March-April', response.data['ai_message']['content'])

    def test_chat_rejects_blank_messages(self):
        response = self.client.post(
            reverse('chat-new'),
            {'content': '   '},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AdvisorySession.objects.count(), 0)

    def test_create_session_then_send_first_message_sets_session_title(self):
        created = self.client.post(
            reverse('session-list'),
            {
                'title': 'New conversation',
                'crop_type': 'Maize, Beans',
                'location': 'Gulu',
            },
            format='json',
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        response = self.client.post(
            reverse('chat-continue', kwargs={'session_id': created.data['id']}),
            {'content': 'How do I prevent fall armyworm?'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = AdvisorySession.objects.get(id=created.data['id'])
        self.assertEqual(session.title, 'How do I prevent fall armyworm?')
        self.assertEqual(session.crop_type, 'Maize, Beans')
        self.assertEqual(session.location, 'Gulu')
        self.assertEqual(session.messages.count(), 2)

    def test_session_messages_are_private_to_the_owner(self):
        other_user = get_user_model().objects.create_user(
            username='+256700000010',
            phone_number='+256700000010',
            password='StrongPass123!',
        )
        session = AdvisorySession.objects.create(user=other_user)

        response = self.client.get(
            reverse('message-list', kwargs={'session_id': session.id}),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'], [])
