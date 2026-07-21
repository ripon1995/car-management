"""create enrollments

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: Union[str, Sequence[str], None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "enrollments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "car_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("cars.id"),
            nullable=False,
        ),
        sa.Column(
            "vendor_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("vendors.id"),
            nullable=False,
        ),
        sa.Column("monthly_fare", sa.Numeric(12, 2), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_enrollments_car_id", "enrollments", ["car_id"])
    op.create_index("ix_enrollments_vendor_id", "enrollments", ["vendor_id"])


def downgrade() -> None:
    op.drop_index("ix_enrollments_vendor_id", table_name="enrollments")
    op.drop_index("ix_enrollments_car_id", table_name="enrollments")
    op.drop_table("enrollments")
