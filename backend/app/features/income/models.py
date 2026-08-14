import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class Income(Base):
    """A month of lease rent owed by a vendor to a car owner. Always traces back to a Lease."""

    __tablename__ = "income"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lease_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("leases.id"), nullable=False
    )
    car_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("cars.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # period is the rent month this row covers (set once at creation, immutable); payment_date
    # is the actual date the money moved and is freely editable via the mark-as-received flow —
    # keep them separate, don't derive one from the other.
    period: Mapped[date] = mapped_column(Date, nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid_by: Mapped[str] = mapped_column(String, nullable=False)
    paid_to: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="unpaid")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
