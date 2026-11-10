from io import BytesIO
from os import getenv
from pathlib import Path
from uuid import uuid4

import pytest
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.main import create_app
from app.models import Complaint, ComplaintImage, Location, User, UserRole
from app.schemas.auth import ClientType
from app.services.auth import create_session
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import select

pytestmark = pytest.mark.skipif(
    getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live AI integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def ai_client():
    email = email_for("ai-citizen")
    with SessionLocal.begin() as db:
        user = User(
            email=email,
            password_hash=hash_password("correct horse battery staple"),
            full_name="AI Citizen",
            role=UserRole.CITIZEN,
        )
        db.add(user)
        db.flush()
        token, _ = create_session(db, user, ClientType.ANDROID, get_settings())
        user_id = user.id

    with TestClient(create_app()) as client:
        yield client, token

    with SessionLocal.begin() as db:
        complaints = db.scalars(select(Complaint).where(Complaint.reporter_id == user_id)).all()
        complaint_ids = [complaint.id for complaint in complaints]
        image_keys = [
            image.storage_key
            for image in db.scalars(select(ComplaintImage).where(ComplaintImage.complaint_id.in_(complaint_ids))).all()
        ]
        location_ids = [complaint.location_id for complaint in complaints]
        for complaint in complaints:
            db.delete(complaint)
        db.flush()
        for image_key in image_keys:
            target = Path(get_settings().upload_root) / image_key
            if target.exists():
                target.unlink()
        for location in db.scalars(select(Location).where(Location.id.in_(location_ids))).all():
            db.delete(location)
        for user in db.scalars(select(User).where(User.id == user_id)).all():
            db.delete(user)


def test_verified_model_detects_and_persists_result(ai_client) -> None:
    client, token = ai_client
    complaint = client.post(
        "/api/v1/complaints",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "AI test complaint",
            "description": "A valid image is used to test model availability behavior.",
            "location": {"latitude": 12.9716, "longitude": 77.5946},
        },
    ).json()
    image = Image.new("RGB", (12, 12), color=(20, 30, 40))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    upload = client.post(
        f"/api/v1/complaints/{complaint['id']}/images",
        headers={"Authorization": f"Bearer {token}"},
        files={"image": ("road.png", buffer.getvalue(), "image/png")},
    )
    assert upload.status_code == 201
    image_id = upload.json()["id"]

    detected = client.post(
        f"/api/v1/ai/images/{image_id}/detect",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detected.status_code == 202
    assert detected.json()["status"] == "COMPLETED"
    assert detected.json()["model_name"] == get_settings().ai_model_name
    assert detected.json()["detection_count"] >= 0
    history = client.get(
        f"/api/v1/ai/images/{image_id}/detections",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert history.status_code == 200
    assert history.json()[0]["status"] == "COMPLETED"
    assert history.json()[0]["result_metadata"]["image_width"] == 12
    assert history.json()[0]["result_metadata"]["image_height"] == 12
