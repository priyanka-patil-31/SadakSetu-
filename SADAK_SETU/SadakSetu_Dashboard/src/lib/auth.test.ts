import { beforeEach, describe, expect, it } from 'vitest'
import { AUTH_SESSION_KEY, createAuthSession, INACTIVITY_TIMEOUT_MS, persistAuthSession, readAuthSession, SESSION_DURATION_MS, touchAuthSession, type AdminUser } from './auth'

const user: AdminUser = { id: 'operator-id', name: 'Authenticated operator', email: 'operator@municipality.example', role: 'Super admin' }

describe('auth session lifecycle', () => {
  beforeEach(() => sessionStorage.clear())

  it('rejects and clears an absolutely expired session', () => {
    const session = createAuthSession(user, 1_000)
    persistAuthSession(session)

    expect(readAuthSession(sessionStorage, 1_000 + SESSION_DURATION_MS)).toBeNull()
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
  })

  it('rejects sessions that have exceeded the inactivity window', () => {
    const session = createAuthSession(user, 1_000)
    persistAuthSession(session)

    expect(readAuthSession(sessionStorage, 1_000 + INACTIVITY_TIMEOUT_MS)).toBeNull()
  })

  it('touches last activity without changing the session identity', () => {
    const session = createAuthSession(user, 1_000)
    const touched = touchAuthSession(session, 2_000)

    expect(touched.sessionId).toBe(session.sessionId)
    expect(touched.lastActivityAt).toBe(2_000)
    expect(touched.expiresAt).toBe(session.expiresAt)
  })
})
