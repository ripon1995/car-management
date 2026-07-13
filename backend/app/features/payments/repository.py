import uuid
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.payments.models import Payment


class PaymentRepository:
    """Data access for the Payment model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, payment_id: uuid.UUID) -> Payment | None:
        return await self.db.get(Payment, payment_id)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Payment]:
        query = select(Payment).order_by(Payment.payment_date)
        if car_id is not None:
            query = query.where(Payment.car_id == car_id)
        if type is not None:
            query = query.where(Payment.type == type)
        if date_from is not None:
            query = query.where(Payment.payment_date >= date_from)
        if date_to is not None:
            query = query.where(Payment.payment_date <= date_to)
        result = await self.db.scalars(query)
        return list(result.all())

    async def create(self, **fields: Any) -> Payment:
        payment = Payment(**fields)
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def update(self, payment: Payment, updates: dict[str, Any]) -> Payment:
        for field, value in updates.items():
            setattr(payment, field, value)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def delete(self, payment: Payment) -> None:
        await self.db.delete(payment)
        await self.db.commit()
