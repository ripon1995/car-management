import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CarDocCreate(BaseModel):
    name: str
    expiry_date: date
    cost: Decimal
    car_id: uuid.UUID


class CarDocUpdate(BaseModel):
    name: str | None = None
    expiry_date: date | None = None
    cost: Decimal | None = None
    car_id: uuid.UUID | None = None


class CarDocRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    expiry_date: date
    cost: Decimal
    car_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
