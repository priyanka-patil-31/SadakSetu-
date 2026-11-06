from datetime import datetime
from typing import Any
from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKey
from app.models.enums import (
    AssignmentStatus,
    ComplaintStatus,
    DetectionStatus,
    SeverityLevel,
    TeamAvailability,
    UserRole,
)

JSONType = JSON().with_variant(JSONB, "postgresql")


def enum_type(enum: type, name: str) -> Enum:
    return Enum(enum, name=name, native_enum=True, values_callable=lambda values: [item.value for item in values])


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[UUIDPrimaryKey]
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    area: Mapped[str | None] = mapped_column(String(160))
    preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict, server_default=text("'{}'")
    )
    role: Mapped[UserRole] = mapped_column(enum_type(UserRole, "user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    complaints: Mapped[list["Complaint"]] = relationship(
        back_populates="reporter", foreign_keys="Complaint.reporter_id"
    )
    assignments_created: Mapped[list["TeamAssignment"]] = relationship(back_populates="assigned_by")
    complaint_updates: Mapped[list["ComplaintUpdate"]] = relationship(back_populates="actor")
    severity_records_created: Mapped[list["SeverityRecord"]] = relationship(back_populates="created_by")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    device_tokens: Mapped[list["DeviceToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="actor")


class Session(TimestampMixin, Base):
    __tablename__ = "sessions"

    id: Mapped[UUIDPrimaryKey]
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credential_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")

    __table_args__ = (
        Index("ix_sessions_active_expiry", "user_id", "expires_at", postgresql_where=text("revoked_at IS NULL")),
    )


class Location(TimestampMixin, Base):
    __tablename__ = "locations"

    id: Mapped[UUIDPrimaryKey]
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    point: Mapped[Any] = mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500))
    area: Mapped[str | None] = mapped_column(String(160), index=True)
    zone: Mapped[str | None] = mapped_column(String(80), index=True)

    complaints: Mapped[list["Complaint"]] = relationship(back_populates="location")

    __table_args__ = (
        Index("ix_locations_latitude_longitude", "latitude", "longitude"),
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_locations_latitude_range"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_locations_longitude_range"),
    )


