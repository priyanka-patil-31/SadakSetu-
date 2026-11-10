import { createContext } from 'react'
import type { AdminUser, AuthSession } from '@/lib/auth'

export type LoginResult = { ok: true } | { ok: false; error: string }
export type AuthContextValue = { user: AdminUser | null; session: AuthSession | null; isAuthenticated: boolean; logoutReason: 'expired' | null; login: (email: string, password: string) => Promise<LoginResult>; logout: (reason?: 'expired') => void; updateUser: (patch: Partial<Pick<AdminUser, 'name' | 'email'>>) => void }

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
