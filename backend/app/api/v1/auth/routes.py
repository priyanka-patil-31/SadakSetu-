from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.core.security import hash_password
from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth, get_current_user
from app.models import Session, User, UserRole
from app.schemas.auth import (
    AuthResponse,
    AuthUserResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ForgotPasswordRequest,
    SessionResponse,
)
from app.services.audit import record_audit
from app.services.auth import (
    AuthenticatedSession,
    authenticate_credentials,
    clear_session_cookie,
    create_session,
    normalize_email,
    require_roles,
    set_session_cookie,
    utc_now,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


def _auth_response(response: Response, user: User, token: str, session, client_type) -> AuthResponse:
    settings = get_settings()
    if client_type.value == "browser":
        set_session_cookie(response, token, session.expires_at, settings)
        response_token = None
    else:
        response_token = token
    return AuthResponse(
        user=AuthUserResponse.model_validate(user), session_id=response_token, expires_at=session.expires_at
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: DBSession = Depends(get_db)) -> AuthResponse:
    settings = get_settings()
    if len(payload.password) < settings.password_min_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password does not meet requirements"
        )
    email = normalize_email(str(payload.email))
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        role=UserRole.CITIZEN,
    )
    try:
        db.add(user)
        db.flush()
        token, session = create_session(db, user, payload.client_type, settings)
        record_audit(db, actor_id=user.id, action="REGISTER", entity_type="User", entity_id=user.id)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
        ) from exc
    return _auth_response(response, user, token, session, payload.client_type)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: DBSession = Depends(get_db)) -> AuthResponse:
    settings = get_settings()
    user = db.scalar(select(User).where(User.email == normalize_email(str(payload.email))))
    if not authenticate_credentials(user, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token, session = create_session(db, user, payload.client_type, settings)
    record_audit(db, actor_id=user.id, action="LOGIN", entity_type="User", entity_id=user.id)
    db.commit()
    return _auth_response(response, user, token, session, payload.client_type)




@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: DBSession = Depends(get_db)) -> MessageResponse:
    settings = get_settings()
    if len(payload.new_password) < settings.password_min_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Password must be at least {settings.password_min_length} characters"
        )
    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found with this email address")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    user.password_hash = hash_password(payload.new_password)
    db.execute(
        update(Session).where(Session.user_id == user.id, Session.revoked_at.is_(None)).values(revoked_at=utc_now())
    )
    record_audit(db, actor_id=user.id, action="PASSWORD_RESET", entity_type="User", entity_id=user.id)
    db.commit()
    return MessageResponse(message="Password reset successfully. You can now sign in with your new password.")


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response, auth: AuthenticatedSession = Depends(get_current_auth), db: DBSession = Depends(get_db)):
    auth.session.revoked_at = utc_now()
    record_audit(db, actor_id=auth.user.id, action="LOGOUT", entity_type="Session", entity_id=auth.session.id)
    db.commit()
    clear_session_cookie(response, get_settings())
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=AuthUserResponse)
def current_user(user: User = Depends(get_current_user)) -> User:
    return user


@router.get("/session", response_model=SessionResponse)
def current_session(auth: AuthenticatedSession = Depends(get_current_auth)):
    return auth.session


@router.get("/admin-check", response_model=MessageResponse)
def admin_check(
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
) -> MessageResponse:
    return MessageResponse(message="Administrator access granted")
