import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.enrollments.models import Enrollment


class EnrollmentRepository:
    """Data access for the Enrollment model. No business rules belong above this layer."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, enrollment_id: uuid.UUID) -> Enrollment | None:
        return await self.db.get(Enrollment, enrollment_id)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        vendor_id: uuid.UUID | None = None,
        active: bool | None = None,
    ) -> list[Enrollment]:
        query = select(Enrollment).order_by(Enrollment.start_date)
        if car_id is not None:
            query = query.where(Enrollment.car_id == car_id)
        if vendor_id is not None:
            query = query.where(Enrollment.vendor_id == vendor_id)
        if active is True:
            query = query.where(Enrollment.end_date.is_(None))
        elif active is False:
            query = query.where(Enrollment.end_date.is_not(None))
        result = await self.db.scalars(query)
        return list(result.all())

    async def create(self, **fields: Any) -> Enrollment:
        enrollment = Enrollment(**fields)
        self.db.add(enrollment)
        await self.db.commit()
        await self.db.refresh(enrollment)
        return enrollment

    async def update(self, enrollment: Enrollment, updates: dict[str, Any]) -> Enrollment:
        for field, value in updates.items():
            setattr(enrollment, field, value)
        await self.db.commit()
        await self.db.refresh(enrollment)
        return enrollment

    async def delete(self, enrollment: Enrollment) -> None:
        await self.db.delete(enrollment)
        await self.db.commit()
