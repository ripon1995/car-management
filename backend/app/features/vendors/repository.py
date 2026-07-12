import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.vendors.models import Vendor


class VendorRepository:
    """Data access for the Vendor model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, vendor_id: uuid.UUID) -> Vendor | None:
        return await self.db.get(Vendor, vendor_id)

    async def list_all(self) -> list[Vendor]:
        result = await self.db.scalars(select(Vendor).order_by(Vendor.created_at))
        return list(result.all())

    async def create(self, **fields: Any) -> Vendor:
        vendor = Vendor(**fields)
        self.db.add(vendor)
        await self.db.commit()
        await self.db.refresh(vendor)
        return vendor

    async def update(self, vendor: Vendor, updates: dict[str, Any]) -> Vendor:
        for field, value in updates.items():
            setattr(vendor, field, value)
        await self.db.commit()
        await self.db.refresh(vendor)
        return vendor

    async def delete(self, vendor: Vendor) -> None:
        await self.db.delete(vendor)
        await self.db.commit()
