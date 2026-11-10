from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SeverityLevel


class SeverityReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    severity: SeverityLevel
    note: str | None = Field(default=None, max_length=2_000)


class SeverityRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    complaint_id: UUID
    created_by_id: UUID | None
    severity: SeverityLevel
    method: str
    method_version: str
    measurements: dict[str, Any] | None
    limitations: str | None
    created_at: datetime
