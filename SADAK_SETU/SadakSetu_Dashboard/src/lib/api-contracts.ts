import type { AdminUser } from '@/lib/auth'
import type { BackendComplaintStatus, Complaint, ComplaintStatus, ComplaintPriority } from '@/lib/complaints-data'

export type ApiEnvelope<T> = { data: T; message?: string; requestId?: string }
export type ApiErrorPayload = { detail?: string; message?: string; code?: string; request_id?: string; details?: unknown }

export type LoginRequest = { email: string; password: string }
export type LoginResponse = { user: AdminUser; accessToken: string; expiresInSeconds: number }
export type SessionResponse = { user: AdminUser; sessionId: string; expiresAt: string }

export type ComplaintQuery = { search?: string; status?: ComplaintStatus; priority?: ComplaintPriority; zone?: string; page?: number; pageSize?: number }
export type ComplaintListResponse = { items: Complaint[]; total: number; page: number; pageSize: number }
export type UpdateComplaintRequest = { status?: BackendComplaintStatus; assignedTeam?: string; note?: string }

export type DashboardSummary = { totalComplaints: number; activeComplaints: number; resolvedComplaints: number; resolutionRate: number; averageResponseMinutes: number }
