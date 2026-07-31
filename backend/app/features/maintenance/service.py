import uuid
from datetime import date
from decimal import Decimal

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.features.cars.repository import CarRepository
from app.features.maintenance.models import MaintenanceRecord
from app.features.maintenance.repository import MaintenanceRepository
from app.features.maintenance.schemas import MAINTENANCE_TYPES, MaintenanceCreate, MaintenanceUpdate
from app.features.payments.repository import PaymentRepository


class MaintenanceService:
    """Business logic for creating/managing maintenance records."""

    def __init__(
        self,
        repository: MaintenanceRepository,
        car_repository: CarRepository,
        payment_repository: PaymentRepository,
    ) -> None:
        self.repository = repository
        self.car_repository = car_repository
        self.payment_repository = payment_repository

    async def create(self, payload: MaintenanceCreate) -> MaintenanceRecord:
        self._validate_type(payload.type)
        self._validate_cost(payload.cost)
        await self._validate_car(payload.car_id)
        record = await self.repository.create(**payload.model_dump())

        await self.payment_repository.create(
            type="service",
            car_id=record.car_id,
            associated_maintenance=record.id,
            amount=record.cost,
            payment_date=date.today(),
            paid_by="",
            paid_to="",
            status="unpaid",
            description=None,
        )
        return record

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[MaintenanceRecord]:
        return await self.repository.list_all(
            car_id=car_id, type=type, date_from=date_from, date_to=date_to
        )

    async def get_by_id(self, maintenance_id: uuid.UUID) -> MaintenanceRecord:
        record = await self.repository.get_by_id(maintenance_id)
        if record is None:
            raise NotFoundException(f"Maintenance record {maintenance_id} not found")
        return record

    async def update(self, maintenance_id: uuid.UUID, payload: MaintenanceUpdate) -> MaintenanceRecord:
        record = await self.get_by_id(maintenance_id)
        updates = payload.model_dump(exclude_unset=True)

        if "type" in updates:
            self._validate_type(updates["type"])
        if "cost" in updates:
            self._validate_cost(updates["cost"])
        if "car_id" in updates:
            await self._validate_car(updates["car_id"])

        return await self.repository.update(record, updates)

    async def delete(self, maintenance_id: uuid.UUID) -> None:
        record = await self.get_by_id(maintenance_id)
        linked = await self.payment_repository.list_by_maintenance(maintenance_id)
        if any(payment.status == "paid" for payment in linked):
            raise ConflictException(
                "Cannot delete a maintenance record that has a paid linked payment"
            )
        for payment in linked:
            await self.payment_repository.delete(payment)
        await self.repository.delete(record)

    @staticmethod
    def _validate_type(type: str) -> None:
        if type not in MAINTENANCE_TYPES:
            raise ValidationException(
                f"type must be one of {', '.join(MAINTENANCE_TYPES)}"
            )

    @staticmethod
    def _validate_cost(cost: Decimal) -> None:
        if cost < 0:
            raise ValidationException("cost must be >= 0")

    async def _validate_car(self, car_id: uuid.UUID) -> None:
        if await self.car_repository.get_by_id(car_id) is None:
            raise NotFoundException(f"Car {car_id} not found")
