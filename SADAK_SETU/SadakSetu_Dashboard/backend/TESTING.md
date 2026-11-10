# SadakSetu Backend Testing

## Phase 13 — Final Security and Deployment Readiness

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed. |
| 2. Environment and dependencies | PASS | Python 3.12 environment, Alembic head, and `uv pip check` passed. |
| 3. Functional testing | PASS | Production-setting validation, security headers, request IDs, and audit hooks passed. |
| 4. API testing | PASS | Full API contract and authorization suite remained green. |
| 5. Database testing | PASS | PostgreSQL/PostGIS suite and migration head verification passed. |
| 6. Security testing | PASS | No credential files/private keys found; production defaults rejected; non-debug errors, security headers, RBAC, private uploads, and session controls passed. |
| 7. Integration testing | PASS | Auth, complaints, assignments, notifications, reports, frontend API compatibility, and audit persistence remained integrated. |
| 8. Regression testing | PASS | Full live backend suite: 45 passed; frontend: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Production config failures, unknown routes, validation envelopes, and security middleware paths passed. |
| 10. Performance testing | NOT APPLICABLE | No production workload or deployment target was supplied; native deployment guidance is documented. |
| 11. Phase acceptance | PASS | Phase 13 security/deployment-readiness requirements are implemented and verified. |

## Phase 12 — API Integration and Documentation

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed. |
| 2. Environment and dependencies | PASS | `uv pip check` passed. |
| 3. Functional testing | PASS | Versioned API endpoints, pagination fields, request IDs, and error envelopes passed. |
| 4. API testing | PASS | OpenAPI resource paths and validation/error response contracts passed. |
| 5. Database testing | PASS | Full live domain suite remained green. |
| 6. Security testing | PASS | Authenticated frontend headers, CORS restrictions, and non-debug error responses passed. |
| 7. Integration testing | PASS | Frontend real-service mappings align with `/api/v1`, direct backend response shapes, and bearer sessions. |
| 8. Regression testing | PASS | Full live backend suite: 42 passed; frontend: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Unknown routes, validation errors, request-ID propagation, and stable error payloads passed. |
| 10. Performance testing | NOT APPLICABLE | No production load target exists; request processing remains synchronous for current modules. |
| 11. Phase acceptance | PASS | Phase 12 API integration/documentation requirements are implemented and verified. |

## Phase 11 — Reports and Analytics

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed. |
| 2. Environment and dependencies | PASS | `uv pip check` passed. |
| 3. Functional testing | PASS | Summary counts, severity distribution, monthly trends, area/team aggregates, and AI statistics passed. |
| 4. API testing | PASS | Admin-only summary and CSV endpoints, date filters, and CSV headers/content passed. |
| 5. Database testing | PASS | Reports read complaints, locations, teams, images, and AI detections from PostgreSQL. |
| 6. Security testing | PASS | Citizen access to report endpoints was denied. |
| 7. Integration testing | PASS | Report aggregates and CSV export use the same filtered complaint query. |
| 8. Regression testing | PASS | Full live backend suite: 40 passed; frontend: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Reversed date ranges return 422; empty AI-detection sets are handled. |
| 10. Performance testing | NOT APPLICABLE | No production data volume exists; report query indexes remain inherited from domain tables. |
| 11. Phase acceptance | PASS | Phase 11 requirements are implemented and live-verified. |

## Phase 10 — Notifications

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed. |
| 2. Environment and dependencies | PASS | `uv pip check` passed; FCM adapter is lazy and local tests require no credentials. |
| 3. Functional testing | PASS | Device-token upsert/invalidation, notification creation, unread filtering, mark-read, and mark-all-read passed. |
| 4. API testing | PASS | Notification and token endpoints returned expected success and ownership-protected errors. |
| 5. Database testing | PASS | Notification and device-token rows persisted against PostgreSQL. |
| 6. Security testing | PASS | Notification/token reads and mutations are scoped to the authenticated user. |
| 7. Integration testing | PASS | Complaint creation/status updates and assignment operations create durable notification history. |
| 8. Regression testing | PASS | Full live backend suite: 39 passed; frontend: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Token upsert and invalidation behavior passed; push failures are isolated by the best-effort adapter contract. |
| 10. Performance testing | NOT APPLICABLE | No production notification volume exists; pagination and indexed user lookups are configured. |
| 11. Phase acceptance | PASS | Durable notification requirements are implemented and live-verified; FCM is deployment-configured and disabled by default. |

