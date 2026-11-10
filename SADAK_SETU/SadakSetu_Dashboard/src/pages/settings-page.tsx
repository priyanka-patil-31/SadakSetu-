import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, KeyRound, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { userService } from '@/services/user-service'

type Preferences = { emailAlerts: boolean; criticalAlerts: boolean; weeklyReports: boolean; compactTables: boolean }

function formatSessionDate(value: number | undefined) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unavailable'
}

export function SettingsPage() {
  const { user, session, logout, updateUser } = useAuth()
  const [profile, setProfile] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [preferences, setPreferences] = useState<Preferences>({ emailAlerts: true, criticalAlerts: true, weeklyReports: false, compactTables: false })
  const [preferencesMessage, setPreferencesMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    userService.getPreferences().then((stored) => setPreferences({ emailAlerts: stored.email_alerts, criticalAlerts: stored.critical_alerts, weeklyReports: stored.weekly_reports, compactTables: stored.compact_tables })).catch(() => undefined)
  }, [])

  const saveProfile = async () => {
    setProfileError('')
    if (!profile.name.trim()) { setProfileMessage(''); setProfileError('Administrator name is required.'); return }
    setSaving(true)
    try {
      const saved = await userService.updateMyProfile({ full_name: profile.name.trim() })
      updateUser({ name: saved.full_name, email: saved.email })
      setProfile({ name: saved.full_name, email: saved.email })
      setProfileMessage('Profile details saved to the database.')
    } catch (error) {
      setProfileMessage('')
      setProfileError(error instanceof Error ? error.message : 'Unable to save profile details.')
    } finally { setSaving(false) }
  }

  const savePassword = async () => {
    setPasswordError('')
    setPasswordMessage('')
    if (!password.current || !password.next || !password.confirm) { setPasswordError('Complete all password fields before saving.'); return }
    if (password.next.length < 8) { setPasswordError('New password must be at least 8 characters.'); return }
    if (password.next !== password.confirm) { setPasswordError('New password and confirmation do not match.'); return }
    setSaving(true)
    try {
      await userService.updatePassword(password.current, password.next)
      setPassword({ current: '', next: '', confirm: '' })
      setPasswordMessage('Password saved to the database.')
    } catch (error) { setPasswordError(error instanceof Error ? error.message : 'Unable to save password.') }
    finally { setSaving(false) }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      await userService.updatePreferences({ email_alerts: preferences.emailAlerts, critical_alerts: preferences.criticalAlerts, weekly_reports: preferences.weeklyReports, compact_tables: preferences.compactTables })
      setPreferencesMessage('Application preferences saved to the database.')
    } catch (error) { setPreferencesMessage(error instanceof Error ? error.message : 'Unable to save preferences.') }
    finally { setSaving(false) }
  }

  return <div><PageHeader eyebrow="Workspace controls" title="Settings" description="Manage your administrator profile, session, and application preferences." /><div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
    <div className="space-y-6">
      <Card><CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-orange-50 p-2.5 text-orange-600"><UserRound className="h-5 w-5" /></div><div><CardTitle>Administrator profile</CardTitle><CardDescription>Update the name shown across the admin console.</CardDescription></div></div></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-slate-700">Full name<Input aria-label="Administrator name" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></label><label className="space-y-2 text-sm font-semibold text-slate-700">Work email<Input aria-label="Administrator email" value={profile.email} readOnly className="bg-slate-50" /></label></div>{profileError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{profileError}</p>}{profileMessage && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />{profileMessage}</p>}<Button onClick={saveProfile} disabled={saving} className="mt-5 gap-2 bg-orange-500 hover:bg-orange-600"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save profile'}</Button></CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><KeyRound className="h-5 w-5" /></div><div><CardTitle>Password settings</CardTitle><CardDescription>Use a strong password for your administrator account.</CardDescription></div></div></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-3">Current password<Input aria-label="Current password" type="password" value={password.current} onChange={(event) => setPassword((current) => ({ ...current, current: event.target.value }))} /></label><label className="space-y-2 text-sm font-semibold text-slate-700">New password<Input aria-label="New password" type="password" value={password.next} onChange={(event) => setPassword((current) => ({ ...current, next: event.target.value }))} /></label><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">Confirm new password<Input aria-label="Confirm new password" type="password" value={password.confirm} onChange={(event) => setPassword((current) => ({ ...current, confirm: event.target.value }))} /></label></div>{passwordError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{passwordError}</p>}{passwordMessage && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />{passwordMessage}</p>}<Button variant="outline" onClick={savePassword} disabled={saving} className="mt-5 gap-2"><KeyRound className="h-4 w-4" />{saving ? 'Saving…' : 'Update password'}</Button><p className="mt-3 text-xs leading-5 text-muted-foreground">Password changes are saved to the configured backend service.</p></CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><ShieldCheck className="h-5 w-5" /></div><div><CardTitle>Application preferences</CardTitle><CardDescription>Choose which operational updates you want to receive.</CardDescription></div></div></CardHeader><CardContent><div className="space-y-1">{([['emailAlerts', 'Email activity alerts', 'Receive summaries for new complaints and assignments.'], ['criticalAlerts', 'Critical complaint alerts', 'Always surface critical road-safety reports.'], ['weeklyReports', 'Weekly report digest', 'Receive a weekly summary of city operations.'], ['compactTables', 'Compact data tables', 'Show more rows in complaint and user listings.']] as const).map(([key, label, description]) => <label key={key} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border-b py-4 last:border-b-0"><span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span><input aria-label={label} type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-orange-500" /></label>)}</div>{preferencesMessage && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />{preferencesMessage}</p>}<Button onClick={savePreferences} disabled={saving} className="mt-5 gap-2 bg-orange-500 hover:bg-orange-600"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save preferences'}</Button></CardContent></Card>
    </div>
    <div className="space-y-6"><Card><CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Clock3 className="h-5 w-5" /></div><div><CardTitle>Current session</CardTitle><CardDescription>Frontend session boundary and activity.</CardDescription></div></div></CardHeader><CardContent><div className="space-y-4 text-sm"><div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-700">Authenticated</Badge></div><div><p className="text-xs text-muted-foreground">Session ID</p><p className="mt-1 break-all font-mono text-xs text-slate-700">{session?.sessionId ?? 'Unavailable'}</p></div><div><p className="text-xs text-muted-foreground">Started</p><p className="mt-1 font-medium text-slate-700">{formatSessionDate(session?.createdAt)}</p></div><div><p className="text-xs text-muted-foreground">Last activity</p><p className="mt-1 font-medium text-slate-700">{formatSessionDate(session?.lastActivityAt)}</p></div><div><p className="text-xs text-muted-foreground">Expires</p><p className="mt-1 font-medium text-slate-700">{formatSessionDate(session?.expiresAt)}</p></div></div></CardContent></Card><Card className="border-red-100"><CardContent className="p-5"><p className="font-semibold text-slate-800">Sign out everywhere</p><p className="mt-1 text-sm leading-5 text-muted-foreground">End this browser session immediately and return to the admin sign-in screen.</p><Button variant="destructive" onClick={() => logout()} className="mt-4 gap-2"><LogOut className="h-4 w-4" />Sign out</Button></CardContent></Card></div>
  </div></div>
}
