from datetime import timedelta
from functools import wraps

from django.conf import settings
from django.http import HttpResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .views import User, get_tokens_for_user

REFRESH_COOKIE_NAME = 'agrismart_refresh'
REFRESH_COOKIE_PATH = '/api/v1/auth/web/'


@csrf_protect
def _csrf_check(request):
    return HttpResponse(status=204)


def csrf_protected_view(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        response = _csrf_check(request._request)
        if response.status_code == status.HTTP_403_FORBIDDEN:
            raise PermissionDenied('CSRF verification failed.')
        return view(request, *args, **kwargs)

    return wrapped


def _set_refresh_cookie(response, refresh):
    lifetime = settings.SIMPLE_JWT.get(
        'REFRESH_TOKEN_LIFETIME',
        timedelta(days=30),
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh,
        max_age=int(lifetime.total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        samesite='Lax',
    )


def _session_response(user, status_code=status.HTTP_200_OK):
    tokens = get_tokens_for_user(user)
    response = Response(
        {
            'user': UserSerializer(user).data,
            'access': tokens['access'],
        },
        status=status_code,
    )
    _set_refresh_cookie(response, tokens['refresh'])
    return response


@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def csrf_token(request):
    return Response({'csrfToken': get_token(request)})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@csrf_protected_view
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return _session_response(serializer.save(), status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@csrf_protected_view
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = User.objects.filter(
        phone_number=serializer.validated_data['phone_number'],
    ).first()
    if (
        not user
        or not user.check_password(serializer.validated_data['password'])
        or not user.is_active
    ):
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return _session_response(user)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@csrf_protected_view
def refresh(request):
    refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        response = Response(
            {'error': 'Browser session expired. Please sign in again.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
        _clear_refresh_cookie(response)
        return response

    serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
    try:
        serializer.is_valid(raise_exception=True)
    except TokenError:
        response = Response(
            {'error': 'Browser session expired. Please sign in again.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
        _clear_refresh_cookie(response)
        return response
    except ValidationError:
        response = Response(
            {'error': 'Browser session expired. Please sign in again.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
        _clear_refresh_cookie(response)
        return response

    response = Response({'access': serializer.validated_data['access']})
    rotated_refresh = serializer.validated_data.get('refresh')
    if rotated_refresh:
        _set_refresh_cookie(response, rotated_refresh)
    return response


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@csrf_protected_view
def logout(request):
    refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass
    response = Response(status=status.HTTP_204_NO_CONTENT)
    _clear_refresh_cookie(response)
    return response
