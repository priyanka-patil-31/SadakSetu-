import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ClipboardCheck,
  Info,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/http-client'

interface SystemNotification {
  id: string
  title: string
  message: string
  type: 'Critical' | 'Assignment' | 'System'
  time: string
  read: boolean
}

type BackendNotification = {
  id: string
  title: string
  message: string
  notification_type: string
  created_at: string
}

const mockDefaultNotifications: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Critical Pothole Reported on NH-48',
    message: 'High severity complaint SS-20261104-6D2FC7E58B7F detected by YOLO11 with 92% confidence score.',
    type: 'Critical',
    time: '10 minutes ago',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Repair Crew Alpha Dispatched',
    message: 'Central Zone Quick Response Team assigned to Sector 14 asphalt patching.',
    type: 'Assignment',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Daily PostGIS Database Sync Complete',
    message: 'Geographic coordinate projections and spatial layers refreshed successfully.',
    type: 'System',
    time: '5 hours ago',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'YOLO11 Model Weights Updated',
    message: 'Baseline PyTorch weights models/baseline_yolo11.pt validated with 0.89 mAP.',
    type: 'System',
    time: 'Yesterday',
    read: true,
  },
]

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<SystemNotification[]>(mockDefaultNotifications)
  const [filter, setFilter] = useState<'all' | 'Critical' | 'Assignment' | 'System'>('all')

  useEffect(() => {
    let active = true
    apiClient
      .get<{ items: BackendNotification[] }>('/notifications', {
        params: { page: 1, page_size: 50 },
      })
      .then(({ data }) => {
        if (!active || !data.items || data.items.length === 0) return
        setNotifications(
          data.items.map((item) => ({
            id: item.id,
            title: item.title,
            message: item.message,
            time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type:
              item.notification_type === 'CRITICAL'
                ? 'Critical'
                : item.notification_type === 'ASSIGNMENT'
                ? 'Assignment'
                : 'System',
            read: false,
          }))
        )
      })
      .catch(() => {
        // Fallback to default notifications
      })

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    return notifications.filter((n) => n.type === filter)
  }, [notifications, filter])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    apiClient.post('/notifications/read-all').catch(() => {})
  }

  const markSingleAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`).catch(() => {})
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alerts & Feed"
        title="Administrative Notifications"
        description="Real-time alerts for road incidents, emergency repair dispatches, and system updates."
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="gap-1.5 text-xs font-semibold"
              >
                <CheckCheck className="h-3.5 w-3.5 text-teal-600" />
                Mark all as read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="gap-1.5 text-xs text-slate-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        }
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">
                Activity Stream
              </CardTitle>
              {unreadCount > 0 && (
                <Badge className="bg-orange-500 text-white text-[10px]">
                  {unreadCount} unread
                </Badge>
              )}
            </div>

            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['all', 'Critical', 'Assignment', 'System'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${
                    filter === tab
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all' ? 'All Alerts' : tab}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">All caught up</h3>
              <p className="mt-1 text-xs text-slate-500">
                No notifications match the selected category.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const Icon =
                item.type === 'Critical'
                  ? AlertTriangle
                  : item.type === 'Assignment'
                  ? ClipboardCheck
                  : Info
              const toneClass =
                item.type === 'Critical'
                  ? 'bg-red-50 text-red-600 border border-red-200/60'
                  : item.type === 'Assignment'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                  : 'bg-slate-100 text-slate-600 border border-slate-200/60'

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 p-5 transition-colors ${
                    !item.read ? 'bg-orange-50/30' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.time}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {item.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-200 bg-white text-slate-600"
                      >
                        {item.type}
                      </Badge>

                      {!item.read && (
                        <button
                          type="button"
                          onClick={() => markSingleAsRead(item.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#0E7A6E] hover:text-[#0B6157]"
                        >
                          <Check className="h-3 w-3" />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
