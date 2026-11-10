from os import getenv
from uuid import uuid4

import pytest
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.main import create_app
from app.models import User, UserRole
from app.schemas.auth import ClientType
from app.services.auth import create_session
from fastapi.testclient import TestClient
from sqlalchemy import select

pytestmark = pytest.mark.skipif(
    getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live user-management integration tests",
)


def email_for(prefix: str) -> str:
    return f"{prefix}-{uuid4()}@example.com"


@pytest.fixture
def user_client():
    emails = [email_for("admin")]
    with SessionLocal.begin() as db:
        admin = User(
            email=emails[0],
            password_hash=hash_password("correct horse battery staple"),
            full_name="User Management Admin",
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.flush()
        admin_token, _ = create_session(db, admin, ClientType.ANDROID, get_settings())
        admin_id = str(admin.id)

    with TestClient(create_app()) as client:
        yield client, admin_token, admin_id, emails

    with SessionLocal.begin() as db:
        for user in db.scalars(select(User).where(User.email.in_(emails))).all():
            db.delete(user)


def register_citizen(client: TestClient, emails: list[str]) -> tuple[str, str]:
    email = email_for("citizen")
    emails.append(email)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "correct horse battery staple",
            "full_name": "Managed Citizen",
            "client_type": "android",
        },
    )
    assert response.status_code == 201
    return email, response.json()["session_id"]


def test_admin_list_search_pagination_and_citizen_forbidden(user_client) -> None:
    client, admin_token, _, emails = user_client
    citizen_email, citizen_token = register_citizen(client, emails)
    headers = {"Authorization": f"Bearer {admin_token}"}

    listing = client.get("/api/v1/users?page=1&page_size=1&search=Managed", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["email"] == citizen_email

    forbidden = client.get("/api/v1/users", headers={"Authorization": f"Bearer {citizen_token}"})
    assert forbidden.status_code == 403


def test_profile_update_and_duplicate_email_protection(user_client) -> None:
    client, _, _, emails = user_client
    citizen_email, citizen_token = register_citizen(client, emails)
    headers = {"Authorization": f"Bearer {citizen_token}"}

    profile = client.patch("/api/v1/users/me", headers=headers, json={"full_name": "Updated Citizen"})
    assert profile.status_code == 200
    assert profile.json()["full_name"] == "Updated Citizen"
    assert client.get("/api/v1/users/me", headers=headers).json()["email"] == citizen_email

    duplicate_email, _ = register_citizen(client, emails)
    conflict = client.patch("/api/v1/users/me", headers=headers, json={"email": duplicate_email})
    assert conflict.status_code == 409


def test_profile_password_and_preferences_are_persisted(user_client) -> None:
    client, _, _, emails = user_client
    citizen_email, citizen_token = register_citizen(client, emails)
    headers = {"Authorization": f"Bearer {citizen_token}"}

    profile = client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"full_name": "Persisted Citizen", "phone": "+919999999999", "area": "Central"},
    )
    assert profile.status_code == 200
    assert profile.json()["phone"] == "+919999999999"
    assert profile.json()["area"] == "Central"

    preferences = client.patch(
        "/api/v1/users/me/preferences",
        headers=headers,
        json={"email_alerts": False, "critical_alerts": True, "weekly_reports": True, "compact_tables": True},
    )
    assert preferences.status_code == 200
    assert preferences.json()["weekly_reports"] is True
    assert client.get("/api/v1/users/me/preferences", headers=headers).json()["compact_tables"] is True

    password = client.patch(
        "/api/v1/users/me/password",
        headers=headers,
        json={"current_password": "correct horse battery staple", "new_password": "new correct horse battery staple"},
    )
    assert password.status_code == 200
    login = client.post(
        "/api/v1/auth/login",
        json={"email": citizen_email, "password": "new correct horse battery staple", "client_type": "android"},
    )
    assert login.status_code == 200

    with SessionLocal.begin() as db:
        saved = db.scalar(select(User).where(User.email == citizen_email))
        assert saved is not None
        assert saved.full_name == "Persisted Citizen"
        assert saved.phone == "+919999999999"
        assert saved.area == "Central"
        assert saved.preferences["weekly_reports"] is True


def test_deactivation_revokes_sessions_and_last_admin_is_protected(user_client) -> None:
    client, admin_token, admin_id, emails = user_client
    _, citizen_token = register_citizen(client, emails)
    headers = {"Authorization": f"Bearer {admin_token}"}
    citizen = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {citizen_token}"}).json()

    last_admin = client.patch(f"/api/v1/users/{admin_id}/status", headers=headers, json={"is_active": False})
    assert last_admin.status_code == 409

    deactivated = client.patch(
        f"/api/v1/users/{citizen['id']}/status",
        headers=headers,
        json={"is_active": False},
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {citizen_token}"}).status_code == 401
