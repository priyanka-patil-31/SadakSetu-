from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models.entities import Feedback, Notification, User
from app.models.enums import UserRole
from app.services.auth import AuthenticatedSession, authenticate_session, extract_session_token

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    category: str = Field(default="Road Repair Quality", description="Category of feedback or support request")
    message: str = Field(min_length=1, max_length=2000, description="Feedback or support message content")
    rating: int = Field(default=5, ge=1, le=5, description="Star rating 1 to 5")
    complaint_id: Optional[str] = None
    complaint_ticket: Optional[str] = None
    location: Optional[str] = None
    # Optional fields if sent by client, but backend automatically overrides with authenticated user
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    user_id: Optional[str] = None


class FeedbackStatusUpdate(BaseModel):
    status: str = Field(pattern="^(OPEN|IN_PROGRESS|RESOLVED)$")


class FeedbackReply(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)
    status: Optional[str] = Field(default="RESOLVED", pattern="^(OPEN|IN_PROGRESS|RESOLVED)$")


def _format_feedback_dict(fb: Feedback) -> dict:
    created_str = fb.created_at.strftime("%d %b %Y, %I:%M %p") if fb.created_at else ""
    replied_str = fb.replied_at.strftime("%d %b %Y, %I:%M %p") if fb.replied_at else None
    
    # Map status to UI friendly format
    status_display = {
        "OPEN": "Needs Attention" if fb.rating <= 2 else "Reviewed",
        "IN_PROGRESS": "In Progress",
        "RESOLVED": "Resolved",
    }.get(fb.status.upper(), "Reviewed")

    return {
        "id": fb.ticket_number,
        "raw_id": str(fb.id),
        "user_id": str(fb.user_id),
        "citizenName": fb.citizen_name,
        "citizenEmail": fb.citizen_email,
        "location": fb.location or "Indiranagar, Ward 112",
        "category": fb.category,
        "comment": fb.message,
        "message": fb.message,
        "rating": fb.rating,
        "status": status_display,
        "raw_status": fb.status.upper(),
        "sentiment": fb.sentiment,
        "complaintId": fb.complaint_ticket or (str(fb.complaint_id) if fb.complaint_id else "Civic Feedback"),
        "date": created_str,
        "created_at": fb.created_at.isoformat() if fb.created_at else None,
        "adminReply": fb.admin_reply,
        "repliedAt": replied_str,
    }


@router.get("", response_model=List[dict])
def list_feedback(
    request: Request,
    db: DBSession = Depends(get_db),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    """List feedback. Admins view all; citizens view their own submissions."""
    settings = get_settings()
    token = extract_session_token(request, settings)
    auth: Optional[AuthenticatedSession] = None
    if token:
        try:
            auth = authenticate_session(db, token, settings)
        except Exception:
            pass

    query = select(Feedback).order_by(desc(Feedback.created_at))

    # If authenticated as citizen, restrict to their user_id
    if auth and auth.user.role == UserRole.CITIZEN:
        query = query.where(Feedback.user_id == auth.user.id)

    if status_filter and status_filter.lower() != "all":
        norm_status = status_filter.upper()
        if norm_status in ("OPEN", "IN_PROGRESS", "RESOLVED"):
            query = query.where(Feedback.status == norm_status)
        elif norm_status == "NEEDS_ATTENTION":
            query = query.where(Feedback.status == "OPEN")

    if category and category.lower() != "all":
        query = query.where(Feedback.category.ilike(f"%{category}%"))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Feedback.citizen_name.ilike(term),
                Feedback.citizen_email.ilike(term),
                Feedback.message.ilike(term),
                Feedback.ticket_number.ilike(term),
                Feedback.complaint_ticket.ilike(term),
            )
        )

    feedbacks = db.scalars(query).all()
    return [_format_feedback_dict(fb) for fb in feedbacks]


