import uuid
from datetime import date

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.fuel.models import FuelRecord
from app.features.fuel.schemas import FuelCreate, FuelRead, FuelUpdate
from app.features.fuel.service import FuelService, get_fuel_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[FuelRead])
async def list_fuel_records(
    car_id: uuid.UUID | None = None,
    fuel_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    service: FuelService = Depends(get_fuel_service),
) -> list[FuelRecord]:
    return await service.list_all(car_id=car_id, fuel_type=fuel_type, date_from=date_from, date_to=date_to)


@router.post("", response_model=FuelRead, status_code=status.HTTP_201_CREATED)
async def create_fuel_record(
    payload: FuelCreate, service: FuelService = Depends(get_fuel_service)
) -> FuelRecord:
    return await service.create(payload)


@router.get("/{fuel_id}", response_model=FuelRead)
async def get_fuel_record(
    fuel_id: uuid.UUID, service: FuelService = Depends(get_fuel_service)
) -> FuelRecord:
    return await service.get_by_id(fuel_id)


@router.put("/{fuel_id}", response_model=FuelRead)
async def update_fuel_record(
    fuel_id: uuid.UUID,
    payload: FuelUpdate,
    service: FuelService = Depends(get_fuel_service),
) -> FuelRecord:
    return await service.update(fuel_id, payload)


@router.delete("/{fuel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fuel_record(
    fuel_id: uuid.UUID, service: FuelService = Depends(get_fuel_service)
) -> None:
    await service.delete(fuel_id)
