from fastapi import APIRouter

from app.features.auth.router import router as auth_router
from app.features.car_owners.router import router as car_owners_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(car_owners_router, prefix="/car-owners", tags=["car-owners"])
