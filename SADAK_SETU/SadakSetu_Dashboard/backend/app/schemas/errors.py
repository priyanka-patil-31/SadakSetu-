from typing import Any

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    message: str
    code: str
    request_id: str
    details: Any | None = None
