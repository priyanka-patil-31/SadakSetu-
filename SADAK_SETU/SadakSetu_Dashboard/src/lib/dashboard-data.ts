import type { ComplaintStatus } from '@/lib/complaints-data'

export type DashboardStatus = ComplaintStatus

export type DashboardStat = { label: string; value: string; change: string; detail: string; tone: 'orange' | 'green' | 'blue' | 'violet' }
export type DashboardActivity = { day: string; complaints: number; resolved: number }
export type GeographicSummary = { name: string; complaints: number; resolved: number; color: string }
export type RecentComplaint = { id: string; title: string; location: string; category: string; status: DashboardStatus; reported: string; initials: string; avatar: string }
export type RecentActivity = { title: string; actor: string; time: string; color: string }

export const dashboardStats: DashboardStat[] = []
export const complaintActivity: DashboardActivity[] = []
export const geographicSummary: GeographicSummary[] = []
export const recentComplaints: RecentComplaint[] = []
export const recentActivities: RecentActivity[] = []
