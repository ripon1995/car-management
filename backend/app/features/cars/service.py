import uuid
from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.db.session import get_db
from app.features.car_owners.repository import CarOwnerRepository
from app.features.cars.models import Car
from app.features.cars.repository import CarRepository
from app.features.cars.schemas import CarCreate, CarUpdate
from app.features.drivers.repository import DriverRepository
from app.features.vendors.repository import VendorRepository

MIN_MODEL_YEAR = 1980


class CarService:
    """Business logic for creating/managing cars."""

    def __init__(
        self,
        repository: CarRepository,
        owner_repository: CarOwnerRepository,
        vendor_repository: VendorRepository,
        driver_repository: DriverRepository,
    ) -> None:
        self.repository = repository
        self.owner_repository = owner_repository
        self.vendor_repository = vendor_repository
        self.driver_repository = driver_repository

    async def create(self, payload: CarCreate) -> Car:
        await self._validate_model_year(payload.model_year)
        await self._validate_unique_numbers(payload.engine_number, payload.chassis_number)
        await self._validate_references(payload.owner_id, payload.vendor_id, payload.driver_id)
        return await self.repository.create(**payload.model_dump())

    async def list_all(self) -> list[Car]:
        return await self.repository.list_all()

    async def get_by_id(self, car_id: uuid.UUID) -> Car:
        car = await self.repository.get_by_id(car_id)
        if car is None:
            raise NotFoundException(f"Car {car_id} not found")
        return car

    async def update(self, car_id: uuid.UUID, payload: CarUpdate) -> Car:
        car = await self.get_by_id(car_id)
        updates = payload.model_dump(exclude_unset=True)

        if "model_year" in updates:
            await self._validate_model_year(updates["model_year"])

        engine_number = updates.get("engine_number")
        chassis_number = updates.get("chassis_number")
        if engine_number is not None or chassis_number is not None:
            await self._validate_unique_numbers(
                engine_number, chassis_number, exclude_car_id=car.id
            )

        if any(field in updates for field in ("owner_id", "vendor_id", "driver_id")):
            await self._validate_references(
                updates.get("owner_id", car.owner_id),
                updates.get("vendor_id", car.vendor_id),
                updates.get("driver_id", car.driver_id),
            )

        return await self.repository.update(car, updates)

    async def delete(self, car_id: uuid.UUID) -> None:
        car = await self.get_by_id(car_id)
        await self._check_not_referenced(car_id)
        await self.repository.delete(car)

    async def _check_not_referenced(self, car_id: uuid.UUID) -> None:
        from app.features.car_docs.models import CarDoc
        from app.features.maintenance.models import MaintenanceRecord
        from app.features.payments.models import Payment

        for model, label in (
            (MaintenanceRecord, "maintenance records"),
            (CarDoc, "car docs"),
            (Payment, "payments"),
        ):
            referenced = await self.repository.db.scalar(
                select(model.id).where(model.car_id == car_id).limit(1)
            )
            if referenced is not None:
                raise ConflictException(f"Cannot delete a car that has {label}")

    async def _validate_model_year(self, model_year: int) -> None:
        current_year = datetime.now(timezone.utc).year
        if not (MIN_MODEL_YEAR <= model_year <= current_year + 1):
            raise ValidationException(
                f"model_year must be between {MIN_MODEL_YEAR} and {current_year + 1}"
            )

    async def _validate_unique_numbers(
        self,
        engine_number: str | None,
        chassis_number: str | None,
        *,
        exclude_car_id: uuid.UUID | None = None,
    ) -> None:
        if engine_number is not None:
            existing = await self.repository.get_by_engine_number(engine_number)
            if existing is not None and existing.id != exclude_car_id:
                raise ConflictException(f"engine_number '{engine_number}' is already in use")
        if chassis_number is not None:
            existing = await self.repository.get_by_chassis_number(chassis_number)
            if existing is not None and existing.id != exclude_car_id:
                raise ConflictException(f"chassis_number '{chassis_number}' is already in use")

    async def _validate_references(
        self,
        owner_id: uuid.UUID,
        vendor_id: uuid.UUID | None,
        driver_id: uuid.UUID | None,
    ) -> None:
        if await self.owner_repository.get_by_id(owner_id) is None:
            raise NotFoundException(f"Car owner {owner_id} not found")
        if vendor_id is not None and await self.vendor_repository.get_by_id(vendor_id) is None:
            raise NotFoundException(f"Vendor {vendor_id} not found")
        if driver_id is not None and await self.driver_repository.get_by_id(driver_id) is None:
            raise NotFoundException(f"Driver {driver_id} not found")


def get_car_service(db: AsyncSession = Depends(get_db)) -> CarService:
    return CarService(
        CarRepository(db),
        CarOwnerRepository(db),
        VendorRepository(db),
        DriverRepository(db),
    )
