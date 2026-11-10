import type { DashboardSummary } from '@/lib/api-contracts'
import { apiClient } from '@/lib/http-client'

export type DashboardService = { getSummary: () => Promise<DashboardSummary> }

export const realDashboardService: DashboardService = {
  async getSummary() {
    const response = await apiClient.get<{ total_complaints: number; pending_complaints: number; resolved_complaints: number }>('/reports/summary')
    const totalComplaints = response.data.total_complaints
    const resolvedComplaints = response.data.resolved_complaints
    return { totalComplaints, activeComplaints: response.data.pending_complaints, resolvedComplaints, resolutionRate: totalComplaints ? (resolvedComplaints / totalComplaints) * 100 : 0, averageResponseMinutes: 0 }
  },
}

export const dashboardService = realDashboardService
