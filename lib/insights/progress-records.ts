import type { WeekStats } from '@/lib/insights/progress'

/**
 * The Progress tab's Records, Lifts and trend note (S2): pure maths over a
 * user's logged sets and S1's weekly stats. Nothing here touches the DB.
 *
 * A session is one workout completion. e1RM is Epley on the weight in pounds
 * (the weight itself at 1 rep); bodyweight sets (weight 0) have none and are
 * compared by reps. Every weight that comes out is in the user's unit, raw:
 * the page rounds and words it.
 */

export type WeightUnit = 'lbs' | 'kg'

export interface HistorySet {
  completionId: string
  completedAt: Date
  exerciseDefinitionId: string
  name: string
  reps: number
  weight: number
  /** 'lbs' or 'kg'. */
  weightUnit: string
  isWarmup: boolean
}

export interface WeekRecord {
  exerciseDefinitionId: string
  name: string
  kind: 'e1rm' | 'rep'
  /** The set that set the record. */
  weight: number
  reps: number
  /** Of that set; null for bodyweight. */
  e1rm: number | null
  /** The earlier best: an e1RM, the heaviest weight at these reps, or (bodyweight) the most reps. */
  previous: number
}

export interface WeekLift {
  exerciseDefinitionId: string
  name: string
  workingSets: number
  /** The week's set with the highest e1RM (bodyweight: the most reps). */
  bestSet: { weight: number; reps: number }
  e1rm: number | null
  /** The best-set e1RM of the latest session before the week. */
  previousE1rm: number | null
  /** The best session e1RM up to the end of the week, this week included. */
  bestE1rm: number | null
  /** Sessions after the latest one that reached bestE1rm. */
  sessionsBelowBest: number
}

export interface TrendNote {
  /** Weeks in the run of rising average RPE that ends with the shown week; 0 below 3. */
  effortRisingWeeks: number
  effortFrom: number | null
  effortTo: number | null
  /** 0 for the shown week, 1 for the week before...; null when no week was light. */
  lastLightWeeksAgo: number | null
  /** The chart weeks the light-week search covered: 8, or fewer since the first workout. */
  lightWeeksSearched: number
}

export const LBS_PER_KG = 2.20462
/** Records (e1RM and Rep PRs) are kept for sets of 1 to 12 reps. */
export const MAX_PR_REPS = 12
/** Weeks of history before a trend note says anything. */
const MIN_TREND_WEEKS = 3
const MIN_RISING_WEEKS = 3

const toLbs = (s: HistorySet) => (s.weightUnit === 'kg' ? s.weight * LBS_PER_KG : s.weight)
const fromLbs = (lbs: number, unit: WeightUnit) => (unit === 'kg' ? lbs / LBS_PER_KG : lbs)
const epley = (lbs: number, reps: number) => (reps === 1 ? lbs : lbs * (1 + reps / 30))

/** A working set in pounds, with its e1RM (null for bodyweight). */
interface Lb {
  completionId: string
  completedAt: number
  lbs: number
  reps: number
  e1rm: number | null
}

interface ExerciseSets {
  name: string
  before: Lb[]
  week: Lb[]
}

/** Working sets before the week end, per exercise, split at the week start. */
function byExercise(history: HistorySet[], weekStart: Date, weekEnd: Date): Map<string, ExerciseSets> {
  const start = weekStart.getTime()
  const end = weekEnd.getTime()
  const out = new Map<string, ExerciseSets>()
  for (const s of history) {
    const at = s.completedAt.getTime()
    if (s.isWarmup || at >= end) continue
    let ex = out.get(s.exerciseDefinitionId)
    if (!ex) {
      ex = { name: s.name, before: [], week: [] }
      out.set(s.exerciseDefinitionId, ex)
    }
    const lbs = toLbs(s)
    const set = { completionId: s.completionId, completedAt: at, lbs, reps: s.reps, e1rm: lbs > 0 ? epley(lbs, s.reps) : null }
    ;(at < start ? ex.before : ex.week).push(set)
  }
  return out
}

