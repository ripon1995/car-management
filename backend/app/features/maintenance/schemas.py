import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

MAINTENANCE_TYPES = ("service", "battery", "tyre", "spare_parts", "engine_oil")


class MaintenanceCreate(BaseModel):
    type: str
    cost: Decimal
    service_place: str
    service_by: str
    description: str | None = None
    car_id: uuid.UUID


class MaintenanceUpdate(BaseModel):
    type: str | None = None
    cost: Decimal | None = None
    service_place: str | None = None
    service_by: str | None = None
    description: str | None = None
    car_id: uuid.UUID | None = None


class MaintenanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    cost: Decimal
    service_place: str
    service_by: str
    description: str | None
    car_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
