"""create maintenance_records

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, Sequence[str], None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "maintenance_records",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("service_place", sa.String(), nullable=False),
        sa.Column("service_by", sa.String(), nullable=False),
        sa.Column(
            "car_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("cars.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_maintenance_records_car_id", "maintenance_records", ["car_id"])


def downgrade() -> None:
    op.drop_index("ix_maintenance_records_car_id", table_name="maintenance_records")
    op.drop_table("maintenance_records")
