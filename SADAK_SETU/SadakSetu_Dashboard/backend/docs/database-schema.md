# SadakSetu planned database schema

This is the Phase 1 PostgreSQL 17 + PostGIS schema contract and implementation summary. SQLAlchemy models are defined in `app/models/entities.py`, and the initial Alembic migration is `migrations/versions/0001_initial_schema.py`.

All tables use UUID primary keys, UTC `created_at` and `updated_at` timestamps where applicable, foreign-key constraints, and indexes appropriate to their lookup patterns. Complaint status and severity values are controlled enums, not arbitrary strings.

| Table | Core columns and relationships |
|---|---|
| `users` | `id`, `email` unique, `password_hash`, `full_name`, `role`, `is_active`, `created_at`, `updated_at` |
| `sessions` | `id`, `user_id` → `users`, `credential_hash`, `expires_at`, `last_activity_at`, `revoked_at`, `created_at`; index user/expiry/revocation |
| `complaints` | `id`, unique `complaint_number`, `reporter_id` → `users`, `status`, `severity`, `title`, `description`, `location_id` → `locations`, `assigned_team_id` → `repair_teams` nullable, timestamps |
| `complaint_images` | `id`, `complaint_id` → `complaints`, storage key/path, media type, byte size, checksum, capture timestamp, GPS metadata |
| `locations` | `id`, latitude/longitude validation fields, PostGIS `geography(Point, 4326)`, address/area/zone, timestamps; spatial index |
| `ai_detections` | `id`, `complaint_image_id` → `complaint_images`, model name/version, status, processing time, detection count, raw result metadata, error message nullable |
| `severity_records` | `id`, `complaint_id` → `complaints`, severity enum, method/version, measurements JSON, limitations/notes, created by/system timestamp |
| `repair_teams` | `id`, name unique, lead/contact fields, availability, is_active, timestamps |
| `team_assignments` | `id`, `complaint_id` → `complaints`, `team_id` → `repair_teams`, assigned_by → `users`, assigned/released timestamps, assignment status; unique active assignment constraint |
| `complaint_updates` | `id`, `complaint_id` → `complaints`, actor_id → `users`, event type, old/new values, note, created timestamp; complaint timeline index |
| `notifications` | `id`, `user_id` → `users`, type, title, body, read_at, created_at, related complaint/team IDs nullable |
| `device_tokens` | `id`, `user_id` → `users`, platform, token unique, active flag, last_seen_at, timestamps |
| `audit_logs` | `id`, actor_id → `users` nullable, action, entity type/id, request ID, IP/user-agent metadata, before/after JSON, created timestamp |

## Controlled values

- Complaint status: `SUBMITTED`, `UNDER_REVIEW`, `AI_PROCESSING`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`.
- Severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Roles: `ADMIN`, `CITIZEN`, `REPAIR_TEAM`.

Phase 1 adds the foreign keys, indexes, enum types, coordinate checks, PostGIS extension handling, and Alembic migration described above. Status-transition validation belongs to complaint business logic in a later phase. The migration has passed offline SQL generation plus live upgrade, downgrade, and re-upgrade verification against PostgreSQL 17/PostGIS 3.7.
