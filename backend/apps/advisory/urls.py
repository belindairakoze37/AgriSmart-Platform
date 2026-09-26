from django.urls import path
from . import views

urlpatterns = [
    path('sessions/', views.SessionListCreateView.as_view(), name='session-list'),
    path('sessions/<uuid:pk>/', views.SessionDetailView.as_view(), name='session-detail'),
    path('sessions/<uuid:session_id>/messages/', views.MessageListView.as_view(), name='message-list'),
    path('chat/', views.send_message, name='chat-new'),
    path('chat/<uuid:session_id>/', views.send_message, name='chat-continue'),
]