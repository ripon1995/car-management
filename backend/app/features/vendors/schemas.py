import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VendorCreate(BaseModel):
    name: str
    address: str
    contact_number: str
    whatsapp_number: str | None = None


class VendorUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    contact_number: str | None = None
    whatsapp_number: str | None = None


class VendorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    address: str
    contact_number: str
    whatsapp_number: str | None
    created_at: datetime
    updated_at: datetime
