# SadakSetu Backend

FastAPI backend for the SadakSetu road safety platform. Phases 0 through 13 are complete for the supplied local dataset. The exact Intel Unnati Roboflow v9 source remains an external-source limitation.

## Phase 0 scope

- Python 3.12 virtual environment at `backend/.venv`.
- FastAPI application factory and Uvicorn entry point.
- Environment-backed settings with `.env.example`.
- Structured application logging configuration.
- Explicit CORS configuration for the React development origins.
- Root and versioned health endpoints: `/health` and `/api/v1/health`.
- Pytest, coverage, and Ruff configuration.
- Planned module boundaries, dataset placeholders, schema contract, and source documentation.

## Phase 1 scope

- SQLAlchemy 2 declarative base, naming convention, UUID keys, and UTC timestamp mixin.
- PostgreSQL/PostGIS database engine and session dependency configuration.
- Thirteen domain models with relationships, foreign keys, controlled enums, checks, and indexes.
- Alembic configuration and `0001_initial_schema` migration, including PostGIS and spatial index setup.

The local PostgreSQL 17/PostGIS installation is configured natively through Homebrew for development verification. No Docker or Docker Compose is used.

## macOS setup

From the repository root:

```bash
uv venv backend/.venv --python 3.12
source backend/.venv/bin/activate
uv pip install --python backend/.venv/bin/python -r backend/requirements.txt
cp backend/.env.example backend/.env
```

No Docker or Docker Compose is required or supported by this setup.

## Run the API

```bash
source backend/.venv/bin/activate
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Then open <http://127.0.0.1:8000/docs> or check:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/v1/health
```

## Test and static checks

```bash
source backend/.venv/bin/activate
pytest backend/tests -q --cov=backend/app --cov-report=term-missing
ruff check backend/app backend/ai_service backend/tests
```

## Dataset and model evaluation

The original `Pothole Detection.v1i.yolov11/` export is preserved unchanged and ignored by Git. The reproducible preparation command is:

```bash
cd backend
.venv/bin/python -m ai_service.evaluation.prepare_dataset
```

It creates the ignored single-class dataset at `backend/datasets/provided_pothole_detection_yolo11_prepared/`, converting polygon pothole annotations to YOLO detection boxes. Run the measured test-split evaluation with:

```bash
.venv/bin/python -m ai_service.evaluation.evaluate_model
```

The generated evaluation result is intentionally ignored and removed after cleanup; rerun the command whenever a fresh artifact is needed. See [`docs/dataset-sources.md`](docs/dataset-sources.md) for source identity, license notes, and exact-source limitations.

## Severity classification

Phase 7 provides a separate image-geometry heuristic module and API. It uses validated bounding-box area ratios and detection counts with environment-configurable thresholds; detector confidence is never treated as severity. `POST /api/v1/ai/images/{image_id}/severity` stores the estimate and `GET /api/v1/complaints/{complaint_id}/severity` returns history. Administrators can record a human review through `POST /api/v1/complaints/{complaint_id}/severity/review`. Image-based severity is an operational estimate and requires human review for safety-critical decisions.

## Notifications

Phase 10 provides durable notification history, device-token lifecycle APIs, unread/read operations, and notification hooks for new complaints, status changes, assignments, releases, and resolutions. Firebase Cloud Messaging is an optional best-effort adapter controlled by `FCM_ENABLED` and `FCM_CREDENTIALS_PATH`; database history is committed independently of push delivery.

## Security and deployment

See [`docs/SECURITY_DEPLOYMENT.md`](docs/SECURITY_DEPLOYMENT.md) for native macOS production configuration, security controls, PostgreSQL backup guidance, and the no-Docker runbook.

## Database commands

With PostgreSQL 17 and PostGIS provisioned and `DATABASE_URL` configured:

```bash
source backend/.venv/bin/activate
alembic -c backend/alembic.ini upgrade head
alembic -c backend/alembic.ini downgrade -1
```
