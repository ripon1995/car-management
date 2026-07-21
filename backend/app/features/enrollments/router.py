import uuid

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.enrollments.models import Enrollment
from app.features.enrollments.schemas import (
    DuePaymentsRead,
    EnrollmentCreate,
    EnrollmentRead,
    EnrollmentUpdate,
)
from app.features.enrollments.service import EnrollmentService, get_enrollment_service
from app.features.payments.models import Payment
from app.features.payments.schemas import PaymentRead

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[EnrollmentRead])
async def list_enrollments(
    car_id: uuid.UUID | None = None,
    vendor_id: uuid.UUID | None = None,
    active: bool | None = None,
    service: EnrollmentService = Depends(get_enrollment_service),
) -> list[Enrollment]:
    return await service.list_all(car_id=car_id, vendor_id=vendor_id, active=active)


@router.post("", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
async def create_enrollment(
    payload: EnrollmentCreate, service: EnrollmentService = Depends(get_enrollment_service)
) -> Enrollment:
    return await service.create(payload)


@router.get("/{enrollment_id}", response_model=EnrollmentRead)
async def get_enrollment(
    enrollment_id: uuid.UUID, service: EnrollmentService = Depends(get_enrollment_service)
) -> Enrollment:
    return await service.get_by_id(enrollment_id)


@router.put("/{enrollment_id}", response_model=EnrollmentRead)
async def update_enrollment(
    enrollment_id: uuid.UUID,
    payload: EnrollmentUpdate,
    service: EnrollmentService = Depends(get_enrollment_service),
) -> Enrollment:
    return await service.update(enrollment_id, payload)


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_enrollment(
    enrollment_id: uuid.UUID, service: EnrollmentService = Depends(get_enrollment_service)
) -> None:
    await service.delete(enrollment_id)


@router.get("/{enrollment_id}/due-payments", response_model=DuePaymentsRead)
async def get_due_payments(
    enrollment_id: uuid.UUID, service: EnrollmentService = Depends(get_enrollment_service)
) -> DuePaymentsRead:
    return await service.get_due_payments(enrollment_id)


@router.post("/{enrollment_id}/generate-payments", response_model=list[PaymentRead])
async def generate_due_payments(
    enrollment_id: uuid.UUID, service: EnrollmentService = Depends(get_enrollment_service)
) -> list[Payment]:
    return await service.generate_due_payments(enrollment_id)
