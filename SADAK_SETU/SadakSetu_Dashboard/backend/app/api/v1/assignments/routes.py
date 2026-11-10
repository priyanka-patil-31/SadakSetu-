from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import Complaint, TeamAssignment, UserRole
from app.schemas.assignments import AssignmentCreate, AssignmentHistoryResponse, AssignmentResponse
from app.services.assignments import assign_complaint, release_complaint_assignment
from app.services.auth import AuthenticatedSession, require_roles

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.post(
    "/complaints/{complaint_id}",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    complaint_id: UUID,
    payload: AssignmentCreate,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> TeamAssignment:
    assignment = assign_complaint(db, complaint_id, payload.team_id, auth.user.id, payload.note)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/complaints/{complaint_id}/release", response_model=dict[str, str])
def release_assignment(
    complaint_id: UUID,
    note: str | None = None,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> dict[str, str]:
    release_complaint_assignment(db, complaint_id, auth.user.id, note)
    db.commit()
    return {"message": "Complaint assignment released"}


@router.get("/complaints/{complaint_id}", response_model=AssignmentHistoryResponse)
def complaint_assignment_history(
    complaint_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> AssignmentHistoryResponse:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if auth.user.role != UserRole.ADMIN and complaint.reporter_id != auth.user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    items = db.scalars(
        select(TeamAssignment)
        .where(TeamAssignment.complaint_id == complaint_id)
        .order_by(TeamAssignment.created_at.desc())
    ).all()
    return AssignmentHistoryResponse(items=items)