## Phase 9 — Assignment and Status Tracking

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed. |
| 2. Environment and dependencies | PASS | `uv pip check` passed for all installed packages. |
| 3. Functional testing | PASS | Assignment, reassignment, release, history, and status integration passed. |
| 4. API testing | PASS | Admin-only mutation, owner-visible history, and expected conflict responses passed. |
| 5. Database testing | PASS | Active/released assignment rows, timestamps, complaint ownership, and timeline events persisted against PostgreSQL. |
| 6. Security testing | PASS | Citizens cannot mutate assignments; assignment history enforces complaint ownership. |
| 7. Integration testing | PASS | Complaint status, team availability, row locks, assignment records, and history integrated transactionally. |
| 8. Regression testing | PASS | Full live backend suite: 36 passed; frontend: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Duplicate assignment, off-duty team, terminal complaint, and PostgreSQL locking edge cases passed. |
| 10. Performance testing | NOT APPLICABLE | No production workload exists; indexed foreign keys and row locks are configured. |
| 11. Phase acceptance | PASS | Phase 9 requirements are implemented and live-verified. |

## Phase 8 — Repair Team Management

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed. |
| 2. Environment and dependencies | PASS | Existing environment passed `uv pip check`. |
| 3. Functional testing | PASS | Team CRUD, availability, details, assigned complaints, and assignment history passed. |
| 4. API testing | PASS | Admin authorization and duplicate/delete conflict responses passed. |
| 5. Database testing | PASS | Team persistence and assignment-history reads passed against PostgreSQL. |
| 6. Security testing | PASS | Team mutations and operational reads are admin-only. |
| 7. Integration testing | PASS | Team APIs integrated with existing complaint and assignment relationships. |
| 8. Regression testing | PASS | Full live backend suite: 36 passed; frontend: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Duplicate names and deletion of referenced teams were rejected. |
| 10. Performance testing | NOT APPLICABLE | Pagination and indexed team fields are configured; no production volume exists. |
| 11. Phase acceptance | PASS | Phase 8 requirements are implemented and live-verified. |

## Phase 7 — Severity Classification

Status: COMPLETE. Verified on 2026-11-02. Phase 6 dataset evaluation remains independently blocked; this phase uses no unverified dataset metrics.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed across application, AI service, migrations, and tests. |
| 2. Environment and dependencies | PASS | `uv pip check` passed for all 76 installed packages. |
| 3. Functional testing | PASS | 5 unit tests covered LOW/MEDIUM/HIGH/CRITICAL boundaries, count escalation, invalid geometry, and confidence exclusion. |
| 4. API testing | PASS | Detection-to-severity, history, admin review, and role denial endpoints passed. |
| 5. Database testing | PASS | Severity record creator, measurements, limitations, complaint severity, and audit update persistence passed against PostgreSQL/PostGIS. |
| 6. Security testing | PASS | Complaint/image ownership was enforced; only administrators can submit a human severity review. |
| 7. Integration testing | PASS | Completed AI detection metadata, severity classifier, complaint update history, and SQLAlchemy persistence worked together. |
| 8. Regression testing | PASS | Full live backend suite: 34 passed; frontend suite: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Invalid coordinates, malformed boxes, missing measurements, missing completed detection, and unauthorized review were covered. |
| 10. Performance testing | NOT APPLICABLE | No production workload exists; the classifier is a synchronous, bounded geometry calculation. |
| 11. Phase acceptance | PASS | Dataset-independent Phase 7 requirements are implemented and verified. |

### Phase 7 API

- `POST /api/v1/ai/images/{image_id}/severity` classifies the latest completed detection for an authorized image.
- `GET /api/v1/complaints/{complaint_id}/severity` returns severity history for an authorized complaint.
- `POST /api/v1/complaints/{complaint_id}/severity/review` records an administrator review and supersedes the current complaint severity.

The classifier records its method, version, measured geometry, thresholds, and limitations. It does not use YOLO confidence as severity and does not claim that image area alone establishes real-world road danger.

