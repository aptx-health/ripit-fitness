'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import type {
  AnalyticsData,
  PostSessionMetrics,
  SignupAttributionMetrics,
} from '@/lib/admin/analytics-queries'
import { POST_SESSION_REFINEMENTS } from '@/types/feedback'

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (bust = false) => {
    try {
      setLoading(true)
      setError(null)
      const url = bust ? '/api/admin/analytics?bust=1' : '/api/admin/analytics'
      const res = await fetch(url)
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
          onClick={() => fetchData(true)}
          aria-label="Retry loading analytics"
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchData(true)}
            aria-label="Refresh analytics data"
            className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* CSV Export */}
      <CsvExportPanel />

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
            label="Avg Workouts / User / Week"
            value={data.usage.avgWorkoutsPerUserPerWeek}
            info="Average workouts each active user finished per week over the last 4 weeks. A casual lifter hits 2–3. Don't panic at low numbers early on — a handful of committed beta users is a win."
          />
          <MetricCard
            label="Completion Rate"
            value={`${data.usage.completionRate}%`}
            info="Of all the workouts people started, what percent did they finish (vs. abandoned mid-session)? Higher is better. If this dips, the session UX might be getting in the way."
          />
        </div>
      </Section>

      {/* Retention Section */}
      <Section title="Retention">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard
            label="Daily Active"
            value={data.retention.dau}
            info="DAU = Daily Active Users. How many different users finished a workout today. With a small beta, this will often be 0 or 1 — that's normal. Watch the trend over weeks, not day to day."
          />
          <MetricCard
            label="Weekly Active"
            value={data.retention.wau}
            info="WAU = Weekly Active Users. How many different users finished at least one workout in the last 7 days. This is the most useful number for a strength app — most people lift 2–4x/week, not daily."
          />
          <MetricCard
            label="Monthly Active"
            value={data.retention.mau}
            info="MAU = Monthly Active Users. How many different users finished at least one workout in the last 30 days. A good rough measure of 'people who are still around'."
          />
        </div>

        {/* Time to First Workout */}
        {data.retention.timeToFirstWorkout && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Time to First Workout (hours)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Based on users who signed up in the last 90 days.
              {' '}
              <span className={
                data.retention.timeToFirstWorkout.sampleSize < 5
                  ? 'text-yellow-400 font-semibold'
                  : ''
              }>
                n={data.retention.timeToFirstWorkout.sampleSize}
              </span>
            </p>
            {data.retention.timeToFirstWorkout.sampleSize < 5 ? (
              <p className="text-sm text-muted-foreground italic">
                Insufficient data (n&lt;5). Percentiles are unreliable at this
                sample size.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  label="Fast 25%"
                  value={data.retention.timeToFirstWorkout.p25}
                  info="p25 = '25th percentile.' The fastest quarter of users logged their first workout within this many hours of signing up. Think of it as 'the eager beavers got started this fast.'"
                />
                <MetricCard
                  label="Typical (Median)"
                  value={data.retention.timeToFirstWorkout.median}
                  info="The middle of the pack. Half of users logged their first workout faster than this, half slower. More useful than an average because it isn't thrown off by one person who signed up six months ago and finally logged today."
                />
                <MetricCard
                  label="Slow 25%"
                  value={data.retention.timeToFirstWorkout.p75}
                  info="p75 = '75th percentile.' Three quarters of users were faster than this. If this number is huge, a lot of people are signing up and then stalling before they ever lift — onboarding may need work."
                />
              </div>
            )}
          </div>
        )}

        {/* Retention Cohorts */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            7-Day Retention by Signup Cohort
          </h3>
          <p className="text-xs text-muted-foreground mb-3 max-w-2xl">
            A &ldquo;cohort&rdquo; is a group of users who signed up in the same week. This
            shows: of the people who signed up N weeks ago, what percent are
            still lifting today? Retention in fitness apps is notoriously hard
            — 10–20% is respectable, 30%+ is great.
          </p>
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
        <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground uppercase tracking-wider">
          <div className="w-40 sm:w-48">Step</div>
          <div className="flex-1">Users</div>
          <div className="w-14 text-right" title="Step-to-step conversion">
            Step %
          </div>
          <div className="w-16 text-right" title="End-to-end conversion (vs signups)">
            Overall
          </div>
        </div>
        <div className="space-y-2">
          {data.funnel.map((step, i) => (
            <FunnelRow key={step.step} step={step} isFirst={i === 0} />
          ))}
        </div>
      </Section>

      {/* Signup Attribution */}
      <Section title={`Signup Sources (last ${data.signupAttribution.windowDays}d)`}>
        <SignupAttributionPanel attribution={data.signupAttribution} />
      </Section>

      {/* Post-Session Feedback */}
      <Section title="Post-Session Feedback">
        <PostSessionPanel postSession={data.postSession} />
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
  info,
}: {
  label: string
  value: string | number
  /** Optional plain-language explanation shown when the card is clicked. */
  info?: string
}) {
  const [open, setOpen] = useState(false)
  const interactive = Boolean(info)

  const content = (
    <>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
        {interactive && (
          <span
            aria-hidden="true"
            className="text-xs text-muted-foreground border border-border rounded-full w-4 h-4 flex items-center justify-center leading-none"
          >
            ?
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {interactive && open && (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          {info}
        </p>
      )}
    </>
  )

  if (!interactive) {
    return (
      <div className="bg-background border border-border rounded-lg p-3">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      aria-label={`${label}: tap for explanation`}
      className="bg-background border border-border rounded-lg p-3 text-left hover:border-orange-500/50 transition-colors w-full"
    >
      {content}
    </button>
  )
}

function RetentionBadge({ pct }: { pct: number }) {
  let color = 'text-red-400'
  if (pct >= 50) color = 'text-green-400'
  else if (pct >= 25) color = 'text-yellow-400'
  else if (pct >= 10) color = 'text-orange-400'

  return <span className={`font-semibold ${color}`}>{pct}%</span>
}

function SignupAttributionPanel({
  attribution,
}: {
  attribution: SignupAttributionMetrics
}) {
  const totalAttributed = attribution.sourceBreakdown.reduce(
    (sum, s) => sum + s.count,
    0
  )

  return (
    <div className="space-y-6">
      {/* Source breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Source Breakdown
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Where signups came from. <code>qr</code> = scanned a gym code,{' '}
          <code>oauth</code> = social provider, <code>organic</code> = direct
          arrival, <code>unknown</code> = pre-#490 signups (no attribution
          recorded).
        </p>
        {attribution.sourceBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No signups in the window yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {attribution.sourceBreakdown.map((s) => (
              <div
                key={s.source}
                className="bg-background border border-border rounded-lg p-3"
              >
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {s.source}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {s.count}
                </div>
                {totalAttributed > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round((s.count / totalAttributed) * 100)}% of total
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-gym rollup */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Per-Gym Signups
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Signups attributed to a gym slug (via <code>/go/[slug]</code>) and how
          many of those users completed at least one workout.
        </p>
        {attribution.perGym.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No gym-attributed signups yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    Gym Slug
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    Signups
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    First Workout
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    Conversion
                  </th>
                </tr>
              </thead>
              <tbody>
                {attribution.perGym.map((g) => (
                  <tr
                    key={g.gymSlug}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 px-3 text-foreground">{g.gymSlug}</td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {g.signupCount}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {g.firstWorkoutCount}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <RetentionBadge pct={g.firstWorkoutPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR funnel */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          QR Landing Drop-off
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Of users who hit a <code>/go/[slug]</code> page, how many clicked
          signup, and how many actually completed it.
        </p>
        <div className="space-y-2">
          {attribution.qrFunnel.map((step, i) => (
            <div key={step.step} className="flex items-center gap-3">
              <div className="w-44 sm:w-52 text-sm text-foreground truncate">
                {step.step}
              </div>
              <div className="flex-1 bg-background rounded-full h-6 overflow-hidden border border-border">
                <div
                  className="h-full bg-orange-600/60 rounded-full flex items-center justify-end pr-2"
                  style={{
                    width: `${
                      attribution.qrFunnel[0].count > 0
                        ? Math.min(
                            100,
                            Math.max(
                              (step.count / attribution.qrFunnel[0].count) *
                                100,
                              5
                            )
                          )
                        : 5
                    }%`,
                  }}
                >
                  <span className="text-xs font-semibold text-foreground">
                    {step.count}
                  </span>
                </div>
              </div>
              <div className="w-14 text-right text-sm">
                {i === 0 ? (
                  <span className="text-muted-foreground">--</span>
                ) : (
                  <span className="text-orange-400 font-semibold">
                    {step.conversionPct}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FunnelRow({
  step,
  isFirst,
}: {
  step: {
    step: string
    count: number
    conversionPct: number
    overallPct: number
  }
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
            width: `${Math.min(100, Math.max(step.overallPct, 5))}%`,
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
      <div className="w-16 text-right text-sm">
        <span className="text-foreground font-semibold">{step.overallPct}%</span>
      </div>
    </div>
  )
}

function TrendArrow({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null
  const diff = Math.round((current - previous) * 10) / 10
  if (diff === 0) return <span className="text-muted-foreground text-xs ml-1">--</span>
  const isUp = diff > 0
  return (
    <span className={`text-xs ml-1 font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
      {isUp ? '\u2191' : '\u2193'} {Math.abs(diff)}
    </span>
  )
}

const CSV_TABLES = [
  { value: 'events', label: 'Events', description: 'Raw analytics events (page views, signups, etc.)' },
  { value: 'feedback', label: 'Feedback', description: 'User feedback and post-session ratings' },
  { value: 'completions', label: 'Completions', description: 'Workout completions and abandonments' },
] as const

const CSV_DAY_OPTIONS = [30, 60, 90, 180, 365] as const

function CsvExportPanel() {
  const [table, setTable] = useState<string>('events')
  const [days, setDays] = useState<number>(90)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/admin/analytics/export?table=${table}&days=${days}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
        ?? `ripit-${table}-${days}d.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // Let the user know via a simple alert — not worth a toast system for admin-only
      alert('Failed to download CSV. Check the console for details.')
    } finally {
      setDownloading(false)
    }
  }

  const selected = CSV_TABLES.find((t) => t.value === table)

  return (
    <Section title="Export Raw Data">
      <p className="text-sm text-muted-foreground mb-4">
        Download raw data as CSV for external analysis. Only includes end-user data (excludes staff accounts).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="export-table" className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Table
          </label>
          <select
            id="export-table"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            {CSV_TABLES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="export-days" className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Period
          </label>
          <select
            id="export-days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            {CSV_DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
        >
          {downloading ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>
      {selected && (
        <p className="text-xs text-muted-foreground mt-2">{selected.description}</p>
      )}
    </Section>
  )
}

function PostSessionPanel({ postSession }: { postSession: PostSessionMetrics }) {
  const refinementLabels: Record<string, string> = {}
  for (const r of POST_SESSION_REFINEMENTS) {
    refinementLabels[r.value] = r.label
  }

  const totalDistribution = Object.values(postSession.ratingDistribution).reduce(
    (sum: number, c: number) => sum + c,
    0
  )

  return (
    <div className="space-y-6">
      {/* Average ratings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Avg Rating (This Week)"
          value={
            postSession.avgRatingThisWeek !== null
              ? `${postSession.avgRatingThisWeek}/5`
              : '--'
          }
          info={`Based on ${postSession.sampleSizeThisWeek} ratings this week. Compare to last week to spot trends.`}
        />
        <div className="bg-background border border-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            vs. Last Week
          </div>
          <div className="text-2xl font-bold text-foreground">
            {postSession.avgRatingLastWeek !== null
              ? `${postSession.avgRatingLastWeek}/5`
              : '--'}
            <TrendArrow
              current={postSession.avgRatingThisWeek}
              previous={postSession.avgRatingLastWeek}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            n={postSession.sampleSizeLastWeek}
          </p>
        </div>
        <MetricCard
          label="5-Star Rate"
          value={`${postSession.fiveStarPct}%`}
          info="Percentage of all post-session ratings that are 5/5. A high number means users are consistently happy after workouts."
        />
        <MetricCard
          label="Total Rated"
          value={postSession.totalRated}
          info="Total number of post-session feedback submissions with a rating, all time."
        />
      </div>

      {/* Rating Distribution */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Rating Distribution
        </h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = postSession.ratingDistribution[rating] || 0
            const pct = totalDistribution > 0 ? (count / totalDistribution) * 100 : 0
            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="w-8 text-sm text-foreground font-semibold text-right">
                  {rating}
                </div>
                <div className="flex-1 bg-background rounded-full h-5 overflow-hidden border border-border">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-2 ${
                      rating >= 4
                        ? 'bg-green-600/60'
                        : rating === 3
                          ? 'bg-yellow-600/60'
                          : 'bg-red-600/60'
                    }`}
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  >
                    <span className="text-xs font-semibold text-foreground">
                      {count}
                    </span>
                  </div>
                </div>
                <div className="w-12 text-right text-xs text-muted-foreground">
                  {Math.round(pct)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Refinements */}
      {postSession.topRefinements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Top Refinement Categories
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    Category
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {postSession.topRefinements.map((r) => (
                  <tr key={r.refinement} className="border-b border-border/50">
                    <td className="py-2 px-3 text-foreground">
                      {refinementLabels[r.refinement] || r.refinement.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground font-semibold">
                      {r.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link
        href="/admin/feedback?tab=post_session"
        className="inline-block text-sm text-orange-500 hover:text-orange-400 transition-colors"
      >
        View all post-session feedback
      </Link>
    </div>
  )
}
