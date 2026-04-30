'use client'

import { useCallback, useEffect, useState } from 'react'

interface SignupRow {
  email: string
  createdAt: string
  source: string | null
  experienceLevel: string | null
  firstWorkoutAt: string | null
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
            Last 30 days &middot; {rows.length} signup{rows.length !== 1 ? 's' : ''}
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
                    <FirstWorkoutCell firstWorkoutAt={row.firstWorkoutAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
