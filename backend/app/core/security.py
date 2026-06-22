from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import settings


def create_access_token(user_id: int, role: str, expires_delta: timedelta | None = None) -> str:
    """
    Creates a JWT access token.
    For Developer role, expires in 30 seconds if expires_delta is not provided.
    For other roles, expires in settings.ACCESS_TOKEN_EXPIRE_MINUTES (default 1 day).
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    elif role == "Developer":
        expire = datetime.now(UTC) + timedelta(seconds=30)
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"sub": str(user_id), "role": role, "exp": expire}

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decodes and validates a JWT access token.
    Returns the payload if valid, otherwise raises/returns None.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
