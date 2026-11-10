import { ArrowRight, Construction, Layers3 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const pageDetails: Record<string, { title: string; description: string; phase: string }> = {
  '/': { title: 'Overview', description: 'Your city road safety operations at a glance.', phase: 'Phase 3' },
  '/incidents': { title: 'Incident management', description: 'Review, assign, and track citizen-reported road issues.', phase: 'Phase 4' },
  '/roads': { title: 'Road network', description: 'Monitor road health, inspections, and maintenance coverage.', phase: 'Phase 5' },
  '/citizens': { title: 'User management', description: 'Review citizen profiles, access status, and reporting activity.', phase: 'Phase 8' },
  '/analytics': { title: 'Reports & analytics', description: 'Track complaint trends, severity, zones, and repair team performance.', phase: 'Phase 9' },
  '/map': { title: 'Live map', description: 'See incidents and road conditions across the city.', phase: 'Phase 5' },
  '/settings': { title: 'Settings', description: 'Configure your administrator profile and application preferences.', phase: 'Phase 10' },
}

export function PlaceholderPage() {
  const { pathname } = useLocation()
  const details = pageDetails[pathname] ?? pageDetails['/']
  return <div className="mx-auto max-w-5xl"><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-500">SadakSetu workspace</p><h1 className="text-3xl font-bold tracking-tight text-slate-900">{details.title}</h1><p className="mt-1 text-sm text-muted-foreground">{details.description}</p></div><Badge variant="outline" className="w-fit border-orange-200 bg-orange-50 text-orange-700">Planned for {details.phase}</Badge></div><Card className="overflow-hidden"><CardHeader className="border-b bg-slate-50/80"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white"><Construction className="h-6 w-6" /></div><CardTitle className="mt-4 text-xl">{details.title} is mapped into the shell</CardTitle><CardDescription>Phase 1 establishes navigation and layout. Feature work will be added one approved phase at a time.</CardDescription></CardHeader><CardContent className="grid gap-4 p-6 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><Layers3 className="mb-3 h-5 w-5 text-orange-500" /><p className="text-sm font-semibold text-slate-800">Reusable foundation</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Shared buttons, cards, badges, inputs, and layout tokens are ready.</p></div><div className="rounded-xl border bg-white p-4"><span className="mb-3 block text-lg font-bold text-slate-900">01</span><p className="text-sm font-semibold text-slate-800">Responsive by default</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Desktop sidebar collapses into a mobile navigation drawer.</p></div><div className="rounded-xl border bg-white p-4"><span className="mb-3 block text-lg font-bold text-slate-900">→</span><p className="text-sm font-semibold text-slate-800">Next approval</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Continue with Phase 2 to add authentication and protected routes.</p></div></CardContent></Card><Link to="/" className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"><span>Return to overview</span><ArrowRight className="h-4 w-4" /></Link></div>
}
