import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class Car(Base):
    __tablename__ = "cars"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand: Mapped[str] = mapped_column(String, nullable=False)
    model_name: Mapped[str | None] = mapped_column(String, nullable=True)
    model_year: Mapped[int] = mapped_column(Integer, nullable=False)
    registration_number: Mapped[str | None] = mapped_column(String, nullable=True)
    engine_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    chassis_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    tyre_size: Mapped[str] = mapped_column(String, nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("car_owners.id"), nullable=False
    )
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vendors.id"), nullable=True
    )
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("drivers.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
