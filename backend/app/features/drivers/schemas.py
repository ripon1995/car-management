import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DriverCreate(BaseModel):
    name: str
    address: str
    contact_number: str
    whatsapp_number: str | None = None


class DriverUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    contact_number: str | None = None
    whatsapp_number: str | None = None


class DriverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    address: str
    contact_number: str
    whatsapp_number: str | None
    created_at: datetime
    updated_at: datetime
