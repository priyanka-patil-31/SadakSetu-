from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.database.dependencies import get_db
from app.models import User
from app.services.auth import AuthenticatedSession, authenticate_session, extract_session_token


def get_current_auth(request: Request, db: DBSession = Depends(get_db)) -> AuthenticatedSession:
    settings = get_settings()
    token = extract_session_token(request, settings)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return authenticate_session(db, token, settings)


def get_current_user(auth: AuthenticatedSession = Depends(get_current_auth)) -> User:
    return auth.user


__all__ = ["get_current_auth", "get_current_user"]
