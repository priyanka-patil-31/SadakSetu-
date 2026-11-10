"""Persist editable user profile and preference fields.

Revision ID: 0004_user_input_fields
Revises: 0003_severity_creator
Create Date: 2026-11-02
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_user_input_fields"
down_revision = "0003_severity_creator"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=40), nullable=True))
    op.add_column("users", sa.Column("area", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("preferences", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade() -> None:
    op.drop_column("users", "preferences")
    op.drop_column("users", "area")
    op.drop_column("users", "phone")
