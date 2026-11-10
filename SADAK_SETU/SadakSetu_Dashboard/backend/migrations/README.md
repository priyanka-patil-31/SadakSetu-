# Alembic migrations

The Alembic environment reads `DATABASE_URL` from the backend settings. The initial migration creates the PostgreSQL enums, 13 application tables, foreign keys, indexes, checks, and the PostGIS extension/spatial index.

```bash
alembic -c backend/alembic.ini upgrade head
alembic -c backend/alembic.ini downgrade -1
```

Live execution requires PostgreSQL 17 with PostGIS. The local development service is provisioned natively through Homebrew and Phase 1 migration upgrade, downgrade, re-upgrade, and integration tests have passed.
