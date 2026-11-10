import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ClipboardList, Clock3, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const statIcons: Record<string, LucideIcon> = { orange: ClipboardList, green: CheckCircle2, blue: AlertTriangle, violet: Clock3 }

export function StatCard({ label, value, change, detail, tone }: { label: string; value: string; change: string; detail: string; tone: 'orange' | 'green' | 'blue' | 'violet' }) {
  const Icon = statIcons[tone] ?? Activity
  const positive = !change.startsWith('-')
  const toneClasses = { orange: 'bg-orange-50 text-orange-600', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-sky-50 text-sky-600', violet: 'bg-violet-50 text-violet-600' }
  return <Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p><div className={cn('mt-3 inline-flex items-center gap-1 text-xs font-semibold', positive ? 'text-emerald-600' : 'text-red-600')}>{positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{change}<span className="font-normal text-muted-foreground">{detail}</span></div></div><div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneClasses[tone])}><Icon className="h-5 w-5" /></div></CardContent></Card>
}
