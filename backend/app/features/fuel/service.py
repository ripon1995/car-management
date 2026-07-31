import uuid
from datetime import date
from decimal import Decimal

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.features.cars.repository import CarRepository
from app.features.fuel.models import FuelRecord
from app.features.fuel.repository import FuelRepository
from app.features.fuel.schemas import FUEL_TYPES, FuelCreate, FuelUpdate
from app.features.payments.repository import PaymentRepository


class FuelService:
    """Business logic for creating/managing fuel records."""

    def __init__(
        self,
        repository: FuelRepository,
        car_repository: CarRepository,
        payment_repository: PaymentRepository,
    ) -> None:
        self.repository = repository
        self.car_repository = car_repository
        self.payment_repository = payment_repository

    async def create(self, payload: FuelCreate) -> FuelRecord:
        self._validate_fuel_type(payload.fuel_type)
        self._validate_quantity(payload.quantity_liters)
        self._validate_cost(payload.cost)
        self._validate_odometer(payload.odometer_reading)
        await self._validate_car(payload.car_id)
        record = await self.repository.create(**payload.model_dump())

        await self.payment_repository.create(
            type="fuel",
            car_id=record.car_id,
            associated_fuel=record.id,
            amount=record.cost,
            payment_date=record.fuel_date,
            paid_by="",
            paid_to="",
            status="unpaid",
            description=None,
        )
        return record

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        fuel_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[FuelRecord]:
        return await self.repository.list_all(
            car_id=car_id, fuel_type=fuel_type, date_from=date_from, date_to=date_to
        )

    async def get_by_id(self, fuel_id: uuid.UUID) -> FuelRecord:
        record = await self.repository.get_by_id(fuel_id)
        if record is None:
            raise NotFoundException(f"Fuel record {fuel_id} not found")
        return record

    async def update(self, fuel_id: uuid.UUID, payload: FuelUpdate) -> FuelRecord:
        record = await self.get_by_id(fuel_id)
        updates = payload.model_dump(exclude_unset=True)

        if "fuel_type" in updates:
            self._validate_fuel_type(updates["fuel_type"])
        if "quantity_liters" in updates:
            self._validate_quantity(updates["quantity_liters"])
        if "cost" in updates:
            self._validate_cost(updates["cost"])
        if "odometer_reading" in updates:
            self._validate_odometer(updates["odometer_reading"])
        if "car_id" in updates:
            await self._validate_car(updates["car_id"])

        return await self.repository.update(record, updates)

    async def delete(self, fuel_id: uuid.UUID) -> None:
        record = await self.get_by_id(fuel_id)
        linked = await self.payment_repository.list_by_fuel(fuel_id)
        if any(payment.status == "paid" for payment in linked):
            raise ConflictException("Cannot delete a fuel record that has a paid linked payment")
        for payment in linked:
            await self.payment_repository.delete(payment)
        await self.repository.delete(record)

    @staticmethod
    def _validate_fuel_type(fuel_type: str) -> None:
        if fuel_type not in FUEL_TYPES:
            raise ValidationException(f"fuel_type must be one of {', '.join(FUEL_TYPES)}")

    @staticmethod
    def _validate_quantity(quantity_liters: Decimal) -> None:
        if quantity_liters < 0:
            raise ValidationException("quantity_liters must be >= 0")

    @staticmethod
    def _validate_cost(cost: Decimal) -> None:
        if cost < 0:
            raise ValidationException("cost must be >= 0")

    @staticmethod
    def _validate_odometer(odometer_reading: Decimal | None) -> None:
        if odometer_reading is not None and odometer_reading < 0:
            raise ValidationException("odometer_reading must be >= 0")

    async def _validate_car(self, car_id: uuid.UUID) -> None:
        if await self.car_repository.get_by_id(car_id) is None:
            raise NotFoundException(f"Car {car_id} not found")
