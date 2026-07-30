import re
import datetime
import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import Admin


def _parse_expires_in(value):
    """Parse strings like '8h', '30m', '10d', '3600s' or a plain number of seconds
    into a datetime.timedelta. Mirrors the flexibility of jsonwebtoken's `expiresIn`.
    """
    if isinstance(value, (int, float)):
        return datetime.timedelta(seconds=value)

    match = re.fullmatch(r'\s*(\d+)\s*([smhd])?\s*', str(value), flags=re.IGNORECASE)
    if not match:
        return datetime.timedelta(hours=8)

    amount = int(match.group(1))
    unit = (match.group(2) or 's').lower()
    unit_seconds = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}[unit]
    return datetime.timedelta(seconds=amount * unit_seconds)


def generate_token(admin):
    """Issue a signed JWT for the given Admin, matching the payload shape
    previously produced by the Node/Express backend (jsonwebtoken).
    """
    now = timezone.now()
    expires_delta = _parse_expires_in(settings.JWT_EXPIRES_IN)
    payload = {
        'id': str(admin.id),
        'name': admin.name,
        'email': admin.email,
        'iat': int(now.timestamp()),
        'exp': int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


class AdminUser:
    """Lightweight stand-in for Django's User model so DRF's IsAuthenticated
    permission (and request.user) works against our custom Admin model.
    """

    def __init__(self, admin):
        self.admin = admin
        self.id = str(admin.id)
        self.pk = admin.id
        self.name = admin.name
        self.email = admin.email
        self.is_authenticated = True
        self.is_anonymous = False

    def __str__(self):
        return self.email


class JWTAuthentication(authentication.BaseAuthentication):
    """DRF authentication backend that verifies a Bearer JWT issued at login,
    equivalent to the previous Express `authMiddleware`.
    """

    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token = parts[1]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Invalid or expired token.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid or expired token.')

        try:
            admin = Admin.objects.get(pk=payload.get('id'))
        except (Admin.DoesNotExist, ValueError, TypeError):
            raise exceptions.AuthenticationFailed('Invalid or expired token.')

        return (AdminUser(admin), token)

    def authenticate_header(self, request):
        # Ensures DRF responds with 401 (not 403) when auth is missing/invalid.
        return self.keyword
