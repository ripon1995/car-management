"""create income

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: Union[str, Sequence[str], None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "income",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "lease_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("leases.id"),
            nullable=False,
        ),
        sa.Column(
            "car_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("cars.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("paid_by", sa.String(), nullable=False),
        sa.Column("paid_to", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="unpaid"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_income_lease_id", "income", ["lease_id"])
    op.create_index("ix_income_car_id", "income", ["car_id"])
    op.create_index("ix_income_payment_date", "income", ["payment_date"])
    op.create_index("ix_income_status", "income", ["status"])


def downgrade() -> None:
    op.drop_index("ix_income_status", table_name="income")
    op.drop_index("ix_income_payment_date", table_name="income")
    op.drop_index("ix_income_car_id", table_name="income")
    op.drop_index("ix_income_lease_id", table_name="income")
    op.drop_table("income")
