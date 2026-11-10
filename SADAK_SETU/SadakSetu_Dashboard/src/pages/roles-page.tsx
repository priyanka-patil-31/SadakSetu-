import { useState } from 'react'
import {
  Check,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Users,
  X,
  Trash2,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export interface RoleDefinition {
  id: string
  name: string
  badge: string
  description: string
  usersCount: number
  isSystem?: boolean
  permissions: {
    complaints: ('view' | 'edit' | 'delete' | 'verify')[]
    aiDetection: ('view' | 'override' | 'train')[]
    teams: ('view' | 'assign' | 'manage')[]
    citizens: ('view' | 'manage')[]
    analytics: ('view' | 'export')[]
    system: ('settings' | 'audit_logs' | 'manage_roles')[]
  }
}

const defaultRoles: RoleDefinition[] = [
  {
    id: 'super-admin',
    name: 'Super Administrator',
    badge: 'System Core',
    description: 'Full unconstrained platform control across complaints, teams, AI thresholds, and system roles.',
    usersCount: 2,
    isSystem: true,
    permissions: {
      complaints: ['view', 'edit', 'delete', 'verify'],
      aiDetection: ['view', 'override', 'train'],
      teams: ['view', 'assign', 'manage'],
      citizens: ['view', 'manage'],
      analytics: ['view', 'export'],
      system: ['settings', 'audit_logs', 'manage_roles'],
    },
  },
  {
    id: 'road-inspector',
    name: 'Municipal Road Inspector',
    badge: 'Field Ops',
    description: 'Reviews road hazard evidence, verifies AI pothole detections, and updates incident statuses.',
    usersCount: 5,
    permissions: {
      complaints: ['view', 'edit', 'verify'],
      aiDetection: ['view', 'override'],
      teams: ['view', 'assign'],
      citizens: ['view'],
      analytics: ['view', 'export'],
      system: [],
    },
  },
  {
    id: 'pwd-dispatcher',
    name: 'PWD Field Dispatcher',
    badge: 'Maintenance',
    description: 'Assigns verified road damage incidents to municipal repair crews and tracks SLA resolution.',
    usersCount: 4,
    permissions: {
      complaints: ['view', 'edit'],
      aiDetection: ['view'],
      teams: ['view', 'assign', 'manage'],
      citizens: ['view'],
      analytics: ['view'],
      system: [],
    },
  },
  {
    id: 'ai-specialist',
    name: 'YOLO11 AI Specialist',
    badge: 'Machine Learning',
    description: 'Audits automatic pothole bounding boxes, confidence scoring benchmarks, and false positives.',
    usersCount: 2,
    permissions: {
      complaints: ['view'],
      aiDetection: ['view', 'override', 'train'],
      teams: ['view'],
      citizens: [],
      analytics: ['view', 'export'],
      system: ['audit_logs'],
    },
  },
]

export function RolesPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>(defaultRoles)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('super-admin')
  const [search, setSearch] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  // Dialog State for Creating Custom Role
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleBadge, setNewRoleBadge] = useState('Custom')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [newRoleError, setNewRoleError] = useState('')

  // Selected Role
  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0]

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  )

  const showToast = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  // Toggle permission for any module and action
  const togglePermission = (
    moduleKey: keyof RoleDefinition['permissions'],
    action: string
  ) => {
    setRoles((currentRoles) =>
      currentRoles.map((role) => {
        if (role.id !== selectedRoleId) return role
        const currentList = role.permissions[moduleKey] as string[]
        const hasAction = currentList.includes(action)
        const updatedList = hasAction
          ? currentList.filter((p) => p !== action)
          : [...currentList, action]

        return {
          ...role,
          permissions: {
            ...role.permissions,
            [moduleKey]: updatedList,
          },
        }
      })
    )
    showToast(`Updated '${action}' permission for ${selectedRole.name}.`)
  }


  // Handle Create Custom Role
  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      setNewRoleError('Please provide a role name.')
      return
    }
    if (!newRoleDesc.trim()) {
      setNewRoleError('Please provide a description of this role.')
      return
    }

    const newId = `custom-role-${Date.now()}`
    const newRole: RoleDefinition = {
      id: newId,
      name: newRoleName.trim(),
      badge: newRoleBadge.trim() || 'Custom',
      description: newRoleDesc.trim(),
      usersCount: 0,
      isSystem: false,
      permissions: {
        complaints: ['view'],
        aiDetection: ['view'],
        teams: ['view'],
        citizens: ['view'],
        analytics: ['view'],
        system: [],
      },
    }

    setRoles((prev) => [...prev, newRole])
    setSelectedRoleId(newId)
    setIsCreateDialogOpen(false)
    setNewRoleName('')
    setNewRoleBadge('Custom')
    setNewRoleDesc('')
    setNewRoleError('')
    showToast(`Custom role '${newRole.name}' created successfully!`)
  }

  // Delete a non-system role
  const handleDeleteRole = (roleId: string) => {
    const roleToDelete = roles.find((r) => r.id === roleId)
    if (!roleToDelete || roleToDelete.isSystem) return
    setRoles((prev) => prev.filter((r) => r.id !== roleId))
    setSelectedRoleId('super-admin')
    showToast(`Role '${roleToDelete.name}' has been deleted.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access Control"
        title="Admin Roles & Permissions"
        description="Configure role-based access control (RBAC), security scopes, and administrative privileges for SadakSetu."
        action={
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#0E7A6E] hover:bg-[#0B6157] text-white gap-2 text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Create Custom Role
          </Button>
        }
      />

      {notification && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Roles List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles..."
              className="bg-white pl-9 text-xs"
            />
          </div>

          <div className="space-y-2">
            {filteredRoles.map((role) => {
              const isSelected = role.id === selectedRoleId
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-[#0E7A6E] bg-teal-50/50 shadow-xs ring-1 ring-[#0E7A6E]/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{role.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        isSelected
                          ? 'border-teal-300 bg-teal-100 text-teal-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {role.badge}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {role.usersCount} Assigned
                    </span>
                    {role.isSystem ? (
                      <span className="flex items-center gap-1 text-amber-600 font-semibold text-[11px]">
                        <Lock className="h-3 w-3" /> System Guarded
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-teal-700">Custom Role</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Role Permissions Matrix */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#0E7A6E]" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      {selectedRole.name}
                    </CardTitle>
                    <Badge className="bg-teal-600 text-white text-[10px]">
                      {selectedRole.badge}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{selectedRole.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedRole.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(selectedRole.id)}
                      className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Role
                    </Button>
                  )}
                  <Badge variant="outline" className="text-xs border-slate-200 bg-white">
                    {selectedRole.usersCount} Active Users
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* Permission Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Functional Module Permissions
                  </h3>
                  <p className="text-[11px] text-slate-400">Click any action button to toggle permission status</p>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  {/* 1. Complaints */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Complaint Management</p>
                      <p className="text-[11px] text-slate-500">
                        View, update status, verify evidence, and delete citizen road reports
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['view', 'edit', 'verify', 'delete'].map((action) => {
                        const active = selectedRole.permissions.complaints.includes(action as never)
                        return (
                          <button
                            key={action}
                            type="button"
                            onClick={() => togglePermission('complaints', action)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs hover:bg-teal-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                            title={`Click to ${active ? 'revoke' : 'grant'} ${action} permission`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal-600' : 'bg-slate-300'}`} />
                            {action}
                            {active ? <Check className="h-3 w-3 text-teal-600" /> : <Plus className="h-3 w-3 text-slate-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 2. AI Detection */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">AI YOLO11 Inference & Detection</p>
                      <p className="text-[11px] text-slate-500">
                        Inspect YOLO bounding boxes, override false alarms, and trigger re-inference
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['view', 'override', 'train'].map((action) => {
                        const active = selectedRole.permissions.aiDetection.includes(action as never)
                        return (
                          <button
                            key={action}
                            type="button"
                            onClick={() => togglePermission('aiDetection', action)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs hover:bg-teal-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                            title={`Click to ${active ? 'revoke' : 'grant'} ${action} permission`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal-600' : 'bg-slate-300'}`} />
                            {action}
                            {active ? <Check className="h-3 w-3 text-teal-600" /> : <Plus className="h-3 w-3 text-slate-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 3. Repair Teams */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Repair Teams & Dispatch</p>
                      <p className="text-[11px] text-slate-500">
                        Assign road repair crews, monitor team locations, and manage rosters
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['view', 'assign', 'manage'].map((action) => {
                        const active = selectedRole.permissions.teams.includes(action as never)
                        return (
                          <button
                            key={action}
                            type="button"
                            onClick={() => togglePermission('teams', action)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs hover:bg-teal-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                            title={`Click to ${active ? 'revoke' : 'grant'} ${action} permission`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal-600' : 'bg-slate-300'}`} />
                            {action}
                            {active ? <Check className="h-3 w-3 text-teal-600" /> : <Plus className="h-3 w-3 text-slate-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 4. Citizen Management */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Citizens & App Users</p>
                      <p className="text-[11px] text-slate-500">
                        View registered citizen profiles, active mobile devices, and block abuse
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['view', 'manage'].map((action) => {
                        const active = selectedRole.permissions.citizens.includes(action as never)
                        return (
                          <button
                            key={action}
                            type="button"
                            onClick={() => togglePermission('citizens', action)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs hover:bg-teal-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                            title={`Click to ${active ? 'revoke' : 'grant'} ${action} permission`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal-600' : 'bg-slate-300'}`} />
                            {action}
                            {active ? <Check className="h-3 w-3 text-teal-600" /> : <Plus className="h-3 w-3 text-slate-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 5. Analytics & Reports */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Analytics & Reports</p>
                      <p className="text-[11px] text-slate-500">
                        Inspect resolution time trends, export executive CSV / PDF reports
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['view', 'export'].map((action) => {
                        const active = selectedRole.permissions.analytics.includes(action as never)
                        return (
                          <button
                            key={action}
                            type="button"
                            onClick={() => togglePermission('analytics', action)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs hover:bg-teal-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                            title={`Click to ${active ? 'revoke' : 'grant'} ${action} permission`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal-600' : 'bg-slate-300'}`} />
                            {action}
                            {active ? <Check className="h-3 w-3 text-teal-600" /> : <Plus className="h-3 w-3 text-slate-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 6. System & Security */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">System Configuration & Security</p>
                      <p className="text-[11px] text-slate-500">
                        Platform settings, database logs, and administrator credential management
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { key: 'settings', label: 'settings' },
                        { key: 'audit_logs', label: 'audit logs' },
                        { key: 'manage_roles', label: 'manage roles' },
                      ].map(({ key, label }) => {
                        const active = selectedRole.permissions.system.includes(key as never)
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => togglePermission('system', key)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs hover:bg-teal-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                            title={`Click to ${active ? 'revoke' : 'grant'} ${label} permission`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal-600' : 'bg-slate-300'}`} />
                            {label}
                            {active ? <Check className="h-3 w-3 text-teal-600" /> : <Plus className="h-3 w-3 text-slate-400" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Policy Alert */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-blue-900">
                  <p className="font-bold">Enterprise Role-Based Access Control (RBAC)</p>
                  <p className="mt-0.5 text-blue-700">
                    Permissions update dynamically in your active administrator session. All changes are enforced across SadakSetu API endpoints and authenticated user actions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Create Custom Role */}
      {isCreateDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 animate-in fade-in duration-150"
          onClick={() => setIsCreateDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create Custom Role"
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Create Custom Role</h2>
                  <p className="text-xs text-slate-500">Define administrative privileges and module scopes</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateDialogOpen(false)}
                className="h-8 w-8 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {newRoleError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {newRoleError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Role Name</label>
                <Input
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value)
                    setNewRoleError('')
                  }}
                  placeholder="e.g. Senior Zonal Auditor, PWD Field Supervisor"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Department / Badge Label</label>
                <Input
                  value={newRoleBadge}
                  onChange={(e) => setNewRoleBadge(e.target.value)}
                  placeholder="e.g. Operations, Quality Control, Field Ops"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => {
                    setNewRoleDesc(e.target.value)
                    setNewRoleError('')
                  }}
                  placeholder="Summarize the core duties and authorized capabilities for this role..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateRole}
                className="bg-[#0E7A6E] hover:bg-[#0B6157] text-white text-xs font-semibold"
              >
                Create & Save Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
