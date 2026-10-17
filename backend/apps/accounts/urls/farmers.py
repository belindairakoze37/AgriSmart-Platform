from django.urls import path
from .. import views
from ..officers import officer_dashboard, send_district_advisory
from apps.core.weather import current_weather

urlpatterns = [
    path('officers/dashboard/', officer_dashboard, name='officer-dashboard'),
    path('officers/advisories/', send_district_advisory, name='officer-advisory-send'),
    path('weather/', current_weather, name='farmer-weather'),
    path('profile/', views.FarmerProfileView.as_view(), name='farmer-profile'),
    path('farms/', views.FarmListCreateView.as_view(), name='farm-list'),
    path('farms/<uuid:pk>/', views.FarmDetailView.as_view(), name='farm-detail'),
    path('crops/', views.CropListCreateView.as_view(), name='crop-list'),
    path('crops/<uuid:pk>/', views.CropDetailView.as_view(), name='crop-detail'),
]