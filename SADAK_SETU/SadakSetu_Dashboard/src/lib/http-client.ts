import axios, { type AxiosRequestConfig } from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from '@/lib/api-config'
import { normalizeApiError } from '@/lib/api-errors'
import { readAuthSession } from '@/lib/auth'

export function getSessionAuthHeaders(storage?: Storage): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const session = readAuthSession(storage ?? window.sessionStorage)
  return session ? { Authorization: `Bearer ${session.accessToken ?? session.sessionId}`, 'X-Session-ID': session.sessionId } : {}
}

export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS, withCredentials: true, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } })

apiClient.interceptors.request.use((config) => {
  if (config.baseURL) {
    config.baseURL = config.baseURL.trim().replace(/\/+$/, '')
  }
  if (config.url) {
    config.url = config.url.trim()
  }
  const authHeaders = getSessionAuthHeaders()
  Object.entries(authHeaders).forEach(([key, value]) => config.headers.set(key, value))
  return config
})

apiClient.interceptors.response.use((response) => response, (error) => {
  const normalized = normalizeApiError(error)
  if (normalized.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sadaksetu:auth-expired'))
  return Promise.reject(normalized)
})

export function withQuery(config: AxiosRequestConfig, query: Record<string, string | number | undefined>): AxiosRequestConfig {
  return { ...config, params: Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== '')) }
}
