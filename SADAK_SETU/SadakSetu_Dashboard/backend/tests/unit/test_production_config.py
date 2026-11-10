import pytest
from app.core.config import Settings


def test_production_defaults_reject_local_database_and_insecure_cookie() -> None:
    with pytest.raises(ValueError):
        Settings(app_env="production")


def test_production_settings_accept_explicit_secure_configuration() -> None:
    settings = Settings(
        app_env="production",
        database_url="postgresql+psycopg://app:secret@db.internal:5432/sadaksetu",
        session_cookie_secure=True,
        cors_origins="https://admin.example.com",
    )
    assert settings.app_env == "production"
