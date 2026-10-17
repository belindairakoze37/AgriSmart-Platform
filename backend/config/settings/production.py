from .base import *

from decouple import config

DEBUG = False
SECRET_KEY = config('SECRET_KEY')
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='api.agrismart.ug,agrismart.ug',
    cast=lambda value: [host.strip() for host in value.split(',') if host.strip()],
)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='agrismart'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

API_CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='https://app.agrismart.ug,https://admin.agrismart.ug',
    cast=lambda value: [origin.strip() for origin in value.split(',') if origin.strip()],
)
CORS_ALLOWED_ORIGINS = API_CORS_ALLOWED_ORIGINS + WEB_APP_ORIGINS
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
