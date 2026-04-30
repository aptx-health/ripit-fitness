'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MESSAGE_ICONS } from '@/lib/icons/message-icons'

interface Message {
  id: string
  name: string | null
  content: string
  placement: string
  userType: string
  icon: string
  lifecycle: string
  minWorkouts: number | null
  maxWorkouts: number | null
  programTargeting: string | null
  priority: number
  active: boolean
  version: number
  createdAt: string
  updatedAt: string
}

interface CommunityProgram {
  id: string
  name: string
}

const PLACEMENT_TABS = ['all', 'training_tab', 'exercise_logger'] as const

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlacement, setActivePlacement] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [programFilter, setProgramFilter] = useState<string>('all')
  const [programs, setPrograms] = useState<CommunityProgram[]>([])

  // Fetch community programs for filter
  useEffect(() => {
    fetch('/api/admin/community-programs')
      .then((res) => res.json())
      .then((json) => setPrograms(json.data || []))
      .catch(() => {})
  }, [])

  const filterKey = `${activePlacement}-${showInactive}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey)
    setLoading(true)
  }

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (activePlacement !== 'all') params.set('placement', activePlacement)
    if (!showInactive) params.set('active', 'true')

    fetch(`/api/admin/messages?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setMessages(json.data || [])
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [activePlacement, showInactive])

  // Client-side program filter
  const filteredMessages = programFilter === 'all'
    ? messages
    : programFilter === 'none'
      ? messages.filter((m) => !m.programTargeting)
      : messages.filter((m) => {
          if (!m.programTargeting) return false
          try {
            const ids: string[] = JSON.parse(m.programTargeting)
            return ids.includes(programFilter)
          } catch { return false }
        })

  // Sort by priority descending
  const sortedMessages = [...filteredMessages].sort((a, b) => b.priority - a.priority)

  const placementLabel = (p: string) => {
    switch (p) {
      case 'training_tab': return 'Training'
      case 'exercise_logger': return 'Logger'
      default: return p
    }
  }

  const lifecycleLabel = (l: string) => {
    switch (l) {
      case 'show_once': return 'Once'
      case 'show_until_dismissed': return 'Dismissable'
      case 'show_always': return 'Always'
      default: return l
    }
  }

  const audienceLabel = (t: string) => {
    switch (t) {
      case 'beginner': return 'Follow-Along'
      case 'experienced': return 'Full Logging'
      default: return 'All'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Messages</h1>
        <Link
          href="/admin/messages/new"
          className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-hover font-semibold uppercase tracking-wider text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          New Message
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex gap-1 overflow-x-auto">
            {PLACEMENT_TABS.map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActivePlacement(tab)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-2 transition-colors ${
                  activePlacement === tab
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
                }`}
              >
                {tab === 'all' ? 'All' : placementLabel(tab)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-primary"
            />
            Show inactive
          </label>
        </div>

        {/* Program filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Program
          </label>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="px-2 py-1 bg-input border-2 border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Programs</option>
            <option value="none">Program-Agnostic Only</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort indicator */}
      <p className="text-xs text-muted-foreground mb-3">
        Sorted by priority (highest first) &middot; {sortedMessages.length} message{sortedMessages.length !== 1 ? 's' : ''}
      </p>

      {/* Message list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : sortedMessages.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No messages found. Create your first message to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMessages.map((msg) => {
            const Icon = MESSAGE_ICONS[msg.icon] ?? MESSAGE_ICONS.Lightbulb
            return (
              <Link
                key={msg.id}
                href={`/admin/messages/${msg.id}/edit`}
                className={`block p-4 bg-card border-2 transition-colors ${
                  msg.active ? 'border-border hover:border-primary' : 'border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Priority badge */}
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center border-2 border-border bg-muted/50 text-foreground font-bold text-sm">
                    {msg.priority}
                  </div>

                  <Icon size={18} className="shrink-0 mt-2.5 text-muted-foreground" />

                  <div className="min-w-0 flex-1">
                    {/* Name + content */}
                    {msg.name && (
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">
                        {msg.name}
                      </p>
                    )}
                    <p className="text-sm text-foreground line-clamp-2">{msg.content}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 border border-border text-muted-foreground font-semibold uppercase">
                        {placementLabel(msg.placement)}
                      </span>
                      <span className="text-xs px-2 py-0.5 border border-border text-muted-foreground font-semibold uppercase">
                        {audienceLabel(msg.userType)}
                      </span>
                      <span className="text-xs px-2 py-0.5 border border-border text-muted-foreground font-semibold uppercase">
                        {lifecycleLabel(msg.lifecycle)}
                      </span>
                      {(msg.minWorkouts !== null || msg.maxWorkouts !== null) && (
                        <span className="text-xs text-muted-foreground">
                          Workouts: {msg.minWorkouts ?? '0'}-{msg.maxWorkouts ?? 'any'}
                        </span>
                      )}
                      {!msg.active && (
                        <span className="text-xs px-2 py-0.5 border border-red-700 text-red-400 font-semibold uppercase">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <div>v{msg.version}</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
