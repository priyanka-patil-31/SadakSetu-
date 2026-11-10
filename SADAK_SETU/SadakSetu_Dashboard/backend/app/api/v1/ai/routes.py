import shutil
import tempfile
from pathlib import Path
from uuid import UUID

from ai_service.detection.service import ModelUnavailableError, PotholeDetector
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import AIDetection, ComplaintImage, UserRole
from app.schemas.ai import AIDetectionBox, AIDetectionResponse, AIDirectDetectionResponse
from app.services.auth import AuthenticatedSession, require_roles
from app.storage.files import resolve_storage_path

router = APIRouter(prefix="/ai", tags=["ai-detection"])


def accessible_image(db: DBSession, auth: AuthenticatedSession, image_id: UUID) -> ComplaintImage:
    image = db.scalar(select(ComplaintImage).where(ComplaintImage.id == image_id))
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    if auth.user.role != UserRole.ADMIN and image.complaint.reporter_id != auth.user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return image


@router.post("/detect", response_model=AIDirectDetectionResponse)
async def detect_direct(
    image: UploadFile = File(...),
    auth: AuthenticatedSession = Depends(get_current_auth),
) -> AIDirectDetectionResponse:
    settings = get_settings()
    suffix = Path(image.filename or "upload.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_in:
        shutil.copyfileobj(image.file, tmp_in)
        tmp_in_path = Path(tmp_in.name)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_out:
        tmp_out_path = Path(tmp_out.name)
    try:
        detector = PotholeDetector(settings)
        result = detector.detect(tmp_in_path, tmp_out_path)
        boxes = [
            AIDetectionBox(
                x1=float(b["x1"]),
                y1=float(b["y1"]),
                x2=float(b["x2"]),
                y2=float(b["y2"]),
                confidence=float(b["confidence"]),
                label=str(b["label"]),
            )
            for b in result.boxes
        ]
        return AIDirectDetectionResponse(
            model_name=settings.ai_model_name,
            model_version=settings.ai_model_version,
            status="COMPLETED",
            processing_time_ms=result.processing_time_ms,
            detection_count=len(boxes),
            image_width=result.image_width,
            image_height=result.image_height,
            boxes=boxes,
        )
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI model unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI inference failed: {exc}") from exc
    finally:
        if tmp_in_path.is_file():
            tmp_in_path.unlink(missing_ok=True)
        if tmp_out_path.is_file():
            tmp_out_path.unlink(missing_ok=True)


@router.post("/images/{image_id}/detect", response_model=AIDetectionResponse, status_code=status.HTTP_202_ACCEPTED)
def detect_image(
    image_id: UUID,
    auth: AuthenticatedSession = Depends(require_roles(UserRole.CITIZEN, UserRole.ADMIN)),
    db: DBSession = Depends(get_db),
) -> AIDetection:
    image = accessible_image(db, auth, image_id)
    settings = get_settings()
    record = AIDetection(
        complaint_image_id=image.id,
        model_name=settings.ai_model_name,
        model_version=settings.ai_model_version,
        status="PENDING",
        detection_count=0,
    )
    db.add(record)
    db.flush()
    try:
        detector = PotholeDetector(settings)
        source = resolve_storage_path(image.storage_key, settings)
        annotated_root = Path(settings.ai_annotated_root)
        if not annotated_root.is_absolute():
            annotated_root = Path(__file__).resolve().parents[3] / annotated_root
        annotated_path = annotated_root / str(image.complaint_id) / f"{record.id}.png"
        result = detector.detect(source, annotated_path)
        record.status = "COMPLETED"
        record.processing_time_ms = result.processing_time_ms
        record.detection_count = len(result.boxes)
        record.result_metadata = {
            "detections": result.boxes,
            "annotated_image_path": str(annotated_path),
            "image_width": result.image_width,
            "image_height": result.image_height,
        }
        db.commit()
        db.refresh(record)
        return record
    except ModelUnavailableError as exc:
        record.status = "FAILED"
        record.error_message = str(exc)
        db.commit()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI model unavailable") from exc
    except Exception as exc:
        db.rollback()
        record.status = "FAILED"
        record.error_message = "Inference failed"
        db.add(record)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI inference failed") from exc


@router.get("/images/{image_id}/detections", response_model=list[AIDetectionResponse])
def detection_history(
    image_id: UUID,
    auth: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> list[AIDetection]:
    image = accessible_image(db, auth, image_id)
    return db.scalars(
        select(AIDetection).where(AIDetection.complaint_image_id == image.id).order_by(AIDetection.created_at.desc())
    ).all()
