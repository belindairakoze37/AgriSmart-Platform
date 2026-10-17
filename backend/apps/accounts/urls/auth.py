from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .. import views, web_auth

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('otp/request/', views.request_otp, name='otp-request'),
    path('otp/verify/', views.verify_otp, name='otp-verify'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('web/csrf/', web_auth.csrf_token, name='web-csrf'),
    path('web/register/', web_auth.register, name='web-register'),
    path('web/login/', web_auth.login, name='web-login'),
    path('web/refresh/', web_auth.refresh, name='web-refresh'),
    path('web/logout/', web_auth.logout, name='web-logout'),
]