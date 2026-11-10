from os import getenv
from uuid import uuid4

import pytest
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.main import create_app
from app.models import (
    AssignmentStatus,
    Complaint,
    ComplaintStatus,
    Location,
    RepairTeam,
    SeverityLevel,
    TeamAssignment,
    TeamAvailability,
    User,
    UserRole,
)
from app.schemas.auth import ClientType
from app.services.auth import create_session
from fastapi.testclient import TestClient
from geoalchemy2.elements import WKTElement

pytestmark = pytest.mark.skipif(
    getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live repair-team integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def team_fixture():
    with SessionLocal.begin() as db:
        admin = User(
            email=email_for("team-admin"),
            password_hash=hash_password("correct horse battery staple"),
            full_name="Team Admin",
            role=UserRole.ADMIN,
        )
        citizen = User(
            email=email_for("team-citizen"),
            password_hash=hash_password("correct horse battery staple"),
            full_name="Team Citizen",
            role=UserRole.CITIZEN,
        )
        location = Location(
            latitude=12.9716,
            longitude=77.5946,
            point=WKTElement("POINT(77.5946 12.9716)", srid=4326),
        )
        team = RepairTeam(
            name=f"Fixture Team {uuid4().hex[:8]}",
            lead_name="Fixture Lead",
            phone="+919999999999",
            email=email_for("fixture-team"),
            availability=TeamAvailability.AVAILABLE,
        )
        db.add_all([admin, citizen, location, team])
        db.flush()
        complaint = Complaint(
            complaint_number=f"SS-TEAM-{uuid4().hex[:12].upper()}",
            reporter_id=citizen.id,
            status=ComplaintStatus.ASSIGNED,
            severity=SeverityLevel.HIGH,
            title="Assigned team fixture",
            description="Fixture complaint for repair team read APIs.",
            location_id=location.id,
            assigned_team_id=team.id,
        )
        db.add(complaint)
        db.flush()
        db.add(
            TeamAssignment(
                complaint_id=complaint.id,
                team_id=team.id,
                assigned_by_id=admin.id,
                status=AssignmentStatus.ACTIVE,
            )
        )
        admin_token, _ = create_session(db, admin, ClientType.ANDROID, get_settings())
        citizen_token, _ = create_session(db, citizen, ClientType.ANDROID, get_settings())
        ids = (admin.id, citizen.id, team.id, complaint.id, location.id)

    with TestClient(create_app()) as client:
        yield client, admin_token, citizen_token, ids

    with SessionLocal.begin() as db:
        admin_id, citizen_id, team_id, complaint_id, location_id = ids
        complaint = db.get(Complaint, complaint_id)
        if complaint is not None:
            db.delete(complaint)
            db.flush()
        team = db.get(RepairTeam, team_id)
        if team is not None:
            db.delete(team)
        location = db.get(Location, location_id)
        if location is not None:
            db.delete(location)
        for user_id in (admin_id, citizen_id):
            user = db.get(User, user_id)
            if user is not None:
                db.delete(user)


def test_team_crud_availability_and_duplicate_protection(team_fixture) -> None:
    client, admin_token, citizen_token, ids = team_fixture
    team_id = ids[2]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

    assert client.get("/api/v1/teams", headers=citizen_headers).status_code == 403
    listed = client.get("/api/v1/teams?search=Fixture", headers=admin_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    created = client.post(
        "/api/v1/teams",
        headers=admin_headers,
        json={
            "name": f"Temporary Team {uuid4().hex[:8]}",
            "lead_name": "Temporary Lead",
            "phone": "+918888888888",
            "email": email_for("temporary"),
        },
    )
    assert created.status_code == 201
    temporary_id = created.json()["id"]
    duplicate = client.post(
        "/api/v1/teams",
        headers=admin_headers,
        json={
            "name": created.json()["name"],
            "lead_name": "Different Lead",
            "phone": "+917777777777",
            "email": email_for("duplicate"),
        },
    )
    assert duplicate.status_code == 409
    updated = client.patch(
        f"/api/v1/teams/{temporary_id}",
        headers=admin_headers,
        json={"lead_name": "Updated Lead", "availability": "ON_JOB"},
    )
    assert updated.status_code == 200
    assert updated.json()["lead_name"] == "Updated Lead"
    availability = client.patch(
        f"/api/v1/teams/{temporary_id}/availability",
        headers=admin_headers,
        json={"availability": "OFF_DUTY"},
    )
    assert availability.status_code == 200
    assert availability.json()["availability"] == "OFF_DUTY"
    deleted = client.delete(f"/api/v1/teams/{temporary_id}", headers=admin_headers)
    assert deleted.status_code == 200

    blocked = client.delete(f"/api/v1/teams/{team_id}", headers=admin_headers)
    assert blocked.status_code == 409


def test_team_details_assigned_complaints_and_assignment_history(team_fixture) -> None:
    client, admin_token, _, ids = team_fixture
    team_id = ids[2]
    headers = {"Authorization": f"Bearer {admin_token}"}
    detail = client.get(f"/api/v1/teams/{team_id}", headers=headers)
    assert detail.status_code == 200
    complaints = client.get(f"/api/v1/teams/{team_id}/complaints", headers=headers)
    assert complaints.status_code == 200
    assert complaints.json()[0]["complaint_number"].startswith("SS-TEAM-")
    assignments = client.get(f"/api/v1/teams/{team_id}/assignments", headers=headers)
    assert assignments.status_code == 200
    assert assignments.json()[0]["status"] == "ACTIVE"
