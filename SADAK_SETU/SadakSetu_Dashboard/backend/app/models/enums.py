from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "ADMIN"
    CITIZEN = "CITIZEN"
    REPAIR_TEAM = "REPAIR_TEAM"


class ComplaintStatus(StrEnum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    AI_PROCESSING = "AI_PROCESSING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class SeverityLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TeamAvailability(StrEnum):
    AVAILABLE = "AVAILABLE"
    ON_JOB = "ON_JOB"
    OFF_DUTY = "OFF_DUTY"


class AssignmentStatus(StrEnum):
    ACTIVE = "ACTIVE"
    RELEASED = "RELEASED"


class DetectionStatus(StrEnum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
