import uuid

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.car_owners.models import CarOwner
from app.features.car_owners.schemas import CarOwnerCreate, CarOwnerRead, CarOwnerUpdate
from app.features.car_owners.service import CarOwnerService, get_car_owner_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CarOwnerRead])
async def list_car_owners(
    service: CarOwnerService = Depends(get_car_owner_service),
) -> list[CarOwner]:
    return await service.list_all()


@router.post("", response_model=CarOwnerRead, status_code=status.HTTP_201_CREATED)
async def create_car_owner(
    payload: CarOwnerCreate, service: CarOwnerService = Depends(get_car_owner_service)
) -> CarOwner:
    return await service.create(payload)


@router.get("/{owner_id}", response_model=CarOwnerRead)
async def get_car_owner(
    owner_id: uuid.UUID, service: CarOwnerService = Depends(get_car_owner_service)
) -> CarOwner:
    return await service.get_by_id(owner_id)


@router.put("/{owner_id}", response_model=CarOwnerRead)
async def update_car_owner(
    owner_id: uuid.UUID,
    payload: CarOwnerUpdate,
    service: CarOwnerService = Depends(get_car_owner_service),
) -> CarOwner:
    return await service.update(owner_id, payload)


@router.delete("/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_car_owner(
    owner_id: uuid.UUID, service: CarOwnerService = Depends(get_car_owner_service)
) -> None:
    await service.delete(owner_id)
