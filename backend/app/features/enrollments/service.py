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
from app.features.enrollments.models import Enrollment
from app.features.enrollments.repository import EnrollmentRepository
from app.features.enrollments.schemas import DuePaymentsRead, EnrollmentCreate, EnrollmentUpdate
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


class EnrollmentService:
    """Business logic for creating/managing car<->vendor enrollments."""

    def __init__(
        self,
        repository: EnrollmentRepository,
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

    async def create(self, payload: EnrollmentCreate) -> Enrollment:
        self._validate_fare(payload.monthly_fare)
        self._validate_dates(payload.start_date, payload.end_date)
        await self._validate_references(payload.car_id, payload.vendor_id)
        await self._validate_no_active_enrollment(payload.car_id)
        return await self.repository.create(**payload.model_dump())

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        vendor_id: uuid.UUID | None = None,
        active: bool | None = None,
    ) -> list[Enrollment]:
        return await self.repository.list_all(car_id=car_id, vendor_id=vendor_id, active=active)

    async def get_by_id(self, enrollment_id: uuid.UUID) -> Enrollment:
        enrollment = await self.repository.get_by_id(enrollment_id)
        if enrollment is None:
            raise NotFoundException(f"Enrollment {enrollment_id} not found")
        return enrollment

    async def update(self, enrollment_id: uuid.UUID, payload: EnrollmentUpdate) -> Enrollment:
        enrollment = await self.get_by_id(enrollment_id)
        updates = payload.model_dump(exclude_unset=True)

        if "monthly_fare" in updates:
            self._validate_fare(updates["monthly_fare"])

        if "start_date" in updates or "end_date" in updates:
            self._validate_dates(
                updates.get("start_date", enrollment.start_date),
                updates.get("end_date", enrollment.end_date),
            )

        becomes_active = "end_date" in updates and updates["end_date"] is None
        if becomes_active and enrollment.end_date is not None:
            await self._validate_no_active_enrollment(enrollment.car_id, exclude_id=enrollment.id)

        return await self.repository.update(enrollment, updates)

    async def delete(self, enrollment_id: uuid.UUID) -> None:
        enrollment = await self.get_by_id(enrollment_id)
        from app.features.payments.models import Payment

        linked_payment = await self.repository.db.scalar(
            select(Payment.id).where(Payment.associated_enrollment == enrollment_id).limit(1)
        )
        if linked_payment is not None:
            raise ConflictException("Cannot delete an enrollment that has a linked payment")
        await self.repository.delete(enrollment)

    async def get_due_payments(self, enrollment_id: uuid.UUID) -> DuePaymentsRead:
        enrollment = await self.get_by_id(enrollment_id)
        from app.features.payments.models import Payment

        today = date.today()
        effective_end = min(enrollment.end_date, today) if enrollment.end_date else today
        all_months = _month_range(enrollment.start_date, effective_end)

        result = await self.repository.db.scalars(
            select(Payment.payment_date).where(Payment.associated_enrollment == enrollment_id)
        )
        generated_months = sorted({payment_date.strftime("%Y-%m") for payment_date in result.all()})
        due_months = [month for month in all_months if month not in generated_months]
        return DuePaymentsRead(due_months=due_months, generated_months=generated_months)

    async def generate_due_payments(self, enrollment_id: uuid.UUID) -> list:
        enrollment = await self.get_by_id(enrollment_id)
        due = await self.get_due_payments(enrollment_id)
        if not due.due_months:
            return []

        vendor = await self.vendor_repository.get_by_id(enrollment.vendor_id)
        car = await self.car_repository.get_by_id(enrollment.car_id)
        owner = await self.car_owner_repository.get_by_id(car.owner_id)

        created = []
        for month in due.due_months:
            year, month_num = (int(part) for part in month.split("-"))
            payment = await self.payment_repository.create(
                type="monthly_fair",
                car_id=enrollment.car_id,
                amount=enrollment.monthly_fare,
                payment_date=date(year, month_num, 1),
                paid_by=vendor.name,
                paid_to=owner.name,
                associated_enrollment=enrollment.id,
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

    async def _validate_no_active_enrollment(
        self, car_id: uuid.UUID, *, exclude_id: uuid.UUID | None = None
    ) -> None:
        active = await self.repository.list_all(car_id=car_id, active=True)
        if any(enrollment.id != exclude_id for enrollment in active):
            raise ConflictException(
                "Car already has an active enrollment; end it before starting a new one"
            )


def get_enrollment_service(db: AsyncSession = Depends(get_db)) -> EnrollmentService:
    return EnrollmentService(
        EnrollmentRepository(db),
        CarRepository(db),
        VendorRepository(db),
        CarOwnerRepository(db),
        PaymentRepository(db),
    )
