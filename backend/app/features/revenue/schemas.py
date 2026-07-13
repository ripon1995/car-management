import uuid
from decimal import Decimal

from pydantic import BaseModel


class RevenueTypeBreakdown(BaseModel):
    type: str
    amount: Decimal


class RevenuePeriodBreakdown(BaseModel):
    period: str
    income: Decimal
    expense: Decimal
    net: Decimal


class RevenueCarBreakdown(BaseModel):
    car_id: uuid.UUID
    income: Decimal
    expense: Decimal
    net: Decimal


class RevenueSummary(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    net_revenue: Decimal
    by_type: list[RevenueTypeBreakdown]
    by_period: list[RevenuePeriodBreakdown]
    by_car: list[RevenueCarBreakdown] | None = None
