import type { LoginRequest, LoginResponse } from '@/lib/api-contracts'
import { ApiError } from '@/lib/api-errors'
import { apiClient } from '@/lib/http-client'

export type AuthService = {
  login: (request: LoginRequest) => Promise<LoginResponse>
  logout: () => Promise<void>
  forgotPassword: (email: string, newPassword: string) => Promise<string>
}

export const realAuthService: AuthService = {
  async forgotPassword(email: string, newPassword: string) {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', {
      email,
      new_password: newPassword,
    })
    return response.data.message
  },
  async login(request) {
    const response = await apiClient.post<{
      user: { id: string; email: string; full_name: string; role: string; is_active: boolean }
      session_id: string | null
      expires_at: string
    }>('/auth/login', { ...request, client_type: 'android' })
    if (response.data.user.role !== 'ADMIN' || !response.data.session_id) throw new ApiError('This account does not have administrator access.')
    const expiresInSeconds = Math.max(0, Math.floor((Date.parse(response.data.expires_at) - Date.now()) / 1000))
    return {
      user: { id: response.data.user.id, name: response.data.user.full_name, email: response.data.user.email, role: 'Super admin' },
      accessToken: response.data.session_id,
      expiresInSeconds,
    }
  },
  async logout() {
    await apiClient.post('/auth/logout')
  },
}

export const authService = realAuthService
