# Security and deployment readiness

## Production configuration

SadakSetu does not use Docker or Docker Compose. Run Python 3.12 with a managed PostgreSQL/PostGIS service, configure environment variables outside the repository, and run Alembic migrations before starting Uvicorn.

Production settings reject local/default database URLs, insecure cookies, wildcard CORS, and enabled FCM without credentials. Set at minimum:

- `APP_ENV=production`
- `DATABASE_URL` for a managed PostgreSQL/PostGIS instance
- `SESSION_COOKIE_SECURE=true`
- `CORS_ORIGINS` to explicit HTTPS dashboard origins
- `FCM_ENABLED=true` and `FCM_CREDENTIALS_PATH` only when Firebase delivery is configured

Never commit `.env`, Firebase service-account JSON, database passwords, session tokens, model weights, uploads, or dataset archives.

## Security controls

- Passwords use Argon2id; session credentials are generated with the system CSPRNG and stored only as SHA-256 digests.
- Browser sessions use HTTP-only cookies; Android clients use bearer session tokens.
- Request IDs are propagated in `X-Request-ID` and stable error envelopes contain no stack traces.
- Responses include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.
- Uploads are private, content-validated, size-limited, checksum-recorded, and authorization-protected.
- Admin mutations and authentication events can be recorded in the `audit_logs` table through the audit service.
- Complaint, assignment, notification, user, and report routes enforce role/ownership boundaries.

## Native macOS runbook

```bash
brew services start postgresql@17
source backend/.venv/bin/activate
alembic -c backend/alembic.ini upgrade head
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

For a production process manager, bind Uvicorn behind TLS termination and a trusted reverse proxy. Do not expose the development server directly to the public internet.

## PostgreSQL backup guidance

Use the managed provider's encrypted, tested backups in production. For a native manual backup, run a scoped command such as:

```bash
pg_dump --format=custom --file=/secure/backup/sadaksetu-$(date +%Y%m%d).dump "$DATABASE_URL"
```

Store backups outside the repository, encrypt them at rest, restrict access, and periodically test restore into an isolated PostgreSQL/PostGIS database. The application migration downgrade path is for controlled development verification, not a production backup strategy.
