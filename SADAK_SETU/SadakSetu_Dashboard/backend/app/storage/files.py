from hashlib import sha256
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import Settings


class StoredImage:
    def __init__(self, storage_key: str, media_type: str, byte_size: int, checksum: str):
        self.storage_key = storage_key
        self.media_type = media_type
        self.byte_size = byte_size
        self.checksum = checksum


def _safe_root(settings: Settings) -> Path:
    root = Path(settings.upload_root)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[2] / root
    return root.resolve()


async def store_validated_image(upload: UploadFile, complaint_id: UUID, settings: Settings) -> StoredImage:
    content_type = (upload.content_type or "").lower()
    if content_type not in settings.allowed_image_type_list:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported image type")

    content = await upload.read(settings.max_image_size_bytes + 1)
    if len(content) > settings.max_image_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds maximum size")
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image cannot be empty")

    try:
        with Image.open(__import__("io").BytesIO(content)) as image:
            image.verify()
            detected_format = image.format
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image content") from exc

    expected_formats = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
    if expected_formats.get(content_type) != detected_format:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Image content does not match MIME type"
        )

    storage_root = _safe_root(settings)
    relative_dir = Path(str(complaint_id))
    storage_dir = storage_root / relative_dir
    storage_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.{detected_format.lower()}"
    target = (storage_dir / filename).resolve()
    if storage_root not in target.parents:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid storage path")
    target.write_bytes(content)
    return StoredImage(
        storage_key=str(relative_dir / filename),
        media_type=content_type,
        byte_size=len(content),
        checksum=sha256(content).hexdigest(),
    )


def resolve_storage_path(storage_key: str, settings: Settings) -> Path:
    root = _safe_root(settings)
    target = (root / storage_key).resolve()
    if root not in target.parents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return target


def delete_storage_key(storage_key: str, settings: Settings) -> None:
    target = resolve_storage_path(storage_key, settings)
    if target.exists():
        target.unlink()
