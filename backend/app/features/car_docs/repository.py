import uuid
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.car_docs.models import CarDoc


class CarDocRepository:
    """Data access for the CarDoc model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, car_doc_id: uuid.UUID) -> CarDoc | None:
        return await self.db.get(CarDoc, car_doc_id)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        name: str | None = None,
        expiring_before: date | None = None,
    ) -> list[CarDoc]:
        query = select(CarDoc).order_by(CarDoc.created_at)
        if car_id is not None:
            query = query.where(CarDoc.car_id == car_id)
        if name is not None:
            query = query.where(CarDoc.name == name)
        if expiring_before is not None:
            query = query.where(CarDoc.expiry_date < expiring_before)
        result = await self.db.scalars(query)
        return list(result.all())

    async def create(self, **fields: Any) -> CarDoc:
        car_doc = CarDoc(**fields)
        self.db.add(car_doc)
        await self.db.commit()
        await self.db.refresh(car_doc)
        return car_doc

    async def update(self, car_doc: CarDoc, updates: dict[str, Any]) -> CarDoc:
        for field, value in updates.items():
            setattr(car_doc, field, value)
        await self.db.commit()
        await self.db.refresh(car_doc)
        return car_doc

    async def delete(self, car_doc: CarDoc) -> None:
        await self.db.delete(car_doc)
        await self.db.commit()
