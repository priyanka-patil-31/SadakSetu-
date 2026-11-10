from os import getenv
from uuid import uuid4

import pytest
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.main import create_app
from app.models import Complaint, Location, User, UserRole
from app.schemas.auth import ClientType
from app.services.auth import create_session
from fastapi.testclient import TestClient
from sqlalchemy import select

pytestmark = pytest.mark.skipif(
    getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live complaint integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def complaint_client():
    emails = [email_for("admin"), email_for("citizen")]
    with SessionLocal.begin() as db:
        admin = User(
            email=emails[0],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Complaint Admin",
            role=UserRole.ADMIN,
        )
        citizen = User(
            email=emails[1],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Complaint Citizen",
            role=UserRole.CITIZEN,
        )
        db.add_all([admin, citizen])
        db.flush()
        admin_token, _ = create_session(db, admin, ClientType.ANDROID, get_settings())
        citizen_token, _ = create_session(db, citizen, ClientType.ANDROID, get_settings())
        admin_id = str(admin.id)
        citizen_id = str(citizen.id)

    with TestClient(create_app()) as client:
        yield client, admin_token, citizen_token, admin_id, citizen_id, emails

    with SessionLocal.begin() as db:
        users = db.scalars(select(User).where(User.email.in_(emails))).all()
        user_ids = [user.id for user in users]
        complaints = db.scalars(select(Complaint).where(Complaint.reporter_id.in_(user_ids))).all()
        location_ids = [complaint.location_id for complaint in complaints]
        for complaint in complaints:
            db.delete(complaint)
        db.flush()
        for location in db.scalars(select(Location).where(Location.id.in_(location_ids))).all():
            db.delete(location)
        for user in users:
            db.delete(user)


def complaint_payload(title: str = "Deep road pothole") -> dict:
    return {
        "title": title,
        "description": "A large pothole is affecting traffic near the main road.",
        "location": {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "Integration Road",
            "area": "Central",
            "zone": "Z1",
        },
    }


def test_citizen_can_create_list_detail_and_view_history(complaint_client) -> None:
    client, _, citizen_token, _, _, _ = complaint_client
    headers = {"Authorization": f"Bearer {citizen_token}"}
    created = client.post("/api/v1/complaints", headers=headers, json=complaint_payload())
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "SUBMITTED"
    assert body["location"]["area"] == "Central"

    complaint_id = body["id"]
    listing = client.get("/api/v1/complaints?search=Deep&page=1&page_size=10", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    detail = client.get(f"/api/v1/complaints/{complaint_id}", headers=headers)
    assert detail.status_code == 200
    history = client.get(f"/api/v1/complaints/{complaint_id}/history", headers=headers)
    assert history.status_code == 200
    assert history.json()["items"][0]["event_type"] == "CREATED"


def test_admin_status_transitions_notes_and_invalid_transition(complaint_client) -> None:
    client, admin_token, citizen_token, _, _, _ = complaint_client
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    complaint = client.post("/api/v1/complaints", headers=citizen_headers, json=complaint_payload()).json()
    complaint_id = complaint["id"]

    under_review = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        headers=admin_headers,
        json={"status": "UNDER_REVIEW", "note": "Admin review started"},
    )
    assert under_review.status_code == 200
    assert under_review.json()["status"] == "UNDER_REVIEW"

    invalid = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        headers=admin_headers,
        json={"status": "RESOLVED"},
    )
    assert invalid.status_code == 409
    note = client.post(
        f"/api/v1/complaints/{complaint_id}/notes",
        headers=admin_headers,
        json={"note": "Needs field verification"},
    )
    assert note.status_code == 201
    assert note.json()["event_type"] == "ADMIN_NOTE"


def test_citizen_can_delete_submitted_but_rejected_complaint_requires_admin(complaint_client) -> None:
    client, admin_token, citizen_token, _, _, _ = complaint_client
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    submitted = client.post(
        "/api/v1/complaints", headers=citizen_headers, json=complaint_payload("Mistaken report")
    ).json()
    submitted_id = submitted["id"]
    deleted_by_citizen = client.request(
        "DELETE",
        f"/api/v1/complaints/{submitted_id}",
        headers=citizen_headers,
        json={"reason": "Added by mistake"},
    )
    assert deleted_by_citizen.status_code == 200
    assert client.get(f"/api/v1/complaints/{submitted_id}", headers=citizen_headers).status_code == 404

    complaint = client.post(
        "/api/v1/complaints", headers=citizen_headers, json=complaint_payload("Invalid report")
    ).json()
    complaint_id = complaint["id"]

    rejected = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        headers=admin_headers,
        json={"status": "REJECTED", "note": "Duplicate report"},
    )
    assert rejected.status_code == 200
    forbidden = client.request(
        "DELETE",
        f"/api/v1/complaints/{complaint_id}",
        headers=citizen_headers,
        json={"reason": "invalid"},
    )
    assert forbidden.status_code == 409

    deleted = client.request(
        "DELETE",
        f"/api/v1/complaints/{complaint_id}",
        headers=admin_headers,
        json={"reason": "duplicate invalid report"},
    )
    assert deleted.status_code == 200
    assert client.get(f"/api/v1/complaints/{complaint_id}", headers=admin_headers).status_code == 404
