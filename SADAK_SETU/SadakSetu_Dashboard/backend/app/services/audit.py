from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session as DBSession

from app.models import AuditLog


def record_audit(
    db: DBSession,
    *,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    before_data: dict[str, Any] | None = None,
    after_data: dict[str, Any] | None = None,
    request_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_data=before_data,
        after_data=after_data,
        request_id=request_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    return entry
