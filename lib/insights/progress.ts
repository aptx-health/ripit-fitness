import { Prisma, type PrismaClient } from '@prisma/client'
import { setEffort } from '@/lib/aggregates/compute'
import { loadPinned, type PinnedLift, resolvePins } from '@/lib/insights/pinned-lifts'
import {
  computeTrendNote,
  computeWeekLifts,
  computeWeekRecords,
  type HistorySet,
  LBS_PER_KG,
  MAX_PR_REPS,
  type TrendNote,
  type WeekLift,
  type WeekRecord,
  type WeightUnit,
} from '@/lib/insights/progress-records'

/**
 * The Progress tab's weekly report (S1): one week compared with the user's
 * normal (the mean of the 8 weeks before it), the last 8 weeks of working
 * sets, and the streak of weeks that hit the weekly workout target.
 *
 * Weeks run Monday to Sunday in the user's local timezone, named by their
 * Monday as 'YYYY-MM-DD'. Only completed, un-archived workouts count. Raw
 * numbers only: the page decides how to phrase them.
 */

export interface WorkoutInput {
  completedAt: Date
  startedAt: Date | null
  durationSeconds: number | null
  sets: Array<{ isWarmup: boolean; rpe: number | null; rir: number | null }>
}

export interface CardioInput {
  completedAt: Date
  durationMinutes: number
}

export interface WeekEffort {
  /** Mean effort of the rated working sets (RIR read as 10 minus RIR). */
  avgRpe: number
  /** Whole percent of rated working sets at 9 or more. */
  pctAtOrAbove9: number
  setsAt10: number
  ratedSets: number
}

export interface WeekStats {
  weekStart: string
  workouts: number
  workingSets: number
  durationSeconds: number
  cardioMinutes: number
  /** Null when fewer than half of the working sets are rated. */
  effort: WeekEffort | null
}

export interface WeekNormal {
  workouts: number
  workingSets: number
  durationSeconds: number
  cardioMinutes: number
  avgRpe: number | null
}

export interface WeeklyReport {
  weekStart: string
  isCurrentWeek: boolean
  target: number
  programWeek: { weekNumber: number; programName: string } | null
  current: WeekStats
  /** The mean of the prior weeks (up to 8) since the user's first workout. */
  normal: WeekNormal
  /** How many weeks `normal` averages; 0 means there is nothing to compare with. */
  normalWeeks: number
  streak: number
  /** The 8 weeks ending with the selected one, oldest first. */
  weeks: WeekStats[]
  /** The user's unit; every weight in records and lifts is in it. */
  weightUnit: WeightUnit
  /** Personal records set in the selected week (S2). */
  records: WeekRecord[]
  /** Every exercise done in the selected week (S2). */
  lifts: WeekLift[]
  /** The note under the chart; null with fewer than 3 weeks of history (S2). */
  trend: TrendNote | null
  /** The pinned lifts, in pin order (S3). Optional: reports from before S3 have none. */
  pinned?: PinnedLift[]
}

export const DEFAULT_WEEKLY_WORKOUT_TARGET = 3
/** Weeks in the normal, and in the chart. */
const NORMAL_WEEKS = 8
const DAY_MS = 86_400_000

// --- civil dates and zones ------------------------------------------------------

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(timeZone, f)
  }
  return f
}

/** The instant's local wall-clock time, read as if it were UTC, in ms. */
function wallClockMs(instant: number, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'), instant % 1000)
}

