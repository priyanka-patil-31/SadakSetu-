import { type ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-500">{eyebrow}</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[30px]">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{action}</div>
}
