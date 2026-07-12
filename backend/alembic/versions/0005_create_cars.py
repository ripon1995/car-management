"""create cars

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cars",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("brand", sa.String(), nullable=False),
        sa.Column("model_name", sa.String(), nullable=True),
        sa.Column("model_year", sa.Integer(), nullable=False),
        sa.Column("registration_number", sa.String(), nullable=True),
        sa.Column("engine_number", sa.String(), nullable=False),
        sa.Column("chassis_number", sa.String(), nullable=False),
        sa.Column("tyre_size", sa.String(), nullable=False),
        sa.Column(
            "owner_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("car_owners.id"),
            nullable=False,
        ),
        sa.Column(
            "vendor_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("vendors.id"),
            nullable=True,
        ),
        sa.Column(
            "driver_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("drivers.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_cars_engine_number", "cars", ["engine_number"], unique=True)
    op.create_index("ix_cars_chassis_number", "cars", ["chassis_number"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_cars_chassis_number", table_name="cars")
    op.drop_index("ix_cars_engine_number", table_name="cars")
    op.drop_table("cars")