const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`)

/** True for a zone name Intl accepts, e.g. 'America/Denver' or 'UTC'. */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64) return false
  try {
    formatter(timeZone)
    return true
  } catch {
    return false
  }
}

/** The local Monday of the instant's week, as 'YYYY-MM-DD'. */
export function weekStartFor(instant: Date, timeZone: string): string {
  const local = new Date(wallClockMs(instant.getTime(), timeZone))
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  const sinceMonday = (local.getUTCDay() + 6) % 7
  return toDay(midnight - sinceMonday * DAY_MS)
}

/** Civil-date arithmetic in whole weeks; n may be negative. */
export function addWeeks(weekStart: string, n: number): string {
  return toDay(dayMs(weekStart) + n * 7 * DAY_MS)
}

/** Local 00:00 of a civil date, as an instant. */
function localMidnight(day: string, timeZone: string): Date {
  const guess = dayMs(day)
  const first = guess - (wallClockMs(guess, timeZone) - guess)
  return new Date(guess - (wallClockMs(first, timeZone) - first))
}

/** Local Monday 00:00 to the next local Monday 00:00 (exclusive). */
export function weekBounds(weekStart: string, timeZone: string): { start: Date; end: Date } {
  return { start: localMidnight(weekStart, timeZone), end: localMidnight(addWeeks(weekStart, 1), timeZone) }
}

// --- weekly maths ---------------------------------------------------------------

/** A workout's time: the stored duration, else finish minus start, else 0. */
function workoutSeconds(w: WorkoutInput): number {
  if (w.durationSeconds != null) return w.durationSeconds
  if (!w.startedAt) return 0
  return Math.max(0, Math.round((w.completedAt.getTime() - w.startedAt.getTime()) / 1000))
}

function weekEffort(efforts: number[], workingSets: number): WeekEffort | null {
  if (efforts.length === 0 || efforts.length * 2 < workingSets) return null
  return {
    avgRpe: efforts.reduce((a, b) => a + b, 0) / efforts.length,
    pctAtOrAbove9: Math.round((efforts.filter((e) => e >= 9).length / efforts.length) * 100),
    setsAt10: efforts.filter((e) => e >= 10).length,
    ratedSets: efforts.length,
  }
}

/** One entry per weekStart, in the order given; items outside every week are ignored. */
export function summarizeWeeks({
  workouts,
  cardio,
  weekStarts,
  timeZone,
}: {
  workouts: WorkoutInput[]
  cardio: CardioInput[]
  weekStarts: string[]
  timeZone: string
}): WeekStats[] {
  const acc = new Map(
    weekStarts.map((weekStart) => [
      weekStart,
      { weekStart, workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, efforts: [] as number[] },
    ]),
  )
  for (const w of workouts) {
    const week = acc.get(weekStartFor(w.completedAt, timeZone))
    if (!week) continue
    week.workouts++
    week.durationSeconds += workoutSeconds(w)
    for (const s of w.sets) {
      if (s.isWarmup) continue
      week.workingSets++
      const effort = setEffort(s)
      if (effort != null) week.efforts.push(effort)
    }
  }
  for (const c of cardio) {
    const week = acc.get(weekStartFor(c.completedAt, timeZone))
    if (week) week.cardioMinutes += c.durationMinutes
  }
  return weekStarts.map((weekStart) => {
    const { efforts, ...week } = acc.get(weekStart) as NonNullable<ReturnType<typeof acc.get>>
    return { ...week, effort: weekEffort(efforts, week.workingSets) }
  })
}

/** The plain mean of the given weeks; avgRpe is the mean over the weeks that have effort. */
export function computeNormal(weeks: WeekStats[]): WeekNormal {
  const mean = (pick: (w: WeekStats) => number) =>
    weeks.length === 0 ? 0 : weeks.reduce((sum, w) => sum + pick(w), 0) / weeks.length
  const rated = weeks.flatMap((w) => (w.effort ? [w.effort.avgRpe] : []))
  return {
    workouts: mean((w) => w.workouts),
    workingSets: mean((w) => w.workingSets),
    durationSeconds: mean((w) => w.durationSeconds),
    cardioMinutes: mean((w) => w.cardioMinutes),
    avgRpe: rated.length === 0 ? null : rated.reduce((a, b) => a + b, 0) / rated.length,
  }
}

/** Whole percent change; null when there is no normal to compare with. */
export function percentChange(value: number, normal: number | null): number | null {
  if (normal == null || normal === 0) return null
  return Math.round(((value - normal) / normal) * 100) || 0
}

/**
 * Weeks in a row, ending at the newest, with at least `target` workouts
 * (counts run oldest to newest). An open newest week adds to the streak when
 * it hits the target and never breaks it when it doesn't.
 */
export function computeStreak(weeklyWorkouts: number[], target: number, openWeek: boolean): number {
  let i = weeklyWorkouts.length - 1
  let streak = 0
  if (openWeek && i >= 0) {
    if (weeklyWorkouts[i] >= target) streak++
    i--
  }
  while (i >= 0 && weeklyWorkouts[i] >= target) {
    streak++
    i--
  }
  return streak
}

// --- the loader -----------------------------------------------------------------

type ReportDb = Pick<
  PrismaClient,
  'workoutCompletion' | 'loggedCardioSession' | 'userSettings' | 'pinnedExercise' | 'userTrainingProfile' | 'exerciseDefinition' | '$queryRaw'
>

const COUNTED = { status: 'completed', isArchived: false } as const

/** The set fields records and lifts need. */
const HISTORY_SET = {
  reps: true,
  weight: true,
  weightUnit: true,
  isWarmup: true,
  exercise: { select: { exerciseDefinitionId: true, exerciseDefinition: { select: { name: true } } } },
} as const

/**
 * The report for one week: four queries for the week, the 8 before it and the
 * date of the first workout, one for the earlier best sets of the exercises
 * done that week (records and lifts), plus one grouped count when the streak runs
 * back past those 8 weeks. Pins add three queries, and two more for their names
 * and last sessions, however many there are. The normal averages only the prior weeks that start on
 * or after the week of the first workout; gaps after it count as 0.
 */
export async function getWeeklyReport(
  db: ReportDb,
  userId: string,
  { weekStart, timeZone, now = new Date() }: { weekStart: string; timeZone: string; now?: Date },
): Promise<WeeklyReport> {
  const weekStarts = Array.from({ length: NORMAL_WEEKS + 1 }, (_, i) => addWeeks(weekStart, i - NORMAL_WEEKS))
  const rangeStart = weekBounds(weekStarts[0], timeZone).start
  const rangeEnd = weekBounds(weekStart, timeZone).end

  const [settings, first, completions, cardio, pins] = await Promise.all([
    db.userSettings.findUnique({ where: { userId }, select: { weeklyWorkoutTarget: true, defaultWeightUnit: true } }),
    db.workoutCompletion.findFirst({
      where: { userId, ...COUNTED },
      select: { completedAt: true },
      orderBy: { completedAt: 'asc' },
    }),
    db.workoutCompletion.findMany({
      where: { userId, ...COUNTED, completedAt: { gte: rangeStart, lt: rangeEnd } },
      select: {
        id: true,
        completedAt: true,
        startedAt: true,
        durationSeconds: true,
        loggedSets: { select: { rpe: true, rir: true, ...HISTORY_SET } },
        workout: {
          select: { week: { select: { weekNumber: true, program: { select: { name: true, isActive: true, userId: true } } } } },
        },
      },
      orderBy: { completedAt: 'desc' },
    }),
    db.loggedCardioSession.findMany({
      where: { userId, status: 'completed', completedAt: { gte: rangeStart, lt: rangeEnd } },
      select: { completedAt: true, duration: true },
    }),
    resolvePins(db, userId),
  ])
  const target = settings?.weeklyWorkoutTarget ?? DEFAULT_WEEKLY_WORKOUT_TARGET
  const weightUnit: WeightUnit = settings?.defaultWeightUnit === 'kg' ? 'kg' : 'lbs'
  const { start: shownStart } = weekBounds(weekStart, timeZone)

  // Records and lifts: the sets in range, plus the earlier sets of this week's exercises that can matter.
  const inRange = completions.flatMap((c) => c.loggedSets.map((s) => historySet(s, c)))
  const shownIds = [...new Set(inRange.filter((s) => s.completedAt >= shownStart).map((s) => s.exerciseDefinitionId))]
  const doneIds = new Set(inRange.filter((s) => s.completedAt >= shownStart && !s.isWarmup).map((s) => s.exerciseDefinitionId))
  const [earlier, pinnedRows] = await Promise.all([
    earlierBestSets(db, userId, shownIds, rangeStart),
    loadPinned(db, userId, { pins, doneIds, weekEnd: rangeEnd, unit: weightUnit }),
  ])
  const history = [...inRange, ...earlier]
  const lifts = computeWeekLifts(history, shownStart, rangeEnd, weightUnit)

  const summary = summarizeWeeks({
    workouts: completions.map((c) => ({ ...c, sets: c.loggedSets })),
    cardio: cardio.map((c) => ({ completedAt: c.completedAt, durationMinutes: c.duration })),
    weekStarts,
    timeZone,
  })
  const prior = summary.slice(0, NORMAL_WEEKS)
  const current = summary[NORMAL_WEEKS]
  const firstWeek = first ? weekStartFor(first.completedAt, timeZone) : null
  const sinceFirst = firstWeek ? prior.filter((w) => w.weekStart >= firstWeek) : []

  // The streak only needs older weeks when every week in range hit the target.
  let counts = summary.map((w) => w.workouts)
  if (prior.every((w) => w.workouts >= target)) {
    const older = await olderStreakWeeks(db, userId, addWeeks(weekStarts[0], -1), rangeStart, target, timeZone)
    counts = [0, ...Array.from({ length: older }, () => target), ...counts]
  }

  const programRow = completions.find(
    (c) =>
      weekStartFor(c.completedAt, timeZone) === weekStart &&
      c.workout?.week.program.isActive &&
      c.workout.week.program.userId === userId,
  )?.workout?.week

  const weeks = summary.slice(1)
  return {
    weekStart,
    isCurrentWeek: weekStartFor(now, timeZone) === weekStart,
    target,
    programWeek: programRow ? { weekNumber: programRow.weekNumber, programName: programRow.program.name } : null,
    current,
    normal: computeNormal(sinceFirst),
    normalWeeks: sinceFirst.length,
    streak: computeStreak(counts, target, now < rangeEnd),
    weeks,
    weightUnit,
    records: computeWeekRecords(history, shownStart, rangeEnd, weightUnit),
    lifts,
    trend: computeTrendNote(weeks, sinceFirst, { openWeek: now < rangeEnd }),
    pinned: pinnedRows.map(({ last, ...pin }) => {
      const lift = lifts.find((l) => l.exerciseDefinitionId === pin.exerciseDefinitionId) ?? null
      return { ...pin, lift, last: lift ? null : last }
    }),
  }
}

function historySet(
  s: { reps: number; weight: number; weightUnit: string; isWarmup: boolean; exercise: { exerciseDefinitionId: string; exerciseDefinition: { name: string } } },
  completion: { id: string; completedAt: Date },
): HistorySet {
  return {
    completionId: completion.id,
    completedAt: completion.completedAt,
    exerciseDefinitionId: s.exercise.exerciseDefinitionId,
    name: s.exercise.exerciseDefinition.name,
    reps: s.reps,
    weight: s.weight,
    weightUnit: s.weightUnit,
    isWarmup: s.isWarmup,
  }
}

/**
 * The earlier working sets (before `before`) of the given exercises that can
 * change a record or a lift, so the rows grow with sessions, not with sets:
 * each session's best-e1RM set (Lifts), each exercise's heaviest set at each
 * of 1 to 12 reps (Records: the best e1RM at 12 reps or fewer is one of them),
 * and its most-reps bodyweight set. The pure functions give the same answers on these
 * as on every set. One query; e1RM is compared in pounds, as there.
 */
async function earlierBestSets(db: ReportDb, userId: string, exerciseDefinitionIds: string[], before: Date): Promise<HistorySet[]> {
  if (exerciseDefinitionIds.length === 0) return []
  const rows = await db.$queryRaw<Array<Omit<HistorySet, 'isWarmup'>>>(Prisma.sql`
    WITH s AS (
      SELECT ls.id, ls.reps, ls.weight, ls."weightUnit", c.id AS "completionId", c."completedAt",
             e."exerciseDefinitionId", d.name,
             ls.weight * CASE WHEN ls."weightUnit" = 'kg' THEN ${LBS_PER_KG} ELSE 1 END AS lbs
      FROM "LoggedSet" ls
      JOIN "WorkoutCompletion" c ON c.id = ls."completionId"
      JOIN "Exercise" e ON e.id = ls."exerciseId"
      JOIN "ExerciseDefinition" d ON d.id = e."exerciseDefinitionId"
      WHERE c."userId" = ${userId}
        AND c.status = 'completed'
        AND c."isArchived" = false
        AND ls."isWarmup" = false
        AND c."completedAt" < (${before.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        AND e."exerciseDefinitionId" = ANY(${exerciseDefinitionIds}::text[])
    ),
    w AS (
      SELECT *, CASE WHEN reps = 1 THEN lbs ELSE lbs * (1 + reps / 30.0) END AS e1rm FROM s WHERE lbs > 0
    )
    SELECT id, reps, weight, "weightUnit", "completionId", "completedAt", "exerciseDefinitionId", name FROM (
      (SELECT DISTINCT ON ("exerciseDefinitionId", "completionId") * FROM w
        ORDER BY "exerciseDefinitionId", "completionId", e1rm DESC)
      UNION
      (SELECT DISTINCT ON ("exerciseDefinitionId", reps) * FROM w WHERE reps <= ${MAX_PR_REPS}
        ORDER BY "exerciseDefinitionId", reps, lbs DESC)
      UNION
      (SELECT DISTINCT ON ("exerciseDefinitionId") *, NULL::double precision AS e1rm FROM s WHERE lbs <= 0
        ORDER BY "exerciseDefinitionId", reps DESC)
    ) best
  `)
  return rows.map((r) => ({ ...r, reps: Number(r.reps), weight: Number(r.weight), isWarmup: false }))
}

/**
 * How many weeks in a row, ending with `lastWeek` and going back, had at least
 * `target` workouts. One grouped query: workouts are counted per local week in
 * the database, weeks under the target are dropped, and the run stops at the
 * first week missing from the sequence.
 */
async function olderStreakWeeks(
  db: ReportDb,
  userId: string,
  lastWeek: string,
  before: Date,
  target: number,
  timeZone: string,
): Promise<number> {
  const rows = await db.$queryRaw<Array<{ weeks: number }>>(Prisma.sql`
    WITH hit AS (
      SELECT date_trunc('week', c."completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date AS week
      FROM "WorkoutCompletion" c
      WHERE c."userId" = ${userId}
        AND c.status = 'completed'
        AND c."isArchived" = false
        AND c."completedAt" < (${before.toISOString()}::timestamptz AT TIME ZONE 'UTC')
      GROUP BY 1
      HAVING COUNT(*) >= ${target}
    ),
    ranked AS (
      SELECT week, ROW_NUMBER() OVER (ORDER BY week DESC) AS n FROM hit
    )
    SELECT COUNT(*)::int AS weeks FROM ranked
    WHERE week = ${lastWeek}::date - ((n - 1) * 7)::int
  `)
  return rows[0]?.weeks ?? 0
}
