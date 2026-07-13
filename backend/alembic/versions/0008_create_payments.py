"""create payments

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, Sequence[str], None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column(
            "associated_maintenance",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("maintenance_records.id"),
            nullable=True,
        ),
        sa.Column(
            "associated_cardocs",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("car_docs.id"),
            nullable=True,
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
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payments_car_id", "payments", ["car_id"])
    op.create_index("ix_payments_type", "payments", ["type"])
    op.create_index("ix_payments_payment_date", "payments", ["payment_date"])


def downgrade() -> None:
    op.drop_index("ix_payments_payment_date", table_name="payments")
    op.drop_index("ix_payments_type", table_name="payments")
    op.drop_index("ix_payments_car_id", table_name="payments")
    op.drop_table("payments")
