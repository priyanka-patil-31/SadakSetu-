from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AssignmentStatus


class AssignmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    team_id: UUID
    note: str | None = Field(default=None, max_length=2_000)


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    complaint_id: UUID
    team_id: UUID
    assigned_by_id: UUID
    status: AssignmentStatus
    released_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AssignmentHistoryResponse(BaseModel):
    items: list[AssignmentResponse]
