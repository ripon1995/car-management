import uuid

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.db.session import get_db
from app.features.cars.models import Car
from app.features.drivers.models import Driver
from app.features.drivers.repository import DriverRepository
from app.features.drivers.schemas import DriverCreate, DriverUpdate


class DriverService:
    """Business logic for creating/managing drivers."""

    def __init__(self, repository: DriverRepository) -> None:
        self.repository = repository

    async def create(self, payload: DriverCreate) -> Driver:
        return await self.repository.create(**payload.model_dump())

    async def list_all(self) -> list[Driver]:
        return await self.repository.list_all()

    async def get_by_id(self, driver_id: uuid.UUID) -> Driver:
        driver = await self.repository.get_by_id(driver_id)
        if driver is None:
            raise NotFoundException(f"Driver {driver_id} not found")
        return driver

    async def update(self, driver_id: uuid.UUID, payload: DriverUpdate) -> Driver:
        driver = await self.get_by_id(driver_id)
        updates = payload.model_dump(exclude_unset=True)
        return await self.repository.update(driver, updates)

    async def delete(self, driver_id: uuid.UUID) -> None:
        driver = await self.get_by_id(driver_id)
        assigned_cars = await self.repository.db.scalar(
            select(Car.id).where(Car.driver_id == driver_id).limit(1)
        )
        if assigned_cars is not None:
            raise ConflictException("Cannot delete a driver currently assigned to one or more cars")
        await self.repository.delete(driver)


def get_driver_service(db: AsyncSession = Depends(get_db)) -> DriverService:
    return DriverService(DriverRepository(db))
