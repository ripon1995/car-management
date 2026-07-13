import uuid
from collections import defaultdict
from datetime import date
from decimal import Decimal

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.features.payments.repository import PaymentRepository
from app.features.revenue.schemas import (
    RevenueCarBreakdown,
    RevenuePeriodBreakdown,
    RevenueSummary,
    RevenueTypeBreakdown,
)

INCOME_TYPE = "monthly_fair"


class RevenueService:
    """Read-only aggregation over Payment records. No writes, no table of its own."""

    def __init__(self, repository: PaymentRepository) -> None:
        self.repository = repository

    async def get_summary(
        self,
        car_id: uuid.UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> RevenueSummary:
        payments = await self.repository.list_all(car_id=car_id, date_from=date_from, date_to=date_to)

        total_income = Decimal("0")
        total_expense = Decimal("0")
        by_type: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        by_period: dict[str, dict[str, Decimal]] = defaultdict(
            lambda: {"income": Decimal("0"), "expense": Decimal("0")}
        )
        by_car: dict[uuid.UUID, dict[str, Decimal]] = defaultdict(
            lambda: {"income": Decimal("0"), "expense": Decimal("0")}
        )

        for payment in payments:
            is_income = payment.type == INCOME_TYPE
            if is_income:
                total_income += payment.amount
            else:
                total_expense += payment.amount
            by_type[payment.type] += payment.amount

            period = payment.payment_date.strftime("%Y-%m")
            bucket = "income" if is_income else "expense"
            by_period[period][bucket] += payment.amount
            by_car[payment.car_id][bucket] += payment.amount

        return RevenueSummary(
            total_income=total_income,
            total_expense=total_expense,
            net_revenue=total_income - total_expense,
            by_type=[
                RevenueTypeBreakdown(type=payment_type, amount=amount)
                for payment_type, amount in sorted(by_type.items())
            ],
            by_period=[
                RevenuePeriodBreakdown(
                    period=period,
                    income=values["income"],
                    expense=values["expense"],
                    net=values["income"] - values["expense"],
                )
                for period, values in sorted(by_period.items())
            ],
            by_car=(
                None
                if car_id is not None
                else [
                    RevenueCarBreakdown(
                        car_id=car,
                        income=values["income"],
                        expense=values["expense"],
                        net=values["income"] - values["expense"],
                    )
                    for car, values in sorted(by_car.items(), key=lambda item: str(item[0]))
                ]
            ),
        )


def get_revenue_service(db: AsyncSession = Depends(get_db)) -> RevenueService:
    return RevenueService(PaymentRepository(db))