/** The first item with the largest score; undefined when none scores. */
function best<T>(items: T[], score: (item: T) => number | null): T | undefined {
  let top: T | undefined
  let topScore = -Infinity
  for (const item of items) {
    const value = score(item)
    if (value != null && value > topScore) {
      top = item
      topScore = value
    }
  }
  return top
}

const weighted = (sets: Lb[]) => sets.filter((s) => s.e1rm != null)
const bodyweight = (sets: Lb[]) => sets.filter((s) => s.e1rm == null)

/** The heaviest set, more reps on a tie; undefined when there are none. */
const heaviestSet = (sets: Lb[]) =>
  sets.reduce<Lb | undefined>((top, s) => (!top || s.lbs > top.lbs || (s.lbs === top.lbs && s.reps > top.reps) ? s : top), undefined)

/** A set's e1RM when it can count toward an e1RM record: 12 reps or fewer. */
const prE1rm = (s: Lb) => (s.reps <= MAX_PR_REPS ? s.e1rm : null)

/** The exercise's record for the week, if any: an e1RM PR, else a weighted Rep PR, else a bodyweight one. */
function recordFor(id: string, ex: ExerciseSets, unit: WeightUnit): WeekRecord | null {
  if (ex.before.length === 0 || ex.week.length === 0) return null
  const base = { exerciseDefinitionId: id, name: ex.name }

  const weekBest = best(ex.week, prE1rm)
  const priorBest = best(ex.before, prE1rm)
  if (weekBest?.e1rm != null && priorBest?.e1rm != null && weekBest.e1rm > priorBest.e1rm) {
    return {
      ...base,
      kind: 'e1rm',
      weight: fromLbs(weekBest.lbs, unit),
      reps: weekBest.reps,
      e1rm: fromLbs(weekBest.e1rm, unit),
      previous: fromLbs(priorBest.e1rm, unit),
    }
  }

  // The heaviest earlier weight at each rep count; a Rep PR needs one to beat.
  const heaviest = new Map<number, number>()
  for (const s of weighted(ex.before)) heaviest.set(s.reps, Math.max(heaviest.get(s.reps) ?? 0, s.lbs))
  const repPr = best(
    weighted(ex.week).filter((s) => s.reps <= MAX_PR_REPS && s.lbs > (heaviest.get(s.reps) ?? Infinity)),
    (s) => s.lbs / (heaviest.get(s.reps) as number),
  )
  if (repPr?.e1rm != null) {
    return {
      ...base,
      kind: 'rep',
      weight: fromLbs(repPr.lbs, unit),
      reps: repPr.reps,
      e1rm: fromLbs(repPr.e1rm, unit),
      previous: fromLbs(heaviest.get(repPr.reps) as number, unit),
    }
  }

  const weekReps = best(bodyweight(ex.week), (s) => s.reps)
  const priorReps = best(bodyweight(ex.before), (s) => s.reps)
  if (weekReps && priorReps && weekReps.reps > priorReps.reps) {
    return { ...base, kind: 'rep', weight: 0, reps: weekReps.reps, e1rm: null, previous: priorReps.reps }
  }
  return null
}

/**
 * The personal records set in [weekStart, weekEnd), at most one per exercise,
 * judged only against the history before weekStart, from sets of 1 to 12 reps.
 * e1RM PRs first, then by name.
 */
export function computeWeekRecords(history: HistorySet[], weekStart: Date, weekEnd: Date, unit: WeightUnit = 'lbs'): WeekRecord[] {
  const records: WeekRecord[] = []
  for (const [id, ex] of byExercise(history, weekStart, weekEnd)) {
    const record = recordFor(id, ex, unit)
    if (record) records.push(record)
  }
  return records.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'e1rm' ? -1 : 1))
}

/** Each session's best e1RM from sets of 12 reps or fewer, oldest first; sessions with none are left out. */
function sessionE1rms(sets: Lb[]): Array<{ completedAt: number; e1rm: number }> {
  const sessions = new Map<string, { completedAt: number; e1rm: number }>()
  for (const s of sets) {
    const e1rm = prE1rm(s)
    if (e1rm == null) continue
    const session = sessions.get(s.completionId)
    if (!session) sessions.set(s.completionId, { completedAt: s.completedAt, e1rm })
    else session.e1rm = Math.max(session.e1rm, e1rm)
  }
  return [...sessions.values()].sort((a, b) => a.completedAt - b.completedAt)
}

