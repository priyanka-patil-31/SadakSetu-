import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UserX,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type UserProfile, type UserRole, type UserStatus } from '@/lib/users-data'
import { cn } from '@/lib/utils'
import { userService } from '@/services/user-service'
import { downloadCsv, printTableReport } from '@/lib/export-utils'

function validateIndianPhone(value: string): { valid: boolean; formatted: string; error?: string } {
  const trimmed = value.trim()
  if (!trimmed) return { valid: true, formatted: '' }
  let digits = trimmed.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2)
  }

  if (digits.length > 10) {
    return {
      valid: false,
      formatted: trimmed,
      error: 'Phone number cannot exceed 10 digits.',
    }
  }

  if (digits.length < 10) {
    return {
      valid: false,
      formatted: trimmed,
      error: `Phone number must be exactly 10 digits (currently ${digits.length} digits entered).`,
    }
  }

  if (!/^[6-9]/.test(digits)) {
    return {
      valid: false,
      formatted: trimmed,
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    }
  }
  return { valid: true, formatted: `+91 ${digits}` }
}

const statusClasses: Record<UserStatus, string> = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-slate-200 bg-slate-100 text-slate-600',
}

const roleClasses: Record<UserRole, string> = {
  Citizen: 'border-slate-200 bg-slate-50 text-slate-600',
  'Field reporter': 'border-sky-200 bg-sky-50 text-sky-700',
  Administrator: 'border-orange-200 bg-orange-50 text-orange-700',
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  area: '',
  role: 'Citizen' as UserRole,
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant="outline" className={cn('font-medium', statusClasses[status])}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  )
}

function UserRoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant="outline" className={cn('font-medium', roleClasses[role])}>
      {role}
    </Badge>
  )
}

