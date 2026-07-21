"""cars: drop vendor_id

Revision ID: 0014
Revises: 0013
Create Date: 2026-07-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: Union[str, Sequence[str], None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("cars", "vendor_id")


def downgrade() -> None:
    op.add_column(
        "cars",
        sa.Column(
            "vendor_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("vendors.id"),
            nullable=True,
        ),
    )
