import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.leases.models import Lease


class LeaseRepository:
    """Data access for the Lease model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, lease_id: uuid.UUID) -> Lease | None:
        return await self.db.get(Lease, lease_id)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        vendor_id: uuid.UUID | None = None,
        active: bool | None = None,
    ) -> list[Lease]:
        query = select(Lease).order_by(Lease.start_date)
        if car_id is not None:
            query = query.where(Lease.car_id == car_id)
        if vendor_id is not None:
            query = query.where(Lease.vendor_id == vendor_id)
        if active is True:
            query = query.where(Lease.end_date.is_(None))
        elif active is False:
            query = query.where(Lease.end_date.is_not(None))
        result = await self.db.scalars(query)
        return list(result.all())

    async def create(self, **fields: Any) -> Lease:
        lease = Lease(**fields)
        self.db.add(lease)
        await self.db.commit()
        await self.db.refresh(lease)
        return lease

    async def update(self, lease: Lease, updates: dict[str, Any]) -> Lease:
        for field, value in updates.items():
            setattr(lease, field, value)
        await self.db.commit()
        await self.db.refresh(lease)
        return lease

    async def delete(self, lease: Lease) -> None:
        await self.db.delete(lease)
        await self.db.commit()
