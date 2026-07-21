"""create fuel_records

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, Sequence[str], None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fuel_records",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("fuel_type", sa.String(), nullable=False),
        sa.Column("quantity_liters", sa.Numeric(10, 2), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("odometer_reading", sa.Numeric(10, 2), nullable=True),
        sa.Column("fuel_station", sa.String(), nullable=False),
        sa.Column("fuel_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "car_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("cars.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_fuel_records_car_id", "fuel_records", ["car_id"])
    op.create_index("ix_fuel_records_fuel_type", "fuel_records", ["fuel_type"])
    op.create_index("ix_fuel_records_fuel_date", "fuel_records", ["fuel_date"])


def downgrade() -> None:
    op.drop_index("ix_fuel_records_fuel_date", table_name="fuel_records")
    op.drop_index("ix_fuel_records_fuel_type", table_name="fuel_records")
    op.drop_index("ix_fuel_records_car_id", table_name="fuel_records")
    op.drop_table("fuel_records")
