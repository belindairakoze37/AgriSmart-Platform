from django.urls import path

from . import views

urlpatterns = [
    path('', views.NotificationListCreateView.as_view(), name='notification-list'),
    path('unread/', views.UnreadNotificationsView.as_view(), name='notification-unread'),
    path('mark-all-read/', views.mark_all_read, name='notification-mark-all-read'),
    path('<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
]