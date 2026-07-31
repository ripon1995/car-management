import uuid

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_car_service
from app.features.auth.dependencies import get_current_user
from app.features.cars.models import Car
from app.features.cars.schemas import CarCreate, CarRead, CarUpdate
from app.features.cars.service import CarService

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CarRead])
async def list_cars(
    service: CarService = Depends(get_car_service),
) -> list[Car]:
    return await service.list_all()


@router.post("", response_model=CarRead, status_code=status.HTTP_201_CREATED)
async def create_car(payload: CarCreate, service: CarService = Depends(get_car_service)) -> Car:
    return await service.create(payload)


@router.get("/{car_id}", response_model=CarRead)
async def get_car(car_id: uuid.UUID, service: CarService = Depends(get_car_service)) -> Car:
    return await service.get_by_id(car_id)


@router.put("/{car_id}", response_model=CarRead)
async def update_car(
    car_id: uuid.UUID,
    payload: CarUpdate,
    service: CarService = Depends(get_car_service),
) -> Car:
    return await service.update(car_id, payload)


@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_car(car_id: uuid.UUID, service: CarService = Depends(get_car_service)) -> None:
    await service.delete(car_id)
