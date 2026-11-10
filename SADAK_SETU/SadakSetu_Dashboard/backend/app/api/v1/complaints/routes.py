from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.orm import joinedload

from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import Complaint, ComplaintStatus, ComplaintUpdate, Location, SeverityLevel, User, UserRole
from app.schemas.complaints import (
    ComplaintCreate,
    ComplaintDeleteRequest,
    ComplaintHistoryResponse,
    ComplaintListResponse,
    ComplaintNoteCreate,
    ComplaintResponse,
    ComplaintStatusUpdate,
    ComplaintUpdateResponse,
)
from app.services.audit import record_audit
from app.services.auth import AuthenticatedSession, require_roles
from app.services.complaints import validate_status_transition
from app.services.notifications import create_notifications

router = APIRouter(prefix="/complaints", tags=["complaints"])


def complaint_number() -> str:
    return f"SS-{datetime.now(UTC):%Y%m%d}-{uuid4().hex[:12].upper()}"


def _visible_query(auth: AuthenticatedSession):
    if auth.user.role == UserRole.ADMIN:
        return []
    if auth.user.role == UserRole.CITIZEN:
        return [Complaint.reporter_id == auth.user.id]
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Complaint access is not enabled for this role")


def _get_visible_complaint(db: DBSession, auth: AuthenticatedSession, complaint_id: UUID) -> Complaint:
    complaint = db.scalar(select(Complaint).options(joinedload(Complaint.location)).where(Complaint.id == complaint_id))
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if auth.user.role != UserRole.ADMIN and complaint.reporter_id != auth.user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return complaint


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.CITIZEN, UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> Complaint:
    location = Location(
        latitude=payload.location.latitude,
        longitude=payload.location.longitude,
        point=WKTElement(
            f"POINT({payload.location.longitude} {payload.location.latitude})",
            srid=4326,
        ),
        address=payload.location.address,
        area=payload.location.area,
        zone=payload.location.zone,
    )
    complaint = Complaint(
        complaint_number=complaint_number(),
        reporter_id=auth.user.id,
        status=ComplaintStatus.SUBMITTED,
        severity=SeverityLevel.MEDIUM,
        title=payload.title.strip(),
        description=payload.description.strip(),
        location=location,
    )
    db.add(complaint)
    db.flush()
    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            actor_id=auth.user.id,
            event_type="CREATED",
            new_value=ComplaintStatus.SUBMITTED.value,
            note="Complaint submitted",
        )
    )
    admin_ids = db.scalars(select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True))).all()
    create_notifications(
        db,
        admin_ids,
        "NEW_COMPLAINT",
        "New complaint submitted",
        f"Complaint {complaint.complaint_number} is ready for review.",
        complaint_id=complaint.id,
    )
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("", response_model=ComplaintListResponse)
def list_complaints(
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=240),
    complaint_status: ComplaintStatus | None = Query(default=None, alias="status"),
    severity: str | None = Query(default=None),
    area: str | None = Query(default=None, max_length=160),
) -> ComplaintListResponse:
    filters = _visible_query(auth)
    if complaint_status is not None:
        filters.append(Complaint.status == complaint_status)
    if severity is not None:
        filters.append(Complaint.severity == severity.upper())
    if area:
        filters.append(Location.area.ilike(f"%{area.strip()}%"))
    if search:
        search_term = f"%{search.strip()}%"
        filters.append(Complaint.title.ilike(search_term) | Complaint.complaint_number.ilike(search_term))

    base_query = select(Complaint).join(Location).where(*filters)
    total = db.scalar(select(func.count()).select_from(base_query.subquery())) or 0
    items = db.scalars(
        base_query.options(joinedload(Complaint.location))
        .order_by(Complaint.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ComplaintListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    complaint_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> Complaint:
    return _get_visible_complaint(db, auth, complaint_id)


@router.get("/{complaint_id}/history", response_model=ComplaintHistoryResponse)
def complaint_history(
    complaint_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> ComplaintHistoryResponse:
    complaint = _get_visible_complaint(db, auth, complaint_id)
    updates = db.scalars(
        select(ComplaintUpdate)
        .where(ComplaintUpdate.complaint_id == complaint.id)
        .order_by(ComplaintUpdate.created_at.asc())
    ).all()
    return ComplaintHistoryResponse(items=updates)


@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
def update_status(
    complaint_id: UUID,
    payload: ComplaintStatusUpdate,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> Complaint:
    complaint = db.scalar(
        select(Complaint)
        .where(Complaint.id == complaint_id)
        .with_for_update()
    )
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if auth.user.role != UserRole.ADMIN and complaint.reporter_id != auth.user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    validate_status_transition(complaint.status, payload.status)
    old_status = complaint.status
    complaint.status = payload.status
    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            actor_id=auth.user.id,
            event_type="STATUS_CHANGED",
            old_value=old_status.value,
            new_value=payload.status.value,
            note=payload.note,
        )
    )
    create_notifications(
        db,
        [complaint.reporter_id],
        "RESOLUTION" if payload.status == ComplaintStatus.RESOLVED else "COMPLAINT_STATUS",
        "Complaint status updated",
        f"Complaint {complaint.complaint_number} is now {payload.status.value}.",
        complaint_id=complaint.id,
    )
    record_audit(
        db,
        actor_id=auth.user.id,
        action="STATUS_CHANGED",
        entity_type="Complaint",
        entity_id=complaint.id,
        after_data={"status": payload.status.value},
    )
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/notes", response_model=ComplaintUpdateResponse, status_code=status.HTTP_201_CREATED)
def add_note(
    complaint_id: UUID,
    payload: ComplaintNoteCreate,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> ComplaintUpdate:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    update = ComplaintUpdate(
        complaint_id=complaint.id,
        actor_id=auth.user.id,
        event_type="ADMIN_NOTE",
        note=payload.note.strip(),
    )
    db.add(update)
    db.commit()
    db.refresh(update)
    return update


@router.delete("/{complaint_id}", response_model=dict[str, str])
def delete_invalid_complaint(
    complaint_id: UUID,
    payload: ComplaintDeleteRequest,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> dict[str, str]:
    complaint = db.scalar(select(Complaint).options(joinedload(Complaint.location)).where(Complaint.id == complaint_id))
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if auth.user.role == UserRole.CITIZEN:
        if complaint.reporter_id != auth.user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if complaint.status != ComplaintStatus.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Citizens can delete only their own submitted complaints",
            )
    elif auth.user.role == UserRole.ADMIN:
        if complaint.status not in {ComplaintStatus.SUBMITTED, ComplaintStatus.REJECTED}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Only invalid or rejected complaints can be deleted"
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    record_audit(
        db,
        actor_id=auth.user.id,
        action="DELETE_COMPLAINT",
        entity_type="Complaint",
        entity_id=complaint.id,
        before_data={"status": complaint.status.value, "reason": payload.reason},
    )
    location = complaint.location
    db.delete(complaint)
    db.flush()
    if (
        location is not None
        and db.scalar(select(func.count()).select_from(Complaint).where(Complaint.location_id == location.id)) == 0
    ):
        db.delete(location)
    db.commit()
    return {"message": f"Complaint deleted: {payload.reason}"}
