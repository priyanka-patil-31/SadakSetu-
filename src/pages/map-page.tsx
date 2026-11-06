import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Crosshair, MapPin, Navigation, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Complaint } from '@/lib/complaints-data'
import { formatDate } from '@/lib/utils'
import { complaintService } from '@/services/complaints-service'

const defaultMapCenter: LatLngExpression = [20.5937, 78.9629]
const severityColors = { Critical: '#dc2626', High: '#f97316', Medium: '#0ea5e9', Low: '#64748b' }

function ResetViewControl() {
  const map = useMap()
  return <Button variant="secondary" size="icon" aria-label="Reset map view" className="absolute bottom-4 right-4 z-[1000] shadow-lg" onClick={() => map.setView(defaultMapCenter, 5)}><Crosshair className="h-4 w-4" /></Button>
}

function FitMapToComplaints({ complaints }: { complaints: Complaint[] }) {
  const map = useMap()
  useEffect(() => {
    const points = complaints.flatMap((complaint) => complaint.coordinates ? [complaint.coordinates] : [])
    if (points.length === 1) map.setView(points[0], 13)
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 13 })
  }, [complaints, map])
  return null
}

function SeverityLegend() {
  return <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Severity</p><div className="flex flex-wrap gap-3">{Object.entries(severityColors).map(([label, color]) => <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700" key={label}><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}</div></div>
}

export function MapPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [priority, setPriority] = useState('All priorities')
  const [zone, setZone] = useState('All zones')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    complaintService.list({ page: 1, pageSize: 100 })
      .then((response) => { if (active) setComplaints(response.items) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load map reports.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const zones = [...new Set(complaints.map((complaint) => complaint.zone))]
  const filtered = useMemo(() => complaints.filter((complaint) => {
    const haystack = `${complaint.id} ${complaint.title} ${complaint.location} ${complaint.zone}`.toLowerCase()
    return haystack.includes(search.toLowerCase()) && (status === 'All statuses' || complaint.status === status) && (priority === 'All priorities' || complaint.priority === priority) && (zone === 'All zones' || complaint.zone === zone)
  }), [complaints, priority, search, status, zone])
  const selected = complaints.find((complaint) => complaint.id === selectedId) ?? null

  return <div><PageHeader eyebrow="Infrastructure" title="Live road map" description="Explore active complaints and road conditions from live backend data." action={<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live data connected</div>} /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><Card className="overflow-hidden"><CardContent className="relative p-0"><div className="absolute left-4 right-4 top-4 z-[1000] flex flex-col gap-2 sm:flex-row"><div className="relative flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search map complaints" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search locations..." className="border-white/70 bg-white/95 pl-9 shadow-lg backdrop-blur" /></div><div className="flex flex-wrap gap-2"><select aria-label="Map status filter" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-white/70 bg-white/95 px-3 text-sm shadow-lg outline-none backdrop-blur"><option>All statuses</option><option>Submitted</option><option>Under review</option><option>AI processing</option><option>Assigned</option><option>In progress</option><option>Resolved</option><option>Rejected</option></select><select aria-label="Map priority filter" value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 rounded-lg border border-white/70 bg-white/95 px-3 text-sm shadow-lg outline-none backdrop-blur"><option>All priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><select aria-label="Map zone filter" value={zone} onChange={(event) => setZone(event.target.value)} className="h-10 rounded-lg border border-white/70 bg-white/95 px-3 text-sm shadow-lg outline-none backdrop-blur"><option>All zones</option>{zones.map((item) => <option key={item}>{item}</option>)}</select></div></div>{error && <p role="alert" className="absolute left-4 right-4 top-20 z-[1000] rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-lg">{error}</p>}<div className="h-[620px] w-full"><MapContainer center={defaultMapCenter} zoom={5} scrollWheelZoom className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><FitMapToComplaints complaints={filtered} />{filtered.map((complaint) => complaint.coordinates && <CircleMarker key={complaint.id} center={complaint.coordinates} radius={complaint.id === selectedId ? 11 : 8} pathOptions={{ color: '#ffffff', weight: 2, fillColor: severityColors[complaint.priority], fillOpacity: 0.9 }} eventHandlers={{ click: () => setSelectedId(complaint.id) }}><Popup><div className="min-w-[190px]"><p className="text-xs font-bold text-orange-600">{complaint.id}</p><p className="mt-1 text-sm font-bold text-slate-900">{complaint.title}</p><p className="mt-1 text-xs text-slate-500">{complaint.location}</p><button type="button" className="mt-3 text-xs font-semibold text-orange-600" onClick={() => setSelectedId(complaint.id)}>View details</button></div></Popup></CircleMarker>)}<ResetViewControl /><SeverityLegend /></MapContainer></div><div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{loading ? 'Loading reports…' : `${filtered.length} of ${complaints.length} complaints visible`}</span><span className="flex items-center gap-1.5"><Navigation className="h-3.5 w-3.5" />Scroll to zoom · Click a marker for details</span></div></CardContent></Card><Card className="h-fit"><CardContent className="p-0">{selected ? <div><div className="flex items-start justify-between border-b p-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">{selected.id}</p><h2 className="mt-2 text-lg font-bold leading-6 text-slate-900">{selected.title}</h2></div><Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label="Close location details"><X className="h-4 w-4" /></Button></div><div className="space-y-5 p-5"><div className="flex flex-wrap gap-2"><StatusBadge status={selected.status} /><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{selected.priority} priority</Badge></div><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin className="h-4 w-4 text-orange-500" />{selected.location}</p><p className="mt-1 pl-6 text-xs text-muted-foreground">{selected.zone} · {selected.category}</p></div><p className="text-sm leading-6 text-slate-600">{selected.description}</p><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><span className="font-semibold text-slate-800">Reported:</span> {formatDate(selected.reportedAt)}</div><Link to="/incidents" className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100">Open complaint management <ArrowRight className="h-4 w-4" /></Link></div></div> : <div className="p-6"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><MapPin className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-bold text-slate-900">Select a map marker</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a complaint marker to inspect its location, severity, and current status.</p><div className="mt-6 space-y-3 rounded-lg bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Map summary</p><div className="flex justify-between text-sm"><span className="text-slate-600">Visible complaints</span><span className="font-bold text-slate-900">{filtered.length}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">High priority issues</span><span className="font-bold text-red-600">{filtered.filter((complaint) => complaint.priority === 'Critical' || complaint.priority === 'High').length}</span></div></div></div>}</CardContent></Card></div></div>
}
