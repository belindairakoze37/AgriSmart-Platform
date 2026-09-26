from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .. import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('otp/request/', views.request_otp, name='otp-request'),
    path('otp/verify/', views.verify_otp, name='otp-verify'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
]