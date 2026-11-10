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
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live report integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def report_fixture():
    emails = [email_for("report-admin"), email_for("report-citizen")]
    with SessionLocal.begin() as db:
        admin = User(
            email=emails[0],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Report Admin",
            role=UserRole.ADMIN,
        )
        citizen = User(
            email=emails[1],
            password_hash=hash_password("correct horse battery staple"),
            full_name="Report Citizen",
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
        ids = [user.id for user in users]
        complaints = db.scalars(select(Complaint).where(Complaint.reporter_id.in_(ids))).all()
        locations = [complaint.location_id for complaint in complaints]
        for complaint in complaints:
            db.delete(complaint)
        db.flush()
        for location in db.scalars(select(Location).where(Location.id.in_(locations))).all():
            db.delete(location)
        for user in users:
            db.delete(user)


def complaint_payload(title: str, area: str) -> dict:
    return {
        "title": title,
        "description": "A report fixture complaint with a valid road location.",
        "location": {"latitude": 12.9716, "longitude": 77.5946, "area": area},
    }


def test_summary_date_filter_and_csv_export(report_fixture) -> None:
    client, admin_token, citizen_token, _ = report_fixture
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
    first = client.post(
        "/api/v1/complaints", headers=citizen_headers, json=complaint_payload("Report Alpha", "North")
    )
    second = client.post(
        "/api/v1/complaints", headers=citizen_headers, json=complaint_payload("Report Beta", "South")
    )
    assert first.status_code == 201
    assert second.status_code == 201
    resolved = client.patch(
        f"/api/v1/complaints/{second.json()['id']}/status",
        headers=admin_headers,
        json={"status": "UNDER_REVIEW"},
    )
    assert resolved.status_code == 200

    summary = client.get("/api/v1/reports/summary", headers=admin_headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_complaints"] >= 2
    assert body["pending_complaints"] >= 2
    assert body["severity_distribution"]["MEDIUM"] >= 2
    assert {item["area"] for item in body["area_distribution"]} >= {"North", "South"}
    assert body["monthly_trends"]

    forbidden = client.get("/api/v1/reports/summary", headers=citizen_headers)
    assert forbidden.status_code == 403
    invalid_range = client.get(
        "/api/v1/reports/summary?start_date=2026-11-03&end_date=2026-11-02", headers=admin_headers
    )
    assert invalid_range.status_code == 422
    csv_response = client.get("/api/v1/reports/complaints.csv", headers=admin_headers)
    assert csv_response.status_code == 200
    assert "complaint_number,status,severity" in csv_response.text
    assert "Report Alpha" in csv_response.text
