from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ComplaintStatus, SeverityLevel


class LocationInput(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: str | None = Field(default=None, max_length=500)
    area: str | None = Field(default=None, max_length=160)
    zone: str | None = Field(default=None, max_length=80)


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    latitude: float
    longitude: float
    address: str | None
    area: str | None
    zone: str | None


class ComplaintCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=5, max_length=240)
    description: str = Field(min_length=10, max_length=5_000)
    location: LocationInput


class ComplaintStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ComplaintStatus
    note: str | None = Field(default=None, max_length=2_000)


class ComplaintNoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str = Field(min_length=1, max_length=2_000)


class ComplaintDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=3, max_length=2_000)


class ComplaintUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_id: UUID | None
    event_type: str
    old_value: str | None
    new_value: str | None
    note: str | None
    created_at: datetime


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    complaint_number: str
    reporter_id: UUID
    status: ComplaintStatus
    severity: SeverityLevel
    title: str
    description: str
    location: LocationResponse
    assigned_team_id: UUID | None
    created_at: datetime
    updated_at: datetime


class ComplaintListResponse(BaseModel):
    items: list[ComplaintResponse]
    total: int
    page: int
    page_size: int


class ComplaintHistoryResponse(BaseModel):
    items: list[ComplaintUpdateResponse]
