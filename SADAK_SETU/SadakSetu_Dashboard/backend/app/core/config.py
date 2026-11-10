from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings.

    Database and authentication settings are environment-backed. Authentication
    secrets are never stored in source-controlled configuration.
    """

    app_name: str = "SadakSetu API"
    app_env: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    host: str = "127.0.0.1"
    port: int = 8000
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = "postgresql+psycopg://sadaksetu:change-me@localhost:5432/sadaksetu"
    session_cookie_name: str = "sadaksetu_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_ttl_minutes: int = 480
    android_session_ttl_days: int = 30
    session_idle_timeout_minutes: int = 60
    password_min_length: int = 8
    upload_root: str = "uploads"
    max_image_size_bytes: int = 10_485_760
    allowed_image_types: str = "image/jpeg,image/png,image/webp"
    ai_model_path: str = "models/pothole.pt"
    ai_model_name: str = "unselected-pothole-model"
    ai_model_version: str = "unselected"
    ai_annotated_root: str = "uploads/annotated"
    severity_small_area_ratio: float = 0.05
    severity_medium_area_ratio: float = 0.15
    severity_large_area_ratio: float = 0.35
    severity_medium_count: int = 2
    severity_high_count: int = 3
    severity_critical_count: int = 5
    fcm_enabled: bool = False
    fcm_credentials_path: str | None = None

    @property
    def allowed_image_type_list(self) -> list[str]:
        return [item.strip().lower() for item in self.allowed_image_types.split(",") if item.strip()]

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.app_env == "production":
            if "change-me" in self.database_url or "localhost" in self.database_url or "127.0.0.1" in self.database_url:
                raise ValueError("Production DATABASE_URL must reference a managed non-local database")
            if not self.session_cookie_secure:
                raise ValueError("Production session cookies must be Secure")
            if not self.cors_origin_list or "*" in self.cors_origin_list:
                raise ValueError("Production CORS origins must be explicit")
            if self.fcm_enabled and not self.fcm_credentials_path:
                raise ValueError("FCM_CREDENTIALS_PATH is required when FCM is enabled in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
