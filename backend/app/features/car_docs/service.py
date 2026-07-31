import uuid
from datetime import date
from decimal import Decimal

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.features.car_docs.models import CarDoc
from app.features.car_docs.repository import CarDocRepository
from app.features.car_docs.schemas import DOC_TYPES, CarDocCreate, CarDocUpdate
from app.features.cars.repository import CarRepository
from app.features.payments.repository import PaymentRepository


class CarDocService:
    """Business logic for creating/managing car docs."""

    def __init__(
        self,
        repository: CarDocRepository,
        car_repository: CarRepository,
        payment_repository: PaymentRepository,
    ) -> None:
        self.repository = repository
        self.car_repository = car_repository
        self.payment_repository = payment_repository

    async def create(self, payload: CarDocCreate) -> CarDoc:
        self._validate_doc_type(payload.doc_type)
        self._validate_cost(payload.cost)
        await self._validate_car(payload.car_id)
        car_doc = await self.repository.create(**payload.model_dump())

        await self.payment_repository.create(
            type="document",
            car_id=car_doc.car_id,
            associated_cardocs=car_doc.id,
            amount=car_doc.cost,
            payment_date=date.today(),
            paid_by="",
            paid_to="",
            status="unpaid",
            description=None,
        )
        return car_doc

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        doc_type: str | None = None,
        expiring_before: date | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[CarDoc]:
        return await self.repository.list_all(
            car_id=car_id,
            doc_type=doc_type,
            expiring_before=expiring_before,
            date_from=date_from,
            date_to=date_to,
        )

    async def get_by_id(self, car_doc_id: uuid.UUID) -> CarDoc:
        car_doc = await self.repository.get_by_id(car_doc_id)
        if car_doc is None:
            raise NotFoundException(f"Car doc {car_doc_id} not found")
        return car_doc

    async def update(self, car_doc_id: uuid.UUID, payload: CarDocUpdate) -> CarDoc:
        car_doc = await self.get_by_id(car_doc_id)
        updates = payload.model_dump(exclude_unset=True)

        if "doc_type" in updates:
            self._validate_doc_type(updates["doc_type"])
        if "cost" in updates:
            self._validate_cost(updates["cost"])
        if "car_id" in updates:
            await self._validate_car(updates["car_id"])

        return await self.repository.update(car_doc, updates)

    async def delete(self, car_doc_id: uuid.UUID) -> None:
        car_doc = await self.get_by_id(car_doc_id)
        linked = await self.payment_repository.list_by_cardoc(car_doc_id)
        if any(payment.status == "paid" for payment in linked):
            raise ConflictException("Cannot delete a car doc that has a paid linked payment")
        for payment in linked:
            await self.payment_repository.delete(payment)
        await self.repository.delete(car_doc)

    @staticmethod
    def _validate_doc_type(doc_type: str) -> None:
        if doc_type not in DOC_TYPES:
            raise ValidationException(f"doc_type must be one of {', '.join(DOC_TYPES)}")

    @staticmethod
    def _validate_cost(cost: Decimal) -> None:
        if cost < 0:
            raise ValidationException("cost must be >= 0")

    async def _validate_car(self, car_id: uuid.UUID) -> None:
        if await self.car_repository.get_by_id(car_id) is None:
            raise NotFoundException(f"Car {car_id} not found")
