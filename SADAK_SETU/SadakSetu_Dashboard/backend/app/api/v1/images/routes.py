from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import Complaint, ComplaintImage, UserRole
from app.schemas.images import ComplaintImageResponse
from app.services.auth import AuthenticatedSession, require_roles
from app.storage.files import resolve_storage_path, store_validated_image

router = APIRouter(prefix="/complaints", tags=["images"])


def visible_complaint(db: DBSession, auth: AuthenticatedSession, complaint_id: UUID) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if auth.user.role != UserRole.ADMIN and complaint.reporter_id != auth.user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return complaint


@router.post("/{complaint_id}/images", response_model=ComplaintImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_complaint_image(
    complaint_id: UUID,
    image: UploadFile = File(...),
    latitude: float | None = Form(default=None, ge=-90, le=90),
    longitude: float | None = Form(default=None, ge=-180, le=180),
    auth: AuthenticatedSession = Depends(require_roles(UserRole.CITIZEN, UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> ComplaintImage:
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Latitude and longitude must be provided together",
        )
    complaint = visible_complaint(db, auth, complaint_id)
    stored = await store_validated_image(image, complaint.id, get_settings())
    capture_metadata = None
    if latitude is not None and longitude is not None:
        capture_metadata = {"latitude": latitude, "longitude": longitude, "source": "device"}
    record = ComplaintImage(
        complaint_id=complaint.id,
        storage_key=stored.storage_key,
        media_type=stored.media_type,
        byte_size=stored.byte_size,
        checksum=stored.checksum,
        capture_metadata=capture_metadata,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{complaint_id}/images", response_model=list[ComplaintImageResponse])
def list_complaint_images(
    complaint_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> list[ComplaintImage]:
    complaint = visible_complaint(db, auth, complaint_id)
    return db.scalars(
        select(ComplaintImage)
        .where(ComplaintImage.complaint_id == complaint.id)
        .order_by(ComplaintImage.created_at.asc())
    ).all()


@router.get("/{complaint_id}/images/{image_id}")
def download_complaint_image(
    complaint_id: UUID,
    image_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
):
    complaint = visible_complaint(db, auth, complaint_id)
    record = db.scalar(
        select(ComplaintImage).where(ComplaintImage.id == image_id, ComplaintImage.complaint_id == complaint.id)
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    path = resolve_storage_path(record.storage_key, get_settings())
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return FileResponse(path, media_type=record.media_type, filename=path.name)
