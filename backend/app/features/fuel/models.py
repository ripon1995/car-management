import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class FuelRecord(Base):
    __tablename__ = "fuel_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fuel_type: Mapped[str] = mapped_column(String, nullable=False)
    quantity_liters: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    odometer_reading: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    fuel_station: Mapped[str] = mapped_column(String, nullable=False)
    fuel_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    car_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("cars.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
