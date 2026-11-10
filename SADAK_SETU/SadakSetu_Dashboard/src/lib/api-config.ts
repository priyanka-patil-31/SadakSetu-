export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').trim().replace(/\/+$/, '')
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10_000)
export const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || ''
export const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || ''
export const SHOW_DEMO_ADMIN_CREDENTIALS = import.meta.env.DEV && Boolean(DEMO_ADMIN_EMAIL && DEMO_ADMIN_PASSWORD)
