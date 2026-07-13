import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    service_place: Mapped[str] = mapped_column(String, nullable=False)
    service_by: Mapped[str] = mapped_column(String, nullable=False)
    car_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("cars.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