export function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [roleFilter, setRoleFilter] = useState('All roles')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationStatus, setLocationStatus] = useState<string | null>(null)

  const handleDetectArea = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.')
      return
    }
    setLocationStatus('Requesting location permission...')
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`
          )
          const data = await resp.json()
          const detected =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.residential ||
            data.address?.city_district ||
            data.address?.town ||
            data.address?.city ||
            `Area near ${lat.toFixed(3)}, ${lon.toFixed(3)}`
          updateForm('area', detected)
          setLocationStatus(`Detected: ${detected}`)
        } catch {
          setLocationStatus('Unable to determine area name from coordinates. You can enter it manually.')
        } finally {
          setDetectingLocation(false)
        }
      },
      (err) => {
        setDetectingLocation(false)
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('Location access permission was denied. You may enter your area manually or leave blank.')
        } else {
          setLocationStatus('Could not retrieve location. You may enter your area manually.')
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const handleExportCsv = () => {
    downloadCsv({
      filename: `sadaksetu-citizens-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: [
        'User ID',
        'Full Name',
        'Email',
        'Phone',
        'Area / Locality',
        'Role',
        'Account Status',
        'Reports Submitted',
        'Joined Date',
      ],
      rows: filtered.map((u) => [
        u.id,
        u.name,
        u.email,
        u.phone || 'Not provided',
        u.area || 'Area Not Provided',
        u.role,
        u.status,
        u.complaintsSubmitted,
        u.joinedAt,
      ]),
    })
  }

  const handlePrintPdf = () => {
    printTableReport({
      title: 'Citizen Accounts Registry',
      subtitle: 'Official Citizen & Community Stakeholder Directory',
      filters: {
        Search: search || 'All',
        Status: statusFilter,
        Role: roleFilter,
      },
      summaryCards: [
        { label: 'Total Citizens', value: users.length },
        { label: 'Active Accounts', value: users.filter((u) => u.status === 'Active').length },
        { label: 'Filtered Results', value: filtered.length },
      ],
      headers: [
        'User ID',
        'Full Name',
        'Email',
        'Phone',
        'Area',
        'Role',
        'Status',
        'Reports',
      ],
      rows: filtered.map((u) => [
        u.id,
        u.name,
        u.email,
        u.phone || '—',
        u.area || 'Area Not Provided',
        u.role,
        u.status,
        u.complaintsSubmitted,
      ]),
    })
  }

  const selected = users.find((user) => user.id === selectedId) ?? null

  useEffect(() => {
    userService
      .list()
      .then(setUsers)
      .catch((error: unknown) =>
        setFormError(error instanceof Error ? error.message : 'Unable to load users.')
      )
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const searchable = `${user.name} ${user.email} ${user.phone} ${user.area}`.toLowerCase()
      return (
        searchable.includes(query) &&
        (statusFilter === 'All statuses' || user.status === statusFilter) &&
        (roleFilter === 'All roles' || user.role === roleFilter)
      )
    })
  }, [roleFilter, search, statusFilter, users])

  const openEdit = (user: UserProfile) => {
    setEditingId(user.id)
    let corePhone = (user.phone || '').trim().replace(/\D/g, '')
    if (corePhone.length === 12 && corePhone.startsWith('91')) {
      corePhone = corePhone.slice(2)
    }
    corePhone = corePhone.slice(0, 10)

    setForm({
      name: user.name,
      email: user.email,
      phone: corePhone,
      area: user.area,
      role: user.role,
    })
    setFormError('')
    setFormOpen(true)
  }

  const updateForm = (key: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const phoneDigits = useMemo(() => extractPhoneDigits(form.phone), [form.phone])

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Restrict strictly up to 10 numbers, not more than 10
    const raw = event.target.value.replace(/\D/g, '').slice(0, 10)
    updateForm('phone', raw ? `+91 ${raw}` : '')
  }

  const saveProfile = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Full name and email address are required.')
      return
    }
    let formattedPhone = form.phone.trim()
    if (formattedPhone) {
      const phoneCheck = validateIndianPhone(formattedPhone)
      if (!phoneCheck.valid) {
        setFormError(phoneCheck.error || 'Please enter a valid 10-digit Indian phone number.')
        return
      }
      formattedPhone = phoneCheck.formatted
    }
    if (editingId) {
      setSaving(true)
      try {
        let saved = await userService.updateProfile(editingId, {
          full_name: form.name.trim(),
          email: form.email.trim(),
          phone: formattedPhone || undefined,
          area: form.area.trim() || undefined,
        })
        if (saved.role !== form.role)
          saved = await userService.updateRole(editingId, form.role)
        setUsers((current) =>
          current.map((user) => (user.id === editingId ? saved : user))
        )
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : 'Unable to save user profile.'
        )
        return
      } finally {
        setSaving(false)
      }
    }
    setFormOpen(false)
  }

  const toggleStatus = async () => {
    if (!selected) return
    const nextStatus: UserStatus =
      selected.status === 'Active' ? 'Inactive' : 'Active'
    setSaving(true)
    try {
      const saved = await userService.updateStatus(selected.id, nextStatus === 'Active')
      setUsers((current) =>
        current.map((user) => (user.id === selected.id ? saved : user))
      )
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to update user status.'
      )
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (id: string) => {
    setSaving(true)
    setFormError('')
    try {
      await userService.remove(id)
      setUsers((current) => current.filter((u) => u.id !== id))
      if (selectedId === id) setSelectedId(null)
      setConfirmDeleteId(null)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to delete user account.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {loading && <p className="mb-4 text-sm text-muted-foreground">Loading users…</p>}
      {saving && <span className="sr-only">Saving user data…</span>}
      <PageHeader
        eyebrow="Community accounts"
        title="Citizens Management"
        description="Review citizen profiles, access status, reports submitted, and manage registrations."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPdf}
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Print PDF</span>
            </Button>
          </div>
        }
      />

      {formError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
        >
          {formError}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter((user) => user.status === 'Active').length}
              </p>
              <p className="text-xs text-muted-foreground">Active accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter((user) => user.status === 'Inactive').length}
              </p>
              <p className="text-xs text-muted-foreground">Inactive accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.reduce((total, user) => total + user.complaintsSubmitted, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Reports submitted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search users"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search names, email, phone, or area..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                aria-label="User status filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              >
                <option>All statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <select
                aria-label="User role filter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              >
                <option>All roles</option>
                <option>Citizen</option>
                <option>Field reporter</option>
                <option>Administrator</option>
              </select>
            </div>
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        aria-label={`View ${user.name}`}
                        onClick={() => setSelectedId(user.id)}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#15213d] text-xs font-bold text-white">
                          {user.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {user.area}
                      </span>
                    </TableCell>
                    <TableCell>
                      <UserRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-700">
                        {user.complaintsSubmitted}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedId(user.id)}
                        >
                          View profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                          title="Delete citizen account"
                          onClick={() => setConfirmDeleteId(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y md:hidden">
            {filtered.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4"
              >
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-3 text-left"
                  aria-label={`View ${user.name}`}
                  onClick={() => setSelectedId(user.id)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#15213d] text-xs font-bold text-white">
                    {user.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {user.area} · {user.complaintsSubmitted} reports
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <UserStatusBadge status={user.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => setConfirmDeleteId(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No users match the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete User Modal Confirmation */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm citizen deletion"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Delete Citizen Account?
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Are you sure you want to remove this citizen/client record? This will revoke
                active mobile app sessions and permanently delete the profile from SadakSetu.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={() => deleteUser(confirmDeleteId)}
              >
                {saving ? 'Deleting…' : 'Delete Citizen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/40"
          onClick={() => setSelectedId(null)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} profile`}
            className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
                  {selected.id}
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {selected.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{selected.role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedId(null)}
                aria-label="Close user profile"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <UserStatusBadge status={selected.status} />
                <span className="text-xs text-muted-foreground">
                  {selected.lastActive}
                </span>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Contact information
                </p>
                <div className="mt-4 space-y-3">
                  <p className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {selected.email}
                  </p>
                  <p className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {selected.phone}
                  </p>
                  <p className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {selected.area}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">Reports submitted</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {selected.complaintsSubmitted}
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    {selected.joinedAt}
                  </p>
                </div>
              </div>
              <div className="border-t pt-5 space-y-3">
                <p className="text-sm font-semibold text-slate-800">
                  User management actions
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => openEdit(selected)}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit profile
                  </Button>
                  <Button
                    variant={selected.status === 'Active' ? 'secondary' : 'default'}
                    className="flex-1 gap-2"
                    onClick={toggleStatus}
                  >
                    {selected.status === 'Active' ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {selected.status === 'Active'
                      ? 'Deactivate'
                      : 'Activate'}
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => setConfirmDeleteId(selected.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Citizen Account
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Edit User Form Dialog */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setFormOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit user profile"
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Edit user profile
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update contact details and access role.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFormOpen(false)}
                aria-label="Close user form"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                Full name
                <Input
                  aria-label="User name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Email
                <Input
                  aria-label="User email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                />
              </label>
              <div className="space-y-2 text-sm font-semibold text-slate-700">
                <div className="flex items-center justify-between">
                  <label htmlFor="user-phone-input" className="text-sm font-semibold text-slate-700">
                    Phone number
                  </label>
                  <span className="text-[11px] font-normal text-slate-400">
                    {form.phone ? `${form.phone.length}/10 digits` : 'Max 10 digits'}
                  </span>
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 overflow-hidden">
                  <span className="inline-flex items-center px-3 border-r border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 select-none">
                    +91
                  </span>
                  <Input
                    id="user-phone-input"
                    aria-label="User phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    maxLength={10}
                    value={form.phone}
                    onChange={(event) => {
                      // Strictly digits only, maximum 10 digits (not more than 10)
                      const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10)
                      updateForm('phone', digitsOnly)
                      if (formError) setFormError('')
                    }}
                    className="border-0 shadow-none focus-visible:ring-0 rounded-l-none text-sm font-mono tracking-wide"
                  />
                </div>
                <p className="text-[11px] font-normal text-slate-500">
                  Enter a valid 10-digit Indian mobile number (not more than 10 digits).
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    Area / Locality <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectArea}
                    disabled={detectingLocation}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-50"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>{detectingLocation ? 'Detecting...' : 'Detect area (Consent-based)'}</span>
                  </button>
                </div>
                <Input
                  aria-label="User area"
                  placeholder="e.g. Indiranagar, Ward 12 (Optional)"
                  value={form.area}
                  onChange={(event) => updateForm('area', event.target.value)}
                />
                {locationStatus && (
                  <p className="text-[11px] text-slate-500">{locationStatus}</p>
                )}
              </div>
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Role
                <select
                  aria-label="User role"
                  value={form.role}
                  onChange={(event) =>
                    updateForm('role', event.target.value as UserRole)
                  }
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none"
                >
                  <option>Citizen</option>
                  <option>Field reporter</option>
                  <option>Administrator</option>
                </select>
              </label>
              {formError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2"
                >
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={saveProfile}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
