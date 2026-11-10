from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.v1.ai.routes import router as ai_router
from app.api.v1.assignments.routes import router as assignments_router
from app.api.v1.auth.routes import router as auth_router
from app.api.v1.complaints.routes import router as complaints_router
from app.api.v1.images.routes import router as images_router
from app.api.v1.locations.routes import router as locations_router
from app.api.v1.notifications.routes import router as notifications_router
from app.api.v1.reports.routes import router as reports_router
from app.api.v1.severity.routes import router as severity_router
from app.api.v1.teams.routes import router as teams_router
from app.api.v1.users.routes import router as users_router
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix=settings.api_v1_prefix)
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(ai_router)
router.include_router(assignments_router)
router.include_router(users_router)
router.include_router(complaints_router)
router.include_router(images_router)
router.include_router(locations_router)
router.include_router(notifications_router)
router.include_router(reports_router)
router.include_router(severity_router)
router.include_router(teams_router)