## Phase 6 — AI Detection Integration

Status: BLOCKED by required Roboflow dataset credential/access. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed across app, AI service, migrations, and tests. |
| 2. Environment and dependencies | PASS | Base and optional AI dependencies resolved; `uv pip check` passed. |
| 3. Functional testing | PASS | AI API contract and unavailable-model persistence test passed. |
| 4. API testing | PASS | Detection start returns 503 when no approved checkpoint is configured; detection history returns persisted FAILED records. |
| 5. Database testing | PASS | `ai_detections` status, model metadata, error, and zero-count persistence passed against PostgreSQL. |
| 6. Security testing | PASS | Image authorization is reused; no model credentials or weights are committed; no fake detections or metrics are returned. |
| 7. Integration testing | PASS | Complaint image, AI service, SQLAlchemy persistence, and annotated-output contract integrated successfully. |
| 8. Regression testing | PASS | Full backend suite: 27 passed; frontend suite: 22 passed; ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Missing checkpoint and model-unavailable behavior are explicit and tested. |
| 10. Performance testing | NOT APPLICABLE | Only a smoke inference was run; it is not a benchmark or evaluation metric. |
| 11. Phase acceptance | BLOCKED | Required Roboflow v9 evaluation data could not be downloaded because the endpoint returned HTTP 403 without an external credential. |

### AI smoke verification

- Checkpoint: DanielsStulpe `baseline_yolo11.pt`.
- SHA-256: `72611b4b92e5a00abb607a38d81113bc08fc88a471fb57dabd8fefc2fbad891b`.
- Model load: passed; class verified as `pothole`.
- Smoke image: SadakSetu logo only, not evaluation data.
- Smoke result: 0 detections, 3,554 ms; no accuracy claim made.
- Required next action: provide permitted Roboflow access or an approved local v9 export, then run reproducible evaluation before Phase 6 can be completed.

## Phase 5 — Image Storage and GPS

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed. |
| 2. Environment and dependencies | PASS | 45 pinned packages passed `uv pip check`; Pillow and multipart support installed. |
| 3. Functional testing | PASS | 2 live tests passed for image metadata/storage/download and nearby location search. |
| 4. API testing | PASS | Upload, listing, download, invalid image, nearby search, and unauthenticated access responses verified. |
| 5. Database testing | PASS | Complaint image metadata persistence and PostGIS distance query passed. |
| 6. Security testing | PASS | Private storage paths, MIME/content validation, path traversal protection, and owner/admin authorization verified. |
| 7. Integration testing | PASS | Upload service, complaint ownership, SQLAlchemy metadata, and PostGIS worked together. |
| 8. Regression testing | PASS | Full backend 26-test suite and frontend 22-test suite remained green. |
| 9. Error and edge-case testing | PASS | Empty/invalid image content, unauthorized nearby search, and invalid MIME handling were tested. |
| 10. Performance testing | NOT APPLICABLE | No production image workload exists; size limits and indexed spatial lookup are configured. |
| 11. Phase acceptance | PASS | Phase 5 requirements are implemented and live-verified. |

Result: **2 phase-specific tests passed**, **0 failed**.

## Phase 3 — User Management

Status: COMPLETE. Verified on 2026-11-02.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and compile checks passed. |
| 2. Environment and dependencies | PASS | Existing 43-package environment passed `uv pip check`. |
| 3. Functional testing | PASS | 3 live tests passed for listing/filtering, profile updates, deactivation, session revocation, and admin protection. |
| 4. API testing | PASS | User endpoints returned expected 200, 401, 403, and 409 responses. |
| 5. Database testing | PASS | User updates, unique email enforcement, role/status persistence, and session revocation were verified against PostgreSQL. |
| 6. Security testing | PASS | Citizen listing access was denied; self/administrator scope was enforced; last-admin protections passed. |
| 7. Integration testing | PASS | User APIs integrated with authentication dependencies and existing session tables. |
| 8. Regression testing | PASS | Full backend and frontend suites remained green. |
| 9. Error and edge-case testing | PASS | Duplicate email, unauthorized listing, account deactivation, and last-admin deactivation were tested. |
| 10. Performance testing | NOT APPLICABLE | No production user volume exists in this phase; pagination is implemented. |
| 11. Phase acceptance | PASS | User-management requirements are implemented and live-verified. |

