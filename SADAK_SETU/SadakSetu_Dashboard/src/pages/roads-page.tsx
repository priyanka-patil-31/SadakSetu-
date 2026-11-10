import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, MapPin, TriangleAlert, Waypoints } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Complaint } from '@/lib/complaints-data'
import { complaintService } from '@/services/complaints-service'

function coordinates(complaint: Complaint) {
  return complaint.coordinates
    ? `${complaint.coordinates[0].toFixed(5)}, ${complaint.coordinates[1].toFixed(5)}`
    : 'Location not captured'
}

export function RoadsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    complaintService.list({ page: 1, pageSize: 100 })
      .then((response) => { if (active) setComplaints(response.items) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load road reports.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const stats = useMemo(() => ({
    total: complaints.length,
    active: complaints.filter((item) => item.status !== 'Resolved').length,
    resolved: complaints.filter((item) => item.status === 'Resolved').length,
    urgent: complaints.filter((item) => item.priority === 'Critical' || item.priority === 'High').length,
    mapped: complaints.filter((item) => item.coordinates).length,
  }), [complaints])

  return <div>
    <PageHeader
      eyebrow="Infrastructure"
      title="Road network"
      description="Monitor reported road conditions and maintenance coverage from live backend data."
      action={<Link to="/map" className="inline-flex h-10 items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 hover:bg-orange-100">Open live map <ArrowRight className="h-4 w-4" /></Link>}
    />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-sky-50 p-3 text-sky-600"><Waypoints className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Road reports</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-orange-50 p-3 text-orange-600"><TriangleAlert className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">Active issues</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-red-50 p-3 text-red-600"><TriangleAlert className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.urgent}</p><p className="text-xs text-muted-foreground">High priority</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.resolved}</p><p className="text-xs text-muted-foreground">Resolved</p></div></CardContent></Card>
    </div>
    <Card>
      <CardHeader className="border-b"><CardTitle>Reported road conditions</CardTitle><p className="text-sm text-muted-foreground">{stats.mapped} of {stats.total} reports include GPS coordinates.</p></CardHeader>
      <CardContent className="p-0">
        {error && <p role="alert" className="border-b bg-red-50 px-5 py-3 text-sm font-medium text-red-700">{error}</p>}
        {loading ? <div className="p-12 text-center text-sm text-muted-foreground">Loading road reports…</div> : complaints.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No road reports are available.</div> : <div className="divide-y">{complaints.map((complaint) => <div className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/70 md:flex-row md:items-center" key={complaint.backendId}><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{complaint.title}</p><p className="mt-1 text-xs text-muted-foreground">{complaint.id} · {complaint.category}</p></div><div className="flex items-center gap-2 text-sm text-slate-600 md:w-52"><MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" /><span>{coordinates(complaint)}</span></div><div className="flex items-center gap-2 md:w-36"><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{complaint.zone}</Badge></div><div className="flex items-center gap-3"><StatusBadge status={complaint.status} /><Link to="/incidents" className="text-sm font-semibold text-orange-600 hover:text-orange-700">Details</Link></div></div>)}</div>}
      </CardContent>
    </Card>
  </div>
}
