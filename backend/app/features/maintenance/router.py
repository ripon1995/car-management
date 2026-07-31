import uuid
from datetime import date

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.maintenance.models import MaintenanceRecord
from app.features.maintenance.schemas import MaintenanceCreate, MaintenanceRead, MaintenanceUpdate
from app.features.maintenance.service import MaintenanceService, get_maintenance_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[MaintenanceRead])
async def list_maintenance(
    car_id: uuid.UUID | None = None,
    type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    service: MaintenanceService = Depends(get_maintenance_service),
) -> list[MaintenanceRecord]:
    return await service.list_all(car_id=car_id, type=type, date_from=date_from, date_to=date_to)


@router.post("", response_model=MaintenanceRead, status_code=status.HTTP_201_CREATED)
async def create_maintenance(
    payload: MaintenanceCreate, service: MaintenanceService = Depends(get_maintenance_service)
) -> MaintenanceRecord:
    return await service.create(payload)


@router.get("/{maintenance_id}", response_model=MaintenanceRead)
async def get_maintenance(
    maintenance_id: uuid.UUID, service: MaintenanceService = Depends(get_maintenance_service)
) -> MaintenanceRecord:
    return await service.get_by_id(maintenance_id)


@router.put("/{maintenance_id}", response_model=MaintenanceRead)
async def update_maintenance(
    maintenance_id: uuid.UUID,
    payload: MaintenanceUpdate,
    service: MaintenanceService = Depends(get_maintenance_service),
) -> MaintenanceRecord:
    return await service.update(maintenance_id, payload)


@router.delete("/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance(
    maintenance_id: uuid.UUID, service: MaintenanceService = Depends(get_maintenance_service)
) -> None:
    await service.delete(maintenance_id)
