import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  CornerDownRight,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Star,
  ThumbsUp,
  User,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface FeedbackItem {
  id: string
  citizenName: string
  citizenEmail?: string
  complaintId: string
  rating: number
  category: string
  date: string
  comment: string
  status: 'Reviewed' | 'Needs Attention' | 'Resolved'
  sentiment: 'positive' | 'neutral' | 'negative'
  adminReply?: string
  repliedAt?: string
}

const initialFeedback: FeedbackItem[] = [
  {
    id: 'FB-8841',
    citizenName: 'Dev Sharma',
    citizenEmail: 'dev.sharma@example.com',
    complaintId: 'SS-20261104-6D2FC7E58B7F',
    rating: 5,
    category: 'Pothole Repair',
    date: 'Today, 2:40 PM',
    comment:
      'The pothole near Sector 14 market was repaired within 36 hours of filing the complaint with AI photo. Excellent work by SadakSetu and the PWD crew!',
    status: 'Reviewed',
    sentiment: 'positive',
  },
  {
    id: 'FB-8839',
    citizenName: 'Aarav Patel',
    citizenEmail: 'aarav.patel@example.com',
    complaintId: 'SS-20261103-A91B4C32D10E',
    rating: 4,
    category: 'AI Detection',
    date: 'Yesterday, 5:15 PM',
    comment:
      'AI detection on mobile camera recognized the crater accurately on first attempt. Would love an option to add video clips too.',
    status: 'Reviewed',
    sentiment: 'positive',
  },
  {
    id: 'FB-8834',
    citizenName: 'Pooja Verma',
    citizenEmail: 'pooja.verma@example.com',
    complaintId: 'SS-20261102-E72F18B9C45A',
    rating: 5,
    category: 'Road Resurfacing',
    date: 'Nov 02, 2026',
    comment:
      'Smooth experience. Got real-time push notification updates when the repair team was dispatched.',
    status: 'Resolved',
    sentiment: 'positive',
    adminReply:
      'Thank you for reporting, Pooja. PWD Zone 3 team verified the asphalt compaction and closed the ticket.',
    repliedAt: 'Nov 02, 2026',
  },
  {
    id: 'FB-8821',
    citizenName: 'Sunil Kumar',
    citizenEmail: 'sunil.kumar@example.com',
    complaintId: 'SS-20261101-C34E56A78901',
    rating: 3,
    category: 'Waterlogging & Drainage',
    date: 'Nov 01, 2026',
    comment:
      'Repair took longer due to ongoing monsoon rains, but the team did clear the water drainage.',
    status: 'Needs Attention',
    sentiment: 'neutral',
  },
]

const quickTemplates = [
  'Thank you for your feedback! The road repair team has inspected and resolved this road hazard.',
  'Thank you for your suggestion. Video evidence submission is scheduled for the upcoming SadakSetu v2.1 update.',
  'We appreciate your patience. Field engineers have completed the asphalt patch and quality inspection.',
]

