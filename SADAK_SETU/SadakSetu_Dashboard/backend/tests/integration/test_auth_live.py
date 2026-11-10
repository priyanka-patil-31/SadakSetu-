from datetime import timedelta
from uuid import uuid4

import pytest
from app.core.config import get_settings
from app.core.security import hash_password, hash_session_token
from app.database.connection import SessionLocal
from app.main import create_app
from app.models import Session, User, UserRole
from app.schemas.auth import ClientType
from app.services.auth import create_session, utc_now
from fastapi.testclient import TestClient
from sqlalchemy import select

pytestmark = pytest.mark.skipif(
    __import__("os").getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live authentication integration tests",
)


@pytest.fixture
def auth_client():
    emails: list[str] = []
    with TestClient(create_app()) as client:
        yield client, emails
    with SessionLocal.begin() as db:
        for user in db.scalars(select(User).where(User.email.in_(emails))).all():
            db.delete(user)


def unique_email(prefix: str = "citizen") -> str:
    return f"{prefix}-{uuid4()}@example.com"


def test_android_registration_login_me_and_logout(auth_client) -> None:
    client, emails = auth_client
    email = unique_email()
    emails.append(email)

    registered = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "correct horse battery staple",
            "full_name": "Integration Citizen",
            "client_type": "android",
        },
    )
    assert registered.status_code == 201
    token = registered.json()["session_id"]
    assert token

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert me.json()["role"] == "CITIZEN"

    session = client.get("/api/v1/auth/session", headers={"Authorization": f"Bearer {token}"})
    assert session.status_code == 200
    assert session.json()["expires_at"]

    logged_out = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logged_out.status_code == 200
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401

    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "correct horse battery staple", "client_type": "android"},
    )
    assert logged_in.status_code == 200
    refreshed_token = logged_in.json()["session_id"]
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {refreshed_token}"}).status_code == 200
    assert client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {refreshed_token}"}).status_code == 200


def test_browser_registration_uses_httponly_cookie(auth_client) -> None:
    client, emails = auth_client
    email = unique_email()
    emails.append(email)

    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "correct horse battery staple", "full_name": "Browser Citizen"},
    )
    assert registered.status_code == 201
    assert registered.json()["session_id"] is None
    assert "HttpOnly" in registered.headers["set-cookie"]
    assert client.get("/api/v1/auth/me").status_code == 200

    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_invalid_credentials_duplicate_registration_and_role_escalation_are_rejected(auth_client) -> None:
    client, emails = auth_client
    email = unique_email()
    emails.append(email)
    payload = {"email": email, "password": "correct horse battery staple", "full_name": "Citizen"}

    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409
    assert client.post("/api/v1/auth/login", json={"email": email, "password": "wrong"}).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/register",
            json={**payload, "email": unique_email(), "role": "ADMIN"},
        ).status_code
        == 422
    )


def test_expired_session_is_rejected_and_admin_route_enforces_rbac(auth_client) -> None:
    client, emails = auth_client
    citizen_email = unique_email("citizen")
    admin_email = unique_email("admin")
    emails.extend([citizen_email, admin_email])

    citizen_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": citizen_email,
            "password": "correct horse battery staple",
            "full_name": "Citizen",
            "client_type": "android",
        },
    )
    citizen_token = citizen_response.json()["session_id"]
    admin_check = client.get("/api/v1/auth/admin-check", headers={"Authorization": f"Bearer {citizen_token}"})
    assert admin_check.status_code == 403

    with SessionLocal.begin() as db:
        admin = User(
            email=admin_email,
            password_hash=hash_password("correct horse battery staple"),
            full_name="Administrator",
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.flush()
        token, _ = create_session(db, admin, ClientType.ANDROID, get_settings())
        admin_token = token

    assert client.get("/api/v1/auth/admin-check", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200

    with SessionLocal.begin() as db:
        expired = db.scalar(select(Session).where(Session.credential_hash == hash_session_token(citizen_token)))
        assert expired is not None
        expired.expires_at = utc_now() - timedelta(minutes=1)

    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {citizen_token}"}).status_code == 401
