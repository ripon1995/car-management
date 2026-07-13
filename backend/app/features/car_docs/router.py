import uuid
from datetime import date

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.car_docs.models import CarDoc
from app.features.car_docs.schemas import CarDocCreate, CarDocRead, CarDocUpdate
from app.features.car_docs.service import CarDocService, get_car_doc_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CarDocRead])
async def list_car_docs(
    car_id: uuid.UUID | None = None,
    name: str | None = None,
    expiring_before: date | None = None,
    service: CarDocService = Depends(get_car_doc_service),
) -> list[CarDoc]:
    return await service.list_all(car_id=car_id, name=name, expiring_before=expiring_before)


@router.post("", response_model=CarDocRead, status_code=status.HTTP_201_CREATED)
async def create_car_doc(
    payload: CarDocCreate, service: CarDocService = Depends(get_car_doc_service)
) -> CarDoc:
    return await service.create(payload)


@router.get("/{car_doc_id}", response_model=CarDocRead)
async def get_car_doc(
    car_doc_id: uuid.UUID, service: CarDocService = Depends(get_car_doc_service)
) -> CarDoc:
    return await service.get_by_id(car_doc_id)


@router.put("/{car_doc_id}", response_model=CarDocRead)
async def update_car_doc(
    car_doc_id: uuid.UUID,
    payload: CarDocUpdate,
    service: CarDocService = Depends(get_car_doc_service),
) -> CarDoc:
    return await service.update(car_doc_id, payload)


@router.delete("/{car_doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_car_doc(
    car_doc_id: uuid.UUID, service: CarDocService = Depends(get_car_doc_service)
) -> None:
    await service.delete(car_doc_id)
