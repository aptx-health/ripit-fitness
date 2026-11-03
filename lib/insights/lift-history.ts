import type { PrismaClient } from '@prisma/client'
import { setEffort } from '@/lib/aggregates/compute'
import { addWeeks, weekBounds, weekStartFor } from '@/lib/insights/progress'
import { type HistorySet, LBS_PER_KG, MAX_PR_REPS, type WeightUnit } from '@/lib/insights/progress-records'

/**
 * The per-lift page: one exercise's sessions, rep records, chart series and
 * weekly working sets. Same rules as the Progress tab (progress-records.ts):
 * working sets only, Epley e1RM from sets of 12 reps or fewer (a single is its
 * own weight), bodyweight (weight 0) has no e1RM and is compared by reps,
 * weights are compared in pounds and come out in the user's unit, raw.
 * Weeks are local Mondays. The page words and rounds the numbers.
 */

export type ChartRange = '3M' | '6M' | '1Y' | 'All'

/** A logged set of one exercise, with its effort when rated. */
export interface LiftSet extends HistorySet {
  rpe?: number | null
  rir?: number | null
}

export interface WeightReps {
  weight: number
  reps: number
}

export interface LiftSession {
  completionId: string
  date: Date
  /** Working sets in the order given. */
  sets: WeightReps[]
  /** The best Epley e1RM of its sets of 12 reps or fewer; null when none. */
  e1rm: number | null
  /** The heaviest set (more reps on a tie); bodyweight: the most reps. */
  topSet: WeightReps
  /** Mean effort of the rated sets (RPE, else 10 − RIR); null when none rated. */
  avgRpe: number | null
}

export interface RepRecord {
  reps: number
  weight: number
  date: Date
  /** Set at or after the start of this week. */
  isNew: boolean
}

export interface ChartPoint {
  date: Date
  e1rm: number | null
  topSet: WeightReps
  /** The most reps in a set. */
  reps: number
  isPr: boolean
}

export type Change = { first: number; last: number; percent: number } | null

export interface ChartSeries {
  points: ChartPoint[]
  change: { e1rm: Change; topSet: Change; reps: Change }
  best: { e1rm: number; date: Date } | null
  heaviest: { weight: number; reps: number; date: Date } | null
  mostReps: { reps: number; date: Date } | null
  /** Sessions in the range, and the oldest one's date. */
  sessions: number
  since: Date | null
}

export interface WeekSets {
  weekStart: string
  sets: number
}

export interface LiftHistory {
  name: string
  weightUnit: WeightUnit
  isBodyweight: boolean
  sessions: LiftSession[]
  records: RepRecord[]
  weeklySets: WeekSets[]
}

const DAY_MS = 86_400_000
const RANGE_DAYS: Record<Exclude<ChartRange, 'All'>, number> = { '3M': 91, '6M': 182, '1Y': 365 }

const toLbs = (weight: number, unit: string) => (unit === 'kg' ? weight * LBS_PER_KG : weight)
const fromLbs = (lbs: number, unit: WeightUnit) => (unit === 'kg' ? lbs / LBS_PER_KG : lbs)
/** The set's weight in the user's unit, untouched when it was logged in that unit. */
const inUnit = (s: HistorySet, unit: WeightUnit) =>
  s.weightUnit === unit || (unit === 'lbs' && s.weightUnit !== 'kg') ? s.weight : fromLbs(toLbs(s.weight, s.weightUnit), unit)
const epley = (lbs: number, reps: number) => (reps === 1 ? lbs : lbs * (1 + reps / 30))

const working = <T extends HistorySet>(history: T[]) => history.filter((s) => !s.isWarmup)
const byTime = <T extends HistorySet>(sets: T[]) => [...sets].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())

/** Heavier wins, then more reps; weights in one unit. */
const heavier = (a: WeightReps, b: WeightReps) => a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps)

/** The first moment of the range: now minus its days; the dawn of time for All. */
function rangeStart(range: ChartRange, now: Date): number {
  return range === 'All' ? -Infinity : now.getTime() - RANGE_DAYS[range] * DAY_MS
}

/** One entry per session, newest first. */
export function computeLiftSessions(history: LiftSet[], unit: WeightUnit): LiftSession[] {
  const groups = new Map<string, LiftSet[]>()
  for (const s of working(history)) {
    const group = groups.get(s.completionId)
    if (group) group.push(s)
    else groups.set(s.completionId, [s])
  }
  const sessions = [...groups].map(([completionId, sets]) => {
    let e1rmLbs: number | null = null
    let top = sets[0]
    for (const s of sets) {
      const lbs = toLbs(s.weight, s.weightUnit)
      if (lbs > 0 && s.reps <= MAX_PR_REPS) e1rmLbs = Math.max(e1rmLbs ?? 0, epley(lbs, s.reps))
      if (heavier({ weight: lbs, reps: s.reps }, { weight: toLbs(top.weight, top.weightUnit), reps: top.reps })) top = s
    }
    const efforts = sets.map((s) => setEffort({ rpe: s.rpe ?? null, rir: s.rir ?? null })).filter((e): e is number => e != null)
    return {
      completionId,
      date: sets[0].completedAt,
      sets: sets.map((s) => ({ weight: inUnit(s, unit), reps: s.reps })),
      e1rm: e1rmLbs == null ? null : fromLbs(e1rmLbs, unit),
      topSet: { weight: inUnit(top, unit), reps: top.reps },
      avgRpe: efforts.length === 0 ? null : efforts.reduce((a, b) => a + b, 0) / efforts.length,
    }
  })
  return sessions.sort((a, b) => b.date.getTime() - a.date.getTime())
}

