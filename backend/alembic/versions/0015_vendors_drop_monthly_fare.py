"""vendors: drop monthly_fare

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: Union[str, Sequence[str], None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("vendors", "monthly_fare")


def downgrade() -> None:
    op.add_column(
        "vendors",
        sa.Column("monthly_fare", sa.Numeric(12, 2), nullable=False),
    )
