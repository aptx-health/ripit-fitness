import { Prisma, type PrismaClient } from '@prisma/client'
import { setEffort } from '@/lib/aggregates/compute'

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

type ReportDb = Pick<PrismaClient, 'workoutCompletion' | 'loggedCardioSession' | 'userSettings' | '$queryRaw'>

const COUNTED = { status: 'completed', isArchived: false } as const

/**
 * The report for one week: four queries for the week, the 8 before it and the
 * date of the first workout, plus one grouped count when the streak runs back
 * past those 8 weeks. The normal averages only the prior weeks that start on
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

  const [settings, first, completions, cardio] = await Promise.all([
    db.userSettings.findUnique({ where: { userId }, select: { weeklyWorkoutTarget: true } }),
    db.workoutCompletion.findFirst({
      where: { userId, ...COUNTED },
      select: { completedAt: true },
      orderBy: { completedAt: 'asc' },
    }),
    db.workoutCompletion.findMany({
      where: { userId, ...COUNTED, completedAt: { gte: rangeStart, lt: rangeEnd } },
      select: {
        completedAt: true,
        startedAt: true,
        durationSeconds: true,
        loggedSets: { select: { isWarmup: true, rpe: true, rir: true } },
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
  ])
  const target = settings?.weeklyWorkoutTarget ?? DEFAULT_WEEKLY_WORKOUT_TARGET

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

  return {
    weekStart,
    isCurrentWeek: weekStartFor(now, timeZone) === weekStart,
    target,
    programWeek: programRow ? { weekNumber: programRow.weekNumber, programName: programRow.program.name } : null,
    current,
    normal: computeNormal(sinceFirst),
    normalWeeks: sinceFirst.length,
    streak: computeStreak(counts, target, now < rangeEnd),
    weeks: summary.slice(1),
  }
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
