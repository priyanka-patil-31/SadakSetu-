from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.database.dependencies import get_db
from app.models import Complaint, RepairTeam, TeamAssignment, UserRole
from app.schemas.teams import (
    AssignedComplaintResponse,
    TeamAssignmentResponse,
    TeamAvailabilityUpdate,
    TeamCreate,
    TeamListResponse,
    TeamResponse,
    TeamUpdate,
)
from app.services.auth import AuthenticatedSession, require_roles

router = APIRouter(prefix="/teams", tags=["repair-teams"])


def _get_team(db: DBSession, team_id: UUID) -> RepairTeam:
    team = db.get(RepairTeam, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repair team not found")
    return team


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> RepairTeam:
    team = RepairTeam(
        name=payload.name.strip(),
        lead_name=payload.lead_name.strip(),
        phone=payload.phone.strip(),
        email=str(payload.email).casefold(),
        zone=payload.zone.strip(),
        members=payload.members,
        specialties=[item.strip() for item in payload.specialties if item.strip()],
        availability=payload.availability,
    )
    db.add(team)
    try:
        db.commit()
        db.refresh(team)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A repair team with this name already exists"
        ) from exc
    return team


@router.get("", response_model=TeamListResponse)
def list_teams(
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=160),
    availability: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
) -> TeamListResponse:
    filters = []
    if search:
        search_term = f"%{search.strip().casefold()}%"
        filters.append(
            func.lower(RepairTeam.name).like(search_term) | func.lower(RepairTeam.lead_name).like(search_term)
        )
    if availability:
        filters.append(RepairTeam.availability == availability.upper())
    if is_active is not None:
        filters.append(RepairTeam.is_active == is_active)
    total = db.scalar(select(func.count()).select_from(RepairTeam).where(*filters)) or 0
    team_rows = db.execute(
        select(RepairTeam, func.count(Complaint.id).label("assigned_work_count"))
        .outerjoin(Complaint, Complaint.assigned_team_id == RepairTeam.id)
        .where(*filters)
        .group_by(RepairTeam.id)
        .order_by(RepairTeam.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = [
        TeamResponse.model_validate(team).model_copy(update={"assigned_work_count": assigned_work_count})
        for team, assigned_work_count in team_rows
    ]
    return TeamListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: UUID,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> RepairTeam:
    return _get_team(db, team_id)


@router.patch("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: UUID,
    payload: TeamUpdate,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> RepairTeam:
    team = _get_team(db, team_id)
    for field in ("name", "lead_name", "phone", "zone", "availability", "is_active"):
        value = getattr(payload, field)
        if value is not None:
            setattr(team, field, value.strip() if isinstance(value, str) else value)
    if payload.members is not None:
        team.members = payload.members
    if payload.specialties is not None:
        team.specialties = [item.strip() for item in payload.specialties if item.strip()]
    if payload.email is not None:
        team.email = str(payload.email).casefold()
    try:
        db.commit()
        db.refresh(team)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A repair team with this name already exists"
        ) from exc
    return team


@router.patch("/{team_id}/availability", response_model=TeamResponse)
def update_team_availability(
    team_id: UUID,
    payload: TeamAvailabilityUpdate,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> RepairTeam:
    team = _get_team(db, team_id)
    team.availability = payload.availability
    db.commit()
    db.refresh(team)
    return team


@router.delete("/{team_id}", response_model=dict[str, str])
def delete_team(
    team_id: UUID,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> dict[str, str]:
    team = _get_team(db, team_id)
    assignment_exists = db.scalar(
        select(func.count()).select_from(TeamAssignment).where(TeamAssignment.team_id == team.id)
    )
    complaint_exists = db.scalar(
        select(func.count()).select_from(Complaint).where(Complaint.assigned_team_id == team.id)
    )
    if assignment_exists or complaint_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Teams with assignment history or assigned complaints cannot be deleted",
        )
    db.delete(team)
    db.commit()
    return {"message": "Repair team deleted"}


@router.get("/{team_id}/complaints", response_model=list[AssignedComplaintResponse])
def assigned_complaints(
    team_id: UUID,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> list[Complaint]:
    _get_team(db, team_id)
    return db.scalars(
        select(Complaint)
        .where(Complaint.assigned_team_id == team_id)
        .order_by(Complaint.created_at.desc())
    ).all()


@router.get("/{team_id}/assignments", response_model=list[TeamAssignmentResponse])
def assignment_history(
    team_id: UUID,
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> list[TeamAssignment]:
    _get_team(db, team_id)
    return db.scalars(
        select(TeamAssignment)
        .where(TeamAssignment.team_id == team_id)
        .order_by(TeamAssignment.created_at.desc())
    ).all()
