from django.urls import path
from .. import views

urlpatterns = [
    path('profile/', views.FarmerProfileView.as_view(), name='farmer-profile'),
    path('farms/', views.FarmListCreateView.as_view(), name='farm-list'),
    path('farms/<uuid:pk>/', views.FarmDetailView.as_view(), name='farm-detail'),
    path('crops/', views.CropListCreateView.as_view(), name='crop-list'),
    path('crops/<uuid:pk>/', views.CropDetailView.as_view(), name='crop-detail'),
]