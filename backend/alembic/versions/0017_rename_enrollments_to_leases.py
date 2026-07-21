"""rename enrollments to leases

Revision ID: 0017
Revises: 0016
Create Date: 2026-07-22

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0017"
down_revision: Union[str, Sequence[str], None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("enrollments", "leases")
    op.execute("ALTER INDEX ix_enrollments_car_id RENAME TO ix_leases_car_id")
    op.execute("ALTER INDEX ix_enrollments_vendor_id RENAME TO ix_leases_vendor_id")
    op.execute("ALTER TABLE leases RENAME CONSTRAINT enrollments_pkey TO leases_pkey")
    op.execute("ALTER TABLE leases RENAME CONSTRAINT enrollments_car_id_fkey TO leases_car_id_fkey")
    op.execute("ALTER TABLE leases RENAME CONSTRAINT enrollments_vendor_id_fkey TO leases_vendor_id_fkey")
    op.alter_column("payments", "associated_enrollment", new_column_name="associated_lease")
    op.execute(
        "ALTER TABLE payments RENAME CONSTRAINT payments_associated_enrollment_fkey "
        "TO payments_associated_lease_fkey"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE payments RENAME CONSTRAINT payments_associated_lease_fkey "
        "TO payments_associated_enrollment_fkey"
    )
    op.alter_column("payments", "associated_lease", new_column_name="associated_enrollment")
    op.execute("ALTER TABLE leases RENAME CONSTRAINT leases_vendor_id_fkey TO enrollments_vendor_id_fkey")
    op.execute("ALTER TABLE leases RENAME CONSTRAINT leases_car_id_fkey TO enrollments_car_id_fkey")
    op.execute("ALTER TABLE leases RENAME CONSTRAINT leases_pkey TO enrollments_pkey")
    op.execute("ALTER INDEX ix_leases_vendor_id RENAME TO ix_enrollments_vendor_id")
    op.execute("ALTER INDEX ix_leases_car_id RENAME TO ix_enrollments_car_id")
    op.rename_table("leases", "enrollments")
