from os import getenv
from uuid import uuid4

import pytest
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.main import create_app
from app.models import AIDetection, Complaint, ComplaintImage, DetectionStatus, Location, User, UserRole
from app.schemas.auth import ClientType
from app.services.auth import create_session
from fastapi.testclient import TestClient
from geoalchemy2.elements import WKTElement

pytestmark = pytest.mark.skipif(
    getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live severity integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def severity_fixture():
    with SessionLocal.begin() as db:
        citizen = User(
            email=email_for("severity-citizen"),
            password_hash=hash_password("correct horse battery staple"),
            full_name="Severity Citizen",
            role=UserRole.CITIZEN,
        )
        admin = User(
            email=email_for("severity-admin"),
            password_hash=hash_password("correct horse battery staple"),
            full_name="Severity Admin",
            role=UserRole.ADMIN,
        )
        location = Location(
            latitude=12.9716,
            longitude=77.5946,
            point=WKTElement("POINT(77.5946 12.9716)", srid=4326),
        )
        db.add_all([citizen, admin, location])
        db.flush()
        complaint = Complaint(
            complaint_number=f"SS-TEST-{uuid4().hex[:12].upper()}",
            reporter_id=citizen.id,
            status="SUBMITTED",
            severity="MEDIUM",
            title="Severity fixture complaint",
            description="Fixture data for severity integration tests.",
            location_id=location.id,
        )
        db.add(complaint)
        db.flush()
        image = ComplaintImage(
            complaint_id=complaint.id,
            storage_key=f"{complaint.id}/severity-fixture.png",
            media_type="image/png",
            byte_size=12,
            checksum=uuid4().hex,
        )
        db.add(image)
        db.flush()
        db.add(
            AIDetection(
                complaint_image_id=image.id,
                model_name="fixture-model",
                model_version="fixture",
                status=DetectionStatus.COMPLETED,
                detection_count=1,
                result_metadata={
                    "image_width": 1_000,
                    "image_height": 1_000,
                    "detections": [{"x1": 0, "y1": 0, "x2": 600, "y2": 600, "label": "pothole"}],
                },
            )
        )
        citizen_token, _ = create_session(db, citizen, ClientType.ANDROID, get_settings())
        admin_token, _ = create_session(db, admin, ClientType.ANDROID, get_settings())
        ids = (citizen.id, admin.id, complaint.id, image.id, location.id)

    with TestClient(create_app()) as client:
        yield client, citizen_token, admin_token, ids

    with SessionLocal.begin() as db:
        citizen_id, admin_id, complaint_id, _, location_id = ids
        complaint = db.get(Complaint, complaint_id)
        if complaint is not None:
            db.delete(complaint)
            db.flush()
        location = db.get(Location, location_id)
        if location is not None:
            db.delete(location)
        for user_id in (citizen_id, admin_id):
            user = db.get(User, user_id)
            if user is not None:
                db.delete(user)


def test_detection_to_severity_is_persisted_and_visible(severity_fixture) -> None:
    client, citizen_token, _, ids = severity_fixture
    _, _, complaint_id, image_id, _ = ids
    response = client.post(
        f"/api/v1/ai/images/{image_id}/severity",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["severity"] == "CRITICAL"
    assert body["method"] == "IMAGE_HEURISTIC"
    assert body["measurements"]["confidence_used"] is False
    history = client.get(
        f"/api/v1/complaints/{complaint_id}/severity",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert history.status_code == 200
    assert history.json()[0]["severity"] == "CRITICAL"


def test_admin_review_supersedes_estimate_and_citizen_cannot_review(severity_fixture) -> None:
    client, citizen_token, admin_token, ids = severity_fixture
    _, _, complaint_id, _, _ = ids
    denied = client.post(
        f"/api/v1/complaints/{complaint_id}/severity/review",
        headers={"Authorization": f"Bearer {citizen_token}"},
        json={"severity": "LOW"},
    )
    assert denied.status_code == 403
    reviewed = client.post(
        f"/api/v1/complaints/{complaint_id}/severity/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"severity": "HIGH", "note": "Reviewed by operations administrator"},
    )
    assert reviewed.status_code == 201
    assert reviewed.json()["method"] == "ADMIN_REVIEW"
    assert reviewed.json()["created_by_id"] == str(ids[1])
