import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CarOwnerCreate(BaseModel):
    name: str
    phone_number: str


class CarOwnerUpdate(BaseModel):
    name: str | None = None
    phone_number: str | None = None


class CarOwnerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone_number: str
    created_at: datetime
    updated_at: datetime
