'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import type { AnalyticsData } from '@/lib/admin/analytics-queries'

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const json = await res.json()
      setData(json.data)
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
        Loading analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="text-sm text-orange-500 hover:text-orange-400 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated{' '}
            {new Date(data.generatedAt).toLocaleTimeString()} (cached 5 min)
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Usage Section */}
      <Section title="Usage">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Total Users"
            value={data.usage.totalUsers}
          />
          <MetricCard
            label="New This Week"
            value={data.usage.newSignupsThisWeek}
          />
          <MetricCard
            label="Workouts This Week"
            value={data.usage.workoutsCompletedThisWeek}
          />
          <MetricCard
            label="Workouts Last Week"
            value={data.usage.workoutsCompletedLastWeek}
          />
          <MetricCard
            label="All-Time Workouts"
            value={data.usage.workoutsCompletedAllTime}
          />
          <MetricCard
            label="Avg/User/Week"
            value={data.usage.avgWorkoutsPerUserPerWeek}
          />
          <MetricCard
            label="Completion Rate"
            value={`${data.usage.completionRate}%`}
          />
        </div>
      </Section>

      {/* Retention Section */}
      <Section title="Retention">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard label="DAU" value={data.retention.dau} />
          <MetricCard label="WAU" value={data.retention.wau} />
          <MetricCard label="MAU" value={data.retention.mau} />
        </div>

        {/* Time to First Workout */}
        {data.retention.timeToFirstWorkout && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Time to First Workout (hours)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                label="p25"
                value={data.retention.timeToFirstWorkout.p25}
              />
              <MetricCard
                label="Median"
                value={data.retention.timeToFirstWorkout.median}
              />
              <MetricCard
                label="p75"
                value={data.retention.timeToFirstWorkout.p75}
              />
            </div>
          </div>
        )}

        {/* Retention Cohorts */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            7-Day Retention by Signup Cohort
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    Cohort
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    Signups
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    Active (7d)
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    Retention
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.retention.retentionCohorts.map((c) => (
                  <tr
                    key={c.weekLabel}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 px-3 text-foreground">
                      {c.weekLabel}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {c.signupCount}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {c.activeCount}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <RetentionBadge pct={c.retentionPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dropout Watchlist */}
        {data.retention.dropoutWatchlist.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Dropout Watchlist
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                      Email
                    </th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                      Days Inactive
                    </th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                      Total Workouts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.retention.dropoutWatchlist.map((d) => (
                    <tr
                      key={d.userId}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 px-3 text-foreground">
                        {d.email}
                      </td>
                      <td className="py-2 px-3 text-right text-orange-400">
                        {d.daysSinceLastWorkout}d
                      </td>
                      <td className="py-2 px-3 text-right text-foreground">
                        {d.totalWorkouts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* Onboarding Funnel */}
      <Section title="Onboarding Funnel">
        <div className="space-y-2">
          {data.funnel.map((step, i) => (
            <FunnelRow key={step.step} step={step} isFirst={i === 0} />
          ))}
        </div>
      </Section>

      {/* Feedback Volume */}
      <Section title="Feedback This Week">
        {data.feedbackVolume.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No feedback this week.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.feedbackVolume.map((f) => (
              <div
                key={f.category}
                className="bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <span className="text-sm text-foreground font-medium">
                  {f.category}
                </span>
                <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                  {f.count}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/admin/feedback"
          className="inline-block mt-3 text-sm text-orange-500 hover:text-orange-400 transition-colors"
        >
          View all feedback
        </Link>
      </Section>
    </div>
  )
}

// ---- Sub-components ----

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <h2 className="text-lg font-bold text-foreground uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="bg-background border border-border rounded-lg p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function RetentionBadge({ pct }: { pct: number }) {
  let color = 'text-red-400'
  if (pct >= 50) color = 'text-green-400'
  else if (pct >= 25) color = 'text-yellow-400'
  else if (pct >= 10) color = 'text-orange-400'

  return <span className={`font-semibold ${color}`}>{pct}%</span>
}

function FunnelRow({
  step,
  isFirst,
}: {
  step: { step: string; count: number; conversionPct: number }
  isFirst: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 sm:w-48 text-sm text-foreground truncate">
        {step.step}
      </div>
      <div className="flex-1 bg-background rounded-full h-6 overflow-hidden border border-border">
        <div
          className="h-full bg-orange-600/60 rounded-full flex items-center justify-end pr-2"
          style={{
            width: `${Math.max(step.conversionPct, 5)}%`,
          }}
        >
          <span className="text-xs font-semibold text-foreground">
            {step.count}
          </span>
        </div>
      </div>
      <div className="w-14 text-right text-sm">
        {isFirst ? (
          <span className="text-muted-foreground">--</span>
        ) : (
          <span className="text-orange-400 font-semibold">
            {step.conversionPct}%
          </span>
        )}
      </div>
    </div>
  )
}
