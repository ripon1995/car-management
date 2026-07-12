"""add users table, drop auth fields from car_owners

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.drop_index("ix_car_owners_email", table_name="car_owners")
    op.drop_column("car_owners", "email")
    op.drop_column("car_owners", "password_hash")


def downgrade() -> None:
    op.add_column("car_owners", sa.Column("password_hash", sa.String(), nullable=False, server_default=""))
    op.add_column("car_owners", sa.Column("email", sa.String(), nullable=False, server_default=""))
    op.create_index("ix_car_owners_email", "car_owners", ["email"], unique=True)

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
