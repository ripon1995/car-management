import uuid
from decimal import Decimal

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.db.session import get_db
from app.features.cars.models import Car
from app.features.vendors.models import Vendor
from app.features.vendors.repository import VendorRepository
from app.features.vendors.schemas import VendorCreate, VendorUpdate


class VendorService:
    """Business logic for creating/managing vendors."""

    def __init__(self, repository: VendorRepository) -> None:
        self.repository = repository

    async def create(self, payload: VendorCreate) -> Vendor:
        self._validate_monthly_fare(payload.monthly_fare)
        return await self.repository.create(**payload.model_dump())

    async def list_all(self) -> list[Vendor]:
        return await self.repository.list_all()

    async def get_by_id(self, vendor_id: uuid.UUID) -> Vendor:
        vendor = await self.repository.get_by_id(vendor_id)
        if vendor is None:
            raise NotFoundException(f"Vendor {vendor_id} not found")
        return vendor

    async def update(self, vendor_id: uuid.UUID, payload: VendorUpdate) -> Vendor:
        vendor = await self.get_by_id(vendor_id)
        updates = payload.model_dump(exclude_unset=True)
        if "monthly_fare" in updates:
            self._validate_monthly_fare(updates["monthly_fare"])
        return await self.repository.update(vendor, updates)

    async def delete(self, vendor_id: uuid.UUID) -> None:
        vendor = await self.get_by_id(vendor_id)
        assigned_cars = await self.repository.db.scalar(
            select(Car.id).where(Car.vendor_id == vendor_id).limit(1)
        )
        if assigned_cars is not None:
            raise ConflictException("Cannot delete a vendor currently assigned to one or more cars")
        await self.repository.delete(vendor)

    @staticmethod
    def _validate_monthly_fare(monthly_fare: Decimal) -> None:
        if monthly_fare < 0:
            raise ValidationException("monthly_fare must be >= 0")


def get_vendor_service(db: AsyncSession = Depends(get_db)) -> VendorService:
    return VendorService(VendorRepository(db))
