import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

INCOME_STATUSES = ("paid", "unpaid")


class IncomeCreate(BaseModel):
    lease_id: uuid.UUID
    period: date
    payment_date: date
    paid_by: str
    paid_to: str
    status: str = "unpaid"
    description: str | None = None


class IncomeUpdate(BaseModel):
    # period is intentionally not settable here — it's the rent month this row covers and is
    # fixed at creation; only payment_date/status/paid_by/paid_to/description can change later.
    lease_id: uuid.UUID | None = None
    payment_date: date | None = None
    paid_by: str | None = None
    paid_to: str | None = None
    status: str | None = None
    description: str | None = None


class IncomeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lease_id: uuid.UUID
    car_id: uuid.UUID
    amount: Decimal
    period: date
    payment_date: date
    paid_by: str
    paid_to: str
    status: str
    description: str | None
    created_at: datetime
    updated_at: datetime
