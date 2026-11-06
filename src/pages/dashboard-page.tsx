import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Complaint } from '@/lib/complaints-data'
import type { DashboardActivity, DashboardStat, GeographicSummary, RecentActivity, RecentComplaint } from '@/lib/dashboard-data'
import { complaintService } from '@/services/complaints-service'
import { formatDate } from '@/lib/utils'

export function DashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])

  useEffect(() => {
    let active = true
    complaintService.list({ page: 1, pageSize: 100 })
      .then((response) => { if (active) setComplaints(response.items) })
      .catch(() => { if (active) setComplaints([]) })
    return () => { active = false }
  }, [])

  const dashboardStats = useMemo<DashboardStat[]>(() => {
    const active = complaints.filter((item) => item.status !== 'Resolved').length
    const resolved = complaints.filter((item) => item.status === 'Resolved').length
    const urgent = complaints.filter((item) => item.priority === 'Critical' || item.priority === 'High').length
    return [
      { label: 'Total complaints', value: String(complaints.length), change: `${active} active`, detail: 'from backend', tone: 'orange' },
      { label: 'Resolved reports', value: String(resolved), change: complaints.length ? `${Math.round((resolved / complaints.length) * 100)}%` : '0%', detail: 'resolution rate', tone: 'green' },
      { label: 'High priority', value: String(urgent), change: `${active} active`, detail: 'needs attention', tone: 'blue' },
      { label: 'GPS mapped', value: String(complaints.filter((item) => item.coordinates).length), change: `${complaints.length} total`, detail: 'location records', tone: 'violet' },
    ]
  }, [complaints])

  const complaintActivity = useMemo<DashboardActivity[]>(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(today.getDate() - (6 - offset))
      const key = date.toISOString().slice(0, 10)
      const dayComplaints = complaints.filter((item) => item.reportedAt.slice(0, 10) === key)
      return { day: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date), complaints: dayComplaints.length, resolved: dayComplaints.filter((item) => item.status === 'Resolved').length }
    })
  }, [complaints])

  const geographicSummary = useMemo<GeographicSummary[]>(() => {
    const groups = new Map<string, { complaints: number; resolved: number }>()
    complaints.forEach((item) => {
      const current = groups.get(item.zone) ?? { complaints: 0, resolved: 0 }
      current.complaints += 1
      if (item.status === 'Resolved') current.resolved += 1
      groups.set(item.zone, current)
    })
    return Array.from(groups.entries()).map(([name, values], index) => ({ ...values, name, color: ['#f97316', '#0ea5e9', '#10b981', '#8b5cf6'][index % 4] }))
  }, [complaints])

  const recentComplaints = useMemo<RecentComplaint[]>(() => [...complaints].sort((left, right) => right.reportedAt.localeCompare(left.reportedAt)).slice(0, 5).map((item) => ({ id: item.id, title: item.title, location: item.location, category: item.category, status: item.status, reported: formatDate(item.reportedAt), initials: item.title.slice(0, 2).toUpperCase(), avatar: 'bg-orange-100 text-orange-700' })), [complaints])
  const recentActivities = useMemo<RecentActivity[]>(() => complaints.slice(0, 5).map((item) => ({ title: `${item.title} reported`, actor: 'Citizen report', time: formatDate(item.reportedAt), color: item.priority === 'Critical' ? 'bg-red-500' : 'bg-orange-500' })), [complaints])

  const today = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())
  return <div><PageHeader eyebrow={today} title="Road safety overview" description="Live operational data from the configured backend." action={<select aria-label="Dashboard range" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none"><option>This week</option><option>This month</option><option>This quarter</option></select>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Complaint activity</CardTitle><CardDescription>Reported and resolved complaints over the last 7 days</CardDescription></div><select aria-label="Activity range" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 outline-none"><option>Last 7 days</option><option>Last 30 days</option></select></CardHeader><CardContent><div className="h-[270px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={complaintActivity} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}><defs><linearGradient id="complaintFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.2} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#eef0f4" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} /><Area type="monotone" dataKey="complaints" stroke="#f97316" strokeWidth={2.5} fill="url(#complaintFill)" name="Complaints" /><Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="none" name="Resolved" /></AreaChart></ResponsiveContainer></div><div className="mt-2 flex flex-wrap items-center gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-orange-500" />Complaints</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />Resolved</span></div></CardContent></Card><Card><CardHeader><CardTitle>Geographic summary</CardTitle><CardDescription>Resolution rate by municipal zone</CardDescription></CardHeader><CardContent className="space-y-5">{geographicSummary.length === 0 ? <p className="text-sm text-muted-foreground">No geographic data is available.</p> : geographicSummary.map((zone) => { const rate = Math.round((zone.resolved / zone.complaints) * 100); return <div key={zone.name}><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">{zone.name}</span><span className="text-sm font-bold text-slate-900">{rate}%</span></div><Progress value={rate} className="[&>div]:bg-orange-500" /><div className="mt-1.5 flex justify-between text-xs text-muted-foreground"><span>{zone.resolved} resolved</span><span>{zone.complaints} complaints</span></div></div> })}<Link to="/map" className="flex items-center justify-between pt-1 text-sm font-semibold text-orange-600 hover:text-orange-700">View geographic map <ArrowRight className="h-4 w-4" /></Link></CardContent></Card></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Recent complaints</CardTitle><CardDescription>Latest reports that need attention</CardDescription></div><Link to="/incidents" className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700">View all <ArrowRight className="h-4 w-4" /></Link></CardHeader><CardContent className="p-0"><div className="divide-y">{recentComplaints.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No complaints are available.</p> : recentComplaints.map((complaint) => <div className="flex items-center gap-4 px-5 py-4" key={complaint.id}><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complaint.avatar}`}>{complaint.initials}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-slate-800">{complaint.title}</p><span className="text-xs text-muted-foreground">{complaint.id}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{complaint.location}</p></div><div className="hidden min-w-[92px] text-right md:block"><p className="text-xs font-medium text-slate-600">{complaint.category}</p><p className="mt-1 text-[11px] text-muted-foreground">{complaint.reported}</p></div><StatusBadge status={complaint.status} /></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Updates from your operations team</CardDescription></CardHeader><CardContent><div className="space-y-5">{recentActivities.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity is available.</p> : recentActivities.map((activity) => <div className="flex gap-3" key={`${activity.title}-${activity.time}`}><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${activity.color}`} /><div className="min-w-0"><p className="text-sm font-medium leading-5 text-slate-800">{activity.title}</p><p className="mt-1 text-xs text-muted-foreground">{activity.actor} · {activity.time}</p></div></div>)}</div></CardContent></Card></div></div>
}
