export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low'

export type SeverityReport = { level: SeverityLevel; complaints: number; resolved: number; color: string }
export type MonthlyReport = { month: string; reported: number; resolved: number }
export type AreaReport = { area: string; complaints: number; resolved: number; critical: number; resolutionRate: number }
export type TeamPerformanceReport = { team: string; assigned: number; resolved: number; averageHours: number; availability: string }

export const severitySummary: SeverityReport[] = []
export const monthlyTrends: MonthlyReport[] = []
export const areaReports: AreaReport[] = []
export const teamPerformance: TeamPerformanceReport[] = []

export function buildReportsCsv() {
  return 'Report section,Name,Reported / assigned,Resolved,Rate / response,Additional detail'
}