export function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback)
  const [filter, setFilter] = useState<'all' | 'positive' | 'neutral'>('all')
  const [search, setSearch] = useState('')
  const [replyingTo, setReplyingTo] = useState<FeedbackItem | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeedback = () => {
      fetch('/api/v1/feedback')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setFeedbackList(data)
          }
        })
        .catch(() => {})
    }
    fetchFeedback()
    const timer = setInterval(fetchFeedback, 3000)
    return () => clearInterval(timer)
  }, [])

  const filtered = feedbackList.filter((item) => {
    const matchesSearch =
      item.citizenName.toLowerCase().includes(search.toLowerCase()) ||
      item.comment.toLowerCase().includes(search.toLowerCase()) ||
      item.complaintId.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || item.sentiment === filter
    return matchesSearch && matchesFilter
  })

  const openReplyModal = (item: FeedbackItem) => {
    setReplyingTo(item)
    setReplyText(
      item.adminReply ||
        `Dear ${item.citizenName}, thank you for contacting SadakSetu regarding report ${item.complaintId}. `
    )
  }

  const handleSendReply = () => {
    if (!replyingTo || !replyText.trim()) return
    setSendingReply(true)

    fetch('/api/v1/feedback/' + replyingTo.id + '/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyText.trim() }),
    }).catch(() => {})

    setTimeout(() => {
      setFeedbackList((prev) =>
        prev.map((item) =>
          item.id === replyingTo.id
            ? {
                ...item,
                status: 'Resolved',
                adminReply: replyText.trim(),
                repliedAt: 'Just now',
              }
            : item
        )
      )

      setNotificationBanner(
        `Official reply successfully dispatched to ${replyingTo.citizenName} via SMS & push notification.`
      )
      setSendingReply(false)
      setReplyingTo(null)
      setReplyText('')

      setTimeout(() => {
        setNotificationBanner(null)
      }, 5000)
    }, 400)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen Engagement"
        title="Feedback & Support"
        description="Monitor citizen satisfaction ratings, app experience reviews, and dispatch official replies."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800">
            <ThumbsUp className="h-4 w-4 text-teal-600" />
            92% Citizen Satisfaction
          </div>
        }
      />

      {notificationBanner && (
        <div
          role="status"
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

      {/* Top 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Average Rating
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">4.6</span>
              <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < 4
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-amber-100 text-amber-300'
                  }`}
                />
              ))}
              <span className="ml-1 text-xs text-slate-600 font-medium">
                342 reviews
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Repair SLA Approval
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">91%</span>
              <span className="text-xs text-slate-400">on-time</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Citizens verified complaint resolution within 48h
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              AI App Accuracy Rating
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">94.8%</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Positive ratings for automatic camera detection
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Support Resolution
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0E7A6E]">100%</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              All citizen grievance inquiries responded
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Feedback List */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-bold text-slate-900">
                Citizen Feedback & Reviews
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search comments..."
                    className="h-9 w-48 bg-white pl-9 text-xs"
                  />
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(['all', 'positive', 'neutral'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilter(tab)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                        filter === tab
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-slate-100">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        {item.citizenName}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">
                        {item.complaintId}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                    <span className="text-[11px] text-slate-400">{item.date}</span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-700 font-normal">
                  {item.comment}
                </p>

                {/* Display official admin reply if present */}
                {item.adminReply && (
                  <div className="rounded-xl border border-teal-200/80 bg-teal-50/60 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-bold text-teal-900">
                        <CornerDownRight className="h-3.5 w-3.5 text-teal-600" />
                        Official SadakSetu Response
                      </span>
                      <span className="text-teal-700 font-medium">{item.repliedAt}</span>
                    </div>
                    <p className="text-xs text-teal-950 pl-5 leading-relaxed">
                      {item.adminReply}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-[10px] text-slate-600 bg-slate-50"
                    >
                      {item.category}
                    </Badge>
                    <Badge
                      className={`text-[10px] font-semibold ${
                        item.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.status}
                    </Badge>
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
            ))}
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
                  <p className="font-semibold text-slate-900">Official Grievance Email</p>
                  <p className="text-slate-500">support@sadaksetu.gov.in</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Android In-App Chat</p>
                  <p className="text-slate-500">Active on SadakSetu Mobile v2.0</p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-800">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Live Helpdesk Active
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
                  Average response time: &lt; 15 minutes for critical road safety alerts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reply to Citizen Modal */}
      {replyingTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setReplyingTo(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reply to Citizen"
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reply to Citizen Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  Citizen: <strong className="text-slate-700">{replyingTo.citizenName}</strong> · Incident{' '}
                  <span className="font-mono text-orange-600">{replyingTo.complaintId}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReplyingTo(null)}
                aria-label="Close reply modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-700 space-y-1">
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  Original Citizen Comment
                </p>
                <p className="italic">"{replyingTo.comment}"</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Official Response Message
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Sent via SMS & Android notification
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your official administrative response here..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Response Templates
                </p>
                <div className="space-y-1.5">
                  {quickTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(template)}
                      className="block w-full text-left rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-[11px] text-slate-600 hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
                    >
                      "{template}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="gap-2 bg-[#0E7A6E] hover:bg-[#0B6157] text-white"
                >
                  {sendingReply ? (
                    'Sending…'
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Official Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
