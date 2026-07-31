import uuid
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.income.models import Income


class IncomeRepository:
    """Data access for the Income model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, income_id: uuid.UUID) -> Income | None:
        return await self.db.get(Income, income_id)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        lease_id: uuid.UUID | None = None,
        status: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Income]:
        query = select(Income).order_by(Income.payment_date)
        if car_id is not None:
            query = query.where(Income.car_id == car_id)
        if lease_id is not None:
            query = query.where(Income.lease_id == lease_id)
        if status is not None:
            query = query.where(Income.status == status)
        if date_from is not None:
            query = query.where(Income.payment_date >= date_from)
        if date_to is not None:
            query = query.where(Income.payment_date <= date_to)
        result = await self.db.scalars(query)
        return list(result.all())

    async def create(self, **fields: Any) -> Income:
        income = Income(**fields)
        self.db.add(income)
        await self.db.commit()
        await self.db.refresh(income)
        return income

    async def update(self, income: Income, updates: dict[str, Any]) -> Income:
        for field, value in updates.items():
            setattr(income, field, value)
        await self.db.commit()
        await self.db.refresh(income)
        return income

    async def delete(self, income: Income) -> None:
        await self.db.delete(income)
        await self.db.commit()