Result: **3 phase-specific tests passed**, **0 failed**.

## Phase 1 — Database Architecture

Status: COMPLETE. Verified on 2026-11-02 with native PostgreSQL 17.11 and PostGIS 3.7.0.

| Testing pass | Status | Evidence |
|---|---|---|
| 1. Code quality | PASS | Ruff and Python compile checks passed across app, migrations, and tests. |
| 2. Environment and dependencies | PASS | Python 3.12.14; PostgreSQL 17.11; PostGIS 3.7.0; 37 Python packages passed `uv pip check`. |
| 3. Functional testing | PASS | 12 backend tests passed with live database integration enabled. |
| 4. API testing | NOT APPLICABLE | Phase 1 adds no database-domain API endpoints; existing health API regression remained green. |
| 5. Database testing | PASS | Live connectivity, PostGIS availability, migration revision, CRUD relationships, spatial query, invalid-coordinate constraint, downgrade, and re-upgrade passed. |
| 6. Security testing | PASS | Application role is non-superuser; PostGIS was provisioned separately by the local database administrator; credentials remain environment-backed; no destructive operation touched existing user data. |
| 7. Integration testing | PASS | SQLAlchemy sessions, ORM relationships, PostGIS spatial query, and Alembic migration state worked together. |
| 8. Regression testing | PASS | Existing backend health tests and frontend 22-test suite passed; frontend ESLint and Vite build passed. |
| 9. Error and edge-case testing | PASS | Invalid latitude was rejected by the database check constraint; enum/type migration duplicate bug was found and fixed; live migration failure paths were retested. |
| 10. Performance testing | NOT APPLICABLE | No Phase 1 production workload exists yet; spatial/index definitions were compiled and created successfully. |
| 11. Phase acceptance | PASS | All Phase 1 database architecture requirements are implemented and live-verified. |

### Phase 1 verification results

```text
uv pip check --python .venv/bin/python                         PASS
.venv/bin/ruff check app migrations tests                     PASS
.venv/bin/python -m compileall -q app migrations tests        PASS
.venv/bin/alembic -c alembic.ini upgrade head                 PASS
.venv/bin/alembic -c alembic.ini downgrade base               PASS
.venv/bin/alembic -c alembic.ini upgrade head                 PASS
SADAKSETU_RUN_DB_TESTS=1 pytest tests -q --cov=app             12 passed
```

Coverage for the current application package: **98%**. No tests failed.

### Phase 1 database changes

- Added SQLAlchemy 2 declarative base and timestamp/UUID conventions.
- Added database engine, session factory, and request dependency configuration.
- Added models for `users`, `sessions`, `complaints`, `complaint_images`, `locations`, `ai_detections`, `severity_records`, `repair_teams`, `team_assignments`, `complaint_updates`, `notifications`, `device_tokens`, and `audit_logs`.
- Added controlled PostgreSQL enums for roles, complaint statuses, severities, team availability, assignment status, and AI detection status.
- Added foreign keys, delete behavior, coordinate checks, JSON/JSONB fields, lookup indexes, partial indexes, unique active-assignment index, and the PostGIS `geography(Point, 4326)` field.
- Added Alembic revision `0001_initial_schema` with PostGIS extension setup and reverse table teardown. PostGIS itself is intentionally not dropped on downgrade.

### Database verification

- PostgreSQL server version: 17.11.
- PostGIS version: 3.7.0.
- Alembic revision: `0001_initial_schema (head)`.
- Application role: `sadaksetu`, used without superuser privileges.
- Live test data is created inside rolled-back transactions.

## Phase 0 — Environment and Initialization

Status: COMPLETE

Phase 0 verification is preserved in the project history and included in the regression checks above: backend health tests, Uvicorn startup, OpenAPI, CORS, frontend tests, ESLint, and Vite production build passed.

## Test commands

```bash
source backend/.venv/bin/activate
pytest backend/tests -q --cov=backend/app --cov-report=term-missing
SADAKSETU_RUN_DB_TESTS=1 pytest backend/tests -q --cov=backend/app --cov-report=term-missing
ruff check backend/app backend/migrations backend/tests
npm test -- --run
npm run lint
npm run build
```
