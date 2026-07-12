import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.drivers.models import Driver


class DriverRepository:
    """Data access for the Driver model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, driver_id: uuid.UUID) -> Driver | None:
        return await self.db.get(Driver, driver_id)

    async def list_all(self) -> list[Driver]:
        result = await self.db.scalars(select(Driver).order_by(Driver.created_at))
        return list(result.all())

    async def create(self, **fields: Any) -> Driver:
        driver = Driver(**fields)
        self.db.add(driver)
        await self.db.commit()
        await self.db.refresh(driver)
        return driver

    async def update(self, driver: Driver, updates: dict[str, Any]) -> Driver:
        for field, value in updates.items():
            setattr(driver, field, value)
        await self.db.commit()
        await self.db.refresh(driver)
        return driver

    async def delete(self, driver: Driver) -> None:
        await self.db.delete(driver)
        await self.db.commit()
