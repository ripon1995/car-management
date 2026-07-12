import uuid

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.core.config import settings
from app.core.exceptions import AuthenticationException
from app.core.security import decode_access_token
from app.features.auth.models import User
from app.features.auth.service import AuthService, get_auth_service


class OAuth2Bearer(OAuth2PasswordBearer):
    """OAuth2PasswordBearer raises a bare HTTPException (missing/malformed
    Authorization header) that bypasses our AppException handler and its
    response shape. Re-raise as AuthenticationException so every auth
    failure looks the same.
    """

    async def __call__(self, request: Request) -> str:
        try:
            return await super().__call__(request)
        except HTTPException as exc:
            raise AuthenticationException(exc.detail) from exc


oauth2_scheme = OAuth2Bearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    service: AuthService = Depends(get_auth_service),
) -> User:
    try:
        user_id = decode_access_token(token)
    except JWTError as exc:
        raise AuthenticationException() from exc

    user = await service.get_by_id(uuid.UUID(user_id))
    if user is None:
        raise AuthenticationException()
    return user
