export const AUTH_SESSION_KEY = 'sadaksetu.auth.session'
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
export const AUTH_SESSION_LIFETIME_LABEL = `${SESSION_DURATION_MS / (60 * 60 * 1000)} hours`

export type AdminUser = {
  id: string
  name: string
  email: string
  role: 'Super admin'
}

export type AuthSession = {
  sessionId: string
  accessToken?: string
  user: AdminUser
  createdAt: number
  lastActivityAt: number
  expiresAt: number
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `session-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export function createAuthSession(user: AdminUser, now = Date.now(), accessToken?: string): AuthSession {
  return { sessionId: createSessionId(), ...(accessToken ? { accessToken } : {}), user, createdAt: now, lastActivityAt: now, expiresAt: now + SESSION_DURATION_MS }
}

function isSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AuthSession>
  return typeof candidate.sessionId === 'string' && typeof candidate.createdAt === 'number' && typeof candidate.lastActivityAt === 'number' && typeof candidate.expiresAt === 'number' && Boolean(candidate.user?.id) && Boolean(candidate.user?.email)
}

export function clearAuthSession(storage: Storage = sessionStorage) {
  storage.removeItem(AUTH_SESSION_KEY)
}

export function readAuthSession(storage: Storage = sessionStorage, now = Date.now()): AuthSession | null {
  try {
    const raw = storage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!isSessionShape(value) || now >= value.expiresAt || now - value.lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
      clearAuthSession(storage)
      return null
    }
    return value
  } catch {
    clearAuthSession(storage)
    return null
  }
}

export function persistAuthSession(session: AuthSession, storage: Storage = sessionStorage) {
  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function touchAuthSession(session: AuthSession, now = Date.now()): AuthSession {
  return { ...session, lastActivityAt: now }
}
