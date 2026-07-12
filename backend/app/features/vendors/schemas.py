import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class VendorCreate(BaseModel):
    name: str
    address: str
    contact_number: str
    whatsapp_number: str | None = None
    monthly_fare: Decimal


class VendorUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    contact_number: str | None = None
    whatsapp_number: str | None = None
    monthly_fare: Decimal | None = None


class VendorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    address: str
    contact_number: str
    whatsapp_number: str | None
    monthly_fare: Decimal
    created_at: datetime
    updated_at: datetime
