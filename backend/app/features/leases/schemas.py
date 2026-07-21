import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class LeaseCreate(BaseModel):
    car_id: uuid.UUID
    vendor_id: uuid.UUID
    monthly_fare: Decimal
    start_date: date
    end_date: date | None = None


class LeaseUpdate(BaseModel):
    monthly_fare: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None


class LeaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    car_id: uuid.UUID
    vendor_id: uuid.UUID
    monthly_fare: Decimal
    start_date: date
    end_date: date | None
    created_at: datetime
    updated_at: datetime


class DuePaymentsRead(BaseModel):
    due_months: list[str]
    generated_months: list[str]
