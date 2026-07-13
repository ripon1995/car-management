"""car_docs: drop name, add doc_type

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, Sequence[str], None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "car_docs",
        sa.Column("doc_type", sa.String(), nullable=False, server_default="registration_certificate"),
    )
    op.alter_column("car_docs", "doc_type", server_default=None)
    op.drop_column("car_docs", "name")


def downgrade() -> None:
    op.add_column("car_docs", sa.Column("name", sa.String(), nullable=False, server_default=""))
    op.alter_column("car_docs", "name", server_default=None)
    op.drop_column("car_docs", "doc_type")
