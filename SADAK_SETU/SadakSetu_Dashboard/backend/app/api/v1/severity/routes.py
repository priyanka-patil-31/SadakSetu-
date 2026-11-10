from uuid import UUID

from ai_service.severity.service import classify_detections
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import (
    AIDetection,
    Complaint,
    ComplaintImage,
    ComplaintUpdate,
    DetectionStatus,
    SeverityRecord,
    UserRole,
)
from app.schemas.severity import SeverityRecordResponse, SeverityReviewRequest
from app.services.auth import AuthenticatedSession, require_roles

router = APIRouter(tags=["severity"])


def _visible_complaint(db: DBSession, auth: AuthenticatedSession, complaint_id: UUID) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if auth.user.role != UserRole.ADMIN and complaint.reporter_id != auth.user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return complaint


def _visible_image(db: DBSession, auth: AuthenticatedSession, image_id: UUID) -> ComplaintImage:
    image = db.get(ComplaintImage, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    if auth.user.role != UserRole.ADMIN:
        complaint = db.get(Complaint, image.complaint_id)
        if complaint is None or complaint.reporter_id != auth.user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return image


@router.post(
    "/ai/images/{image_id}/severity",
    response_model=SeverityRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def classify_image_severity(
    image_id: UUID,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.CITIZEN, UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> SeverityRecord:
    image = _visible_image(db, auth, image_id)
    detection = db.scalar(
        select(AIDetection)
        .where(
            AIDetection.complaint_image_id == image.id,
            AIDetection.status == DetectionStatus.COMPLETED,
        )
        .order_by(AIDetection.created_at.desc())
    )
    if detection is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A completed AI detection is required before severity classification",
        )
    metadata = detection.result_metadata or {}
    detections = metadata.get("detections")
    image_width = metadata.get("image_width")
    image_height = metadata.get("image_height")
    if not isinstance(detections, list) or not isinstance(image_width, int) or not isinstance(image_height, int):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Detection metadata lacks the image measurements required for severity classification",
        )
    try:
        assessment = classify_detections(detections, image_width, image_height, get_settings())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    complaint = db.get(Complaint, image.complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    record = SeverityRecord(
        complaint_id=complaint.id,
        severity=assessment.severity,
        method=assessment.method,
        method_version=assessment.method_version,
        measurements=assessment.measurements,
        limitations=assessment.limitations,
    )
    complaint.severity = assessment.severity
    db.add(record)
    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            actor_id=None,
            event_type="SEVERITY_CLASSIFIED",
            new_value=assessment.severity.value,
            note="Image-based heuristic classification; human review required",
        )
    )
    db.commit()
    db.refresh(record)
    return record


@router.get("/complaints/{complaint_id}/severity", response_model=list[SeverityRecordResponse])
def severity_history(
    complaint_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> list[SeverityRecord]:
    complaint = _visible_complaint(db, auth, complaint_id)
    return db.scalars(
        select(SeverityRecord)
        .where(SeverityRecord.complaint_id == complaint.id)
        .order_by(SeverityRecord.created_at.desc())
    ).all()


@router.post(
    "/complaints/{complaint_id}/severity/review",
    response_model=SeverityRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def review_severity(
    complaint_id: UUID,
    payload: SeverityReviewRequest,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> SeverityRecord:
    complaint = _visible_complaint(db, auth, complaint_id)
    old_severity = complaint.severity
    record = SeverityRecord(
        complaint_id=complaint.id,
        created_by_id=auth.user.id,
        severity=payload.severity,
        method="ADMIN_REVIEW",
        method_version="1.0",
        measurements={"previous_severity": old_severity.value},
        limitations="Administrative review supersedes the prior operational estimate.",
    )
    complaint.severity = payload.severity
    db.add(record)
    db.add(
        ComplaintUpdate(
            complaint_id=complaint.id,
            actor_id=auth.user.id,
            event_type="SEVERITY_REVIEWED",
            old_value=old_severity.value,
            new_value=payload.severity.value,
            note=payload.note,
        )
    )
    db.commit()
    db.refresh(record)
    return record