/**
 * Every exercise with working sets in [weekStart, weekEnd), most working sets
 * first. e1RMs come from sets of 12 reps or fewer: a week of only higher-rep
 * sets has no e1RM, change or Flat, and its best set is the heaviest (more
 * reps on a tie), or the most reps for bodyweight.
 */
export function computeWeekLifts(history: HistorySet[], weekStart: Date, weekEnd: Date, unit: WeightUnit = 'lbs'): WeekLift[] {
  const lifts: WeekLift[] = []
  for (const [id, ex] of byExercise(history, weekStart, weekEnd)) {
    if (ex.week.length === 0) continue
    const top =
      best(ex.week, prE1rm) ??
      heaviestSet(weighted(ex.week)) ??
      (best(ex.week, (s) => s.reps) as Lb)
    const sessions = sessionE1rms([...ex.before, ...ex.week])
    const start = weekStart.getTime()
    const previous = sessions.filter((s) => s.completedAt < start).at(-1)
    const bestE1rm = sessions.length === 0 ? null : Math.max(...sessions.map((s) => s.e1rm))
    const lastBest = bestE1rm == null ? -1 : sessions.findLastIndex((s) => s.e1rm >= bestE1rm)
    lifts.push({
      exerciseDefinitionId: id,
      name: ex.name,
      workingSets: ex.week.length,
      bestSet: { weight: fromLbs(top.lbs, unit), reps: top.reps },
      e1rm: prE1rm(top) == null ? null : fromLbs(top.e1rm as number, unit),
      previousE1rm: previous ? fromLbs(previous.e1rm, unit) : null,
      bestE1rm: bestE1rm == null ? null : fromLbs(bestE1rm, unit),
      sessionsBelowBest: lastBest < 0 ? 0 : sessions.length - 1 - lastBest,
    })
  }
  return lifts.sort((a, b) => b.workingSets - a.workingSets || a.name.localeCompare(b.name))
}

/**
 * The note under the 8-week chart. `weeks` are the chart weeks, oldest first,
 * the shown week last; `normalWeeks` the prior weeks the normal averages, the
 * first being the week of the first workout. Null with fewer than 3 of them.
 * An open (unfinished) shown week is never the light week.
 */
export function computeTrendNote(
  weeks: WeekStats[],
  normalWeeks: WeekStats[],
  { openWeek = false }: { openWeek?: boolean } = {},
): TrendNote | null {
  if (normalWeeks.length < MIN_TREND_WEEKS || weeks.length === 0) return null

  // Rising effort: count back from the shown week while each week's RPE is above the one before.
  const rpe = (i: number) => weeks[i]?.effort?.avgRpe ?? null
  const last = weeks.length - 1
  let from = last
  while (from > 0 && rpe(from) != null && rpe(from - 1) != null && (rpe(from - 1) as number) < (rpe(from) as number)) from--
  const rising = rpe(last) == null ? 0 : last - from + 1
  const effort =
    rising >= MIN_RISING_WEEKS
      ? { effortRisingWeeks: rising, effortFrom: rpe(from), effortTo: rpe(last) }
      : { effortRisingWeeks: 0, effortFrom: null, effortTo: null }

  // Light: working sets at or under 60% of the normal's mean, counted from the first workout's week.
  const normalSets = normalWeeks.reduce((sum, w) => sum + w.workingSets, 0)
  const firstWeek = normalWeeks[0].weekStart
  const lightWeeksSearched = weeks.filter((w) => w.weekStart >= firstWeek).length
  let lastLightWeeksAgo: number | null = null
  for (let i = openWeek ? last - 1 : last; i >= 0 && weeks[i].weekStart >= firstWeek; i--) {
    if (weeks[i].workingSets * 5 * normalWeeks.length <= normalSets * 3) {
      lastLightWeeksAgo = last - i
      break
    }
  }
  return { ...effort, lastLightWeeksAgo, lightWeeksSearched }
}
