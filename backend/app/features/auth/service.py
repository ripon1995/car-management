import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationException, ConflictException
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.features.auth.models import User
from app.features.auth.repository import UserRepository
from app.features.auth.schemas import UserCreate


class AuthService:
    """Business logic for registration, login, and session lookup."""

    def __init__(self, repository: UserRepository) -> None:
        self.repository = repository

    async def register(self, payload: UserCreate) -> User:
        if await self.repository.get_by_email(payload.email) is not None:
            raise ConflictException("Email already registered")

        return await self.repository.create(
            email=payload.email,
            password_hash=hash_password(payload.password),
        )

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.repository.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise AuthenticationException("Incorrect email or password")
        return user

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.repository.get_by_id(user_id)


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))
