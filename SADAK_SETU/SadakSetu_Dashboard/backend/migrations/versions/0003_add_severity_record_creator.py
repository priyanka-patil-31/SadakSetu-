"""Track the administrator or system that created a severity record.

Revision ID: 0003_severity_creator
Revises: 0002_assigned_status
Create Date: 2026-11-02
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_severity_creator"
down_revision = "0002_assigned_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("severity_records", sa.Column("created_by_id", sa.UUID(), nullable=True))
    op.create_index("ix_severity_records_created_by_id", "severity_records", ["created_by_id"])
    op.create_foreign_key(
        "fk_severity_records_created_by_id_users",
        "severity_records",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_severity_records_created_by_id_users", "severity_records", type_="foreignkey")
    op.drop_index("ix_severity_records_created_by_id", table_name="severity_records")
    op.drop_column("severity_records", "created_by_id")
