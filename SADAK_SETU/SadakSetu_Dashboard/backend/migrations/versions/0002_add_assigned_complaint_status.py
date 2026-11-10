"""Add the ASSIGNED complaint workflow status.

Revision ID: 0002_add_assigned_complaint_status
Revises: 0001_initial_schema
Create Date: 2026-11-02
"""

from alembic import op

revision = "0002_assigned_status"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'ASSIGNED'")


def downgrade() -> None:
    # PostgreSQL does not support removing an enum value in-place safely.
    # The status remains compatible with the initial enum on future upgrades.
    pass
