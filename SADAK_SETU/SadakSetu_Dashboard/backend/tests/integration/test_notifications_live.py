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
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live notification integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def notification_fixture():
    emails = [email_for("notification-admin"), email_for("notification-citizen")]
    with SessionLocal.begin() as db:
        admin = User(
            email=emails[0],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Notification Admin",
            role=UserRole.ADMIN,
        )
        citizen = User(
            email=emails[1],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Notification Citizen",
            role=UserRole.CITIZEN,
        )
        db.add_all([admin, citizen])
        db.flush()
        admin_token, _ = create_session(db, admin, ClientType.ANDROID, get_settings())
        citizen_token, _ = create_session(db, citizen, ClientType.ANDROID, get_settings())

    with TestClient(create_app()) as client:
        yield client, admin_token, citizen_token, emails

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


def complaint_payload() -> dict:
    return {
        "title": "Notification test complaint",
        "description": "A complaint used to verify durable notifications and read state.",
        "location": {"latitude": 12.9716, "longitude": 77.5946},
    }


def test_device_token_lifecycle_and_notification_read_state(notification_fixture) -> None:
    client, admin_token, citizen_token, _ = notification_fixture
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

    token = client.post(
        "/api/v1/notifications/tokens",
        headers=citizen_headers,
        json={"platform": "android", "token": f"fcm-{uuid4().hex}"},
    )
    assert token.status_code == 201
    token_id = token.json()["id"]
    upserted = client.post(
        "/api/v1/notifications/tokens",
        headers=citizen_headers,
        json={"platform": "android", "token": token.json()["token"]},
    )
    assert upserted.status_code == 201
    assert upserted.json()["id"] == token_id
    invalidated = client.delete(f"/api/v1/notifications/tokens/{token_id}", headers=citizen_headers)
    assert invalidated.status_code == 200

    complaint = client.post("/api/v1/complaints", headers=citizen_headers, json=complaint_payload()).json()
    admin_notifications = client.get("/api/v1/notifications?unread_only=true", headers=admin_headers)
    assert admin_notifications.status_code == 200
    assert admin_notifications.json()["unread"] >= 1
    assert admin_notifications.json()["items"][0]["notification_type"] == "NEW_COMPLAINT"

    status_update = client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        headers=admin_headers,
        json={"status": "UNDER_REVIEW", "note": "Operations review started"},
    )
    assert status_update.status_code == 200
    citizen_notifications = client.get("/api/v1/notifications?unread_only=true", headers=citizen_headers)
    assert citizen_notifications.status_code == 200
    assert citizen_notifications.json()["unread"] >= 1
    notification_id = citizen_notifications.json()["items"][0]["id"]
    read = client.patch(f"/api/v1/notifications/{notification_id}/read", headers=citizen_headers)
    assert read.status_code == 200
    assert read.json()["read_at"] is not None
    all_read = client.post("/api/v1/notifications/read-all", headers=citizen_headers)
    assert all_read.status_code == 200
