"""maintenance_records: drop name, add description

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, Sequence[str], None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("maintenance_records", sa.Column("description", sa.Text(), nullable=True))
    op.drop_column("maintenance_records", "name")


def downgrade() -> None:
    op.add_column("maintenance_records", sa.Column("name", sa.String(), nullable=False, server_default=""))
    op.alter_column("maintenance_records", "name", server_default=None)
    op.drop_column("maintenance_records", "description")
