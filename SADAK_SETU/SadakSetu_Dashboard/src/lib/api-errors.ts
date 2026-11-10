import axios from 'axios'
import type { ApiErrorPayload } from '@/lib/api-contracts'

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string
  readonly requestId?: string
  readonly details?: unknown

  constructor(message: string, options: { status?: number; code?: string; requestId?: string; details?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.requestId = options.requestId
    this.details = options.details
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data
    return new ApiError(payload?.detail ?? payload?.message ?? error.message ?? 'The API request failed.', { status: error.response?.status, code: payload?.code, requestId: payload?.request_id, details: payload?.details })
  }
  return new ApiError(error instanceof Error ? error.message : 'The API request failed.')
}
