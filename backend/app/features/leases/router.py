import uuid

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.leases.models import Lease
from app.features.leases.schemas import (
    DuePaymentsRead,
    LeaseCreate,
    LeaseRead,
    LeaseUpdate,
)
from app.features.leases.service import LeaseService, get_lease_service
from app.features.payments.models import Payment
from app.features.payments.schemas import PaymentRead

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[LeaseRead])
async def list_leases(
    car_id: uuid.UUID | None = None,
    vendor_id: uuid.UUID | None = None,
    active: bool | None = None,
    service: LeaseService = Depends(get_lease_service),
) -> list[Lease]:
    return await service.list_all(car_id=car_id, vendor_id=vendor_id, active=active)


@router.post("", response_model=LeaseRead, status_code=status.HTTP_201_CREATED)
async def create_lease(
    payload: LeaseCreate, service: LeaseService = Depends(get_lease_service)
) -> Lease:
    return await service.create(payload)


@router.get("/{lease_id}", response_model=LeaseRead)
async def get_lease(
    lease_id: uuid.UUID, service: LeaseService = Depends(get_lease_service)
) -> Lease:
    return await service.get_by_id(lease_id)


@router.put("/{lease_id}", response_model=LeaseRead)
async def update_lease(
    lease_id: uuid.UUID,
    payload: LeaseUpdate,
    service: LeaseService = Depends(get_lease_service),
) -> Lease:
    return await service.update(lease_id, payload)


@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lease(
    lease_id: uuid.UUID, service: LeaseService = Depends(get_lease_service)
) -> None:
    await service.delete(lease_id)


@router.get("/{lease_id}/due-payments", response_model=DuePaymentsRead)
async def get_due_payments(
    lease_id: uuid.UUID, service: LeaseService = Depends(get_lease_service)
) -> DuePaymentsRead:
    return await service.get_due_payments(lease_id)


@router.post("/{lease_id}/generate-payments", response_model=list[PaymentRead])
async def generate_due_payments(
    lease_id: uuid.UUID, service: LeaseService = Depends(get_lease_service)
) -> list[Payment]:
    return await service.generate_due_payments(lease_id)
