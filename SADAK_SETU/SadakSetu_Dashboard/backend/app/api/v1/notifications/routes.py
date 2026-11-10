from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session as DBSession

from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import DeviceToken, Notification
from app.schemas.notifications import (
    DeviceTokenCreate,
    DeviceTokenResponse,
    NotificationListResponse,
    NotificationResponse,
)
from app.services.auth import AuthenticatedSession
from app.services.notifications import mark_read, register_device_token

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/tokens", response_model=DeviceTokenResponse, status_code=status.HTTP_201_CREATED)
def upsert_device_token(
    payload: DeviceTokenCreate,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> DeviceToken:
    return register_device_token(db, auth.user.id, payload.platform, payload.token)


@router.delete("/tokens/{token_id}", response_model=dict[str, str])
def invalidate_device_token(
    token_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> dict[str, str]:
    token = db.scalar(select(DeviceToken).where(DeviceToken.id == token_id, DeviceToken.user_id == auth.user.id))
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device token not found")
    token.is_active = False
    db.commit()
    return {"message": "Device token invalidated"}


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    unread_only: bool = Query(default=False),
) -> NotificationListResponse:
    filters = [Notification.user_id == auth.user.id]
    if unread_only:
        filters.append(Notification.read_at.is_(None))
    total = db.scalar(select(func.count()).select_from(Notification).where(*filters)) or 0
    unread = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == auth.user.id, Notification.read_at.is_(None)
        )
    ) or 0
    items = db.scalars(
        select(Notification)
        .where(*filters)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return NotificationListResponse(items=items, total=total, unread=unread, page=page, page_size=page_size)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> Notification:
    notification = db.scalar(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == auth.user.id)
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    mark_read(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/read-all", response_model=dict[str, int])
def mark_all_notifications_read(
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> dict[str, int]:
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == auth.user.id, Notification.read_at.is_(None))
        .values(read_at=func.now())
    )
    db.commit()
    return {"updated": result.rowcount}
