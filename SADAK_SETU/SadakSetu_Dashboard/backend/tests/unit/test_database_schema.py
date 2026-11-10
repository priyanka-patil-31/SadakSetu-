from app import models
from app.database.base import Base
from sqlalchemy.dialects.postgresql import dialect
from sqlalchemy.schema import CreateTable

EXPECTED_TABLES = {
    "users",
    "sessions",
    "complaints",
    "complaint_images",
    "locations",
    "ai_detections",
    "severity_records",
    "repair_teams",
    "team_assignments",
    "complaint_updates",
    "notifications",
    "device_tokens",
    "audit_logs",
}


def test_all_planned_tables_are_registered() -> None:
    assert set(Base.metadata.tables) == EXPECTED_TABLES


def test_postgresql_ddl_compiles_for_every_table() -> None:
    postgres = dialect()

    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=postgres))
        assert ddl.startswith("\nCREATE TABLE")
        assert table.name in ddl


def test_relationship_keys_and_postgis_location_type_are_declared() -> None:
    complaint = Base.metadata.tables["complaints"]
    location = Base.metadata.tables["locations"]

    assert {foreign_key.target_fullname for foreign_key in complaint.c.reporter_id.foreign_keys} == {"users.id"}
    assert {foreign_key.target_fullname for foreign_key in complaint.c.location_id.foreign_keys} == {"locations.id"}
    assert location.c.point.type.geometry_type == "POINT"
    assert location.c.point.type.srid == 4326


def test_model_exports_include_controlled_database_enums() -> None:
    assert models.UserRole.ADMIN.value == "ADMIN"
    assert models.ComplaintStatus.IN_PROGRESS.value == "IN_PROGRESS"
    assert models.SeverityLevel.CRITICAL.value == "CRITICAL"
