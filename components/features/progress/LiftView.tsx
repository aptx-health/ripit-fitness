'use client'

import { ChevronLeft, History, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import PageTitle from '@/components/ui/PageTitle'
import { PAPER_TAB_CLIP, PAPER_TAB_FOCUS } from '@/components/ui/PaperTabs'
import PaperTabTitle from '@/components/ui/PaperTabTitle'
import { clientLogger } from '@/lib/client-logger'
import { pluralize } from '@/lib/format/pluralize'
import {
  type Change,
  type ChartRange,
  type ChartSeries,
  chartSeries,
  type LiftSession,
  type RepRecord,
  setsInRange,
  type WeekSets,
  weeksInRange,
} from '@/lib/insights/lift-history'
import { isMonday } from '@/lib/insights/progress'
import { browserTimeZone, formatWeight, signed, unitLabel } from './format'
import { BarChart, LineChart, type LinePoint } from './LiftChart'
import LiftSkeleton from './LiftSkeleton'
import { PR_CHIP } from './rows'

/**
 * The per-lift page (mockup B): one lift's chart (e1RM, Top set or Volume;
 * Reps and Volume for a bodyweight lift) over 3M / 6M / 1Y / All, its rep
 * records and its sessions. Chips switch between the pinned lifts. `?week=`
 * is only passed on, so Back returns to the Progress week it came from. The
 * API sends raw numbers; the maths for the ranges is lift-history's, the
 * wording is here.
 */

interface Lift {
  name: string
  weightUnit: 'lbs' | 'kg'
  isBodyweight: boolean
  sessions: LiftSession[]
  records: RepRecord[]
  weeklySets: WeekSets[]
  pinned: Array<{ exerciseDefinitionId: string; name: string }>
}

type Loaded = { status: 'loading' } | { status: 'missing' } | { status: 'error' } | { status: 'ready'; lift: Lift }
type ChartTab = 'main' | 'top-set' | 'volume'

const RANGES: ChartRange[] = ['3M', '6M', '1Y', 'All']
const PAGE = 10
const NONE = '—'

const BOX_BUTTON =
  'inline-flex min-h-12 items-center border-2 border-border bg-card px-4 font-bold uppercase tracking-wider text-foreground hover:bg-muted doom-focus-ring'

/** The API's lift with its dates as Dates. */
function parseLift(json: Lift): Lift {
  return {
    ...json,
    sessions: json.sessions.map((s) => ({ ...s, date: new Date(s.date) })),
    records: json.records.map((r) => ({ ...r, date: new Date(r.date) })),
  }
}

export default function LiftView({ exerciseDefinitionId }: { exerciseDefinitionId: string }) {
  const weekParam = useSearchParams().get('week')
  const week = weekParam && isMonday(weekParam) ? weekParam : null
  const query = week ? `?week=${week}` : ''
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' })
  // Only the latest request may land, so a quick chip tap can't show the lift before.
  const latest = useRef(0)

  const load = useCallback(async () => {
    const id = ++latest.current
    setLoaded({ status: 'loading' })
    const params = new URLSearchParams({ tz: browserTimeZone() })
    try {
      const res = await fetch(`/api/progress/lift/${encodeURIComponent(exerciseDefinitionId)}?${params}`)
      if (res.status === 404) {
        if (id === latest.current) setLoaded({ status: 'missing' })
        return
      }
      const data = await res.json()
      if (!res.ok || !data.lift) throw new Error(data.error || 'Failed to load the lift')
      if (id === latest.current) setLoaded({ status: 'ready', lift: parseLift(data.lift) })
    } catch (err) {
      clientLogger.error('Error loading the lift history:', err)
      if (id === latest.current) setLoaded({ status: 'error' })
    }
  }, [exerciseDefinitionId])

  useEffect(() => {
    load()
  }, [load])

  const back = (
    <Link
      href={`/progress${query}`}
      className="-ml-2 inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground doom-focus-ring"
    >
      <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
      Back to Progress
    </Link>
  )

  if (loaded.status === 'loading') {
    return <LiftSkeleton back={back} />
  }
  if (loaded.status === 'missing') {
    return (
      <div className="space-y-3">
        {back}
        <PageTitle>Lift not found</PageTitle>
        <p className="text-sm text-muted-foreground">{"This lift doesn't exist, or isn't one of yours."}</p>
      </div>
    )
  }
  if (loaded.status === 'error') {
    return (
      <div className="space-y-3">
        {back}
        <div role="alert" className="folder-box border-2 border-border bg-card px-4 py-5 text-sm text-error">
          <p>{"Couldn't load this lift. Try again."}</p>
          <button type="button" onClick={load} className={`mt-3 ${BOX_BUTTON}`}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const { lift } = loaded
  return (
    <div className="space-y-5">
      <div>
        {back}
        <PageTitle>{lift.name}</PageTitle>
        {lift.pinned.length > 0 && (
          <nav aria-label="Pinned lifts" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {lift.pinned.map((p) => {
              const current = p.exerciseDefinitionId === exerciseDefinitionId
              return (
                <Link
                  key={p.exerciseDefinitionId}
                  href={`/progress/lift/${encodeURIComponent(p.exerciseDefinitionId)}${query}`}
                  aria-current={current ? 'page' : undefined}
                  className={`inline-flex min-h-12 shrink-0 items-center whitespace-nowrap border-2 px-3 text-sm font-bold uppercase tracking-wider doom-focus-ring ${
                    current
                      ? 'border-secondary bg-secondary text-secondary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.name}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      {lift.sessions.length === 0 ? (
        <div className="folder-box border-2 border-border bg-card px-4 py-5">
          <p className="font-bold text-foreground">No sessions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Log {lift.name} in a workout and its history shows here.</p>
        </div>
      ) : (
        <LiftHistory key={exerciseDefinitionId} lift={lift} />
      )}
    </div>
  )
}

// --- the history ------------------------------------------------------------------

function LiftHistory({ lift }: { lift: Lift }) {
  // A weighted lift trained only above 12 reps has no e1RM: it opens on Top set.
  const [tab, setTab] = useState<ChartTab>(() =>
    !lift.isBodyweight && lift.sessions.every((s) => s.e1rm == null) ? 'top-set' : 'main',
  )
  const [range, setRange] = useState<ChartRange>('6M')
  const [shown, setShown] = useState(PAGE)
  const timeZone = browserTimeZone()
  const now = new Date()
  const unit = unitLabel(lift.weightUnit)
  const series = chartSeries(lift.sessions, range, now, timeZone)
  const day = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone })

  const tabs: Array<{ id: ChartTab; label: string }> = lift.isBodyweight
    ? [
        { id: 'main', label: 'Reps' },
        { id: 'volume', label: 'Volume' },
      ]
    : [
        { id: 'main', label: 'e1RM' },
        { id: 'top-set', label: 'Top set' },
        { id: 'volume', label: 'Volume' },
      ]
  const selected = tabs.some((t) => t.id === tab) ? tab : 'main'

  return (
    <>
      <section aria-label="Chart">
        <ChartTabs tabs={tabs} value={selected} onChange={setTab} />
        <div
          role="tabpanel"
          id="lift-chart-panel"
          aria-labelledby={`lift-chart-tab-${selected}`}
          className="folder-box border-2 border-secondary bg-card"
        >
          <ChartPanel tab={selected} lift={lift} series={series} range={range} now={now} timeZone={timeZone} unit={unit} day={day} />
          <div className="flex border-t border-border">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={r === range}
                onClick={() => setRange(r)}
                className={`flex min-h-12 flex-1 items-center justify-center text-sm font-bold uppercase tracking-wider doom-focus-ring ${
                  r === range ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section data-section="records" aria-labelledby="lift-records">
        <div className="flex items-end">
          <PaperTabTitle tone="coach" icon={<Trophy size={16} />} asChild>
            <h2 id="lift-records">Records</h2>
          </PaperTabTitle>
        </div>
        <div className="folder-box border-2 border-accent bg-card divide-y divide-border">
          {lift.records.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">No records yet: they count sets of 12 reps or fewer.</p>
          ) : (
            lift.records.map((r) => <RecordRow key={r.reps} record={r} bodyweight={lift.isBodyweight} unit={unit} day={day} />)
          )}
        </div>
      </section>

      <section data-section="sessions" aria-labelledby="lift-sessions">
        <div className="flex items-end">
          <PaperTabTitle
            tone="mine"
            icon={<History size={16} />}
            count={lift.sessions.length}
            countLabel={pluralize(lift.sessions.length, 'session')}
            asChild
          >
            <h2 id="lift-sessions">Sessions</h2>
          </PaperTabTitle>
        </div>
        <div className="folder-box border-2 border-secondary bg-card divide-y divide-border">
          {lift.sessions.slice(0, shown).map((s) => (
            <SessionRow key={s.completionId} session={s} timeZone={timeZone} day={day} />
          ))}
          {shown < lift.sessions.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="flex min-h-12 w-full items-center justify-center text-sm font-bold uppercase tracking-wider text-foreground hover:bg-muted doom-focus-ring"
            >
              Show more
            </button>
          )}
        </div>
      </section>
    </>
  )
}

/** Paper tabs for the chart, 48px tall; arrow keys, Home and End move between them. */
function ChartTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: ChartTab; label: string }>
  value: ChartTab
  onChange: (id: ChartTab) => void
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1
    const next =
      event.key === 'ArrowRight'
        ? index === last ? 0 : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0 ? last : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    buttons.current[next]?.focus()
    onChange(tabs[next].id)
  }

  return (
    <div role="tablist" aria-label="Chart" className="flex items-end">
      {tabs.map((t, index) => {
        const isSelected = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => {
              buttons.current[index] = el
            }}
            type="button"
            role="tab"
            id={`lift-chart-tab-${t.id}`}
            aria-selected={isSelected}
            aria-controls="lift-chart-panel"
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`relative inline-flex min-h-12 items-end gap-1.5 whitespace-nowrap rounded-tl pl-3 pr-5 pb-1.5 font-bold uppercase tracking-wider ${PAPER_TAB_FOCUS} ${
              index > 0 ? '-ml-2.5' : ''
            } ${
              isSelected
                ? 'z-10 bg-secondary pt-2 text-sm text-secondary-foreground'
                : 'bg-muted pt-1.5 text-[13px] text-muted-foreground shadow-[inset_0_1px_0_var(--border)] hover:text-foreground'
            }`}
            style={PAPER_TAB_CLIP}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** The tiles, the chart and its legend for the selected tab. */
function ChartPanel({
  tab,
  lift,
  series,
  range,
  now,
  timeZone,
  unit,
  day,
}: {
  tab: ChartTab
  lift: Lift
  series: ChartSeries
  range: ChartRange
  now: Date
  timeZone: string
  unit: string
  day: (date: Date) => string
}) {
  const month = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', timeZone })
  const sessionsTile = (
    <Tile name="sessions" label="Sessions" value={series.sessions} detail={series.since ? `since ${month(series.since)}` : undefined} />
  )
  const changeTile = (c: Change, text: (n: number) => string) => (
    <Tile
      name="change"
      label={range}
      value={c ? signed(c.percent, (n) => `${n.toFixed(1)}%`) : NONE}
      tone={c && c.percent >= 0.05 ? 'up' : undefined}
      detail={c ? `${text(c.first)} → ${text(c.last)}` : undefined}
    />
  )
  const empty = series.points.length === 0

  if (tab === 'volume') {
    // Bars are whole weeks; the tiles, like Sessions, count from the range's exact start.
    const weeks = weeksInRange(lift.weeklySets, range, now, timeZone)
    const total = setsInRange(lift.sessions, range, now)
    const avg = weeks.length ? Math.round((total / weeks.length) * 10) / 10 : 0
    return (
      <>
        <Tiles>
          <Tile name="avg" label="Sets / week" value={avg} />
          <Tile name="total" label="Total sets" value={total} />
          {sessionsTile}
        </Tiles>
        <div className="p-3">
          {weeks.length === 0 ? (
            <EmptyRange />
          ) : (
            <BarChart weeks={weeks} label={`Working sets per week: ${total} over ${pluralize(weeks.length, 'week')}`} />
          )}
        </div>
      </>
    )
  }

  if (tab === 'top-set') {
    const h = series.heaviest
    // Weight-0 (bodyweight) sessions of a weighted lift are left off the weight chart.
    const points: LinePoint[] = series.points.flatMap((p) =>
      p.topSet.weight > 0 ? [{ date: p.date, value: p.topSet.weight, reps: p.topSet.reps }] : [],
    )
    return (
      <>
        <Tiles>
          <Tile
            name="best"
            label="Heaviest"
            value={h ? formatWeight(h.weight) : NONE}
            detail={h ? `${unit} × ${h.reps} · ${day(h.date)}` : undefined}
          />
          {changeTile(series.change.topSet, (n) => String(Math.round(n)))}
          {sessionsTile}
        </Tiles>
        <div className="p-3">
          {points.length === 0 ? <EmptyRange /> : <LineChart kind="top-set" label={`Top set weight by session, in ${unit}`} points={points} dateLabel={day} />}
        </div>
      </>
    )
  }

  if (lift.isBodyweight) {
    const m = series.mostReps
    const points: LinePoint[] = series.points.map((p) => ({ date: p.date, value: p.reps }))
    return (
      <>
        <Tiles>
          <Tile name="best" label="Best" value={m ? m.reps : NONE} detail={m ? `reps · ${day(m.date)}` : undefined} />
          {changeTile(series.change.reps, (n) => String(Math.round(n)))}
          {sessionsTile}
        </Tiles>
        <div className="p-3">
          {empty ? <EmptyRange /> : <LineChart kind="reps" label="Most reps in a set, by session" points={points} dateLabel={day} />}
        </div>
      </>
    )
  }

  const b = series.best
  const points: LinePoint[] = series.points.flatMap((p) => (p.e1rm == null ? [] : [{ date: p.date, value: p.e1rm, isPr: p.isPr }]))
  const overlay = series.points.flatMap((p) => (p.topSet.weight > 0 ? [{ date: p.date, value: p.topSet.weight }] : []))
  return (
    <>
      <Tiles>
        <Tile
          name="best"
          label="Best e1RM"
          value={b ? Math.round(b.e1rm) : NONE}
          detail={b ? `${unit} · ${day(b.date)}` : undefined}
        />
        {changeTile(series.change.e1rm, (n) => String(Math.round(n)))}
        {sessionsTile}
      </Tiles>
      <div className="p-3">
        {points.length === 0 ? (
          series.sessions > 0 ? (
            <EmptyRange text="No e1RM: sets over 12 reps" />
          ) : (
            <EmptyRange />
          )
        ) : (
          <>
            <LineChart kind="e1rm" label={`e1RM by session, in ${unit}`} points={points} overlay={overlay} dateLabel={day} />
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <i aria-hidden="true" className="inline-block size-2.5 rounded-full border-[1.5px] border-foreground bg-accent" />
                <span>all-time PR</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i aria-hidden="true" className="inline-block w-3.5 border-t-2 border-dashed border-accent" />
                <span>top-set weight</span>
              </span>
            </p>
          </>
        )}
      </div>
    </>
  )
}

function EmptyRange({ text = 'No sessions in this range' }: { text?: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>
}

function Tiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 divide-x divide-border border-b border-border">{children}</div>
}

function Tile({
  name,
  label,
  value,
  detail,
  tone,
}: {
  name: string
  label: string
  value: ReactNode
  detail?: string
  tone?: 'up'
}) {
  return (
    <div data-tile={name} className="min-w-0 px-3 py-2.5">
      <div className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>{' '}
      <div className={`text-2xl font-bold leading-tight tabular-nums ${tone === 'up' ? 'text-success-text' : 'text-foreground'}`}>
        {value}
      </div>
      {detail && (
        <>
          {' '}
          <div className="truncate text-xs text-muted-foreground tabular-nums">{detail}</div>
        </>
      )}
    </div>
  )
}

function RecordRow({
  record,
  bodyweight,
  unit,
  day,
}: {
  record: RepRecord
  bodyweight: boolean
  unit: string
  day: (date: Date) => string
}) {
  return (
    <div data-record={record.reps} className="flex min-h-12 items-center gap-3 px-3 py-2">
      <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {bodyweight ? 'Most reps' : pluralize(record.reps, 'rep')}
      </span>{' '}
      <span className="flex min-w-0 flex-1 items-center gap-2 font-bold text-foreground tabular-nums">
        {bodyweight ? pluralize(record.reps, 'rep') : `${formatWeight(record.weight)} ${unit}`}
        {record.isNew && (
          <>
            {' '}
            <span className={PR_CHIP}>New</span>
          </>
        )}
      </span>{' '}
      <span className="shrink-0 text-sm text-muted-foreground">{day(record.date)}</span>
    </div>
  )
}

function SessionRow({ session, timeZone, day }: { session: LiftSession; timeZone: string; day: (date: Date) => string }) {
  const weekday = session.date.toLocaleDateString('en-US', { weekday: 'short', timeZone })
  const sets = session.sets.map((s) => (s.weight === 0 ? pluralize(s.reps, 'rep') : `${formatWeight(s.weight)}×${s.reps}`))
  if (session.avgRpe != null) sets.push(`RPE ${Math.round(session.avgRpe * 10) / 10}`)
  return (
    <div data-session={session.completionId} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="font-bold leading-tight text-foreground">
          {weekday} {day(session.date)}
        </div>{' '}
        <div className="text-sm text-muted-foreground tabular-nums">{sets.join(' · ')}</div>
      </div>
      {session.e1rm != null && (
        <>
          {' '}
          <div className="shrink-0 text-right">
            <div className="font-bold leading-tight text-foreground tabular-nums">{Math.round(session.e1rm)}</div>{' '}
            <div className="text-xs text-muted-foreground">e1RM</div>
          </div>
        </>
      )}
    </div>
  )
}
