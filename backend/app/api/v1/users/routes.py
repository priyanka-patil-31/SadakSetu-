from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.core.security import hash_password, verify_password
from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import Complaint, Session, User, UserRole
from app.schemas.users import (
    PasswordUpdateRequest,
    UserListResponse,
    UserPreferences,
    UserProfileUpdate,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
)
from app.services.auth import AuthenticatedSession, normalize_email, require_roles, utc_now

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
def list_users(
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=160),
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> UserListResponse:
    filters = []
    if search:
        search_term = f"%{search.strip().casefold()}%"
        filters.append(or_(func.lower(User.email).like(search_term), func.lower(User.full_name).like(search_term)))
    if role is not None:
        filters.append(User.role == role)
    if is_active is not None:
        filters.append(User.is_active == is_active)

    total = db.scalar(select(func.count()).select_from(User).where(*filters)) or 0
    user_rows = db.execute(
        select(User, func.count(Complaint.id).label("complaints_submitted"))
        .outerjoin(Complaint, Complaint.reporter_id == User.id)
        .where(*filters)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = [
        UserResponse.model_validate(user).model_copy(update={"complaints_submitted": complaints_submitted})
        for user, complaints_submitted in user_rows
    ]
    return UserListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/me", response_model=UserResponse)
def get_my_profile(auth: AuthenticatedSession = Depends(get_current_auth)) -> User:
    return auth.user


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    payload: UserProfileUpdate,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> User:
    user = auth.user
    if payload.email is not None:
        normalized = normalize_email(str(payload.email))
        existing = db.scalar(select(User).where(User.email == normalized, User.id != user.id))
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
            )
        user.email = normalized
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip() or None
    if payload.area is not None:
        user.area = payload.area.strip() or None
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
        ) from exc
    return user


@router.patch("/me/password", response_model=dict[str, str])
def update_my_password(
    payload: PasswordUpdateRequest,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> dict[str, str]:
    if not verify_password(payload.current_password, auth.user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    auth.user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.get("/me/preferences", response_model=UserPreferences)
def get_my_preferences(auth: AuthenticatedSession = Depends(get_current_auth)) -> UserPreferences:
    return UserPreferences.model_validate(auth.user.preferences or {})


@router.patch("/me/preferences", response_model=UserPreferences)
def update_my_preferences(
    payload: UserPreferences,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> UserPreferences:
    auth.user.preferences = payload.model_dump()
    db.commit()
    db.refresh(auth.user)
    return UserPreferences.model_validate(auth.user.preferences)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user_profile(
    user_id: UUID,
    payload: UserProfileUpdate,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.email is not None:
        normalized = normalize_email(str(payload.email))
        existing = db.scalar(select(User).where(User.email == normalized, User.id != user.id))
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
            )
        user.email = normalized
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip() or None
    if payload.area is not None:
        user.area = payload.area.strip() or None
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
        ) from exc
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> User:
    if auth.user.id != user_id and auth.user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_active and not payload.is_active and user.role == UserRole.ADMIN:
        active_admins = db.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        )
        if active_admins is not None and active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="The last active administrator cannot be deactivated"
            )
    user.is_active = payload.is_active
    if not payload.is_active:
        db.execute(
            update(Session).where(Session.user_id == user.id, Session.revoked_at.is_(None)).values(revoked_at=utc_now())
        )
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == UserRole.ADMIN and payload.role != UserRole.ADMIN and user.is_active:
        active_admins = db.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        )
        if active_admins is not None and active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="The last active administrator cannot be demoted"
            )
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user
