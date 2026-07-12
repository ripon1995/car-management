import uuid

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.drivers.models import Driver
from app.features.drivers.schemas import DriverCreate, DriverRead, DriverUpdate
from app.features.drivers.service import DriverService, get_driver_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[DriverRead])
async def list_drivers(
    service: DriverService = Depends(get_driver_service),
) -> list[Driver]:
    return await service.list_all()


@router.post("", response_model=DriverRead, status_code=status.HTTP_201_CREATED)
async def create_driver(
    payload: DriverCreate, service: DriverService = Depends(get_driver_service)
) -> Driver:
    return await service.create(payload)


@router.get("/{driver_id}", response_model=DriverRead)
async def get_driver(
    driver_id: uuid.UUID, service: DriverService = Depends(get_driver_service)
) -> Driver:
    return await service.get_by_id(driver_id)


@router.put("/{driver_id}", response_model=DriverRead)
async def update_driver(
    driver_id: uuid.UUID,
    payload: DriverUpdate,
    service: DriverService = Depends(get_driver_service),
) -> Driver:
    return await service.update(driver_id, payload)


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_driver(
    driver_id: uuid.UUID, service: DriverService = Depends(get_driver_service)
) -> None:
    await service.delete(driver_id)
