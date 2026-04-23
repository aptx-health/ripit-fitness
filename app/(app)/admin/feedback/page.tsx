'use client'

import { ArrowDown, ArrowUp, Check, CheckCheck, ExternalLink, Github, MessageSquarePlus, Tag } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { FeedbackStatus } from '@/types/feedback'
import { POST_SESSION_REFINEMENTS } from '@/types/feedback'

interface FeedbackItem {
  id: string
  userId: string
  category: string
  message: string
  pageUrl: string
  userAgent: string | null
  properties: string | null
  status: string
  adminNote: string | null
  githubIssueUrl: string | null
  createdAt: string
  rating: number | null
  refinements: string[]
}

interface PostSessionStats {
  avgRatingOverall: number | null
  avgRatingThisWeek: number | null
  sampleSizeOverall: number
  sampleSizeThisWeek: number
  ratingDistribution: Record<number, number>
  fiveStarPct: number
  refinementCounts: Array<{ refinement: string; count: number }>
}

const STATUS_TABS = ['unresolved', 'all', 'new', 'reviewed', 'resolved'] as const
type TabValue = typeof STATUS_TABS[number] | 'post_session'

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'bug',
  feature: 'enhancement',
  confusion: 'ux',
  general: 'feedback',
  post_session: 'post-session',
}

const REFINEMENT_LABELS: Record<string, string> = {}
for (const r of POST_SESSION_REFINEMENTS) {
  REFINEMENT_LABELS[r.value] = r.label
}

