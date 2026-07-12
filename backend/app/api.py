from fastapi import APIRouter

from app.features.auth.router import router as auth_router
from app.features.car_owners.router import router as car_owners_router
from app.features.cars.router import router as cars_router
from app.features.drivers.router import router as drivers_router
from app.features.vendors.router import router as vendors_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(car_owners_router, prefix="/car-owners", tags=["car-owners"])
api_router.include_router(vendors_router, prefix="/vendors", tags=["vendors"])
api_router.include_router(drivers_router, prefix="/drivers", tags=["drivers"])
api_router.include_router(cars_router, prefix="/cars", tags=["cars"])
