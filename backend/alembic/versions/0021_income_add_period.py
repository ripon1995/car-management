"""income: add period (rent month), decoupled from payment_date

Revision ID: 0021
Revises: 0020
Create Date: 2026-08-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: Union[str, Sequence[str], None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("income", sa.Column("period", sa.Date(), nullable=True))
    op.execute("UPDATE income SET period = payment_date WHERE period IS NULL")
    op.alter_column("income", "period", nullable=False)
    op.create_index("ix_income_period", "income", ["period"])


def downgrade() -> None:
    op.drop_index("ix_income_period", table_name="income")
    op.drop_column("income", "period")
