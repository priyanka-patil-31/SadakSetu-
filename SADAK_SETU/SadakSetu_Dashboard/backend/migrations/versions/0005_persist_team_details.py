"""Persist repair team details entered in the admin console.

Revision ID: 0005_team_details
Revises: 0004_user_input_fields
Create Date: 2026-11-03
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_team_details"
down_revision = "0004_user_input_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("repair_teams", sa.Column("zone", sa.String(length=80), nullable=False, server_default=sa.text("'West Zone'")))
    op.add_column("repair_teams", sa.Column("members", sa.Integer(), nullable=False, server_default=sa.text("4")))
    op.add_column("repair_teams", sa.Column("specialties", sa.JSON(), nullable=False, server_default=sa.text("'[]'")))


def downgrade() -> None:
    op.drop_column("repair_teams", "specialties")
    op.drop_column("repair_teams", "members")
    op.drop_column("repair_teams", "zone")