class RepairTeam(TimestampMixin, Base):
    __tablename__ = "repair_teams"

    id: Mapped[UUIDPrimaryKey]
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    lead_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    zone: Mapped[str] = mapped_column(String(80), nullable=False, server_default=text("'West Zone'"))
    members: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("4"))
    specialties: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list, server_default=text("'[]'"))
    availability: Mapped[TeamAvailability] = mapped_column(
        enum_type(TeamAvailability, "team_availability"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    assigned_complaints: Mapped[list["Complaint"]] = relationship(
        back_populates="assigned_team", foreign_keys="Complaint.assigned_team_id"
    )
    assignments: Mapped[list["TeamAssignment"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="related_team")


class Complaint(TimestampMixin, Base):
    __tablename__ = "complaints"

    id: Mapped[UUIDPrimaryKey]
    complaint_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    reporter_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    status: Mapped[ComplaintStatus] = mapped_column(
        enum_type(ComplaintStatus, "complaint_status"), nullable=False, index=True
    )
    severity: Mapped[SeverityLevel] = mapped_column(
        enum_type(SeverityLevel, "severity_level"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location_id: Mapped[UUID] = mapped_column(
        ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assigned_team_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("repair_teams.id", ondelete="SET NULL"), index=True
    )

    reporter: Mapped[User] = relationship(back_populates="complaints", foreign_keys=[reporter_id])
    location: Mapped[Location] = relationship(back_populates="complaints")
    assigned_team: Mapped[RepairTeam | None] = relationship(
        back_populates="assigned_complaints", foreign_keys=[assigned_team_id]
    )
    images: Mapped[list["ComplaintImage"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
    severity_records: Mapped[list["SeverityRecord"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan"
    )
    assignments: Mapped[list["TeamAssignment"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
    updates: Mapped[list["ComplaintUpdate"]] = relationship(back_populates="complaint", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="related_complaint")

    __table_args__ = (
        Index("ix_complaints_status_severity", "status", "severity"),
        Index("ix_complaints_created_at", "created_at"),
    )


class ComplaintImage(TimestampMixin, Base):
    __tablename__ = "complaint_images"

    id: Mapped[UUIDPrimaryKey]
    complaint_id: Mapped[UUID] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    media_type: Mapped[str] = mapped_column(String(100), nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    capture_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONType)

    complaint: Mapped[Complaint] = relationship(back_populates="images")
    ai_detections: Mapped[list["AIDetection"]] = relationship(
        back_populates="complaint_image", cascade="all, delete-orphan"
    )

    __table_args__ = (CheckConstraint("byte_size > 0", name="ck_complaint_images_positive_size"),)


class AIDetection(TimestampMixin, Base):
    __tablename__ = "ai_detections"

    id: Mapped[UUIDPrimaryKey]
    complaint_image_id: Mapped[UUID] = mapped_column(
        ForeignKey("complaint_images.id", ondelete="CASCADE"), nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String(160), nullable=False)
    model_version: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[DetectionStatus] = mapped_column(enum_type(DetectionStatus, "detection_status"), nullable=False)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer)
    detection_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    result_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONType)
    error_message: Mapped[str | None] = mapped_column(Text)

    complaint_image: Mapped[ComplaintImage] = relationship(back_populates="ai_detections")

    __table_args__ = (CheckConstraint("detection_count >= 0", name="ck_ai_detections_nonnegative_count"),)


class SeverityRecord(TimestampMixin, Base):
    __tablename__ = "severity_records"

    id: Mapped[UUIDPrimaryKey]
    complaint_id: Mapped[UUID] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    severity: Mapped[SeverityLevel] = mapped_column(
        enum_type(
            SeverityLevel,
            "severity_level",
        ),
        nullable=False,
    )
    method: Mapped[str] = mapped_column(String(120), nullable=False)
    method_version: Mapped[str] = mapped_column(String(80), nullable=False)
    measurements: Mapped[dict[str, Any] | None] = mapped_column(JSONType)
    limitations: Mapped[str | None] = mapped_column(Text)

    complaint: Mapped[Complaint] = relationship(back_populates="severity_records")
    created_by: Mapped[User | None] = relationship(back_populates="severity_records_created")


class TeamAssignment(TimestampMixin, Base):
    __tablename__ = "team_assignments"

    id: Mapped[UUIDPrimaryKey]
    complaint_id: Mapped[UUID] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("repair_teams.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assigned_by_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[AssignmentStatus] = mapped_column(enum_type(AssignmentStatus, "assignment_status"), nullable=False)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    complaint: Mapped[Complaint] = relationship(back_populates="assignments")
    team: Mapped[RepairTeam] = relationship(back_populates="assignments")
    assigned_by: Mapped[User] = relationship(back_populates="assignments_created")

    __table_args__ = (
        Index(
            "ix_team_assignments_active",
            "complaint_id",
            "team_id",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
        ),
    )


class ComplaintUpdate(TimestampMixin, Base):
    __tablename__ = "complaint_updates"

    id: Mapped[UUIDPrimaryKey]
    complaint_id: Mapped[UUID] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    old_value: Mapped[str | None] = mapped_column(String(120))
    new_value: Mapped[str | None] = mapped_column(String(120))
    note: Mapped[str | None] = mapped_column(Text)

    complaint: Mapped[Complaint] = relationship(back_populates="updates")
    actor: Mapped[User | None] = relationship(back_populates="complaint_updates")


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"

    id: Mapped[UUIDPrimaryKey]
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    complaint_id: Mapped[UUID | None] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    team_id: Mapped[UUID | None] = mapped_column(ForeignKey("repair_teams.id", ondelete="CASCADE"), index=True)
    notification_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="notifications")
    related_complaint: Mapped[Complaint | None] = relationship(back_populates="notifications")
    related_team: Mapped[RepairTeam | None] = relationship(back_populates="notifications")


class DeviceToken(TimestampMixin, Base):
    __tablename__ = "device_tokens"

    id: Mapped[UUIDPrimaryKey]
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    token: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="device_tokens")


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUIDPrimaryKey]
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True))
    request_id: Mapped[str | None] = mapped_column(String(120), index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    before_data: Mapped[dict[str, Any] | None] = mapped_column(JSONType)
    after_data: Mapped[dict[str, Any] | None] = mapped_column(JSONType)

    actor: Mapped[User | None] = relationship(back_populates="audit_logs")


__all__ = [
    "AIDetection",
    "AuditLog",
    "Complaint",
    "ComplaintImage",
    "ComplaintUpdate",
    "DeviceToken",
    "Location",
    "Notification",
    "RepairTeam",
    "Session",
    "SeverityRecord",
    "TeamAssignment",
    "User",
]
