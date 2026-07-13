"""create car_docs

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, Sequence[str], None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "car_docs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "car_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("cars.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_car_docs_car_id", "car_docs", ["car_id"])


def downgrade() -> None:
    op.drop_index("ix_car_docs_car_id", table_name="car_docs")
    op.drop_table("car_docs")
