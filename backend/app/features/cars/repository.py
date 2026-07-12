import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.cars.models import Car


class CarRepository:
    """Data access for the Car model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, car_id: uuid.UUID) -> Car | None:
        return await self.db.get(Car, car_id)

    async def get_by_engine_number(self, engine_number: str) -> Car | None:
        return await self.db.scalar(select(Car).where(Car.engine_number == engine_number))

    async def get_by_chassis_number(self, chassis_number: str) -> Car | None:
        return await self.db.scalar(select(Car).where(Car.chassis_number == chassis_number))

    async def list_all(self) -> list[Car]:
        result = await self.db.scalars(select(Car).order_by(Car.created_at))
        return list(result.all())

    async def create(self, **fields: Any) -> Car:
        car = Car(**fields)
        self.db.add(car)
        await self.db.commit()
        await self.db.refresh(car)
        return car

    async def update(self, car: Car, updates: dict[str, Any]) -> Car:
        for field, value in updates.items():
            setattr(car, field, value)
        await self.db.commit()
        await self.db.refresh(car)
        return car

    async def delete(self, car: Car) -> None:
        await self.db.delete(car)
        await self.db.commit()