/**
 * The heaviest working set at each rep count that was done, any count,
 * ascending; the earliest keeps a tied record. Bodyweight (every working set
 * at weight 0): one entry, the most reps in a set.
 */
export function computeRepRecords(history: HistorySet[], unit: WeightUnit, weekStart: Date): RepRecord[] {
  const sets = byTime(working(history))
  if (sets.length === 0) return []
  const record = (s: HistorySet): RepRecord => ({
    reps: s.reps,
    weight: inUnit(s, unit),
    date: s.completedAt,
    isNew: s.completedAt.getTime() >= weekStart.getTime(),
  })

  if (sets.every((s) => s.weight === 0)) {
    const most = sets.reduce((a, b) => (b.reps > a.reps ? b : a))
    return [record(most)]
  }
  const heaviest = new Map<number, HistorySet>()
  for (const s of sets) {
    if (s.weight <= 0) continue
    const held = heaviest.get(s.reps)
    if (!held || toLbs(s.weight, s.weightUnit) > toLbs(held.weight, held.weightUnit)) heaviest.set(s.reps, s)
  }
  return [...heaviest.values()].sort((a, b) => a.reps - b.reps).map(record)
}

const mostRepsIn = (s: LiftSession) => Math.max(...s.sets.map((set) => set.reps))

/** The first and last values and the change between them; null with fewer than two. */
function change(values: number[]): Change {
  if (values.length < 2) return null
  const first = values[0]
  const last = values[values.length - 1]
  if (first === 0) return null
  return { first, last, percent: ((last - first) / first) * 100 }
}

/**
 * The chart for a range: one point per session at 3M and 6M, one per local
 * week (its best of each field) at 1Y and All, oldest first. The best e1RM,
 * heaviest top set and most reps are all-time; the change and the session
 * count follow the range. `sessions` are newest first, as computeLiftSessions returns them.
 */
export function chartSeries(sessions: LiftSession[], range: ChartRange, now: Date, timeZone: string): ChartSeries {
  const oldestFirst = [...sessions].sort((a, b) => a.date.getTime() - b.date.getTime())
  const from = rangeStart(range, now)
  const inRange = oldestFirst.filter((s) => s.date.getTime() >= from)

  // All-time bests; the earliest keeps a tie.
  let bestSession: LiftSession | null = null
  let heaviest: LiftSession | null = null
  let mostReps: { reps: number; date: Date } | null = null
  for (const s of oldestFirst) {
    if (s.e1rm != null && (bestSession?.e1rm == null || s.e1rm > bestSession.e1rm)) bestSession = s
    if (!heaviest || heavier(s.topSet, heaviest.topSet)) heaviest = s
    const reps = mostRepsIn(s)
    if (!mostReps || reps > mostReps.reps) mostReps = { reps, date: s.date }
  }

  const groups: LiftSession[][] =
    range === '3M' || range === '6M' ? inRange.map((s) => [s]) : groupByWeek(inRange, timeZone)
  const points = groups.map((group): ChartPoint => {
    const withE1rm = group.filter((s) => s.e1rm != null)
    // The week's date: its best-e1RM session, else its most-reps one; the earliest on a tie.
    const lead = withE1rm.length
      ? withE1rm.reduce((a, b) => ((b.e1rm as number) > (a.e1rm as number) ? b : a))
      : group.reduce((a, b) => (mostRepsIn(b) > mostRepsIn(a) ? b : a))
    return {
      date: lead.date,
      e1rm: withE1rm.length ? (lead.e1rm as number) : null,
      topSet: group.map((s) => s.topSet).reduce((a, b) => (heavier(b, a) ? b : a)),
      reps: Math.max(...group.map(mostRepsIn)),
      isPr: bestSession != null && group.includes(bestSession),
    }
  })

  return {
    points,
    change: {
      e1rm: change(points.flatMap((p) => (p.e1rm == null ? [] : [p.e1rm]))),
      topSet: change(points.flatMap((p) => (p.topSet.weight > 0 ? [p.topSet.weight] : []))),
      reps: change(points.map((p) => p.reps)),
    },
    best: bestSession ? { e1rm: bestSession.e1rm as number, date: bestSession.date } : null,
    heaviest: heaviest ? { ...heaviest.topSet, date: heaviest.date } : null,
    mostReps,
    sessions: inRange.length,
    since: inRange[0]?.date ?? null,
  }
}

