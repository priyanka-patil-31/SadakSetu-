from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DeviceTokenCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    platform: str = Field(min_length=2, max_length=32)
    token: str = Field(min_length=8, max_length=512)


class DeviceTokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    token: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    complaint_id: UUID | None
    team_id: UUID | None
    notification_type: str
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread: int
    page: int
    page_size: int
