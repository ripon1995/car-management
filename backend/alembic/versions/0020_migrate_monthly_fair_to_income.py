"""migrate monthly_fair payments to income, drop payments.associated_lease

Revision ID: 0020
Revises: 0019
Create Date: 2026-08-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: Union[str, Sequence[str], None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO income (
            id, lease_id, car_id, amount, payment_date, paid_by, paid_to,
            status, description, created_at, updated_at
        )
        SELECT
            id, associated_lease, car_id, amount, payment_date, paid_by, paid_to,
            status, description, created_at, updated_at
        FROM payments
        WHERE type = 'monthly_fair'
        """
    )
    op.execute("DELETE FROM payments WHERE type = 'monthly_fair'")
    op.drop_column("payments", "associated_lease")


def downgrade() -> None:
    op.add_column(
        "payments",
        sa.Column(
            "associated_lease",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("leases.id"),
            nullable=True,
        ),
    )
    op.execute(
        """
        INSERT INTO payments (
            id, type, associated_lease, car_id, amount, payment_date, paid_by, paid_to,
            status, description, created_at, updated_at
        )
        SELECT
            id, 'monthly_fair', lease_id, car_id, amount, payment_date, paid_by, paid_to,
            status, description, created_at, updated_at
        FROM income
        """
    )
