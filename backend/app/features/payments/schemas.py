import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

PAYMENT_TYPES = ("service", "document", "monthly_fair", "other")


class PaymentCreate(BaseModel):
    type: str
    associated_maintenance: uuid.UUID | None = None
    associated_cardocs: uuid.UUID | None = None
    car_id: uuid.UUID
    amount: Decimal
    payment_date: date
    paid_by: str
    paid_to: str
    description: str | None = None


class PaymentUpdate(BaseModel):
    type: str | None = None
    associated_maintenance: uuid.UUID | None = None
    associated_cardocs: uuid.UUID | None = None
    car_id: uuid.UUID | None = None
    amount: Decimal | None = None
    payment_date: date | None = None
    paid_by: str | None = None
    paid_to: str | None = None
    description: str | None = None


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    associated_maintenance: uuid.UUID | None
    associated_cardocs: uuid.UUID | None
    car_id: uuid.UUID
    amount: Decimal
    payment_date: date
    paid_by: str
    paid_to: str
    description: str | None
    created_at: datetime
    updated_at: datetime
