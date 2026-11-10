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
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live assignment integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def assignment_fixture():
    emails = [email_for("assignment-admin"), email_for("assignment-citizen")]
    with SessionLocal.begin() as db:
        admin = User(
            email=emails[0],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Assignment Admin",
            role=UserRole.ADMIN,
        )
        citizen = User(
            email=emails[1],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Assignment Citizen",
            role=UserRole.CITIZEN,
        )
        db.add_all([admin, citizen])
        db.flush()
        admin_token, _ = create_session(db, admin, ClientType.ANDROID, get_settings())
        citizen_token, _ = create_session(db, citizen, ClientType.ANDROID, get_settings())
        user_ids = (admin.id, citizen.id)

    with TestClient(create_app()) as client:
        yield client, admin_token, citizen_token, emails

    with SessionLocal.begin() as db:
        users = db.scalars(select(User).where(User.email.in_(emails))).all()
        user_ids = [user.id for user in users]
        complaints = db.scalars(select(Complaint).where(Complaint.reporter_id.in_(user_ids))).all()
        locations = [complaint.location_id for complaint in complaints]
        for complaint in complaints:
            db.delete(complaint)
        db.flush()
        for location in db.scalars(select(Location).where(Location.id.in_(locations))).all():
            db.delete(location)
        for user in users:
            db.delete(user)


def complaint_payload() -> dict:
    return {
        "title": "Assignment test complaint",
        "description": "A pothole complaint used to verify transactional assignment behavior.",
        "location": {"latitude": 12.9716, "longitude": 77.5946, "area": "Assignment Area"},
    }


def team_payload(name: str) -> dict:
    return {
        "name": name,
        "lead_name": "Operations Lead",
        "phone": "+919999999999",
        "email": email_for(name.casefold().replace(" ", "-")),
    }


def test_assign_reassign_release_and_history_are_transactional(assignment_fixture) -> None:
    client, admin_token, citizen_token, _ = assignment_fixture
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
    complaint = client.post("/api/v1/complaints", headers=citizen_headers, json=complaint_payload()).json()
    complaint_id = complaint["id"]
    team_a = client.post(
        "/api/v1/teams", headers=admin_headers, json=team_payload(f"Assignment Team A {uuid4().hex[:8]}")
    ).json()
    team_b = client.post(
        "/api/v1/teams", headers=admin_headers, json=team_payload(f"Assignment Team B {uuid4().hex[:8]}")
    ).json()

    unauthorized = client.post(
        f"/api/v1/assignments/complaints/{complaint_id}",
        headers=citizen_headers,
        json={"team_id": team_a["id"]},
    )
    assert unauthorized.status_code == 403

    assigned = client.post(
        f"/api/v1/assignments/complaints/{complaint_id}",
        headers=admin_headers,
        json={"team_id": team_a["id"], "note": "Initial field assignment"},
    )
    assert assigned.status_code == 201
    assert client.get(f"/api/v1/complaints/{complaint_id}", headers=admin_headers).json()["status"] == "ASSIGNED"

    duplicate = client.post(
        f"/api/v1/assignments/complaints/{complaint_id}",
        headers=admin_headers,
        json={"team_id": team_a["id"]},
    )
    assert duplicate.status_code == 409

    reassigned = client.post(
        f"/api/v1/assignments/complaints/{complaint_id}",
        headers=admin_headers,
        json={"team_id": team_b["id"], "note": "Reassigned due to workload"},
    )
    assert reassigned.status_code == 201
    history = client.get(f"/api/v1/assignments/complaints/{complaint_id}", headers=admin_headers)
    assert history.status_code == 200
    assert [item["status"] for item in history.json()["items"]] == ["ACTIVE", "RELEASED"]

    released = client.post(
        f"/api/v1/assignments/complaints/{complaint_id}/release?note=Field%20work%20paused",
        headers=admin_headers,
    )
    assert released.status_code == 200
    detail = client.get(f"/api/v1/complaints/{complaint_id}", headers=admin_headers).json()
    assert detail["assigned_team_id"] is None
    assert detail["status"] == "UNDER_REVIEW"


def test_off_duty_team_and_terminal_complaint_cannot_be_assigned(assignment_fixture) -> None:
    client, admin_token, citizen_token, _ = assignment_fixture
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
    complaint = client.post("/api/v1/complaints", headers=citizen_headers, json=complaint_payload()).json()
    complaint_id = complaint["id"]
    team = client.post(
        "/api/v1/teams", headers=admin_headers, json=team_payload(f"Unavailable Team {uuid4().hex[:8]}")
    ).json()
    off_duty = client.patch(
        f"/api/v1/teams/{team['id']}/availability",
        headers=admin_headers,
        json={"availability": "OFF_DUTY"},
    )
    assert off_duty.status_code == 200
    unavailable = client.post(
        f"/api/v1/assignments/complaints/{complaint_id}",
        headers=admin_headers,
        json={"team_id": team["id"]},
    )
    assert unavailable.status_code == 409

    rejected = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        headers=admin_headers,
        json={"status": "REJECTED", "note": "Terminal fixture"},
    )
    assert rejected.status_code == 200
    terminal = client.post(
        f"/api/v1/assignments/complaints/{complaint_id}",
        headers=admin_headers,
        json={"team_id": team["id"]},
    )
    assert terminal.status_code == 409
