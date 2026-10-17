from .base import *

from decouple import config

DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1',
    cast=lambda value: [host.strip() for host in value.split(',') if host.strip()],
)

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
] + WEB_APP_ORIGINS
CORS_ALLOW_ALL_ORIGINS = config(
    'CORS_ALLOW_ALL_ORIGINS',
    default=False,
    cast=bool,
)
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
] + WEB_APP_ORIGINS

if config('ENABLE_DEBUG_TOOLBAR', default=False, cast=bool):
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
    INTERNAL_IPS = ['127.0.0.1', 'localhost']
