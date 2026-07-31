import uuid
from datetime import date

from app.core.exceptions import NotFoundException, ValidationException
from app.features.income.models import Income
from app.features.income.repository import IncomeRepository
from app.features.income.schemas import INCOME_STATUSES, IncomeCreate, IncomeUpdate
from app.features.leases.models import Lease
from app.features.leases.repository import LeaseRepository


class IncomeService:
    """Business logic for creating/managing lease-rent income. Amount and car_id are always
    derived from the linked Lease, never taken from the caller, so an income row can't drift
    from its lease's current monthly_fare/car."""

    def __init__(self, repository: IncomeRepository, lease_repository: LeaseRepository) -> None:
        self.repository = repository
        self.lease_repository = lease_repository

    async def create(self, payload: IncomeCreate) -> Income:
        self._validate_status(payload.status)
        lease = await self._get_lease(payload.lease_id)
        data = payload.model_dump()
        data["car_id"] = lease.car_id
        data["amount"] = lease.monthly_fare
        return await self.repository.create(**data)

    async def list_all(
        self,
        car_id: uuid.UUID | None = None,
        lease_id: uuid.UUID | None = None,
        status: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Income]:
        return await self.repository.list_all(
            car_id=car_id, lease_id=lease_id, status=status, date_from=date_from, date_to=date_to
        )

    async def get_by_id(self, income_id: uuid.UUID) -> Income:
        income = await self.repository.get_by_id(income_id)
        if income is None:
            raise NotFoundException(f"Income {income_id} not found")
        return income

    async def update(self, income_id: uuid.UUID, payload: IncomeUpdate) -> Income:
        income = await self.get_by_id(income_id)
        updates = payload.model_dump(exclude_unset=True)

        if "status" in updates:
            self._validate_status(updates["status"])

        if "lease_id" in updates:
            lease = await self._get_lease(updates["lease_id"])
            updates["car_id"] = lease.car_id
            updates["amount"] = lease.monthly_fare

        return await self.repository.update(income, updates)

    async def delete(self, income_id: uuid.UUID) -> None:
        income = await self.get_by_id(income_id)
        await self.repository.delete(income)

    async def _get_lease(self, lease_id: uuid.UUID) -> Lease:
        lease = await self.lease_repository.get_by_id(lease_id)
        if lease is None:
            raise NotFoundException(f"Lease {lease_id} not found")
        return lease

    @staticmethod
    def _validate_status(status: str) -> None:
        if status not in INCOME_STATUSES:
            raise ValidationException(f"status must be one of {', '.join(INCOME_STATUSES)}")
