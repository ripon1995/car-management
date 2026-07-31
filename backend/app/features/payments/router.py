import uuid
from datetime import date

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import get_current_user
from app.features.payments.models import Payment
from app.features.payments.schemas import PaymentCreate, PaymentRead, PaymentUpdate
from app.features.payments.service import PaymentService, get_payment_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[PaymentRead])
async def list_payments(
    car_id: uuid.UUID | None = None,
    type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    service: PaymentService = Depends(get_payment_service),
) -> list[Payment]:
    return await service.list_all(
        car_id=car_id, type=type, date_from=date_from, date_to=date_to, status=status
    )


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: PaymentCreate, service: PaymentService = Depends(get_payment_service)
) -> Payment:
    return await service.create(payload)


@router.get("/{payment_id}", response_model=PaymentRead)
async def get_payment(
    payment_id: uuid.UUID, service: PaymentService = Depends(get_payment_service)
) -> Payment:
    return await service.get_by_id(payment_id)


@router.put("/{payment_id}", response_model=PaymentRead)
async def update_payment(
    payment_id: uuid.UUID,
    payload: PaymentUpdate,
    service: PaymentService = Depends(get_payment_service),
) -> Payment:
    return await service.update(payment_id, payload)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: uuid.UUID, service: PaymentService = Depends(get_payment_service)
) -> None:
    await service.delete(payment_id)
