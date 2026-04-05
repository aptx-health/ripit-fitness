'use client'

import { Check, CheckCheck, ExternalLink, MessageSquarePlus, Tag } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { FeedbackStatus } from '@/types/feedback'

interface FeedbackItem {
  id: string
  userId: string
  category: string
  message: string
  pageUrl: string
  userAgent: string | null
  status: string
  adminNote: string | null
  createdAt: string
}

const STATUS_TABS = ['all', 'new', 'reviewed', 'resolved'] as const

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'bug',
  feature: 'enhancement',
  confusion: 'ux',
  general: 'feedback',
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<string>('new')
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
      setActiveStatus('all')
      setExpandedId(expandId)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams()
    if (activeStatus !== 'all') params.set('status', activeStatus)
    params.set('limit', '100')

    fetch(`/api/feedback?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setFeedback(json.feedback || [])
          setTotal(json.total || 0)
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
  }, [activeStatus])

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
        body: JSON.stringify({ feedbackId: item.id, labels }),
      })

      if (res.ok) {
        const { issueUrl } = await res.json()
        // Update local state with the new admin note and status
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: f.status === 'new' ? 'reviewed' : f.status,
                  adminNote: [f.adminNote, `GitHub Issue: ${issueUrl}`].filter(Boolean).join('\n'),
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
          <MessageSquarePlus size={24} className="text-primary" />
          Feedback
        </h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveStatus(tab)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-2 transition-colors ${
              activeStatus === tab
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : feedback.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No {activeStatus === 'all' ? '' : activeStatus} feedback yet.
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
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {item.message.length > 150
                        ? `${item.message.substring(0, 150)}...`
                        : item.message}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${categoryColor(item.category)}`}>
                        {item.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 border font-semibold uppercase ${statusColor(item.status)}`}>
                        {item.status}
                      </span>
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
                  {/* Full message */}
                  <div>
                    <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Full Message
                    </span>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted p-3 border border-border">
                      {item.message}
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
                  {!item.adminNote?.includes('GitHub Issue:') && (
                    <div>
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
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {!item.adminNote?.includes('GitHub Issue:') && (
                      <button
                        type="button"
                        onClick={() => createIssue(item)}
                        disabled={creatingIssue === item.id}
                        className="px-3 py-2 bg-zinc-700 text-white border-2 border-zinc-700 hover:bg-zinc-600 font-semibold uppercase tracking-wider text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <ExternalLink size={14} />
                        {creatingIssue === item.id ? 'Creating...' : 'Create Issue'}
                      </button>
                    )}
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
