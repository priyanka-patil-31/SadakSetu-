from os import getenv
from uuid import uuid4

import pytest
from app.database.connection import SessionLocal, engine
from app.models import Complaint, ComplaintStatus, Location, RepairTeam, SeverityLevel, TeamAvailability, User, UserRole
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

pytestmark = pytest.mark.skipif(
    getenv("SADAKSETU_RUN_DB_TESTS") != "1",
    reason="Set SADAKSETU_RUN_DB_TESTS=1 to run live PostgreSQL/PostGIS integration tests",
)


def test_database_and_postgis_are_available() -> None:
    with engine.connect() as connection:
        server_version = connection.scalar(text("SHOW server_version"))
        postgis_version = connection.scalar(text("SELECT postgis_full_version()"))

    assert str(server_version).startswith("17.")
    assert "POSTGIS" in str(postgis_version).upper()


def test_migration_revision_is_applied() -> None:
    with engine.connect() as connection:
        revision = connection.scalar(text("SELECT version_num FROM alembic_version"))

    assert revision == "0003_severity_creator"


def test_crud_relationships_and_spatial_query() -> None:
    with SessionLocal.begin() as session:
        user = User(
            email=f"phase1-{uuid4()}@example.com",
            password_hash="test-only-hash",
            full_name="Phase 1 Integration",
            role=UserRole.CITIZEN,
        )
        location = Location(
            latitude=12.9716,
            longitude=77.5946,
            point=WKTElement("POINT(77.5946 12.9716)", srid=4326),
            area="Integration Area",
            zone="TEST",
        )
        team = RepairTeam(
            name=f"Phase 1 Team {uuid4()}",
            lead_name="Integration Lead",
            phone="+910000000000",
            email=f"team-{uuid4()}@example.com",
            availability=TeamAvailability.AVAILABLE,
        )
        complaint = Complaint(
            complaint_number=f"P1-{uuid4().hex[:20]}",
            reporter=user,
            location=location,
            assigned_team=team,
            status=ComplaintStatus.SUBMITTED,
            severity=SeverityLevel.MEDIUM,
            title="Integration test complaint",
            description="Created and rolled back by the Phase 1 integration test.",
        )
        session.add(complaint)
        session.flush()

        assert complaint.id is not None
        assert complaint.reporter.email.endswith("@example.com")
        assert complaint.location.point is not None
        nearby = session.scalar(
            select(func.ST_DWithin(location.point, WKTElement("POINT(77.5946 12.9716)", srid=4326), 10))
        )
        assert nearby is True


def test_database_constraints_reject_invalid_rows() -> None:
    with SessionLocal.begin() as session:
        invalid_location = Location(
            latitude=91,
            longitude=77.5946,
            point=WKTElement("POINT(77.5946 12.9716)", srid=4326),
        )
        session.add(invalid_location)
        with pytest.raises(IntegrityError):
            session.flush()

