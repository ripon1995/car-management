import uuid

from sqlalchemy import select

from app.core.exceptions import ConflictException, NotFoundException
from app.features.leases.models import Lease
from app.features.vendors.models import Vendor
from app.features.vendors.repository import VendorRepository
from app.features.vendors.schemas import VendorCreate, VendorUpdate


class VendorService:
    """Business logic for creating/managing vendors."""

    def __init__(self, repository: VendorRepository) -> None:
        self.repository = repository

    async def create(self, payload: VendorCreate) -> Vendor:
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
        return await self.repository.update(vendor, updates)

    async def delete(self, vendor_id: uuid.UUID) -> None:
        vendor = await self.get_by_id(vendor_id)
        referenced = await self.repository.db.scalar(
            select(Lease.id).where(Lease.vendor_id == vendor_id).limit(1)
        )
        if referenced is not None:
            raise ConflictException("Cannot delete a vendor referenced by one or more leases")
        await self.repository.delete(vendor)
