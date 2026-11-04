'use client'

import { BarChart3, ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import PaperTabTitle from '@/components/ui/PaperTabTitle'
import { clientLogger } from '@/lib/client-logger'
import { pluralize } from '@/lib/format/pluralize'
import { addWeeks, isMonday, percentChange, type WeeklyReport, weekStartFor } from '@/lib/insights/progress'
import type { TrendNote } from '@/lib/insights/progress-records'
import { browserTimeZone, DASH, formatMinutes, formatRpe, signed, weekOfLabel } from './format'
import RecordsLifts from './RecordsLifts'
import WeeklySetsChart from './WeeklySetsChart'

/**
 * The Progress tab: one week at a time. A week navigator, the report card
 * (this week against the 8 weeks before it), the Records / Lifts folder with
 * the pinned lifts, and the last 8 weeks of working sets with a trend note.
 * Weeks are local Mondays:
 * the browser's zone goes with every request, and the server picks the current
 * week when no start is sent. `?week=YYYY-MM-DD` (a Monday, not after this
 * week) opens on that week, and the shown week is written back to the URL
 * (bare for this week), so the lift page's Back link and browser Back return to it.
 */

const NAV_BUTTON =
  'flex h-12 w-12 shrink-0 items-center justify-center border-2 bg-card doom-focus-ring disabled:cursor-not-allowed disabled:border-border/50 disabled:text-muted-foreground border-border text-foreground hover:bg-muted'

/** The `?week=` to open on: a real Monday no later than this week, else none. */
function openingWeek(week: string | null): string | undefined {
  if (!week || !isMonday(week)) return undefined
  return week <= weekStartFor(new Date(), browserTimeZone()) ? week : undefined
}

export default function ProgressView() {
  // Null outside the App Router (e.g. a bare render): no week, the current one shows.
  const week = openingWeek(useSearchParams()?.get('week') ?? null)
  // Only the first request uses ?week=; writing the URL below must not reload.
  const opening = useRef(week)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Only the latest request may land, so quick taps can't show an older week.
  const latest = useRef(0)

  const load = useCallback(async (start?: string) => {
    const id = ++latest.current
    setLoading(true)
    setError(null)
    const query = new URLSearchParams({ ...(start ? { start } : {}), tz: browserTimeZone() })
    try {
      const res = await fetch(`/api/progress/week?${query}`)
      const data = await res.json()
      if (!res.ok || !data.report) throw new Error(data.error || 'Failed to load the week')
      if (id === latest.current) setReport(data.report)
    } catch (err) {
      clientLogger.error('Error loading the weekly report:', err)
      if (id === latest.current) setError("Couldn't load this week. Try again.")
    } finally {
      if (id === latest.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(opening.current)
  }, [load])

  // The shown week goes in the URL without a navigation (Next keeps its router
  // in step with history.replaceState), so Back from a lift lands on it.
  const shownWeek = report ? (report.isCurrentWeek ? null : report.weekStart) : undefined
  useEffect(() => {
    if (shownWeek === undefined) return
    const url = shownWeek ? `${window.location.pathname}?week=${shownWeek}` : window.location.pathname
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', url)
  }, [shownWeek])

  /** Saves the whole pin list, then reloads the week to show it; false when the save failed. */
  const savePins = useCallback(
    async (ids: string[], weekStart: string) => {
      try {
        const res = await fetch('/api/progress/pins', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseDefinitionIds: ids }),
        })
        if (!res.ok) throw new Error(`Saving pins failed (${res.status})`)
      } catch (err) {
        clientLogger.error('Error saving pinned lifts:', err)
        return false
      }
      await load(weekStart)
      return true
    },
    [load],
  )

  if (!report) {
    return error ? (
      <div role="alert" className="folder-box border-2 border-border bg-card px-4 py-5 text-sm text-error">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => load(opening.current)}
          className="mt-3 inline-flex min-h-12 items-center border-2 border-border bg-card px-4 font-bold uppercase tracking-wider text-foreground hover:bg-muted doom-focus-ring"
        >
          Try again
        </button>
      </div>
    ) : (
      <p className="py-5 text-sm text-muted-foreground">Loading…</p>
    )
  }

  return (
    <div className="space-y-5" aria-busy={loading}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous week"
          disabled={loading}
          onClick={() => load(addWeeks(report.weekStart, -1))}
          className={NAV_BUTTON}
        >
          <ChevronLeft size={22} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">
            Week of {weekOfLabel(report.weekStart)}
          </h2>
          {report.programWeek && (
            <p className="text-sm text-muted-foreground">
              Week {report.programWeek.weekNumber} of {report.programWeek.programName}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Next week"
          disabled={loading || report.isCurrentWeek}
          onClick={() => load(addWeeks(report.weekStart, 1))}
          className={NAV_BUTTON}
        >
          <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      <ReportCard report={report} />

      {/* A report without the S2 or S3 fields (an older payload) shows an empty folder, and no pins. */}
      <RecordsLifts
        records={report.records ?? []}
        lifts={report.lifts ?? []}
        pinned={report.pinned ?? []}
        weightUnit={report.weightUnit ?? 'lbs'}
        weekStart={report.weekStart}
        onSavePins={(ids) => savePins(ids, report.weekStart)}
      />

      <section aria-labelledby="progress-last-8">
        <div className="flex items-end">
          <PaperTabTitle tone="mine" icon={<BarChart3 size={16} />} asChild>
            <h2 id="progress-last-8">Last 8 weeks</h2>
          </PaperTabTitle>
        </div>
        <div className="folder-box border-2 border-secondary bg-card p-3">
          <WeeklySetsChart weeks={report.weeks} selected={report.weekStart} isCurrentWeek={report.isCurrentWeek} />
          {report.trend && (
            <p className="-mx-3 -mb-3 mt-2 border-t border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              {trendText(report.trend)}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

/** The note's sentences: rising effort (3+ weeks), then the last light week. */
function trendText(trend: TrendNote): string {
  const effort =
    trend.effortRisingWeeks > 0
      ? `Effort has risen ${trend.effortRisingWeeks} weeks running (${formatRpe(trend.effortFrom)} → ${formatRpe(trend.effortTo)}). `
      : ''
  const ago = trend.lastLightWeeksAgo
  const light =
    ago == null
      ? // Fewer than 8 weeks searched: the first workout is inside the chart.
        (trend.lightWeeksSearched ?? 8) < 8
        ? 'No light week since you started.'
        : 'No light week in the last 8 weeks.'
      : ago === 0
        ? 'This was a light week.'
        : `Your last light week was ${pluralize(ago, 'week')} ago.`
  return effort + light
}

// --- the report card --------------------------------------------------------------

const CHANGE_UP = 'font-bold text-success-text'
const CHANGE_FLAT = 'font-bold text-foreground'

function ReportCard({ report }: { report: WeeklyReport }) {
  const { current, normal, target, streak } = report
  // No week since the first workout to compare with: every normal reads "–".
  const hasNormal = report.normalWeeks !== 0
  const setsChange = hasNormal ? percentChange(current.workingSets, normal.workingSets) : null
  const timeChange = hasNormal && normal.durationSeconds > 0 ? (current.durationSeconds - normal.durationSeconds) / 60 : null
  const effort = current.effort
  const effortChange = hasNormal && effort && normal.avgRpe != null ? effort.avgRpe - normal.avgRpe : null

  return (
    <section aria-labelledby="progress-report-card">
      <div className="flex items-end">
        <PaperTabTitle tone="next" icon={<ClipboardCheck size={16} />} asChild>
          <h2 id="progress-report-card">Report card</h2>
        </PaperTabTitle>
      </div>
      <div className="folder-box border-2 border-primary bg-card divide-y divide-border">
        <Row
          name="workouts"
          label="Workouts"
          value={
            <>
              {current.workouts} <span className="text-base font-semibold text-muted-foreground">of {target}</span>
            </>
          }
          aside={
            <>
              {current.workouts >= target && (
                <span className="inline-block bg-primary-muted px-1.5 text-xs font-bold uppercase leading-5 tracking-wider text-success-text">
                  Done
                </span>
              )}
              <Muted>{hasNormal && normal.workouts > 0 ? `normal ${normal.workouts.toFixed(1)}` : DASH}</Muted>
            </>
          }
        />
        <Row
          name="sets"
          label="Working sets"
          value={current.workingSets}
          aside={
            setsChange == null ? (
              <Muted>{DASH}</Muted>
            ) : (
              <>
                <div className={setsChange > 0 ? CHANGE_UP : CHANGE_FLAT}>{signed(setsChange, (n) => `${n}%`)}</div>
                <Muted>normal {Math.round(normal.workingSets)}</Muted>
              </>
            )
          }
        />
        <Row
          name="time"
          label="Time trained"
          value={formatMinutes(current.durationSeconds / 60)}
          aside={
            <>
              {timeChange == null ? (
                <Muted>{DASH}</Muted>
              ) : (
                <div className={Math.round(timeChange) > 0 ? CHANGE_UP : CHANGE_FLAT}>{signed(timeChange, formatMinutes)}</div>
              )}
              {current.cardioMinutes > 0 && <Muted>+ {formatMinutes(current.cardioMinutes)} cardio</Muted>}
            </>
          }
        />
        <Row
          name="effort"
          label="Effort"
          value={effort ? `RPE ${formatRpe(effort.avgRpe)}` : DASH}
          detail={
            effort
              ? `${effort.pctAtOrAbove9}% of sets at 9+ · ${pluralize(effort.setsAt10, 'set')} at 10`
              : current.workingSets > 0
                ? "Effort isn't tracked enough this week"
                : undefined
          }
          aside={
            effort &&
            (effortChange == null ? (
              <Muted>{DASH}</Muted>
            ) : (
              <>
                <div className={CHANGE_FLAT}>{signed(effortChange, (n) => n.toFixed(1))}</div>
                <Muted>normal {formatRpe(normal.avgRpe)}</Muted>
              </>
            ))
          }
        />
        <Row
          name="streak"
          label="Streak"
          value={pluralize(streak, 'week')}
          aside={
            streak > 0 && (
              <div aria-hidden="true" className="flex w-28 gap-[3px]">
                {Array.from({ length: 8 }, (_, i) => (
                  <i
                    key={i}
                    className={`h-3.5 flex-1 border ${i < Math.min(streak, 8) ? 'border-primary bg-primary' : 'border-border bg-muted'}`}
                  />
                ))}
              </div>
            )
          }
        />
      </div>
    </section>
  )
}

function Row({
  name,
  label,
  value,
  detail,
  aside,
}: {
  name: string
  label: string
  value: ReactNode
  detail?: string
  aside?: ReactNode
}) {
  return (
    <div data-row={name} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>{' '}
        <div className="text-2xl font-bold leading-tight text-foreground tabular-nums">{value}</div>
        {detail && <div className="text-sm text-muted-foreground tabular-nums">{detail}</div>}
      </div>
      {aside && <div className="shrink-0 text-right tabular-nums">{aside}</div>}
    </div>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>
}
