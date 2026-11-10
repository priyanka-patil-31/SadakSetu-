# SadakSetu Authentication

## Supported clients

- Browser dashboard sessions use an opaque random session token stored only as a hashed credential in PostgreSQL and delivered through an HTTP-only cookie.
- Android clients use the same opaque token model through `Authorization: Bearer <session-token>`.
- `X-Session-ID` is accepted for compatibility with the existing API contract.
- Public registration always creates a `CITIZEN`; clients cannot submit or select an elevated role.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a citizen and create a session |
| POST | `/api/v1/auth/login` | Authenticate credentials and create a session |
| POST | `/api/v1/auth/logout` | Revoke the current session |
| GET | `/api/v1/auth/me` | Return the authenticated user |
| GET | `/api/v1/auth/session` | Return current session expiry/activity metadata |
| GET | `/api/v1/auth/admin-check` | RBAC verification endpoint requiring `ADMIN` |

## Security behavior

- Passwords are hashed with Argon2id using `argon2-cffi`.
- Session tokens are generated with the system CSPRNG and stored as SHA-256 digests; raw tokens are never persisted.
- Browser cookies are HTTP-only, `SameSite=Lax` by default, and become `Secure` in production.
- Sessions expire by absolute TTL and idle timeout, and can be explicitly revoked at logout.
- Inactive users cannot authenticate; active sessions are invalidated when an inactive account is encountered.
- All protected endpoints require a valid, unexpired, non-revoked session.
- Role checks are enforced through FastAPI dependencies on the backend.
- Database credentials and cookie configuration are environment-backed.

## Configuration

Configure `DATABASE_URL`, session TTLs, idle timeout, cookie name, cookie security, SameSite policy, and password minimum length in the backend environment. Never commit a real password or token.

Rate limiting, account recovery, email verification, and external identity providers are intentionally deferred to later security/API phases.
