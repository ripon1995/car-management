import uuid
from datetime import date
from decimal import Decimal

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.db.session import get_db
from app.features.car_docs.models import CarDoc
from app.features.car_docs.repository import CarDocRepository
from app.features.car_docs.schemas import DOC_TYPES, CarDocCreate, CarDocUpdate
from app.features.cars.repository import CarRepository


class CarDocService:
    """Business logic for creating/managing car docs."""

    def __init__(self, repository: CarDocRepository, car_repository: CarRepository) -> None:
        self.repository = repository
        self.car_repository = car_repository

    async def create(self, payload: CarDocCreate) -> CarDoc:
        self._validate_doc_type(payload.doc_type)
        self._validate_cost(payload.cost)
        await self._validate_car(payload.car_id)
        return await self.repository.create(**payload.model_dump())

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        doc_type: str | None = None,
        expiring_before: date | None = None,
    ) -> list[CarDoc]:
        return await self.repository.list_all(
            car_id=car_id, doc_type=doc_type, expiring_before=expiring_before
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
        from app.features.payments.models import Payment

        linked_payment = await self.repository.db.scalar(
            select(Payment.id).where(Payment.associated_cardocs == car_doc_id).limit(1)
        )
        if linked_payment is not None:
            raise ConflictException("Cannot delete a car doc that has a linked payment")
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


def get_car_doc_service(db: AsyncSession = Depends(get_db)) -> CarDocService:
    return CarDocService(CarDocRepository(db), CarRepository(db))
