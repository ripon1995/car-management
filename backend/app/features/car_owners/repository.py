import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.car_owners.models import CarOwner


class CarOwnerRepository:
    """Data access for the CarOwner model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, owner_id: uuid.UUID) -> CarOwner | None:
        return await self.db.get(CarOwner, owner_id)

    async def list_all(self) -> list[CarOwner]:
        result = await self.db.scalars(select(CarOwner).order_by(CarOwner.created_at))
        return list(result.all())

    async def create(self, *, name: str, phone_number: str) -> CarOwner:
        owner = CarOwner(name=name, phone_number=phone_number)
        self.db.add(owner)
        await self.db.commit()
        await self.db.refresh(owner)
        return owner

    async def update(self, owner: CarOwner, updates: dict[str, Any]) -> CarOwner:
        for field, value in updates.items():
            setattr(owner, field, value)
        await self.db.commit()
        await self.db.refresh(owner)
        return owner

    async def delete(self, owner: CarOwner) -> None:
        await self.db.delete(owner)
        await self.db.commit()
