from collections.abc import Iterable
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import Settings
from app.models import DeviceToken, Notification


class PushDeliveryError(RuntimeError):
    """Raised when an optional push provider cannot deliver a message."""


def register_device_token(db: DBSession, user_id: UUID, platform: str, token: str) -> DeviceToken:
    existing = db.scalar(select(DeviceToken).where(DeviceToken.token == token))
    if existing is None:
        existing = DeviceToken(user_id=user_id, platform=platform.strip().lower(), token=token, is_active=True)
        db.add(existing)
    else:
        existing.user_id = user_id
        existing.platform = platform.strip().lower()
        existing.is_active = True
    db.commit()
    db.refresh(existing)
    return existing


def create_notification(
    db: DBSession,
    user_id: UUID,
    notification_type: str,
    title: str,
    body: str,
    complaint_id: UUID | None = None,
    team_id: UUID | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        complaint_id=complaint_id,
        team_id=team_id,
        notification_type=notification_type,
        title=title,
        body=body,
    )
    db.add(notification)
    return notification


def create_notifications(
    db: DBSession,
    user_ids: Iterable[UUID],
    notification_type: str,
    title: str,
    body: str,
    complaint_id: UUID | None = None,
    team_id: UUID | None = None,
) -> list[Notification]:
    notifications = [
        create_notification(db, user_id, notification_type, title, body, complaint_id, team_id)
        for user_id in user_ids
    ]
    return notifications


def mark_read(notification: Notification) -> None:
    notification.read_at = datetime.now(UTC)


def send_push_if_configured(
    db: DBSession,
    notification: Notification,
    settings: Settings,
) -> bool:
    """Best-effort push hook; durable notification rows are independent of delivery."""

    if not settings.fcm_enabled:
        return False
    if not settings.fcm_credentials_path:
        raise PushDeliveryError("FCM is enabled but FCM_CREDENTIALS_PATH is not configured")
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except ImportError as exc:
        raise PushDeliveryError("firebase-admin is not installed") from exc
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(settings.fcm_credentials_path))
    tokens = db.scalars(
        select(DeviceToken.token).where(DeviceToken.user_id == notification.user_id, DeviceToken.is_active.is_(True))
    ).all()
    delivered = False
    for token in tokens:
        try:
            messaging.send(
                messaging.Message(
                    token=token,
                    notification=messaging.Notification(title=notification.title, body=notification.body),
                )
            )
            delivered = True
        except Exception as exc:  # provider failures must not affect durable history
            raise PushDeliveryError("FCM push delivery failed") from exc
    return delivered


def dispatch_push_best_effort(db: DBSession, notifications: list[Notification], settings: Settings) -> int:
    delivered = 0
    for notification in notifications:
        try:
            if send_push_if_configured(db, notification, settings):
                delivered += 1
        except PushDeliveryError:
            continue
    return delivered


__all__ = [
    "PushDeliveryError",
    "create_notification",
    "create_notifications",
    "dispatch_push_best_effort",
    "mark_read",
    "register_device_token",
    "send_push_if_configured",
]
