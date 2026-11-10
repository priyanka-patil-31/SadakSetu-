from fastapi import HTTPException, status

from app.models.enums import ComplaintStatus

VALID_STATUS_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    ComplaintStatus.SUBMITTED: {
        ComplaintStatus.UNDER_REVIEW,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.REJECTED,
    },
    ComplaintStatus.UNDER_REVIEW: {
        ComplaintStatus.AI_PROCESSING,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.REJECTED,
    },
    ComplaintStatus.AI_PROCESSING: {
        ComplaintStatus.UNDER_REVIEW,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.REJECTED,
    },
    ComplaintStatus.ASSIGNED: {ComplaintStatus.IN_PROGRESS, ComplaintStatus.REJECTED},
    ComplaintStatus.IN_PROGRESS: {ComplaintStatus.RESOLVED},
    ComplaintStatus.RESOLVED: set(),
    ComplaintStatus.REJECTED: set(),
}


def validate_status_transition(current: ComplaintStatus, requested: ComplaintStatus) -> None:
    if requested == current:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Complaint is already in this status")
    if requested not in VALID_STATUS_TRANSITIONS[current]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid complaint status transition: {current} -> {requested}",
        )


__all__ = ["VALID_STATUS_TRANSITIONS", "validate_status_transition"]
