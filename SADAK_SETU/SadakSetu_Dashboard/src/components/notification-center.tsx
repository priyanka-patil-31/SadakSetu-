import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, Check, ClipboardCheck, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AppNotification } from '@/lib/notifications-data'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/http-client'

const notificationIcon = { Critical: AlertTriangle, Assignment: ClipboardCheck, System: Info }
const notificationTone = { Critical: 'bg-red-50 text-red-600', Assignment: 'bg-sky-50 text-sky-600', System: 'bg-slate-100 text-slate-600' }

type BackendNotification = {
  id: string
  notification_type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

function notificationType(value: string): AppNotification['type'] {
  const normalized = value.toUpperCase()
  if (normalized.includes('CRITICAL') || normalized.includes('SEVERITY')) return 'Critical'
  if (normalized.includes('ASSIGN')) return 'Assignment'
  return 'System'
}

function notificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications])

  useEffect(() => {
    let active = true
    apiClient.get<{ items: BackendNotification[] }>('/notifications', { params: { page: 1, page_size: 25 } })
      .then(({ data }) => {
        if (!active) return
        setNotifications(data.items.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.body,
          time: notificationTime(item.created_at),
          type: notificationType(item.notification_type),
          read: Boolean(item.read_at),
        })))
      })
      .catch(() => {
        if (active) setNotifications([])
      })
    return () => { active = false }
  }, [])

  const markRead = async (id: string) => {
    try { await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`) } catch { return }
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification))
  }
  const markAllRead = async () => {
    try { await apiClient.post('/notifications/read-all') } catch { return }
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }

  return <div className="relative">
    <Button variant="ghost" size="icon" className="relative text-slate-500" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}><Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute right-2 top-2 flex h-1.5 min-w-1.5 rounded-full bg-orange-500 ring-2 ring-white" />}</Button>
    {open && <div className="fixed inset-0 z-30" onClick={() => setOpen(false)}><div role="dialog" aria-label="Notification center" className="absolute right-4 top-[68px] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white shadow-2xl md:right-8" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b px-4 py-4"><div><h2 className="font-semibold text-slate-900">Notifications</h2><p className="mt-0.5 text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}</p></div><div className="flex items-center gap-1">{unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllRead}><Check className="mr-1.5 h-3.5 w-3.5" />Mark all as read</Button>}<Button variant="ghost" size="icon" aria-label="Close notifications" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button></div></div><div className="max-h-[360px] overflow-y-auto">{notifications.map((notification) => { const Icon = notificationIcon[notification.type]; return <div key={notification.id} className={cn('flex gap-3 border-b px-4 py-4 last:border-b-0', !notification.read && 'bg-orange-50/40')}><div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', notificationTone[notification.type])}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{notification.title}</p>{!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p><div className="mt-2 flex items-center justify-between"><span className="text-[11px] text-slate-400">{notification.time}</span>{!notification.read && <button type="button" className="text-[11px] font-semibold text-orange-600 hover:text-orange-700" onClick={() => markRead(notification.id)}>Mark as read</button>}</div></div></div> })}</div></div></div>}
  </div>
}