@router.get("/my", response_model=List[dict])
def get_my_feedback(
    request: Request,
    db: DBSession = Depends(get_db),
):
    """Get feedback submitted by the currently logged in citizen."""
    settings = get_settings()
    token = extract_session_token(request, settings)
    if not token:
        # Fallback to Rahul Sharma if testing without token
        user = db.scalar(select(User).where(User.email == "rahul.citizen@example.com"))
    else:
        auth = authenticate_session(db, token, settings)
        user = auth.user

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    feedbacks = db.scalars(
        select(Feedback)
        .where(Feedback.user_id == user.id)
        .order_by(desc(Feedback.created_at))
    ).all()

    return [_format_feedback_dict(fb) for fb in feedbacks]


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    request: Request,
    db: DBSession = Depends(get_db),
):
    """Submit new feedback or support query. Automatically binds the authenticated user."""
    settings = get_settings()
    token = extract_session_token(request, settings)
    user: Optional[User] = None

    if token:
        try:
            auth = authenticate_session(db, token, settings)
            user = auth.user
        except Exception:
            pass

    # If no session token, check if user_id or email provided matches a user
    if user is None:
        if payload.user_id:
            try:
                user = db.get(User, UUID(payload.user_id))
            except Exception:
                pass
        if user is None and payload.citizen_email:
            user = db.scalar(select(User).where(User.email == payload.citizen_email.strip()))
        # Default fallback to registered citizen
        if user is None:
            user = db.scalar(select(User).where(User.email == "rahul.citizen@example.com"))
        if user is None:
            user = db.scalar(select(User).where(User.role == UserRole.CITIZEN))

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid citizen user account required to submit feedback",
        )

    # Determine sentiment from rating
    if payload.rating >= 4:
        sentiment = "positive"
    elif payload.rating <= 2:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    # Generate sequential unique ticket number
    date_code = datetime.now().strftime("%Y%m%d")
    ticket_num = f"FB-{date_code}-{uuid4().hex[:6].upper()}"

    # Extract location if provided or user area
    loc = payload.location or user.area or "Indiranagar, Ward 112"

    feedback = Feedback(
        ticket_number=ticket_num,
        user_id=user.id,
        citizen_name=user.full_name,
        citizen_email=user.email,
        category=payload.category,
        message=payload.message.strip(),
        rating=payload.rating,
        status="OPEN",
        sentiment=sentiment,
        complaint_ticket=payload.complaint_ticket or payload.complaint_id,
        location=loc,
    )

    db.add(feedback)

    # Add confirmation notification for citizen
    notification = Notification(
        user_id=user.id,
        notification_type="FEEDBACK",
        title=f"Feedback Logged: {ticket_num}",
        body=f"Thank you {user.full_name.split()[0]}! Your feedback on '{payload.category}' has been received by municipal supervisors.",
    )
    db.add(notification)

    db.commit()
    db.refresh(feedback)

    return {
        "success": True,
        "message": "Feedback submitted successfully",
        "feedback": _format_feedback_dict(feedback),
    }


@router.patch("/{feedback_id}/status")
def update_feedback_status(
    feedback_id: str,
    payload: FeedbackStatusUpdate,
    request: Request,
    db: DBSession = Depends(get_db),
):
    """Admin updates status (OPEN, IN_PROGRESS, RESOLVED)."""
    settings = get_settings()
    auth = get_current_auth(request, db)
    if auth.user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    feedback = db.scalar(
        select(Feedback).where(
            or_(
                Feedback.ticket_number == feedback_id,
                Feedback.id == (UUID(feedback_id) if len(feedback_id) == 36 else None),
            )
        )
    )

    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback ticket not found")

    feedback.status = payload.status.upper()
    feedback.updated_at = datetime.now(timezone.utc)

    # Notify citizen of status update
    status_labels = {"OPEN": "Re-opened", "IN_PROGRESS": "In Progress / Under Action", "RESOLVED": "Resolved"}
    db.add(
        Notification(
            user_id=feedback.user_id,
            notification_type="FEEDBACK",
            title=f"Feedback Update: {feedback.ticket_number}",
            body=f"Your feedback status was updated to '{status_labels.get(feedback.status, feedback.status)}' by municipal operations.",
        )
    )

    db.commit()
    db.refresh(feedback)
    return {"success": True, "feedback": _format_feedback_dict(feedback)}


@router.post("/{feedback_id}/reply")
def reply_feedback(
    feedback_id: str,
    payload: FeedbackReply,
    request: Request,
    db: DBSession = Depends(get_db),
):
    """Admin replies to citizen feedback."""
    settings = get_settings()
    auth = get_current_auth(request, db)
    if auth.user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    feedback = db.scalar(
        select(Feedback).where(
            or_(
                Feedback.ticket_number == feedback_id,
                Feedback.id == (UUID(feedback_id) if len(feedback_id) == 36 else None),
            )
        )
    )

    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback ticket not found")

    now = datetime.now(timezone.utc)
    feedback.admin_reply = payload.reply.strip()
    feedback.replied_at = now
    feedback.replied_by_id = auth.user.id
    if payload.status:
        feedback.status = payload.status.upper()

    # Send Notification to the citizen
    db.add(
        Notification(
            user_id=feedback.user_id,
            notification_type="FEEDBACK",
            title=f"Official Reply to Feedback {feedback.ticket_number}",
            body=f"SadakSetu Municipal Operations replied: \"{payload.reply.strip()[:140]}\"",
        )
    )

    db.commit()
    db.refresh(feedback)
    return {"success": True, "feedback": _format_feedback_dict(feedback)}
