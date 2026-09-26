from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Endpoints
    path('api/v1/auth/', include('apps.accounts.urls.auth')),
    path('api/v1/farmers/', include('apps.accounts.urls.farmers')),
    path('api/v1/markets/', include('apps.markets.urls')),
    path('api/v1/forecasts/', include('apps.forecasts.urls')),
    path('api/v1/advisory/', include('apps.advisory.urls')),
    path('api/v1/diseases/', include('apps.diseases.urls')),
    path('api/v1/marketplace/', include('apps.marketplace.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns += [path('__debug__/', include(debug_toolbar.urls))]