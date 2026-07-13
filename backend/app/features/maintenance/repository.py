import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.maintenance.models import MaintenanceRecord


class MaintenanceRepository:
    """Data access for the MaintenanceRecord model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, maintenance_id: uuid.UUID) -> MaintenanceRecord | None:
        return await self.db.get(MaintenanceRecord, maintenance_id)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        type: str | None = None,
    ) -> list[MaintenanceRecord]:
        query = select(MaintenanceRecord).order_by(MaintenanceRecord.created_at)
        if car_id is not None:
            query = query.where(MaintenanceRecord.car_id == car_id)
        if type is not None:
            query = query.where(MaintenanceRecord.type == type)
        result = await self.db.scalars(query)
        return list(result.all())

    async def create(self, **fields: Any) -> MaintenanceRecord:
        record = MaintenanceRecord(**fields)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def update(self, record: MaintenanceRecord, updates: dict[str, Any]) -> MaintenanceRecord:
        for field, value in updates.items():
            setattr(record, field, value)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def delete(self, record: MaintenanceRecord) -> None:
        await self.db.delete(record)
        await self.db.commit()
