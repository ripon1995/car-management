import uuid

from app.core.exceptions import NotFoundException
from app.features.car_owners.models import CarOwner
from app.features.car_owners.repository import CarOwnerRepository
from app.features.car_owners.schemas import CarOwnerCreate, CarOwnerUpdate


class CarOwnerService:
    """Business logic for creating/managing car owners."""

    def __init__(self, repository: CarOwnerRepository) -> None:
        self.repository = repository

    async def create(self, payload: CarOwnerCreate) -> CarOwner:
        return await self.repository.create(name=payload.name, phone_number=payload.phone_number)

    async def list_all(self) -> list[CarOwner]:
        return await self.repository.list_all()

    async def get_by_id(self, owner_id: uuid.UUID) -> CarOwner:
        owner = await self.repository.get_by_id(owner_id)
        if owner is None:
            raise NotFoundException(f"Car owner {owner_id} not found")
        return owner

    async def update(self, owner_id: uuid.UUID, payload: CarOwnerUpdate) -> CarOwner:
        owner = await self.get_by_id(owner_id)
        updates = payload.model_dump(exclude_unset=True)
        return await self.repository.update(owner, updates)

    async def delete(self, owner_id: uuid.UUID) -> None:
        owner = await self.get_by_id(owner_id)
        await self.repository.delete(owner)
