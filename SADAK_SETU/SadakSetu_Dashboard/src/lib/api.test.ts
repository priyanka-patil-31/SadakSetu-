import axios, { type AxiosAdapter, type AxiosError } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthSession, persistAuthSession } from '@/lib/auth'
import { ApiError, normalizeApiError } from '@/lib/api-errors'
import { getSessionAuthHeaders, apiClient, withQuery } from '@/lib/http-client'

describe('API integration preparation', () => {
  beforeEach(() => sessionStorage.clear())

  it('attaches session credentials to Axios requests without exposing them when logged out', async () => {
    expect(getSessionAuthHeaders()).toEqual({})
    const session = createAuthSession({ id: 'operator-id', name: 'Authenticated operator', email: 'operator@municipality.example', role: 'Super admin' }, Date.now(), 'api-token')
    persistAuthSession(session)
    expect(getSessionAuthHeaders()).toEqual({ Authorization: 'Bearer api-token', 'X-Session-ID': session.sessionId })

    const originalAdapter = apiClient.defaults.adapter
    const adapter: AxiosAdapter = async (config) => ({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config })
    apiClient.defaults.adapter = adapter
    try {
      const response = await apiClient.get('/health')
      expect(response.config.headers.get('Authorization')).toBe('Bearer api-token')
      expect(response.config.headers.get('X-Session-ID')).toBe(session.sessionId)
    } finally {
      apiClient.defaults.adapter = originalAdapter
    }
  })

  it('normalizes unknown and API-shaped errors for UI-safe messages', () => {
    expect(normalizeApiError(new Error('Network unavailable'))).toMatchObject({ name: 'ApiError', message: 'Network unavailable' })
    expect(normalizeApiError(new ApiError('Already normalized', { status: 409 })).status).toBe(409)
    const axiosError = new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST') as AxiosError<{ detail: string; code: string }>
    axiosError.response = { status: 422, statusText: 'Unprocessable Entity', headers: {}, config: {} as never, data: { detail: 'Invalid request', code: 'validation_error' } }
    expect(normalizeApiError(axiosError)).toMatchObject({ message: 'Invalid request', status: 422, code: 'validation_error' })
  })

  it('filters empty query values before sending them to FastAPI', () => {
    expect(withQuery({}, { search: '', page: 2, status: undefined }).params).toEqual({ page: 2 })
  })
})