/** Sessions (oldest first) grouped by local week, in order. */
function groupByWeek(sessions: LiftSession[], timeZone: string): LiftSession[][] {
  const weeks = new Map<string, LiftSession[]>()
  for (const s of sessions) {
    const week = weekStartFor(s.date, timeZone)
    const group = weeks.get(week)
    if (group) group.push(s)
    else weeks.set(week, [s])
  }
  return [...weeks.values()]
}

/** Working sets of the sessions on or after the range's exact start (not its first Monday). */
export function setsInRange(sessions: LiftSession[], range: ChartRange, now: Date): number {
  const from = rangeStart(range, now)
  return sessions.reduce((n, s) => (s.date.getTime() >= from ? n + s.sets.length : n), 0)
}

/** The first local week a range covers ('All' has none). */
export function rangeFirstWeek(range: ChartRange, now: Date, timeZone: string): string | null {
  return range === 'All' ? null : weekStartFor(new Date(rangeStart(range, now)), timeZone)
}

/** The weeks of a weeklySets list that fall in the range. */
export function weeksInRange(weeks: WeekSets[], range: ChartRange, now: Date, timeZone: string): WeekSets[] {
  const first = rangeFirstWeek(range, now, timeZone)
  return first == null ? weeks : weeks.filter((w) => w.weekStart >= first)
}

/**
 * Working sets per local week, oldest first, the empty weeks as 0, from the
 * later of the range's first week and the lift's first week up to the week of `now`.
 */
export function weeklySets(history: HistorySet[], range: ChartRange, now: Date, timeZone: string): WeekSets[] {
  const sets = working(history)
  if (sets.length === 0) return []
  const counts = new Map<string, number>()
  for (const s of sets) {
    const week = weekStartFor(s.completedAt, timeZone)
    counts.set(week, (counts.get(week) ?? 0) + 1)
  }
  const firstSet = [...counts.keys()].sort()[0]
  const rangeFirst = rangeFirstWeek(range, now, timeZone)
  const last = weekStartFor(now, timeZone)
  const out: WeekSets[] = []
  for (let week = rangeFirst != null && rangeFirst > firstSet ? rangeFirst : firstSet; week <= last; week = addWeeks(week, 1)) {
    out.push({ weekStart: week, sets: counts.get(week) ?? 0 })
  }
  return out
}

// --- the loader -----------------------------------------------------------------

type LiftDb = Pick<PrismaClient, 'exerciseDefinition' | 'userSettings' | 'loggedSet'>

/**
 * One lift's history for the user, or null when the exercise doesn't exist or
 * is another user's private one. Three queries in parallel, whatever the
 * number of sessions: the definition, the unit, and every working set of the
 * user's completed, un-archived workouts on this definition (any Exercise row).
 */
export async function getLiftHistory(
  db: LiftDb,
  userId: string,
  exerciseDefinitionId: string,
  { timeZone, now = new Date() }: { timeZone: string; now?: Date },
): Promise<LiftHistory | null> {
  const [definition, settings, rows] = await Promise.all([
    db.exerciseDefinition.findFirst({
      where: { id: exerciseDefinitionId, OR: [{ isSystem: true }, { userId }] },
      select: { name: true },
    }),
    db.userSettings.findUnique({ where: { userId }, select: { defaultWeightUnit: true } }),
    db.loggedSet.findMany({
      where: {
        isWarmup: false,
        exercise: { exerciseDefinitionId },
        completion: { userId, status: 'completed', isArchived: false },
      },
      select: {
        reps: true,
        weight: true,
        weightUnit: true,
        rpe: true,
        rir: true,
        completion: { select: { id: true, completedAt: true } },
      },
      orderBy: [{ completion: { completedAt: 'asc' } }, { completionId: 'asc' }, { setNumber: 'asc' }],
    }),
  ])
  if (!definition) return null

  const weightUnit: WeightUnit = settings?.defaultWeightUnit === 'kg' ? 'kg' : 'lbs'
  const history: LiftSet[] = rows.map((r) => ({
    completionId: r.completion.id,
    completedAt: r.completion.completedAt,
    exerciseDefinitionId,
    name: definition.name,
    reps: r.reps,
    weight: r.weight,
    weightUnit: r.weightUnit,
    isWarmup: false,
    rpe: r.rpe,
    rir: r.rir,
  }))
  const { start: thisWeek } = weekBounds(weekStartFor(now, timeZone), timeZone)

  return {
    name: definition.name,
    weightUnit,
    isBodyweight: history.length > 0 && history.every((s) => s.weight === 0),
    sessions: computeLiftSessions(history, weightUnit),
    records: computeRepRecords(history, weightUnit, thisWeek),
    weeklySets: weeklySets(history, 'All', now, timeZone),
  }
}
