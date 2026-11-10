from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.orm import joinedload

from app.core.config import Settings
from app.core.security import generate_session_token, hash_password, hash_session_token, verify_password
from app.models import Session, User
from app.schemas.auth import ClientType


@dataclass(frozen=True)
class AuthenticatedSession:
    session: Session
    user: User
    token: str


def utc_now() -> datetime:
    return datetime.now(UTC)


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def create_session(
    db: DBSession,
    user: User,
    client_type: ClientType,
    settings: Settings,
) -> tuple[str, Session]:
    now = utc_now()
    ttl = (
        timedelta(days=settings.android_session_ttl_days)
        if client_type == ClientType.ANDROID
        else timedelta(minutes=settings.session_ttl_minutes)
    )
    raw_token = generate_session_token()
    session = Session(
        user_id=user.id,
        credential_hash=hash_session_token(raw_token),
        expires_at=now + ttl,
        last_activity_at=now,
    )
    db.add(session)
    db.flush()
    return raw_token, session


def _session_error() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")


def authenticate_session(db: DBSession, token: str, settings: Settings) -> AuthenticatedSession:
    session = db.scalar(
        select(Session).options(joinedload(Session.user)).where(Session.credential_hash == hash_session_token(token))
    )
    now = utc_now()
    if session is None or session.user is None:
        raise _session_error()
    if session.revoked_at is not None or session.expires_at <= now:
        raise _session_error()
    if session.last_activity_at + timedelta(minutes=settings.session_idle_timeout_minutes) <= now:
        session.revoked_at = now
        db.commit()
        raise _session_error()
    if not session.user.is_active:
        session.revoked_at = now
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    if session.last_activity_at + timedelta(minutes=1) <= now:
        session.last_activity_at = now
        db.commit()
    return AuthenticatedSession(session=session, user=session.user, token=token)


def extract_session_token(request: Request, settings: Settings) -> str | None:
    cookie_token = request.cookies.get(settings.session_cookie_name)
    if cookie_token:
        return cookie_token

    authorization = request.headers.get("authorization", "")
    scheme, _, value = authorization.partition(" ")
    if scheme.casefold() == "bearer" and value:
        return value.strip()
    return request.headers.get("x-session-id") or None


def set_session_cookie(response, token: str, expires_at: datetime, settings: Settings) -> None:
    max_age = max(0, int((expires_at - utc_now()).total_seconds()))
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=settings.session_cookie_secure or settings.app_env == "production",
        samesite=settings.session_cookie_samesite,
        path="/",
    )


def clear_session_cookie(response, settings: Settings) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/")


def require_roles(*allowed_roles) -> Callable:
    allowed = set(allowed_roles)
    from app.dependencies.auth import get_current_auth

    def dependency(auth: AuthenticatedSession = Depends(get_current_auth)):
        if auth.user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return auth

    return dependency


def authenticate_credentials(user: User | None, password: str) -> bool:
    return user is not None and user.is_active and verify_password(password, user.password_hash)


__all__ = [
    "AuthenticatedSession",
    "authenticate_credentials",
    "authenticate_session",
    "create_session",
    "extract_session_token",
    "normalize_email",
    "require_roles",
    "set_session_cookie",
    "clear_session_cookie",
    "utc_now",
    "hash_password",
]
