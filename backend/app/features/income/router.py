import uuid
from datetime import date

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_income_service
from app.features.auth.dependencies import get_current_user
from app.features.income.models import Income
from app.features.income.schemas import IncomeCreate, IncomeRead, IncomeUpdate
from app.features.income.service import IncomeService

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[IncomeRead])
async def list_income(
    car_id: uuid.UUID | None = None,
    lease_id: uuid.UUID | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    service: IncomeService = Depends(get_income_service),
) -> list[Income]:
    return await service.list_all(
        car_id=car_id, lease_id=lease_id, status=status, date_from=date_from, date_to=date_to
    )


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
async def create_income(
    payload: IncomeCreate, service: IncomeService = Depends(get_income_service)
) -> Income:
    return await service.create(payload)


@router.get("/{income_id}", response_model=IncomeRead)
async def get_income(
    income_id: uuid.UUID, service: IncomeService = Depends(get_income_service)
) -> Income:
    return await service.get_by_id(income_id)


@router.put("/{income_id}", response_model=IncomeRead)
async def update_income(
    income_id: uuid.UUID,
    payload: IncomeUpdate,
    service: IncomeService = Depends(get_income_service),
) -> Income:
    return await service.update(income_id, payload)


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    income_id: uuid.UUID, service: IncomeService = Depends(get_income_service)
) -> None:
    await service.delete(income_id)
