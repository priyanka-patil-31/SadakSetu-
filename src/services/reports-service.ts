import { apiClient } from '@/lib/http-client'

export type ReportSummary = {
  generated_at: string
  total_complaints: number
  pending_complaints: number
  resolved_complaints: number
  rejected_complaints: number
  severity_distribution: Record<string, number>
  severity_resolved_distribution: Record<string, number>
  monthly_trends: Array<{ month: string; total: number; resolved: number }>
  area_distribution: Array<{ area: string; total: number; critical: number; resolved: number }>
  team_performance: Array<{ team_id: string; team_name: string; assigned: number; resolved: number; open: number }>
  ai_detection_statistics: Record<string, number>
}

export const reportsService = {
  async summary() {
    const response = await apiClient.get<ReportSummary>('/reports/summary')
    return response.data
  },

  async downloadCsv() {
    const response = await apiClient.get<Blob>('/reports/complaints.csv', { responseType: 'blob' })
    return response.data
  },
}
