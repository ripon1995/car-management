import uuid
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.fuel.models import FuelRecord


class FuelRepository:
    """Data access for the FuelRecord model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, fuel_id: uuid.UUID) -> FuelRecord | None:
        return await self.db.get(FuelRecord, fuel_id)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        fuel_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[FuelRecord]:
        query = select(FuelRecord).order_by(FuelRecord.fuel_date)
        if car_id is not None:
            query = query.where(FuelRecord.car_id == car_id)
        if fuel_type is not None:
            query = query.where(FuelRecord.fuel_type == fuel_type)
        if date_from is not None:
            query = query.where(FuelRecord.fuel_date >= date_from)
        if date_to is not None:
            query = query.where(FuelRecord.fuel_date <= date_to)
        result = await self.db.scalars(query)
        return list(result.all())

    async def create(self, **fields: Any) -> FuelRecord:
        record = FuelRecord(**fields)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def update(self, record: FuelRecord, updates: dict[str, Any]) -> FuelRecord:
        for field, value in updates.items():
            setattr(record, field, value)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def delete(self, record: FuelRecord) -> None:
        await self.db.delete(record)
        await self.db.commit()