type SortOption = 'newest' | 'rating_asc' | 'rating_desc'

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>('unresolved')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [postSessionStats, setPostSessionStats] = useState<PostSessionStats | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [creatingIssue, setCreatingIssue] = useState<string | null>(null)
  const [issueLabels, setIssueLabels] = useState('')
  const searchParams = useSearchParams()

  // Auto-expand feedback item from URL (e.g., Discord deep link)
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId) {
      setActiveTab('all')
      setExpandedId(expandId)
    }
    const tab = searchParams.get('tab')
    if (tab === 'post_session') {
      setActiveTab('post_session')
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams()
    const isPostSession = activeTab === 'post_session'

    if (isPostSession) {
      params.set('category', 'post_session')
    } else if (activeTab !== 'all') {
      params.set('status', activeTab)
    }

    // Apply sort for post-session tab
    if (isPostSession && sortBy !== 'newest') {
      params.set('sort', sortBy)
    }

    params.set('limit', '100')

    fetch(`/api/feedback?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setFeedback(json.feedback || [])
          setTotal(json.total || 0)
          setPostSessionStats(json.postSessionStats || null)
          setLoading(false)

          // If auto-expanding from URL, set the admin note for the expanded item
          const expandId = searchParams.get('expand')
          if (expandId) {
            const match = (json.feedback || []).find((f: FeedbackItem) => f.id === expandId)
            if (match) setAdminNote(match.adminNote || '')
          }
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [activeTab, sortBy, searchParams])

  const updateFeedback = async (id: string, status: FeedbackStatus, note?: string) => {
    setUpdating(id)
    try {
      const body: Record<string, string> = { status }
      if (note !== undefined) body.adminNote = note

      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const { feedback: updated } = await res.json()
        setFeedback((prev) =>
          prev.map((f) => (f.id === id ? { ...f, ...updated } : f))
        )
        setExpandedId(null)
        setAdminNote('')
      }
    } finally {
      setUpdating(null)
    }
  }

  const createIssue = async (item: FeedbackItem) => {
    setCreatingIssue(item.id)
    try {
      const labels = issueLabels
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)

      const res = await fetch('/api/admin/feedback/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: item.id, labels, adminNote }),
      })

      if (res.ok) {
        const { issueUrl } = await res.json()
        // Update local state with the new admin note, status, and issue URL
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: f.status === 'new' ? 'reviewed' : f.status,
                  adminNote: [f.adminNote, `GitHub Issue: ${issueUrl}`].filter(Boolean).join('\n'),
                  githubIssueUrl: issueUrl,
                }
              : f
          )
        )
        setAdminNote((prev) =>
          [prev, `GitHub Issue: ${issueUrl}`].filter(Boolean).join('\n')
        )
        window.open(issueUrl, '_blank')
      }
    } finally {
      setCreatingIssue(null)
    }
  }

  const handleExpand = (item: FeedbackItem) => {
    if (expandedId === item.id) {
      setExpandedId(null)
      setAdminNote('')
      setIssueLabels('')
    } else {
      setExpandedId(item.id)
      setAdminNote(item.adminNote || '')
      setIssueLabels('')
    }
  }

  const categoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'text-red-800 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-900/30 dark:border-red-700'
      case 'feature': return 'text-blue-800 bg-blue-100 border-blue-300 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-700'
      case 'confusion': return 'text-yellow-800 bg-yellow-100 border-yellow-300 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700'
      case 'post_session': return 'text-purple-800 bg-purple-100 border-purple-300 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-700'
      default: return 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-600'
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-yellow-800 bg-yellow-100 border-yellow-300 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700'
      case 'reviewed': return 'text-blue-800 bg-blue-100 border-blue-300 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-700'
      case 'resolved': return 'text-green-800 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700'
      default: return 'text-zinc-700 bg-zinc-100 border-zinc-300 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-600'
    }
  }

  const isPostSessionTab = activeTab === 'post_session'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
          <MessageSquarePlus size={24} className="text-primary" />
          Feedback
        </h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Tabs: status tabs + post-session tab */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => { setActiveTab(tab); setSortBy('newest') }}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-2 transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
        <span className="w-px bg-border mx-1" />
        <button
          type="button"
          onClick={() => { setActiveTab('post_session'); setSortBy('newest') }}
          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-2 transition-colors ${
            isPostSessionTab
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
          }`}
        >
          Post-Session
        </button>
      </div>

      {/* Post-session stats header */}
      {isPostSessionTab && postSessionStats && (
        <div className="mb-6 bg-card border-2 border-border p-4 space-y-4">
          {/* Average ratings row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background border border-border p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Avg Rating (Overall)
              </div>
              <div className="text-2xl font-bold text-foreground">
                {postSessionStats.avgRatingOverall !== null
                  ? `${postSessionStats.avgRatingOverall}/5`
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                n={postSessionStats.sampleSizeOverall}
              </p>
            </div>
            <div className="bg-background border border-border p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Avg Rating (This Week)
              </div>
              <div className="text-2xl font-bold text-foreground">
                {postSessionStats.avgRatingThisWeek !== null
                  ? `${postSessionStats.avgRatingThisWeek}/5`
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                n={postSessionStats.sampleSizeThisWeek}
              </p>
            </div>
            <div className="bg-background border border-border p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                5-Star Rate
              </div>
              <div className="text-2xl font-bold text-foreground">
                {postSessionStats.fiveStarPct}%
              </div>
            </div>
            <div className="bg-background border border-border p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Rating Distribution
              </div>
              <div className="flex items-end gap-1 h-8">
                {[1, 2, 3, 4, 5].map((r) => {
                  const count = postSessionStats.ratingDistribution[r] || 0
                  const maxCount = Math.max(...Object.values(postSessionStats.ratingDistribution), 1)
                  const height = Math.max((count / maxCount) * 100, 5)
                  return (
                    <div key={r} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className={`w-full ${r >= 4 ? 'bg-green-500' : r === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ height: `${height}%` }}
                        title={`${r}: ${count}`}
                      />
                      <span className="text-[10px] text-muted-foreground">{r}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Refinement categories breakdown */}
          {postSessionStats.refinementCounts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Issue Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {postSessionStats.refinementCounts.map((r) => (
                  <span
                    key={r.refinement}
                    className="text-xs px-2 py-1 border font-semibold bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700"
                  >
                    {REFINEMENT_LABELS[r.refinement] || r.refinement.replace(/_/g, ' ')} ({r.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Sort:</span>
            <button
              type="button"
              onClick={() => setSortBy('newest')}
              className={`px-2 py-1 text-xs font-semibold border transition-colors ${
                sortBy === 'newest'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setSortBy('rating_asc')}
              className={`px-2 py-1 text-xs font-semibold border transition-colors flex items-center gap-1 ${
                sortBy === 'rating_asc'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              <ArrowUp size={12} /> Rating (Low First)
            </button>
            <button
              type="button"
              onClick={() => setSortBy('rating_desc')}
              className={`px-2 py-1 text-xs font-semibold border transition-colors flex items-center gap-1 ${
                sortBy === 'rating_desc'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
              }`}
            >
              <ArrowDown size={12} /> Rating (High First)
            </button>
          </div>
        </div>
      )}

      {/* Feedback list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : feedback.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No {isPostSessionTab ? 'post-session' : activeTab === 'all' ? '' : activeTab} feedback yet.
        </div>
      ) : (
        <div className="space-y-2">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="bg-card border-2 border-border hover:border-primary/50 transition-colors"
            >
              {/* Summary row */}
              <button
                type="button"
                onClick={() => handleExpand(item)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {item.rating !== null && (
                      <span className="text-sm font-semibold text-foreground mr-2">
                        Rating: {item.rating}/5
                      </span>
                    )}
                    {item.refinements?.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        — {item.refinements.map((r) => REFINEMENT_LABELS[r] || r.replace(/_/g, ' ')).join(', ')}
                      </span>
                    )}
                    {item.message ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-1">
                        {item.message.length > 150
                          ? `${item.message.substring(0, 150)}...`
                          : item.message}
                      </p>
                    ) : !item.rating && (
                      <p className="text-sm text-muted-foreground italic">No message</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${categoryColor(item.category)}`}>
                        {item.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${statusColor(item.status)}`}>
                        {item.status}
                      </span>
                      {item.githubIssueUrl && (
                        <a
                          href={item.githubIssueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs px-2 py-0.5 border font-semibold uppercase text-purple-800 bg-purple-100 border-purple-300 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-700 flex items-center gap-1 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                          aria-label="View GitHub issue"
                        >
                          <Github size={10} />
                          issue
                        </a>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {item.pageUrl}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {new Date(item.createdAt).toLocaleDateString()}
                    <br />
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === item.id && (
                <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                  {/* Question prompt (post_session) */}
                  {item.category === 'post_session' && item.properties && (() => {
                    try {
                      const props = JSON.parse(item.properties)
                      return props.question ? (
                        <div>
                          <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Question Asked
                          </span>
                          <p className="text-sm text-foreground italic bg-muted p-3 border border-border">
                            {props.question}
                          </p>
                        </div>
                      ) : null
                    } catch { return null }
                  })()}

                  {/* Rating & refinements (post-session) */}
                  {item.rating !== null && (
                    <div>
                      <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Rating
                      </span>
                      <p className="text-sm text-foreground bg-muted p-3 border border-border">
                        {item.rating}/5
                      </p>
                    </div>
                  )}
                  {item.refinements?.length > 0 && (
                    <div>
                      <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Issues Selected
                      </span>
                      <div className="flex flex-wrap gap-1.5 bg-muted p-3 border border-border">
                        {item.refinements.map((r) => (
                          <span key={r} className="text-xs px-2 py-1 border font-semibold uppercase bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700">
                            {REFINEMENT_LABELS[r] || r.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full message */}
                  <div>
                    <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Full Message
                    </span>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted p-3 border border-border">
                      {item.message || '(no message)'}
                    </p>
                  </div>

                  {/* User agent */}
                  {item.userAgent && (
                    <div>
                      <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Device
                      </span>
                      <p className="text-xs text-muted-foreground break-all">
                        {item.userAgent}
                      </p>
                    </div>
                  )}

                  {/* Admin note */}
                  <div>
                    <label
                      htmlFor={`note-${item.id}`}
                      className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1"
                    >
                      Admin Note
                    </label>
                    <textarea
                      id={`note-${item.id}`}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Add a note..."
                      className="w-full px-3 py-2 bg-input border-2 border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Labels for GitHub issue */}
                  <div>
                    {item.githubIssueUrl && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 px-3 py-2 mb-2 flex items-center gap-1.5">
                        <Github size={12} />
                        A GitHub issue already exists for this feedback. Creating another will not replace the existing one.
                      </p>
                    )}
                    <label
                      htmlFor={`labels-${item.id}`}
                      className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"
                    >
                      <Tag size={12} />
                      Issue Labels
                    </label>
                    <input
                      id={`labels-${item.id}`}
                      type="text"
                      value={issueLabels}
                      onChange={(e) => setIssueLabels(e.target.value)}
                      placeholder="e.g. priority, agent-task (comma-separated)"
                      className="w-full px-3 py-2 bg-input border-2 border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Category label ({CATEGORY_LABELS[item.category] || 'feedback'}) and user-feedback are added automatically
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => createIssue(item)}
                      disabled={creatingIssue === item.id}
                      className="px-3 py-2 bg-zinc-700 text-white border-2 border-zinc-700 hover:bg-zinc-600 font-semibold uppercase tracking-wider text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <ExternalLink size={14} />
                      {creatingIssue === item.id ? 'Creating...' : item.githubIssueUrl ? 'Create Another Issue' : 'Create Issue'}
                    </button>
                    {item.status !== 'reviewed' && (
                      <button
                        type="button"
                        onClick={() => updateFeedback(item.id, 'reviewed', adminNote)}
                        disabled={updating === item.id}
                        className="px-3 py-2 bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700 font-semibold uppercase tracking-wider text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Check size={14} />
                        {updating === item.id ? '...' : 'Mark Reviewed'}
                      </button>
                    )}
                    {item.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => updateFeedback(item.id, 'resolved', adminNote)}
                        disabled={updating === item.id}
                        className="px-3 py-2 bg-green-600 text-white border-2 border-green-600 hover:bg-green-700 font-semibold uppercase tracking-wider text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <CheckCheck size={14} />
                        {updating === item.id ? '...' : 'Resolve'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
