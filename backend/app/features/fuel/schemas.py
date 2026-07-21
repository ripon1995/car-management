import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

FUEL_TYPES = ("octane", "petrol", "diesel", "cng", "other")


class FuelCreate(BaseModel):
    fuel_type: str
    quantity_liters: Decimal
    cost: Decimal
    odometer_reading: Decimal | None = None
    fuel_station: str
    fuel_date: date
    description: str | None = None
    car_id: uuid.UUID


class FuelUpdate(BaseModel):
    fuel_type: str | None = None
    quantity_liters: Decimal | None = None
    cost: Decimal | None = None
    odometer_reading: Decimal | None = None
    fuel_station: str | None = None
    fuel_date: date | None = None
    description: str | None = None
    car_id: uuid.UUID | None = None


class FuelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fuel_type: str
    quantity_liters: Decimal
    cost: Decimal
    odometer_reading: Decimal | None
    fuel_station: str
    fuel_date: date
    description: str | None
    car_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
