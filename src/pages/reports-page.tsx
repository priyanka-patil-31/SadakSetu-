import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Printer, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { reportsService, type ReportSummary } from '@/services/reports-service'

const severityLevels = [
  { key: 'CRITICAL', label: 'Critical', color: '#ef4444' },
  { key: 'HIGH', label: 'High', color: '#f97316' },
  { key: 'MEDIUM', label: 'Medium', color: '#eab308' },
  { key: 'LOW', label: 'Low', color: '#10b981' },
]

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function buildMonthlyChart(summary: ReportSummary | null) {
  const now = new Date()
  const source = new Map((summary?.monthly_trends ?? []).map((item) => [item.month, item]))
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1)
    const item = source.get(monthKey(date))
    return { month: date.toLocaleString('en-IN', { month: 'short' }), reported: item?.total ?? 0, resolved: item?.resolved ?? 0 }
  })
}

async function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sadaksetu-reports.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    reportsService.summary().then(setSummary).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load report data.')).finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => buildMonthlyChart(summary), [summary])
  const currentMonth = monthKey(new Date())
  const currentMonthData = summary?.monthly_trends.find((item) => item.month === currentMonth)
  const totals = { reported: currentMonthData?.total ?? 0, resolved: currentMonthData?.resolved ?? 0 }
  const overallRate = totals.reported ? Math.round((totals.resolved / totals.reported) * 100) : 0
  const severitySummary = severityLevels.map((level) => ({ ...level, complaints: summary?.severity_distribution?.[level.key] ?? 0, resolved: summary?.severity_resolved_distribution?.[level.key] ?? 0 }))
  const severityData = severitySummary.every((item) => item.complaints === 0) && (summary?.total_complaints ?? 0) > 0
    ? [{ key: 'TOTAL', label: 'All complaints', color: '#64748b', complaints: summary?.total_complaints ?? 0, resolved: summary?.resolved_complaints ?? 0 }]
    : severitySummary
  const areaReports = (summary?.area_distribution ?? []).map((item) => ({ ...item, complaints: item.total, resolved: item.resolved ?? 0, resolutionRate: item.total ? Math.round(((item.resolved ?? 0) / item.total) * 100) : 0 }))
  const teamPerformance = summary?.team_performance?.length
    ? summary.team_performance
    : summary && summary.pending_complaints > 0
      ? [{ team_id: 'unassigned', team_name: 'Unassigned work', assigned: 0, resolved: 0, open: summary.pending_complaints }]
      : []
  const generatedDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date())

  return <div className="print-page">
    <div className="print-hidden"><PageHeader eyebrow="Operational intelligence" title="Reports & analytics" description="Track complaint trends, severity, zones, and repair team performance." action={<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!summary} onClick={() => reportsService.downloadCsv().then(downloadBlob)} className="gap-2"><Download className="h-4 w-4" />Export CSV</Button><Button onClick={() => window.print()} className="gap-2 bg-orange-500 hover:bg-orange-600"><Printer className="h-4 w-4" />Print report</Button></div>} /></div>
    <div className="mb-6 hidden print:block"><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">SadakSetu operations</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Road safety reports</h1><p className="mt-1 text-sm text-slate-500">Generated {generatedDate} · Configured municipal road network</p></div>
    {loading && <p className="mb-4 text-sm text-muted-foreground">Loading report data…</p>}
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm font-medium text-muted-foreground">Reported this month</p><p className="mt-2 text-2xl font-bold text-slate-900">{totals.reported.toLocaleString()}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm font-medium text-muted-foreground">Resolved this month</p><p className="mt-2 text-2xl font-bold text-slate-900">{totals.resolved.toLocaleString()}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm font-medium text-muted-foreground">Resolution rate</p><p className="mt-2 text-2xl font-bold text-slate-900">{overallRate}%</p><div className="mt-3"><Progress value={overallRate} className="[&>div]:bg-emerald-500" /></div></CardContent></Card></div>
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card><CardHeader><CardTitle>Monthly complaint trend</CardTitle><CardDescription>Reported and resolved complaints across the last seven months</CardDescription></CardHeader><CardContent><div className="h-[280px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eef0f4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} /><Bar dataKey="reported" fill="#f97316" radius={[4, 4, 0, 0]} name="Reported" /><Bar dataKey="resolved" fill="#10b981" radius={[4, 4, 0, 0]} name="Resolved" /></BarChart></ResponsiveContainer></div><div className="mt-2 flex flex-wrap gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-500" />Reported</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />Resolved</span></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Severity distribution</CardTitle><CardDescription>Resolution progress by complaint severity</CardDescription></CardHeader><CardContent className="space-y-5">{severityData.every((item) => item.complaints === 0) ? <p className="text-sm text-muted-foreground">No complaints have been reported yet.</p> : severityData.map((item) => { const rate = item.complaints ? Math.round((item.resolved / item.complaints) * 100) : 0; return <div key={item.key}><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><span className="text-sm font-bold text-slate-900">{item.complaints}</span></div><Progress value={rate} className="[&>div]:bg-slate-700" /><div className="mt-1.5 flex justify-between text-xs text-muted-foreground"><span>{item.resolved} resolved</span><span>{rate}% complete</span></div></div> })}</CardContent></Card>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]"><Card><CardHeader><CardTitle>Area-wise report</CardTitle><CardDescription>Complaint volume and resolution by municipal zone</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Area</TableHead><TableHead>Complaints</TableHead><TableHead>Critical</TableHead><TableHead>Resolution</TableHead></TableRow></TableHeader><TableBody>{areaReports.length ? areaReports.map((item) => <TableRow key={item.area}><TableCell className="font-semibold text-slate-800">{item.area}</TableCell><TableCell>{item.complaints}</TableCell><TableCell><span className="font-semibold text-red-600">{item.critical}</span></TableCell><TableCell><div className="flex min-w-[130px] items-center gap-3"><Progress value={item.resolutionRate} className="[&>div]:bg-orange-500" /><span className="text-xs font-semibold text-slate-700">{item.resolutionRate}%</span></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="p-8 text-center text-sm text-muted-foreground">No area data is available.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle>Team performance</CardTitle><CardDescription>Assigned work, resolutions, and open work orders</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Resolved</TableHead><TableHead>Open work</TableHead></TableRow></TableHeader><TableBody>{teamPerformance.length ? teamPerformance.map((item) => <TableRow key={item.team_id}><TableCell><p className="font-semibold text-slate-800">{item.team_name}</p><p className="text-xs text-muted-foreground">{item.team_id === 'unassigned' ? 'Needs assignment' : `${item.assigned} assigned`}</p></TableCell><TableCell><span className="font-semibold text-emerald-600">{item.resolved}</span></TableCell><TableCell><div className="flex items-center gap-2 text-sm"><TrendingUp className="h-3.5 w-3.5 text-orange-500" />{item.open}</div></TableCell></TableRow>) : <TableRow><TableCell colSpan={3} className="p-8 text-center text-sm text-muted-foreground">No open work orders are available.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></div>
    <div className="mt-6 print-hidden"><Card className="border-orange-100 bg-orange-50/60"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-800">Report snapshot</p><p className="mt-1 text-sm text-muted-foreground">Live analytics synced from the backend. Export the data for further analysis.</p></div><Badge variant="outline" className="w-fit border-orange-200 bg-white text-orange-700">{chartData.length + severityData.length + areaReports.length + teamPerformance.length} data points</Badge></CardContent></Card></div>
  </div>
}
