# SadakSetu User Management

## Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/users` | ADMIN | Filtered, paginated user listing |
| GET | `/api/v1/users/me` | Authenticated | Current profile |
| PATCH | `/api/v1/users/me` | Authenticated | Update own email/name |
| GET | `/api/v1/users/{user_id}` | Self or ADMIN | User details |
| PATCH | `/api/v1/users/{user_id}/status` | ADMIN | Activate/deactivate account |
| PATCH | `/api/v1/users/{user_id}/role` | ADMIN | Change role with last-admin protection |

## Protections

- Public registration cannot select an elevated role.
- Only administrators can list users or mutate another user.
- Users cannot access another user’s details unless they are administrators.
- Deactivation revokes all active sessions for the target user.
- The last active administrator cannot be deactivated or demoted.
- Duplicate email addresses are rejected by both application validation and the database unique constraint.
