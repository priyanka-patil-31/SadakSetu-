"""Create the initial SadakSetu PostgreSQL/PostGIS schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-02
"""

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    enums = (
        postgresql.ENUM("ADMIN", "CITIZEN", "REPAIR_TEAM", name="user_role", create_type=False),
        postgresql.ENUM(
            "SUBMITTED",
            "UNDER_REVIEW",
            "AI_PROCESSING",
            "ASSIGNED",
            "IN_PROGRESS",
            "RESOLVED",
            "REJECTED",
            name="complaint_status",
            create_type=False,
        ),
        postgresql.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL", name="severity_level", create_type=False),
        postgresql.ENUM("AVAILABLE", "ON_JOB", "OFF_DUTY", name="team_availability", create_type=False),
        postgresql.ENUM("ACTIVE", "RELEASED", name="assignment_status", create_type=False),
        postgresql.ENUM("PENDING", "COMPLETED", "FAILED", name="detection_status", create_type=False),
    )
    for enum in enums:
        enum.create(op.get_bind(), checkfirst=True)
    user_role, complaint_status, severity_level, team_availability, assignment_status, detection_status = enums

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "repair_teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("lead_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("availability", team_availability, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_repair_teams"),
        sa.UniqueConstraint("name", name="uq_repair_teams_name"),
    )

    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("point", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("address", sa.String(length=500)),
        sa.Column("area", sa.String(length=160)),
        sa.Column("zone", sa.String(length=80)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_locations_latitude_range"),
        sa.CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_locations_longitude_range"),
        sa.PrimaryKeyConstraint("id", name="pk_locations"),
    )
    op.create_index("ix_locations_area", "locations", ["area"], unique=False)
    op.create_index("ix_locations_zone", "locations", ["zone"], unique=False)
    op.create_index("ix_locations_latitude_longitude", "locations", ["latitude", "longitude"], unique=False)
    op.create_index("idx_locations_point", "locations", ["point"], unique=False, postgresql_using="gist")

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("credential_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_sessions"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"], unique=False)
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"], unique=False)
    op.create_index(
        "ix_sessions_active_expiry",
        "sessions",
        ["user_id", "expires_at"],
        unique=False,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )

    op.create_table(
        "complaints",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("complaint_number", sa.String(length=32), nullable=False),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", complaint_status, nullable=False),
        sa.Column("severity", severity_level, nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_team_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_team_id"], ["repair_teams.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_complaints"),
        sa.UniqueConstraint("complaint_number", name="uq_complaints_complaint_number"),
    )
    for name, columns in (
        ("ix_complaints_complaint_number", ["complaint_number"]),
        ("ix_complaints_reporter_id", ["reporter_id"]),
        ("ix_complaints_status", ["status"]),
        ("ix_complaints_severity", ["severity"]),
        ("ix_complaints_location_id", ["location_id"]),
        ("ix_complaints_assigned_team_id", ["assigned_team_id"]),
        ("ix_complaints_status_severity", ["status", "severity"]),
        ("ix_complaints_created_at", ["created_at"]),
    ):
        op.create_index(name, "complaints", columns, unique=False)

    op.create_table(
        "complaint_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("media_type", sa.String(length=100), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("checksum", sa.String(length=128), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True)),
        sa.Column("capture_metadata", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_complaint_images"),
        sa.UniqueConstraint("storage_key", name="uq_complaint_images_storage_key"),
        sa.CheckConstraint("byte_size > 0", name="ck_complaint_images_positive_size"),
    )
    op.create_index("ix_complaint_images_complaint_id", "complaint_images", ["complaint_id"], unique=False)
    op.create_index("ix_complaint_images_checksum", "complaint_images", ["checksum"], unique=False)

    op.create_table(
        "ai_detections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("complaint_image_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_name", sa.String(length=160), nullable=False),
        sa.Column("model_version", sa.String(length=80), nullable=False),
        sa.Column("status", detection_status, nullable=False),
        sa.Column("processing_time_ms", sa.Integer()),
        sa.Column("detection_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("result_metadata", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["complaint_image_id"], ["complaint_images.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_ai_detections"),
        sa.CheckConstraint("detection_count >= 0", name="ck_ai_detections_nonnegative_count"),
    )
    op.create_index("ix_ai_detections_complaint_image_id", "ai_detections", ["complaint_image_id"], unique=False)

    op.create_table(
        "severity_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("severity", severity_level, nullable=False),
        sa.Column("method", sa.String(length=120), nullable=False),
        sa.Column("method_version", sa.String(length=80), nullable=False),
        sa.Column("measurements", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("limitations", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_severity_records"),
    )
    op.create_index("ix_severity_records_complaint_id", "severity_records", ["complaint_id"], unique=False)

    op.create_table(
        "team_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", assignment_status, nullable=False),
        sa.Column("released_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["repair_teams.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_team_assignments"),
    )
    op.create_index("ix_team_assignments_complaint_id", "team_assignments", ["complaint_id"], unique=False)
    op.create_index("ix_team_assignments_team_id", "team_assignments", ["team_id"], unique=False)
    op.create_index(
        "ix_team_assignments_active",
        "team_assignments",
        ["complaint_id", "team_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    op.create_table(
        "complaint_updates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("old_value", sa.String(length=120)),
        sa.Column("new_value", sa.String(length=120)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_complaint_updates"),
    )
    op.create_index("ix_complaint_updates_complaint_id", "complaint_updates", ["complaint_id"], unique=False)
    op.create_index("ix_complaint_updates_actor_id", "complaint_updates", ["actor_id"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True)),
        sa.Column("team_id", postgresql.UUID(as_uuid=True)),
        sa.Column("notification_type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["repair_teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_notifications"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)
    op.create_index("ix_notifications_complaint_id", "notifications", ["complaint_id"], unique=False)
    op.create_index("ix_notifications_team_id", "notifications", ["team_id"], unique=False)

    op.create_table(
        "device_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("token", sa.String(length=512), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_device_tokens"),
        sa.UniqueConstraint("token", name="uq_device_tokens_token"),
    )
    op.create_index("ix_device_tokens_user_id", "device_tokens", ["user_id"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=120), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("request_id", sa.String(length=120)),
        sa.Column("ip_address", sa.String(length=64)),
        sa.Column("user_agent", sa.String(length=512)),
        sa.Column("before_data", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("after_data", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_audit_logs"),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"], unique=False)
    op.create_index("ix_audit_logs_request_id", "audit_logs", ["request_id"], unique=False)


def downgrade() -> None:
    for table in (
        "audit_logs",
        "device_tokens",
        "notifications",
        "complaint_updates",
        "team_assignments",
        "severity_records",
        "ai_detections",
        "complaint_images",
        "complaints",
        "sessions",
        "locations",
        "repair_teams",
        "users",
    ):
        op.drop_table(table)

    for enum in (
        "detection_status",
        "assignment_status",
        "team_availability",
        "severity_level",
        "complaint_status",
        "user_role",
    ):
        sa.Enum(name=enum).drop(op.get_bind(), checkfirst=True)
