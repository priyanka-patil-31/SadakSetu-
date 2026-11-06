from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class ClientType(StrEnum):
    BROWSER = "browser"
    ANDROID = "android"


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)
    client_type: ClientType = ClientType.BROWSER


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Local development uses the intentionally non-public `.local` demo domain.
    # Keep registration strict, but allow the seeded demo identity to reach the
    # authentication service instead of being rejected by EmailStr first.
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)
    client_type: ClientType = ClientType.BROWSER


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    new_password: str = Field(min_length=8, max_length=128)


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    # The seeded development administrator uses a `.local` address.
    email: str
    full_name: str
    role: UserRole
    is_active: bool


class AuthResponse(BaseModel):
    user: AuthUserResponse
    session_id: str | None = None
    expires_at: datetime


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    expires_at: datetime
    last_activity_at: datetime
    created_at: datetime


class MessageResponse(BaseModel):
    message: str
