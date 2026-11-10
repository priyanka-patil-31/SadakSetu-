from io import BytesIO
from os import getenv
from pathlib import Path
from uuid import uuid4

import pytest
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.main import create_app
from app.models import Complaint, ComplaintImage, User, UserRole
from app.schemas.auth import ClientType
from app.services.auth import create_session
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import select

pytestmark = pytest.mark.skipif(
    getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live image/location integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


def image_bytes(image_format: str = "PNG") -> bytes:
    output = BytesIO()
    Image.new("RGB", (12, 12), color=(12, 34, 56)).save(output, format=image_format)
    return output.getvalue()


@pytest.fixture
def image_client():
    emails = [email_for("citizen")]
    with SessionLocal.begin() as db:
        user = User(
            email=emails[0],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Image Citizen",
            role=UserRole.CITIZEN,
        )
        db.add(user)
        db.flush()
        token, _ = create_session(db, user, ClientType.ANDROID, get_settings())
        user_id = user.id

    with TestClient(create_app()) as client:
        yield client, token, emails

    with SessionLocal.begin() as db:
        complaints = db.scalars(select(Complaint).where(Complaint.reporter_id == user_id)).all()
        complaint_ids = [complaint.id for complaint in complaints]
        image_keys = [
            image.storage_key
            for image in db.scalars(select(ComplaintImage).where(ComplaintImage.complaint_id.in_(complaint_ids))).all()
        ]
        for complaint in complaints:
            db.delete(complaint)
        db.flush()
        for image_key in image_keys:
            target = Path(get_settings().upload_root) / image_key
            if target.exists():
                target.unlink()
        for user in db.scalars(select(User).where(User.email.in_(emails))).all():
            db.delete(user)


def create_complaint(client: TestClient, token: str) -> str:
    response = client.post(
        "/api/v1/complaints",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Image test pothole",
            "description": "A road image is required for this integration test.",
            "location": {"latitude": 12.9716, "longitude": 77.5946, "area": "Image Area"},
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_image_upload_metadata_download_and_mime_validation(image_client) -> None:
    client, token, _ = image_client
    complaint_id = create_complaint(client, token)
    headers = {"Authorization": f"Bearer {token}"}

    uploaded = client.post(
        f"/api/v1/complaints/{complaint_id}/images",
        headers=headers,
        files={"image": ("road.png", image_bytes(), "image/png")},
    )
    assert uploaded.status_code == 201
    metadata = uploaded.json()
    assert metadata["media_type"] == "image/png"
    assert metadata["byte_size"] > 0
    assert len(metadata["checksum"]) == 64

    listing = client.get(f"/api/v1/complaints/{complaint_id}/images", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    downloaded = client.get(f"/api/v1/complaints/{complaint_id}/images/{metadata['id']}", headers=headers)
    assert downloaded.status_code == 200
    assert downloaded.content == image_bytes()

    invalid = client.post(
        f"/api/v1/complaints/{complaint_id}/images",
        headers=headers,
        files={"image": ("fake.png", b"not an image", "image/png")},
    )
    assert invalid.status_code == 400


def test_nearby_location_search_requires_authentication(image_client) -> None:
    client, token, _ = image_client
    create_complaint(client, token)
    response = client.get(
        "/api/v1/locations/nearby?latitude=12.9716&longitude=77.5946&radius_meters=100",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["distance_meters"] < 1
    assert client.get("/api/v1/locations/nearby?latitude=12.9716&longitude=77.5946").status_code == 401
