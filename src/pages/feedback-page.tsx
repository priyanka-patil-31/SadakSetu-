import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  CornerDownRight,
  Filter,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  User,
  X,
  AlertCircle,
  CheckCircle,
  Clock4,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface FeedbackItem {
  id: string
  raw_id?: string
  user_id?: string
  citizenName: string
  citizenEmail?: string
  location?: string
  complaintId: string
  rating: number
  category: string
  date: string
  comment: string
  message?: string
  status: string
  raw_status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  sentiment: 'positive' | 'neutral' | 'negative'
  adminReply?: string
  repliedAt?: string
}

function getCitizenInitials(name: string) {
  if (!name || name === 'App Citizen' || name === 'Citizen') return 'RS'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_GRADIENTS = [
  'from-teal-500 to-emerald-600',
  'from-blue-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-pink-600',
  'from-cyan-500 to-blue-600',
]

function getAvatarGradient(name: string) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

const quickTemplates = [
  'Thank you for your feedback! The municipal road repair crew has inspected and resolved this road hazard.',
  'Thank you for alerting us. A field engineer has been assigned and repairs are actively in progress.',
  'We appreciate your feedback! The asphalt surface compaction and leveling has been verified by the municipal supervisor.',
  'Thank you for contacting SadakSetu civic support. Your request has been logged with the zonal road maintenance unit.',
]

export function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [filter, setFilter] = useState<'all' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('all')
  const [search, setSearch] = useState('')
  const [replyingTo, setReplyingTo] = useState<FeedbackItem | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyStatus, setReplyStatus] = useState<'RESOLVED' | 'IN_PROGRESS'>('RESOLVED')
  const [sendingReply, setSendingReply] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null)

  const fetchFeedback = () => {
    fetch('/api/v1/feedback')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setFeedbackList(data)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchFeedback()
    const timer = setInterval(fetchFeedback, 3000)
    return () => clearInterval(timer)
  }, [])

  const filtered = feedbackList.filter((item) => {
    const rawStatus = (item.raw_status || 'OPEN').toUpperCase()
    const matchesFilter = filter === 'all' || rawStatus === filter
    const searchLower = search.toLowerCase()
    const matchesSearch =
      (item.citizenName || '').toLowerCase().includes(searchLower) ||
      (item.citizenEmail || '').toLowerCase().includes(searchLower) ||
      (item.comment || item.message || '').toLowerCase().includes(searchLower) ||
      (item.complaintId || '').toLowerCase().includes(searchLower) ||
      (item.id || '').toLowerCase().includes(searchLower) ||
      (item.category || '').toLowerCase().includes(searchLower)

    return matchesFilter && matchesSearch
  })

  // Calculate live stats from real database feedback
  const totalCount = feedbackList.length
  const openCount = feedbackList.filter((f) => f.raw_status === 'OPEN').length
  const inProgressCount = feedbackList.filter((f) => f.raw_status === 'IN_PROGRESS').length
  const resolvedCount = feedbackList.filter((f) => f.raw_status === 'RESOLVED').length
  const avgRating = totalCount > 0 ? (feedbackList.reduce((acc, f) => acc + (f.rating || 5), 0) / totalCount).toFixed(1) : '5.0'
  const slaResolutionPercent = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100

  const handleUpdateStatus = (item: FeedbackItem, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    setIsUpdatingStatus(item.id)
    fetch(`/api/v1/feedback/${item.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.feedback) {
          setFeedbackList((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, ...data.feedback } : f))
          )
          setNotificationBanner(`Status for ticket ${item.id} updated to ${newStatus}`)
          setTimeout(() => setNotificationBanner(null), 4000)
        }
      })
      .finally(() => setIsUpdatingStatus(null))
  }

  const openReplyModal = (item: FeedbackItem) => {
    setReplyingTo(item)
    setReplyText(
      item.adminReply ||
        `Dear ${item.citizenName}, thank you for contacting SadakSetu Municipal Support regarding your report.`
    )
    setReplyStatus('RESOLVED')
  }

  const handleSendReply = () => {
    if (!replyingTo || !replyText.trim()) return
    setSendingReply(true)

    fetch(`/api/v1/feedback/${replyingTo.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply: replyText.trim(),
        status: replyStatus,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.feedback) {
          setFeedbackList((prev) =>
            prev.map((f) => (f.id === replyingTo.id ? { ...f, ...data.feedback } : f))
          )
        }
        setNotificationBanner(
          `Official municipal response dispatched to ${replyingTo.citizenName} via in-app notification.`
        )
        setSendingReply(false)
        setReplyingTo(null)
        setReplyText('')
        setTimeout(() => setNotificationBanner(null), 5000)
      })
      .catch(() => {
        setSendingReply(false)
      })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback & Citizen Support Management"
        description="Monitor real-time feedback, road service reviews, and citizen grievance queries directly submitted from the SadakSetu Android app."
      />

      {notificationBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notificationBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationBanner(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top 4 KPI Cards - Connected to Real DB Data */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Average Citizen Rating
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{avgRating}</span>
              <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(Number(avgRating))
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-amber-100 text-amber-300'
                  }`}
                />
              ))}
              <span className="ml-1 text-xs text-slate-600 font-medium">
                {totalCount} total reviews
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Open Support Inquiries
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-600">{openCount}</span>
              <span className="text-xs text-slate-400">awaiting action</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              New citizen queries from Android mobile
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              In Progress / Dispatched
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600">{inProgressCount}</span>
              <span className="text-xs text-slate-400">active</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Assigned to PWD road inspection teams
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Resolution Rate
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0E7A6E]">{slaResolutionPercent}%</span>
              <span className="text-xs text-slate-400">resolved</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {resolvedCount} queries officially addressed & verified
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Feedback List */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Citizen Feedback & Support Queries
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time database integration with mobile citizen accounts
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sender, message, ticket..."
                    className="h-9 w-52 bg-white pl-9 text-xs"
                  />
                </div>

                {/* Status Switcher Tabs */}
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'OPEN', label: `Open (${openCount})` },
                    { id: 'IN_PROGRESS', label: `In Progress (${inProgressCount})` },
                    { id: 'RESOLVED', label: `Resolved (${resolvedCount})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id as any)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                        filter === tab.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={fetchFeedback}
                  title="Refresh from PostgreSQL"
                >
                  <RefreshCw className="h-4 w-4 text-slate-600" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="font-semibold text-sm">No feedback tickets match the selected filter</p>
                <p className="text-xs text-slate-400 mt-1">Try switching tabs or clearing the search query</p>
              </div>
            ) : (
              filtered.map((item) => {
                const displayName = item.citizenName || 'Verified Citizen'
                const initials = getCitizenInitials(displayName)
                const gradient = getAvatarGradient(displayName)
                const rawStatus = (item.raw_status || 'OPEN').toUpperCase()

                return (
                  <div
                    key={item.id}
                    className="p-5 space-y-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white text-xs font-bold shadow-xs`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {displayName}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Verified Mobile Citizen
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">{item.citizenEmail}</span>
                            {item.location && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                  <MapPin className="h-3 w-3 text-teal-600" />
                                  {item.location}
                                </span>
                              </>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 font-medium">
                              Ticket: {item.id}
                            </span>
                            {item.complaintId && item.complaintId !== 'Civic Feedback' && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="rounded bg-orange-50 px-1.5 py-0.5 font-mono text-[10px] text-orange-700 border border-orange-200/50">
                                  Ref: {item.complaintId}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/60 rounded-lg px-2 py-1">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < item.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-slate-200 text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-amber-700">
                            {item.rating}.0
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.date}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50/90 to-white p-3.5 pl-4 border-l-4 border-l-teal-500">
                      <p className="text-xs leading-relaxed text-slate-800 font-normal">
                        "{item.comment || item.message}"
                      </p>
                    </div>

                    {/* Display official admin reply if present */}
                    {item.adminReply && (
                      <div className="rounded-xl border border-teal-200/80 bg-teal-50/60 p-3.5 space-y-1.5 ml-4">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 font-bold text-teal-900">
                            <CornerDownRight className="h-3.5 w-3.5 text-teal-600" />
                            Official SadakSetu Municipal Response
                          </span>
                          <span className="text-teal-700 font-medium">{item.repliedAt}</span>
                        </div>
                        <p className="text-xs text-teal-950 pl-5 leading-relaxed">
                          {item.adminReply}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-teal-200 text-[10px] text-teal-800 bg-teal-50/50 font-semibold"
                        >
                          {item.category}
                        </Badge>

                        {/* Interactive Status Pill */}
                        <div className="flex items-center gap-1">
                          {rawStatus === 'OPEN' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                              <AlertCircle className="h-3 w-3 text-blue-600" />
                              Open
                            </span>
                          )}
                          {rawStatus === 'IN_PROGRESS' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              <Clock4 className="h-3 w-3 text-amber-600" />
                              In Progress
                            </span>
                          )}
                          {rawStatus === 'RESOLVED' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              Resolved
                            </span>
                          )}
                        </div>

                        {/* Status Transition Actions for Admins */}
                        <div className="flex items-center gap-1 pl-2">
                          {rawStatus === 'OPEN' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus === item.id}
                              onClick={() => handleUpdateStatus(item, 'IN_PROGRESS')}
                              className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors"
                            >
                              Dispatch Team
                            </button>
                          )}
                          {rawStatus !== 'RESOLVED' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus === item.id}
                              onClick={() => handleUpdateStatus(item, 'RESOLVED')}
                              className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                            >
                              Mark Resolved
                            </button>
                          )}
                          {rawStatus === 'RESOLVED' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus === item.id}
                              onClick={() => handleUpdateStatus(item, 'OPEN')}
                              className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                            >
                              Re-open
                            </button>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-semibold text-[#0E7A6E] hover:text-[#0B6157] hover:bg-teal-50 gap-1.5"
                        onClick={() => openReplyModal(item)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {item.adminReply ? 'Update Reply' : 'Reply to Citizen'}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Support Helpdesk Card */}
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#0E7A6E]" />
                Public Support Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 text-xs">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">National PWD Helpline</p>
                  <p className="text-slate-500">1800-111-SETU (Toll-free 24/7)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Grievance Desk</p>
                  <p className="text-slate-500">support@sadaksetu.gov.in</p>
                </div>
              </div>
              <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-3">
                <p className="font-bold text-teal-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                  Live Sync Active
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-teal-950">
                  Citizen submissions from Android mobile update this console dynamically. Official replies trigger mobile push notifications.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Reply Modal Dialog */}
      {replyingTo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Official Reply to Citizen Feedback
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Citizen: <strong className="text-slate-800">{replyingTo.citizenName}</strong> ({replyingTo.citizenEmail})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-100">
                <span className="font-semibold text-slate-900">Citizen Query: </span>
                "{replyingTo.comment || replyingTo.message}"
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Quick Reply Templates
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {quickTemplates.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(tmpl)}
                      className="w-full text-left rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600 hover:border-teal-400 hover:text-teal-900 transition-colors"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Official Response Message
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  placeholder="Type your official response..."
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Update Status to:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReplyStatus('IN_PROGRESS')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      replyStatus === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyStatus('RESOLVED')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      replyStatus === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplyingTo(null)}
                disabled={sendingReply}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#0E7A6E] hover:bg-[#0B6157] text-white gap-1.5"
                onClick={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
              >
                {sendingReply ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Dispatch Official Reply
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
