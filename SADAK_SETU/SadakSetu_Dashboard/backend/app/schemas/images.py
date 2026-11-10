from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ComplaintImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    complaint_id: UUID
    storage_key: str
    media_type: str
    byte_size: int
    checksum: str
    captured_at: datetime | None
    capture_metadata: dict[str, Any] | None
    created_at: datetime
