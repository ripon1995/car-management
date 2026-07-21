import uuid
from datetime import date
from decimal import Decimal

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.db.session import get_db
from app.features.car_docs.repository import CarDocRepository
from app.features.cars.repository import CarRepository
from app.features.fuel.repository import FuelRepository
from app.features.maintenance.repository import MaintenanceRepository
from app.features.payments.models import Payment
from app.features.payments.repository import PaymentRepository
from app.features.payments.schemas import PAYMENT_TYPES, PaymentCreate, PaymentUpdate


class PaymentService:
    """Business logic for creating/managing payments."""

    def __init__(
        self,
        repository: PaymentRepository,
        car_repository: CarRepository,
        maintenance_repository: MaintenanceRepository,
        car_doc_repository: CarDocRepository,
        fuel_repository: FuelRepository,
    ) -> None:
        self.repository = repository
        self.car_repository = car_repository
        self.maintenance_repository = maintenance_repository
        self.car_doc_repository = car_doc_repository
        self.fuel_repository = fuel_repository

    async def create(self, payload: PaymentCreate) -> Payment:
        self._validate_type(payload.type)
        self._validate_amount(payload.amount)
        self._validate_associations(
            payload.type, payload.associated_maintenance, payload.associated_cardocs, payload.associated_fuel
        )
        await self._validate_references(
            payload.car_id, payload.associated_maintenance, payload.associated_cardocs, payload.associated_fuel
        )
        return await self.repository.create(**payload.model_dump())

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Payment]:
        return await self.repository.list_all(
            car_id=car_id, type=type, date_from=date_from, date_to=date_to
        )

    async def get_by_id(self, payment_id: uuid.UUID) -> Payment:
        payment = await self.repository.get_by_id(payment_id)
        if payment is None:
            raise NotFoundException(f"Payment {payment_id} not found")
        return payment

    async def update(self, payment_id: uuid.UUID, payload: PaymentUpdate) -> Payment:
        payment = await self.get_by_id(payment_id)
        updates = payload.model_dump(exclude_unset=True)

        if "type" in updates:
            self._validate_type(updates["type"])
        if "amount" in updates:
            self._validate_amount(updates["amount"])

        if any(
            field in updates
            for field in ("type", "associated_maintenance", "associated_cardocs", "associated_fuel")
        ):
            self._validate_associations(
                updates.get("type", payment.type),
                updates.get("associated_maintenance", payment.associated_maintenance),
                updates.get("associated_cardocs", payment.associated_cardocs),
                updates.get("associated_fuel", payment.associated_fuel),
            )

        if any(
            field in updates
            for field in ("car_id", "associated_maintenance", "associated_cardocs", "associated_fuel")
        ):
            await self._validate_references(
                updates.get("car_id", payment.car_id),
                updates.get("associated_maintenance", payment.associated_maintenance),
                updates.get("associated_cardocs", payment.associated_cardocs),
                updates.get("associated_fuel", payment.associated_fuel),
            )

        return await self.repository.update(payment, updates)

    async def delete(self, payment_id: uuid.UUID) -> None:
        payment = await self.get_by_id(payment_id)
        await self.repository.delete(payment)

    @staticmethod
    def _validate_type(type: str) -> None:
        if type not in PAYMENT_TYPES:
            raise ValidationException(f"type must be one of {', '.join(PAYMENT_TYPES)}")

    @staticmethod
    def _validate_amount(amount: Decimal) -> None:
        if amount < 0:
            raise ValidationException("amount must be >= 0")

    @staticmethod
    def _validate_associations(
        type: str,
        associated_maintenance: uuid.UUID | None,
        associated_cardocs: uuid.UUID | None,
        associated_fuel: uuid.UUID | None,
    ) -> None:
        if associated_maintenance is not None and type != "service":
            raise ValidationException("associated_maintenance can only be set when type is 'service'")
        if associated_cardocs is not None and type != "document":
            raise ValidationException("associated_cardocs can only be set when type is 'document'")
        if associated_fuel is not None and type != "fuel":
            raise ValidationException("associated_fuel can only be set when type is 'fuel'")

    async def _validate_references(
        self,
        car_id: uuid.UUID,
        associated_maintenance: uuid.UUID | None,
        associated_cardocs: uuid.UUID | None,
        associated_fuel: uuid.UUID | None,
    ) -> None:
        if await self.car_repository.get_by_id(car_id) is None:
            raise NotFoundException(f"Car {car_id} not found")
        if (
            associated_maintenance is not None
            and await self.maintenance_repository.get_by_id(associated_maintenance) is None
        ):
            raise NotFoundException(f"Maintenance record {associated_maintenance} not found")
        if (
            associated_cardocs is not None
            and await self.car_doc_repository.get_by_id(associated_cardocs) is None
        ):
            raise NotFoundException(f"Car doc {associated_cardocs} not found")
        if (
            associated_fuel is not None
            and await self.fuel_repository.get_by_id(associated_fuel) is None
        ):
            raise NotFoundException(f"Fuel record {associated_fuel} not found")


def get_payment_service(db: AsyncSession = Depends(get_db)) -> PaymentService:
    return PaymentService(
        PaymentRepository(db),
        CarRepository(db),
        MaintenanceRepository(db),
        CarDocRepository(db),
        FuelRepository(db),
    )
