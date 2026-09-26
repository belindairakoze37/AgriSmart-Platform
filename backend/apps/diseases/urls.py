from django.urls import path
from . import views

urlpatterns = [
    path('', views.DetectionListView.as_view(), name='detection-list'),
    path('<uuid:pk>/', views.DetectionDetailView.as_view(), name='detection-detail'),
    path('detect/', views.detect_disease, name='detect-disease'),
]