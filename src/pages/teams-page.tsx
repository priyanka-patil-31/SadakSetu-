import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Mail, MapPin, Pencil, Phone, Plus, Trash2, UsersRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { type RepairTeam, type TeamAvailability } from '@/lib/teams-data'
import { cn } from '@/lib/utils'
import { teamsService } from '@/services/teams-service'

const availabilityClasses: Record<TeamAvailability, string> = { Available: 'border-emerald-200 bg-emerald-50 text-emerald-700', 'On job': 'border-sky-200 bg-sky-50 text-sky-700', 'Off duty': 'border-slate-200 bg-slate-50 text-slate-600' }
const emptyForm = { name: '', zone: 'West Zone', lead: '', phone: '', email: '', availability: 'Available' as TeamAvailability, members: '4', specialties: '' }

function AvailabilityBadge({ availability }: { availability: TeamAvailability }) { return <Badge variant="outline" className={cn('font-medium', availabilityClasses[availability])}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{availability}</Badge> }

export function TeamsPage() {
  const [teams, setTeams] = useState<RepairTeam[]>([])
  const [search, setSearch] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('All teams')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const selected = teams.find((team) => team.id === selectedId) ?? null
  const filtered = useMemo(() => teams.filter((team) => `${team.name} ${team.lead} ${team.zone}`.toLowerCase().includes(search.toLowerCase()) && (availabilityFilter === 'All teams' || team.availability === availabilityFilter)), [availabilityFilter, search, teams])

  useEffect(() => {
    let active = true
    teamsService.list().then((items) => { if (active) setTeams(items) }).catch((reason: unknown) => { if (active) setFormError(reason instanceof Error ? reason.message : 'Unable to load repair teams.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormError(''); setFormOpen(true) }
  const openEdit = (team: RepairTeam) => { setEditingId(team.id); setForm({ name: team.name, zone: team.zone, lead: team.lead, phone: team.phone, email: team.email, availability: team.availability, members: String(team.members), specialties: team.specialties.join(', ') }); setFormError(''); setFormOpen(true) }
  const updateForm = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const saveTeam = async () => {
    if (!form.name.trim() || !form.lead.trim() || !form.phone.trim() || !form.email.trim()) { setFormError('Team name, lead, phone, and email are required.'); return }
    if (!/^\d{10}$/.test(form.phone)) { setFormError('Team phone must contain exactly 10 digits.'); return }
    const details = { name: form.name.trim(), zone: form.zone, lead: form.lead.trim(), phone: form.phone.trim(), email: form.email.trim(), availability: form.availability, members: Math.max(1, Number(form.members) || 1), specialties: form.specialties.split(',').map((value) => value.trim()).filter(Boolean) }
    setSaving(true)
    try {
      const saved = editingId ? await teamsService.update(editingId, details) : await teamsService.create(details)
      if (editingId) setTeams((current) => current.map((team) => team.id === editingId ? { ...team, ...saved } : team))
      else { setTeams((current) => [...current, saved]); setSelectedId(saved.id) }
      setFormOpen(false)
    } catch (reason: unknown) {
      setFormError(reason instanceof Error ? reason.message : 'Unable to save repair team.')
    } finally { setSaving(false) }
  }
  const deleteSelected = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await teamsService.remove(selected.id)
      setTeams((current) => current.filter((team) => team.id !== selected.id))
      setSelectedId(null)
      setConfirmDelete(false)
    } catch (reason: unknown) {
      setFormError(reason instanceof Error ? reason.message : 'Unable to delete repair team.')
    } finally { setSaving(false) }
  }

  const updateAvailability = async (availability: TeamAvailability) => {
    if (!selected) return
    setSaving(true)
    try {
      const saved = await teamsService.updateAvailability(selected.id, availability)
      setTeams((current) => current.map((team) => team.id === selected.id ? { ...team, ...saved, assignedComplaints: team.assignedComplaints } : team))
    } catch (reason: unknown) {
      setFormError(reason instanceof Error ? reason.message : 'Unable to update team availability.')
    } finally { setSaving(false) }
  }

  return <div>
    <PageHeader eyebrow="Field operations" title="Repair teams" description="Coordinate crews, availability, and active work orders." action={<Button onClick={openAdd} className="gap-2 bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4" />Add team</Button>} />
    {loading && <p className="mb-4 text-sm text-muted-foreground">Loading repair teams…</p>}
    {formError && !formOpen && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-sky-50 p-3 text-sky-600"><UsersRound className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{teams.length}</p><p className="text-xs text-muted-foreground">Total teams</p></div></CardContent></Card><Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><Check className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{teams.filter((team) => team.availability === 'Available').length}</p><p className="text-xs text-muted-foreground">Available now</p></div></CardContent></Card><Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-orange-50 p-3 text-orange-600"><MapPin className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{teams.reduce((total, team) => total + team.assignedComplaints.length, 0)}</p><p className="text-xs text-muted-foreground">Active work orders</p></div></CardContent></Card></div>
    <Card><CardContent className="p-0"><div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between"><Input aria-label="Search repair teams" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams, leads, or zones..." className="md:max-w-sm" /><select aria-label="Team availability filter" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"><option>All teams</option><option>Available</option><option>On job</option><option>Off duty</option></select></div><div className="divide-y">{filtered.map((team) => <div key={team.id} className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/70 lg:flex-row lg:items-center"><button type="button" className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`View ${team.name}`} onClick={() => { setSelectedId(team.id); setConfirmDelete(false) }}><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#15213d] text-sm font-bold text-white">{team.name.replace('Team ', '').slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{team.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{team.zone} · {team.members} members</p></div></button><div className="flex flex-wrap items-center gap-4 lg:justify-end"><AvailabilityBadge availability={team.availability} /><span className="text-xs text-muted-foreground">{team.assignedComplaints.length} work orders assigned</span><Button variant="ghost" size="icon" aria-label={`Edit ${team.name}`} onClick={() => openEdit(team)}><Pencil className="h-4 w-4" /></Button><ChevronRight className="hidden h-4 w-4 text-slate-400 lg:block" /></div></div>)}{filtered.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No repair teams match the current filters.</div>}</div></CardContent></Card>
    {selected && <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40" onClick={() => setSelectedId(null)}><aside role="dialog" aria-modal="true" aria-label={`${selected.name} details`} className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">{selected.id}</p><h2 className="mt-2 text-xl font-bold text-slate-900">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.zone}</p></div><Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label="Close team details"><X className="h-5 w-5" /></Button></div><div className="space-y-6 p-6"><div className="flex items-center justify-between"><AvailabilityBadge availability={selected.availability} /><span className="text-xs text-muted-foreground">{selected.updatedAt}</span></div><div className="rounded-xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact information</p><div className="mt-4 space-y-3"><p className="flex items-center gap-3 text-sm font-medium text-slate-800"><UsersRound className="h-4 w-4 text-slate-400" />{selected.lead} · {selected.members} members</p><p className="flex items-center gap-3 text-sm text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{selected.phone}</p><p className="flex items-center gap-3 text-sm text-slate-600"><Mail className="h-4 w-4 text-slate-400" />{selected.email}</p></div></div><div><p className="text-sm font-semibold text-slate-800">Team availability</p><select aria-label="Team availability" value={selected.availability} onChange={(event) => updateAvailability(event.target.value as TeamAvailability)} disabled={saving} className="mt-3 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"><option>Available</option><option>On job</option><option>Off duty</option></select></div><div><p className="text-sm font-semibold text-slate-800">Specialties</p><div className="mt-3 flex flex-wrap gap-2">{selected.specialties.map((specialty) => <Badge variant="secondary" key={specialty}>{specialty}</Badge>)}</div></div><div><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">Assigned work orders</p><span className="text-xs text-muted-foreground">{selected.assignedComplaints.length}</span></div>{selected.assignedComplaints.length > 0 ? <div className="mt-3 space-y-2">{selected.assignedComplaints.map((complaintId) => <Link className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700" to="/incidents" key={complaintId}>{complaintId}<ChevronRight className="h-4 w-4" /></Link>)}</div> : <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">No work orders assigned.</p>}</div><div className="border-t pt-5">{confirmDelete ? <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-sm font-semibold text-red-800">Delete {selected.name}?</p><p className="mt-1 text-xs leading-5 text-red-700">The team will be removed from the database. Assigned work records must be released first.</p><div className="mt-3 flex gap-2"><Button variant="destructive" size="sm" onClick={deleteSelected} disabled={saving}><Trash2 className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Deleting…' : 'Confirm delete'}</Button><Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={saving}>Cancel</Button></div></div> : <div className="flex gap-2"><Button variant="outline" className="flex-1 gap-2" onClick={() => openEdit(selected)}><Pencil className="h-4 w-4" />Edit team</Button><Button variant="ghost" className="gap-2 text-red-600 hover:bg-transparent hover:text-red-700" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button></div>}</div></div></aside></div>}
    {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setFormOpen(false)}><div role="dialog" aria-modal="true" aria-label={editingId ? 'Edit repair team' : 'Add repair team'} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b px-6 py-5"><div><h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit repair team' : 'Add repair team'}</h2><p className="mt-1 text-sm text-muted-foreground">Keep crew contact and coverage details current.</p></div><Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} aria-label="Close team form"><X className="h-5 w-5" /></Button></div><div className="grid gap-4 p-6 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">Team name<Input aria-label="Team name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="e.g. Team East" /></label><label className="space-y-2 text-sm font-semibold text-slate-700">Team lead<Input aria-label="Team lead" value={form.lead} onChange={(event) => updateForm('lead', event.target.value)} placeholder="Full name" /></label><label className="space-y-2 text-sm font-semibold text-slate-700">Zone<select aria-label="Team zone" value={form.zone} onChange={(event) => updateForm('zone', event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none"><option>West Zone</option><option>Central Zone</option><option>North Zone</option><option>South Zone</option></select></label><label className="space-y-2 text-sm font-semibold text-slate-700">Phone<Input aria-label="Team phone" value={form.phone} maxLength={10} inputMode="numeric" pattern="[0-9]{10}" onChange={(event) => updateForm('phone', event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit phone number" /></label><label className="space-y-2 text-sm font-semibold text-slate-700">Email<Input aria-label="Team email" type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="team@sadaksetu.gov.in" /></label><label className="space-y-2 text-sm font-semibold text-slate-700">Members<Input aria-label="Team members" type="number" min="1" value={form.members} onChange={(event) => updateForm('members', event.target.value)} /></label><label className="space-y-2 text-sm font-semibold text-slate-700">Availability<select aria-label="New team availability" value={form.availability} onChange={(event) => updateForm('availability', event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none"><option>Available</option><option>On job</option><option>Off duty</option></select></label><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">Specialties<span className="block text-xs font-normal text-muted-foreground">Separate specialties with commas</span><Input aria-label="Team specialties" value={form.specialties} onChange={(event) => updateForm('specialties', event.target.value)} placeholder="Pothole repair, drainage" /></label>{formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">{formError}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={saveTeam} disabled={saving} className="gap-2 bg-orange-500 hover:bg-orange-600"><Check className="h-4 w-4" />{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create team'}</Button></div></div></div></div>}
  </div>
}
