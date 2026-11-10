from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models import Complaint, ComplaintStatus, ComplaintUpdate, RepairTeam, TeamAssignment, TeamAvailability
from app.services.audit import record_audit
from app.services.complaints import validate_status_transition
from app.services.notifications import create_notifications


def assign_complaint(
    db: DBSession,
    complaint_id: UUID,
    team_id: UUID,
    actor_id: UUID,
    note: str | None,
) -> TeamAssignment:
    """Assign or reassign a complaint while holding row locks for the transaction."""

    complaint = db.scalar(select(Complaint).where(Complaint.id == complaint_id).with_for_update())
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    team = db.scalar(select(RepairTeam).where(RepairTeam.id == team_id).with_for_update())
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repair team not found")
    if not team.is_active or team.availability == TeamAvailability.OFF_DUTY:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Repair team is not available")
    if complaint.status in {ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Terminal complaints cannot be assigned")

    active_assignments = db.scalars(
        select(TeamAssignment)
        .where(TeamAssignment.complaint_id == complaint.id, TeamAssignment.status == "ACTIVE")
        .with_for_update()
    ).all()
    if any(assignment.team_id == team.id for assignment in active_assignments):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Complaint is already assigned to this team")

    now = datetime.now(UTC)
    previous_team_id = complaint.assigned_team_id
    for assignment in active_assignments:
        assignment.status = "RELEASED"
        assignment.released_at = now

    if complaint.status != ComplaintStatus.ASSIGNED:
        validate_status_transition(complaint.status, ComplaintStatus.ASSIGNED)
        old_status = complaint.status
        complaint.status = ComplaintStatus.ASSIGNED
    else:
        old_status = complaint.status
    complaint.assigned_team_id = team.id
    assignment = TeamAssignment(
        complaint_id=complaint.id,
        team_id=team.id,
        assigned_by_id=actor_id,
        status="ACTIVE",
    )
    db.add(assignment)
    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            actor_id=actor_id,
            event_type="REASSIGNED" if previous_team_id else "ASSIGNED",
            old_value=str(previous_team_id) if previous_team_id else old_status.value,
            new_value=str(team.id),
            note=note,
        )
    )
    create_notifications(
        db,
        [complaint.reporter_id],
        "ASSIGNMENT",
        "Complaint assigned",
        f"Complaint {complaint.complaint_number} was assigned to a repair team.",
        complaint_id=complaint.id,
        team_id=team.id,
    )
    record_audit(
        db,
        actor_id=actor_id,
        action="REASSIGN" if previous_team_id else "ASSIGN",
        entity_type="Complaint",
        entity_id=complaint.id,
        after_data={"team_id": str(team.id), "status": complaint.status.value},
    )
    db.flush()
    return assignment


def release_complaint_assignment(
    db: DBSession,
    complaint_id: UUID,
    actor_id: UUID,
    note: str | None,
) -> None:
    complaint = db.scalar(select(Complaint).where(Complaint.id == complaint_id).with_for_update())
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    active_assignments = db.scalars(
        select(TeamAssignment)
        .where(TeamAssignment.complaint_id == complaint.id, TeamAssignment.status == "ACTIVE")
        .with_for_update()
    ).all()
    if not active_assignments:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Complaint has no active assignment")
    now = datetime.now(UTC)
    for assignment in active_assignments:
        assignment.status = "RELEASED"
        assignment.released_at = now
    previous_team_id = complaint.assigned_team_id
    complaint.assigned_team_id = None
    if complaint.status == ComplaintStatus.ASSIGNED:
        complaint.status = ComplaintStatus.UNDER_REVIEW
        new_status = ComplaintStatus.UNDER_REVIEW.value
    else:
        new_status = complaint.status.value
    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            actor_id=actor_id,
            event_type="ASSIGNMENT_RELEASED",
            old_value=str(previous_team_id) if previous_team_id else None,
            new_value=new_status,
            note=note,
        )
    )
    create_notifications(
        db,
        [complaint.reporter_id],
        "ASSIGNMENT_RELEASED",
        "Complaint assignment released",
        f"Complaint {complaint.complaint_number} is back in operational review.",
        complaint_id=complaint.id,
    )
    record_audit(
        db,
        actor_id=actor_id,
        action="RELEASE_ASSIGNMENT",
        entity_type="Complaint",
        entity_id=complaint.id,
        after_data={"status": complaint.status.value},
    )
