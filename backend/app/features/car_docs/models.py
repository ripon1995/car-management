import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class CarDoc(Base):
    __tablename__ = "car_docs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    car_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("cars.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
