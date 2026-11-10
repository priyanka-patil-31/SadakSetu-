import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearAuthSession, createAuthSession, INACTIVITY_TIMEOUT_MS, persistAuthSession, readAuthSession, touchAuthSession, type AuthSession } from '@/lib/auth'
import { AuthContext, type LoginResult } from '@/context/auth-context'
import { authService } from '@/services/auth-service'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession())
  const [logoutReason, setLogoutReason] = useState<'expired' | null>(null)

  const logout = useCallback((reason?: 'expired') => {
    clearAuthSession()
    setSession(null)
    setLogoutReason(reason ?? null)
  }, [])

  const updateUser = useCallback((patch: Partial<Pick<AuthSession['user'], 'name' | 'email'>>) => {
    setSession((current) => {
      if (!current) return current
      const nextSession = { ...current, user: { ...current.user, ...patch } }
      persistAuthSession(nextSession)
      return nextSession
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await authService.login({ email, password })
      const nextSession = createAuthSession(response.user, Date.now(), response.accessToken)
      persistAuthSession(nextSession)
      setSession(nextSession)
      setLogoutReason(null)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'The email or password is incorrect.' }
    }
  }, [])

  useEffect(() => {
    if (!session) return
    let lastPersistedActivity = session.lastActivityAt
    const checkSession = () => {
      const current = readAuthSession()
      if (!current || current.sessionId !== session.sessionId) {
        logout('expired')
        return
      }
      if (current.lastActivityAt !== session.lastActivityAt) setSession(current)
    }
    const registerActivity = () => {
      const now = Date.now()
      if (now >= session.expiresAt || now - lastPersistedActivity >= INACTIVITY_TIMEOUT_MS) {
        logout('expired')
        return
      }
      if (now - lastPersistedActivity >= 60_000) {
        const nextSession = touchAuthSession(session, now)
        persistAuthSession(nextSession)
        lastPersistedActivity = now
        setSession(nextSession)
      }
    }
    const activityEvents: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }))
    const interval = window.setInterval(checkSession, 15_000)
    const timeout = window.setTimeout(logout, Math.min(session.expiresAt - Date.now(), session.lastActivityAt + INACTIVITY_TIMEOUT_MS - Date.now()))
    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, registerActivity))
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [logout, session])

  useEffect(() => {
    const handleApiExpiry = () => { if (session) logout('expired') }
    window.addEventListener('sadaksetu:auth-expired', handleApiExpiry)
    return () => window.removeEventListener('sadaksetu:auth-expired', handleApiExpiry)
  }, [logout, session])

  const value = useMemo(() => ({ user: session?.user ?? null, session, isAuthenticated: Boolean(session), logoutReason, login, logout, updateUser }), [login, logout, logoutReason, session, updateUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
