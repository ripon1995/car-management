import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CarCreate(BaseModel):
    brand: str
    model_name: str | None = None
    model_year: int
    registration_number: str | None = None
    engine_number: str
    chassis_number: str
    tyre_size: str
    owner_id: uuid.UUID
    driver_id: uuid.UUID | None = None


class CarUpdate(BaseModel):
    brand: str | None = None
    model_name: str | None = None
    model_year: int | None = None
    registration_number: str | None = None
    engine_number: str | None = None
    chassis_number: str | None = None
    tyre_size: str | None = None
    owner_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None


class CarRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    brand: str
    model_name: str | None
    model_year: int
    registration_number: str | None
    engine_number: str
    chassis_number: str
    tyre_size: str
    owner_id: uuid.UUID
    driver_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
