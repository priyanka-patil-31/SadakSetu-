from datetime import datetime
from uuid import UUID

import re
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import UserRole


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    # The local demo administrator intentionally uses a `.local` address.
    # Keep this as a string so admin list responses can serialize that account.
    email: str
    full_name: str
    phone: str | None
    area: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
    complaints_submitted: int = 0


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str | None = Field(default=None, min_length=3, max_length=320)
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    area: str | None = Field(default=None, max_length=160)

    @field_validator("phone", mode="after")
    @classmethod
    def validate_indian_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = re.sub(r"[\s\-\(\)]", "", v.strip())
        if not cleaned:
            return None
        if cleaned.startswith("+91"):
            cleaned = cleaned[3:]
        elif cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.fullmatch(r"[6-9]\d{9}", cleaned):
            raise ValueError("Invalid phone number. Must be a valid 10-digit Indian mobile number (e.g. +91 9876543210).")
        return f"+91 {cleaned}"

    @model_validator(mode="after")
    def require_a_change(self):
        if self.email is None and self.full_name is None and self.phone is None and self.area is None:
            raise ValueError("At least one profile field must be provided")
        return self


class PasswordUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email_alerts: bool = True
    critical_alerts: bool = True
    weekly_reports: bool = False
    compact_tables: bool = False


class UserRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: UserRole


class UserStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
