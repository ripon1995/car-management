import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.features.auth.dependencies import get_current_user
from app.features.car_owners.models import CarOwner
from app.features.car_owners.schemas import CarOwnerCreate, CarOwnerRead, CarOwnerUpdate

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CarOwnerRead])
async def list_car_owners(db: AsyncSession = Depends(get_db)) -> list[CarOwner]:
    result = await db.scalars(select(CarOwner).order_by(CarOwner.created_at))
    return list(result)


@router.post("", response_model=CarOwnerRead, status_code=status.HTTP_201_CREATED)
async def create_car_owner(payload: CarOwnerCreate, db: AsyncSession = Depends(get_db)) -> CarOwner:
    owner = CarOwner(name=payload.name, phone_number=payload.phone_number)
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner


async def _get_car_owner_or_404(owner_id: uuid.UUID, db: AsyncSession) -> CarOwner:
    owner = await db.get(CarOwner, owner_id)
    if owner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car owner not found")
    return owner


@router.get("/{owner_id}", response_model=CarOwnerRead)
async def get_car_owner(owner_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> CarOwner:
    return await _get_car_owner_or_404(owner_id, db)


@router.put("/{owner_id}", response_model=CarOwnerRead)
async def update_car_owner(
    owner_id: uuid.UUID, payload: CarOwnerUpdate, db: AsyncSession = Depends(get_db)
) -> CarOwner:
    owner = await _get_car_owner_or_404(owner_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(owner, field, value)
    await db.commit()
    await db.refresh(owner)
    return owner


@router.delete("/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_car_owner(owner_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    owner = await _get_car_owner_or_404(owner_id, db)
    await db.delete(owner)
    await db.commit()
