import csv
from datetime import UTC, date, datetime, time
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.orm import joinedload

from app.database.dependencies import get_db
from app.models import AIDetection, Complaint, ComplaintImage, ComplaintStatus, DetectionStatus, SeverityLevel, UserRole
from app.schemas.reports import AreaReport, MonthlyTrend, ReportSummary, TeamPerformance
from app.services.auth import AuthenticatedSession, require_roles

router = APIRouter(prefix="/reports", tags=["reports"])


def _bounds(start_date: date | None, end_date: date | None) -> tuple[datetime | None, datetime | None]:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise ValueError("end_date must be on or after start_date")
    start = datetime.combine(start_date, time.min, tzinfo=UTC) if start_date else None
    end = datetime.combine(end_date, time.max, tzinfo=UTC) if end_date else None
    return start, end


def _complaints(db: DBSession, start_date: date | None, end_date: date | None) -> list[Complaint]:
    start, end = _bounds(start_date, end_date)
    filters = []
    if start:
        filters.append(Complaint.created_at >= start)
    if end:
        filters.append(Complaint.created_at <= end)
    return db.scalars(
        select(Complaint)
        .options(joinedload(Complaint.location), joinedload(Complaint.assigned_team))
        .where(*filters)
        .order_by(Complaint.created_at.asc())
    ).unique().all()


def _summary(db: DBSession, start_date: date | None, end_date: date | None) -> ReportSummary:
    complaints = _complaints(db, start_date, end_date)
    severity_distribution = {level.value: 0 for level in SeverityLevel}
    severity_resolved_distribution = {level.value: 0 for level in SeverityLevel}
    monthly: dict[str, MonthlyTrend] = {}
    areas: dict[str, AreaReport] = {}
    teams: dict[str, TeamPerformance] = {}
    for complaint in complaints:
        severity_distribution[complaint.severity.value] += 1
        month = complaint.created_at.strftime("%Y-%m")
        if month not in monthly:
            monthly[month] = MonthlyTrend(month=month, total=0, resolved=0)
        monthly[month].total += 1
        if complaint.status == ComplaintStatus.RESOLVED:
            monthly[month].resolved += 1
            severity_resolved_distribution[complaint.severity.value] += 1
        area = complaint.location.area if complaint.location and complaint.location.area else "Area Not Provided"
        if area not in areas:
            areas[area] = AreaReport(area=area, total=0, critical=0, resolved=0)
        areas[area].total += 1
        if complaint.status == ComplaintStatus.RESOLVED:
            areas[area].resolved += 1
        if complaint.severity == SeverityLevel.CRITICAL:
            areas[area].critical += 1
        if complaint.assigned_team is not None:
            key = str(complaint.assigned_team.id)
            if key not in teams:
                teams[key] = TeamPerformance(
                    team_id=key, team_name=complaint.assigned_team.name, assigned=0, resolved=0, open=0
                )
            teams[key].assigned += 1
            if complaint.status == ComplaintStatus.RESOLVED:
                teams[key].resolved += 1
            else:
                teams[key].open += 1

    complaint_ids = [complaint.id for complaint in complaints]
    detections = (
        db.scalars(
            select(AIDetection)
            .join(ComplaintImage, ComplaintImage.id == AIDetection.complaint_image_id)
            .where(ComplaintImage.complaint_id.in_(complaint_ids))
        ).all()
        if complaint_ids
        else []
    )
    detection_stats = {
        "total": len(detections),
        "completed": sum(item.status == DetectionStatus.COMPLETED for item in detections),
        "failed": sum(item.status == DetectionStatus.FAILED for item in detections),
        "pending": sum(item.status == DetectionStatus.PENDING for item in detections),
        "detections": sum(item.detection_count for item in detections),
    }
    return ReportSummary(
        generated_at=datetime.now(UTC),
        start_date=datetime.combine(start_date, time.min, tzinfo=UTC) if start_date else None,
        end_date=datetime.combine(end_date, time.max, tzinfo=UTC) if end_date else None,
        total_complaints=len(complaints),
        pending_complaints=sum(
            item.status not in {ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED} for item in complaints
        ),
        resolved_complaints=sum(item.status == ComplaintStatus.RESOLVED for item in complaints),
        rejected_complaints=sum(item.status == ComplaintStatus.REJECTED for item in complaints),
        severity_distribution=severity_distribution,
        severity_resolved_distribution=severity_resolved_distribution,
        monthly_trends=list(monthly.values()),
        area_distribution=list(areas.values()),
        team_performance=list(teams.values()),
        ai_detection_statistics=detection_stats,
    )


@router.get("/summary", response_model=ReportSummary)
def report_summary(
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
) -> ReportSummary:
    try:
        return _summary(db, start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/complaints.csv")
def complaint_csv(
    _: AuthenticatedSession = Depends(require_roles(UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
) -> Response:
    try:
        complaints = _complaints(db, start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["complaint_number", "status", "severity", "title", "area", "assigned_team", "created_at"])
    for complaint in complaints:
        writer.writerow(
            [
                complaint.complaint_number,
                complaint.status.value,
                complaint.severity.value,
                complaint.title,
                (complaint.location.area if complaint.location and complaint.location.area else "Area Not Provided"),
                complaint.assigned_team.name if complaint.assigned_team else "",
                complaint.created_at.isoformat(),
            ]
        )
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sadaksetu-complaints.csv"},
    )
