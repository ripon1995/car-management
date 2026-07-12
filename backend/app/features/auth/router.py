from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import create_access_token
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.auth.schemas import Token, UserCreate, UserRead
from app.features.auth.service import AuthService, get_auth_service

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate, service: AuthService = Depends(get_auth_service)
) -> User:
    return await service.register(payload)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_service),
) -> Token:
    user = await service.authenticate(form_data.username, form_data.password)
    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def read_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
