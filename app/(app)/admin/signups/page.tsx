'use client'

import { useCallback, useEffect, useState } from 'react'
import { pluralize } from '@/lib/format/pluralize'

interface SignupRow {
  email: string
  createdAt: string
  source: string | null
  experienceLevel: string | null
  firstWorkoutAt: string | null
  signupIntent: string | null
  welcomePath: string | null
  welcomeMsToChoice: number | null
}

const INTENT_LABELS: Record<string, string> = {
  new_to_apps: 'New to apps',
  from_another_app: 'From another app',
  returning_to_training: 'Returning to training',
  just_curious: 'Just curious',
}

const PATH_LABELS: Record<string, string> = {
  freestyle: 'Freestyle',
  program: 'Program',
  skipped: 'Skipped',
}

function formatMsToChoice(ms: number | null): string {
  if (ms === null || ms === undefined) return ''
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.round(s / 60)}m`
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}

export default function AdminSignupsPage() {
  const [rows, setRows] = useState<SignupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/signups')
      if (!res.ok) throw new Error('Failed to fetch signups')
      const json = await res.json()
      setRows(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading signups...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => fetchData()}
          aria-label="Retry loading signups"
          className="text-sm text-orange-500 hover:text-orange-400 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">
            Recent Signups
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last 30 days &middot; {pluralize(rows.length, 'signup')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchData()}
          aria-label="Refresh signups data"
          className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
        >
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No signups in the last 30 days.
        </div>
      ) : (
        <>
          <FunnelSummary rows={rows} />
          <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Signed up
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Source
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Experience
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Intent
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Welcome path
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  First workout?
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.email}
                  className="border-b border-border last:border-b-0 hover:bg-card/50 transition-colors"
                >
                  <td className="px-4 py-3 text-foreground font-medium">
                    {row.email}
                  </td>
                  <td
                    className="px-4 py-3 text-muted-foreground"
                    title={new Date(row.createdAt).toLocaleString()}
                  >
                    {relativeTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {row.source ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-card border border-border text-foreground">
                        {row.source}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.experienceLevel ? (
                      <span className="text-foreground">{row.experienceLevel}</span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.signupIntent ? (
                      <span className="text-foreground">
                        {INTENT_LABELS[row.signupIntent] ?? row.signupIntent}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.welcomePath ? (
                      <span className="text-foreground">
                        {PATH_LABELS[row.welcomePath] ?? row.welcomePath}
                        {row.welcomeMsToChoice !== null && (
                          <span className="text-muted-foreground ml-1">
                            ({formatMsToChoice(row.welcomeMsToChoice)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <FirstWorkoutCell firstWorkoutAt={row.firstWorkoutAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  )
}

function FunnelSummary({ rows }: { rows: SignupRow[] }) {
  const total = rows.length
  const experienced = rows.filter((r) => r.experienceLevel === 'experienced').length
  const freestyle = rows.filter((r) => r.welcomePath === 'freestyle').length
  const program = rows.filter((r) => r.welcomePath === 'program').length
  const skipped = rows.filter((r) => r.welcomePath === 'skipped').length
  const noPath = rows.filter((r) => r.welcomePath === null).length
  const firstWorkout = rows.filter((r) => r.firstWorkoutAt !== null).length

  const intentCounts = rows.reduce<Record<string, number>>((acc, r) => {
    if (r.signupIntent) acc[r.signupIntent] = (acc[r.signupIntent] || 0) + 1
    return acc
  }, {})
  const intentAnswered = Object.values(intentCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-4">
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Welcome funnel (experienced users only)
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Stat label="Experienced signups" value={experienced} />
          <Stat label="Freestyle" value={freestyle} of={experienced} />
          <Stat label="Program" value={program} of={experienced} />
          <Stat label="Skipped" value={skipped} of={experienced} />
          <Stat label="Never reached path" value={noPath} of={experienced} />
          <Stat label="Completed first workout" value={firstWorkout} of={total} />
        </div>
      </div>
      {intentAnswered > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Intent ({intentAnswered}/{experienced} answered)
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.entries(intentCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => (
                <Stat
                  key={key}
                  label={INTENT_LABELS[key] ?? key}
                  value={count}
                  of={intentAnswered}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, of }: { label: string; value: number; of?: number }) {
  const pct = of && of > 0 ? Math.round((value / of) * 100) : null
  return (
    <span className="text-foreground">
      <span className="font-semibold">{value}</span>
      {pct !== null && <span className="text-muted-foreground"> ({pct}%)</span>}
      <span className="text-muted-foreground ml-1">{label}</span>
    </span>
  )
}

function FirstWorkoutCell({ firstWorkoutAt }: { firstWorkoutAt: string | null }) {
  if (firstWorkoutAt === null || firstWorkoutAt === undefined) {
    return <span className="text-muted-foreground">Not yet</span>
  }

  return (
    <span
      className="text-green-500 font-medium"
      title={new Date(firstWorkoutAt).toLocaleString()}
    >
      Yes ({relativeTime(firstWorkoutAt)})
    </span>
  )
}
