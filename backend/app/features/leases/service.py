import uuid
from datetime import date
from decimal import Decimal

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.db.session import get_db
from app.features.car_owners.repository import CarOwnerRepository
from app.features.cars.repository import CarRepository
from app.features.leases.models import Lease
from app.features.leases.repository import LeaseRepository
from app.features.leases.schemas import DuePaymentsRead, LeaseCreate, LeaseUpdate
from app.features.payments.repository import PaymentRepository
from app.features.vendors.repository import VendorRepository


def _month_range(start: date, end: date) -> list[str]:
    if end < start:
        return []
    months = []
    cursor = date(start.year, start.month, 1)
    end_month = date(end.year, end.month, 1)
    while cursor <= end_month:
        months.append(cursor.strftime("%Y-%m"))
        cursor = date(cursor.year + 1, 1, 1) if cursor.month == 12 else date(cursor.year, cursor.month + 1, 1)
    return months


class LeaseService:
    """Business logic for creating/managing car<->vendor leases."""

    def __init__(
        self,
        repository: LeaseRepository,
        car_repository: CarRepository,
        vendor_repository: VendorRepository,
        car_owner_repository: CarOwnerRepository,
        payment_repository: PaymentRepository,
    ) -> None:
        self.repository = repository
        self.car_repository = car_repository
        self.vendor_repository = vendor_repository
        self.car_owner_repository = car_owner_repository
        self.payment_repository = payment_repository

    async def create(self, payload: LeaseCreate) -> Lease:
        self._validate_fare(payload.monthly_fare)
        self._validate_dates(payload.start_date, payload.end_date)
        await self._validate_references(payload.car_id, payload.vendor_id)
        await self._validate_no_active_lease(payload.car_id)
        return await self.repository.create(**payload.model_dump())

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        vendor_id: uuid.UUID | None = None,
        active: bool | None = None,
    ) -> list[Lease]:
        return await self.repository.list_all(car_id=car_id, vendor_id=vendor_id, active=active)

    async def get_by_id(self, lease_id: uuid.UUID) -> Lease:
        lease = await self.repository.get_by_id(lease_id)
        if lease is None:
            raise NotFoundException(f"Lease {lease_id} not found")
        return lease

    async def update(self, lease_id: uuid.UUID, payload: LeaseUpdate) -> Lease:
        lease = await self.get_by_id(lease_id)
        updates = payload.model_dump(exclude_unset=True)

        if "monthly_fare" in updates:
            self._validate_fare(updates["monthly_fare"])

        if "start_date" in updates or "end_date" in updates:
            self._validate_dates(
                updates.get("start_date", lease.start_date),
                updates.get("end_date", lease.end_date),
            )

        becomes_active = "end_date" in updates and updates["end_date"] is None
        if becomes_active and lease.end_date is not None:
            await self._validate_no_active_lease(lease.car_id, exclude_id=lease.id)

        return await self.repository.update(lease, updates)

    async def delete(self, lease_id: uuid.UUID) -> None:
        lease = await self.get_by_id(lease_id)
        from app.features.payments.models import Payment

        linked_payment = await self.repository.db.scalar(
            select(Payment.id).where(Payment.associated_lease == lease_id).limit(1)
        )
        if linked_payment is not None:
            raise ConflictException("Cannot delete a lease that has a linked payment")
        await self.repository.delete(lease)

    async def get_due_payments(self, lease_id: uuid.UUID) -> DuePaymentsRead:
        lease = await self.get_by_id(lease_id)
        from app.features.payments.models import Payment

        today = date.today()
        effective_end = min(lease.end_date, today) if lease.end_date else today
        all_months = _month_range(lease.start_date, effective_end)

        result = await self.repository.db.scalars(
            select(Payment.payment_date).where(Payment.associated_lease == lease_id)
        )
        generated_months = sorted({payment_date.strftime("%Y-%m") for payment_date in result.all()})
        due_months = [month for month in all_months if month not in generated_months]
        return DuePaymentsRead(due_months=due_months, generated_months=generated_months)

    async def generate_due_payments(self, lease_id: uuid.UUID) -> list:
        lease = await self.get_by_id(lease_id)
        due = await self.get_due_payments(lease_id)
        if not due.due_months:
            return []

        vendor = await self.vendor_repository.get_by_id(lease.vendor_id)
        car = await self.car_repository.get_by_id(lease.car_id)
        owner = await self.car_owner_repository.get_by_id(car.owner_id)

        created = []
        for month in due.due_months:
            year, month_num = (int(part) for part in month.split("-"))
            payment = await self.payment_repository.create(
                type="monthly_fair",
                car_id=lease.car_id,
                amount=lease.monthly_fare,
                payment_date=date(year, month_num, 1),
                paid_by=vendor.name,
                paid_to=owner.name,
                associated_lease=lease.id,
                status="unpaid",
            )
            created.append(payment)
        return created

    @staticmethod
    def _validate_fare(monthly_fare: Decimal) -> None:
        if monthly_fare < 0:
            raise ValidationException("monthly_fare must be >= 0")

    @staticmethod
    def _validate_dates(start_date: date, end_date: date | None) -> None:
        if end_date is not None and end_date < start_date:
            raise ValidationException("end_date must be on or after start_date")

    async def _validate_references(self, car_id: uuid.UUID, vendor_id: uuid.UUID) -> None:
        if await self.car_repository.get_by_id(car_id) is None:
            raise NotFoundException(f"Car {car_id} not found")
        if await self.vendor_repository.get_by_id(vendor_id) is None:
            raise NotFoundException(f"Vendor {vendor_id} not found")

    async def _validate_no_active_lease(
        self, car_id: uuid.UUID, *, exclude_id: uuid.UUID | None = None
    ) -> None:
        active = await self.repository.list_all(car_id=car_id, active=True)
        if any(lease.id != exclude_id for lease in active):
            raise ConflictException(
                "Car already has an active lease; end it before starting a new one"
            )


def get_lease_service(db: AsyncSession = Depends(get_db)) -> LeaseService:
    return LeaseService(
        LeaseRepository(db),
        CarRepository(db),
        VendorRepository(db),
        CarOwnerRepository(db),
        PaymentRepository(db),
    )
