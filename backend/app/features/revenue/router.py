import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_revenue_service
from app.features.auth.dependencies import get_current_user
from app.features.revenue.schemas import RevenueSummary
from app.features.revenue.service import RevenueService

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=RevenueSummary)
async def get_revenue(
    car_id: uuid.UUID | None = None,
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    service: RevenueService = Depends(get_revenue_service),
) -> RevenueSummary:
    return await service.get_summary(car_id=car_id, date_from=date_from, date_to=date_to)
