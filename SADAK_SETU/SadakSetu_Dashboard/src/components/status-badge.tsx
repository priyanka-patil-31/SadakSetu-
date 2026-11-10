import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ComplaintStatus } from '@/lib/complaints-data'

const statusClasses: Record<ComplaintStatus, string> = { Submitted: 'border-sky-200 bg-sky-50 text-sky-700', 'Under review': 'border-amber-200 bg-amber-50 text-amber-700', 'AI processing': 'border-violet-200 bg-violet-50 text-violet-700', Assigned: 'border-indigo-200 bg-indigo-50 text-indigo-700', 'In progress': 'border-amber-200 bg-amber-50 text-amber-700', Resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700', Rejected: 'border-slate-200 bg-slate-100 text-slate-600' }

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return <Badge variant="outline" className={cn('font-medium', statusClasses[status])}>{status}</Badge>
}
