/**
 * Progress S1 (weekly report), the DB loader. Real test DB.
 * Spec: features/analytics/weekly-report.feature (work item 107).
 *
 * Pinned interface (`@/lib/insights/progress`; the pure helpers are pinned in
 * progress.test.ts):
 *   getWeeklyReport(db: PrismaClient, userId: string,
 *                   opts: { weekStart: string; timeZone: string; now?: Date }): Promise<WeeklyReport>
 *     WeeklyReport = {
 *       weekStart: string                 // 'YYYY-MM-DD', the selected local Monday
 *       isCurrentWeek: boolean            // `now` (default: the clock) falls in it
 *       target: number                    // UserSettings.weeklyWorkoutTarget, 3 with no settings row
 *       programWeek: { weekNumber: number; programName: string } | null
 *       current: WeekStats                // the selected week
 *       normal: ReturnType<computeNormal> // the 8 weeks before the selected week
 *       streak: number                    // computeStreak over the weeks up to the selected one
 *       weeks: WeekStats[]                // the 8 weeks ending with the selected one, oldest first
 *     }
 *   Counts completed, un-archived WorkoutCompletion rows of this user, their
 *   non-warm-up LoggedSets, and this user's completed LoggedCardioSession rows
 *   (`duration` is minutes). The program week is the Week of the ACTIVE
 *   program that the latest counted workout of the selected week belongs to.
 *
 * "Now" is Wednesday 2026-10-28 12:00 Denver. The selected week is Monday
 * 2026-10-26 (it contains the fall DST change on Sunday 11-01). The eight
 * weeks before it start 2026-08-31 .. 2026-10-19.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const load = (spec: string) => import(/* @vite-ignore */ spec)
type Effort = { avgRpe: number; pctAtOrAbove9: number; setsAt10: number; ratedSets: number }
type Stats = {
  weekStart: string
  workouts: number
  workingSets: number
  durationSeconds: number
  cardioMinutes: number
  effort: Effort | null
}
type Report = {
  weekStart: string
  isCurrentWeek: boolean
  target: number
  programWeek: { weekNumber: number; programName: string } | null
  current: Stats
  normal: { workouts: number; workingSets: number; durationSeconds: number; cardioMinutes: number; avgRpe: number | null }
  streak: number
  weeks: Stats[]
}
type Opts = { weekStart: string; timeZone: string; now?: Date }

const DEN = 'America/Denver'
const NOW = new Date('2026-10-28T18:00:00Z')
const THIS_WEEK = '2026-10-26'
// The eight weeks before THIS_WEEK, oldest first.
const PRIOR = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']

let prisma: PrismaClient
let userId: string
let otherUserId: string
let defId: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  defId = (await createTestExerciseDefinition(prisma, { name: 'Bench Press', primaryFAUs: ['chest'] })).id
})

async function report(opts: Partial<Opts> = {}, forUser = userId): Promise<Report> {
  const mod = (await load('@/lib/insights/progress')) as {
    getWeeklyReport: (db: PrismaClient, userId: string, opts: Opts) => Promise<Report>
  }
  return mod.getWeeklyReport(prisma, forUser, { weekStart: THIS_WEEK, timeZone: DEN, now: NOW, ...opts })
}

// --- time ----------------------------------------------------------------------
function offsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - Math.floor(instant / 1000) * 1000
}
/** Local wall-clock time in Denver as a UTC instant. */
function at(day: string, time = '12:00', tz = DEN): Date {
  const guess = Date.parse(`${day}T${time}:00Z`)
  const first = guess - offsetMs(guess, tz)
  return new Date(guess - offsetMs(first, tz))
}
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

// --- seeding ---------------------------------------------------------------------
type SetSpec = { rpe?: number | null; rir?: number | null; warmup?: boolean }
type Seed = {
  at: Date
  userId?: string
  status?: string
  archived?: boolean
  durationSeconds?: number | null
  startedAt?: Date | null
  sets?: number | SetSpec[]
  workoutId?: string | null
}
async function seed(o: Seed) {
  const owner = o.userId ?? userId
  const completion = await prisma.workoutCompletion.create({
    data: {
      userId: owner,
      status: o.status ?? 'completed',
      completedAt: o.at,
      startedAt: o.startedAt ?? null,
      durationSeconds: o.durationSeconds ?? null,
      isArchived: o.archived ?? false,
      isAdHoc: o.workoutId == null,
      workoutId: o.workoutId ?? null,
    },
  })
  const exercise = await prisma.exercise.create({
    data: { name: 'Bench Press', exerciseDefinitionId: defId, order: 1, userId: owner, workoutCompletionId: completion.id, isOneOff: o.workoutId == null },
  })
  const specs: SetSpec[] = typeof o.sets === 'number' ? Array.from({ length: o.sets }, () => ({})) : (o.sets ?? [{}])
  if (specs.length > 0) {
    await prisma.loggedSet.createMany({
      data: specs.map((s, i) => ({
        setNumber: i + 1,
        reps: 5,
        weight: 100,
        weightUnit: 'lbs',
        rpe: s.rpe ?? null,
        rir: s.rir ?? null,
        isWarmup: s.warmup ?? false,
        exerciseId: exercise.id,
        completionId: completion.id,
        userId: owner,
        createdAt: o.at,
      })),
    })
  }
  return completion
}
/** `n` (up to 4) workouts on the first days of a week at 10:00, each with `sets` working sets. */
async function seedWeek(weekStart: string, n: number, sets: number | SetSpec[] = 1, extra: Partial<Seed> = {}) {
  for (let i = 0; i < n; i++) await seed({ at: at(addDays(weekStart, i), '10:00'), sets, ...extra })
}
const cardio = (when: Date, duration: number, o: { userId?: string; status?: string } = {}) =>
  prisma.loggedCardioSession.create({
    data: { userId: o.userId ?? userId, completedAt: when, status: o.status ?? 'completed', name: 'Bike', equipment: 'bike', duration },
  })
const setTarget = (n: number, owner = userId) =>
  prisma.userSettings.create({ data: { userId: owner, weeklyWorkoutTarget: n } as never })

// ---------------------------------------------------------------------------
describe('the weeks', () => {
  it('Week navigator: the current week is selected, flagged current, and the chart covers the 8 weeks ending with it', async () => {
    const r = await report()
    expect(r.weekStart).toBe(THIS_WEEK)
    expect(r.isCurrentWeek).toBe(true)
    expect(r.weeks.map((w) => w.weekStart)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
  })

  it('Week navigator: an earlier week is not current, and the chart moves back with it', async () => {
    const r = await report({ weekStart: '2026-10-19' })
    expect(r.weekStart).toBe('2026-10-19')
    expect(r.isCurrentWeek).toBe(false)
    expect(r.weeks).toHaveLength(8)
    expect(r.weeks[7].weekStart).toBe('2026-10-19')
    expect(r.weeks[0].weekStart).toBe('2026-08-31')
  })

  it('a Sunday-evening workout counts in its local week: Sunday 21:00 Denver (Monday 03:00 UTC) belongs to the week before', async () => {
    const when = at('2026-10-25', '21:00')
    expect(when.toISOString()).toBe('2026-10-26T03:00:00.000Z')
    await seed({ at: when, sets: 4 })

    const before = await report({ weekStart: '2026-10-19' })
    expect(before.current.workouts).toBe(1)
    expect(before.current.workingSets).toBe(4)
    const after = await report({ weekStart: THIS_WEEK })
    expect(after.current.workouts).toBe(0)
    // The same row in UTC lands in the Monday week: the zone decides.
    const utc = await report({ weekStart: THIS_WEEK, timeZone: 'UTC' })
    expect(utc.current.workouts).toBe(1)
  })

  it('Sunday night after the clocks went back (11-01 23:00 MST) is still in the week of 10-26; Monday 00:30 starts the next', async () => {
    await seed({ at: at('2026-11-01', '23:00'), sets: 2 })
    await seed({ at: at('2026-11-02', '00:30'), sets: 3 })
    const now = new Date('2026-11-03T18:00:00Z')
    const old = await report({ weekStart: THIS_WEEK, now })
    expect(old.current.workouts).toBe(1)
    expect(old.current.workingSets).toBe(2)
    expect(old.isCurrentWeek).toBe(false)
    const next = await report({ weekStart: '2026-11-02', now })
    expect(next.current.workouts).toBe(1)
    expect(next.current.workingSets).toBe(3)
    expect(next.isCurrentWeek).toBe(true)
  })

  it('the chart has each week\'s own working sets, oldest first, the selected week last', async () => {
    const sets = [40, 0, 52, 61, 58, 47, 70, 66]
    for (let i = 0; i < 8; i++) {
      const monday = addDays('2026-09-07', i * 7)
      if (sets[i] > 0) await seed({ at: at(monday, '12:00'), sets: sets[i] })
    }
    const r = await report()
    expect(r.weeks.map((w) => w.workingSets)).toEqual(sets)
    expect(r.current.workingSets).toBe(66)
    expect(r.weeks[7]).toMatchObject({ weekStart: THIS_WEEK, workingSets: 66, workouts: 1 })
  })
})

describe('the report card', () => {
  it('Workouts against the target: counts this week\'s completed workouts and averages the 8 weeks before', async () => {
    await seedWeek(THIS_WEEK, 3)
    const counts = [3, 3, 4, 3, 4, 3, 4, 3] // 27 / 8
    for (let i = 0; i < 8; i++) await seedWeek(PRIOR[i], counts[i])
    const r = await report()
    expect(r.current.workouts).toBe(3)
    expect(r.target).toBe(3)
    expect(r.normal.workouts).toBeCloseTo(3.375, 5)
  })

  it('Working sets against normal: 66 this week against an 8-week average of 58, warm-ups left out', async () => {
    await seed({ at: at('2026-10-26', '12:00'), sets: [...Array.from({ length: 30 }, () => ({})), ...Array.from({ length: 6 }, () => ({ warmup: true }))] })
    await seed({ at: at('2026-10-28', '08:00'), sets: 36 })
    for (const w of PRIOR) await seed({ at: at(w, '12:00'), sets: [...Array.from({ length: 58 }, () => ({})), { warmup: true }, { warmup: true }] })
    const r = await report()
    expect(r.current.workingSets).toBe(66)
    expect(r.normal.workingSets).toBeCloseTo(58, 5)
  })

  it('Time trained: workout time and cardio minutes are separate sums for the week', async () => {
    await seed({ at: at('2026-10-26', '12:00'), durationSeconds: 3600 })
    await seed({ at: at('2026-10-27', '12:00'), durationSeconds: 4020 })
    await seed({ at: at('2026-10-28', '08:00'), durationSeconds: 4500 })
    await cardio(at('2026-10-27', '07:00'), 20)
    await cardio(at('2026-10-28', '07:00'), 15)
    await cardio(at('2026-10-20', '07:00'), 60) // last week
    const r = await report()
    expect(r.current.durationSeconds).toBe(12120) // 3h 22m
    expect(r.current.cardioMinutes).toBe(35)
  })

  it('a workout without a duration uses completedAt minus startedAt, or counts as 0 when neither is known', async () => {
    await seed({ at: at('2026-10-26', '12:45'), startedAt: at('2026-10-26', '12:00') }) // 45 min
    await seed({ at: at('2026-10-27', '12:00') }) // unknown
    await seed({ at: at('2026-10-28', '08:00'), durationSeconds: 600, startedAt: at('2026-10-28', '06:00') }) // stored wins
    const r = await report()
    expect(r.current.workouts).toBe(3)
    expect(r.current.durationSeconds).toBe(2700 + 600)
  })

  it('a Follow Along workout with no logged sets still counts as a workout, with its time and no sets', async () => {
    await seed({ at: at('2026-10-27', '12:00'), sets: 0, durationSeconds: 1800 })
    const r = await report()
    expect(r.current).toMatchObject({ workouts: 1, workingSets: 0, durationSeconds: 1800, effort: null })
    expect(r.weeks[7].workouts).toBe(1)
  })

  it('the time normal is the 8-week mean of workout time', async () => {
    for (let i = 0; i < 8; i++) await seed({ at: at(PRIOR[i], '12:00'), durationSeconds: i % 2 === 0 ? 3600 : 7200 })
    const r = await report()
    expect(r.normal.durationSeconds).toBeCloseTo(5400, 5)
  })

  it('cardio counts only this user\'s completed sessions', async () => {
    await cardio(at('2026-10-27', '07:00'), 30)
    await cardio(at('2026-10-27', '08:00'), 45, { userId: otherUserId })
    const r = await report()
    expect(r.current.cardioMinutes).toBe(30)
  })

  it('Effort: average RPE, share at 9+ and sets at 10 from rated working sets, RIR read as 10 minus RIR', async () => {
    // RPE and RIR are whole numbers in the DB. 13 rated sets: 10, 10 (RIR 0), 9, 9 and nine at 8
    // (six RPE 8, three RIR 2): mean 110 / 13 = 8.46, 4 of 13 at 9+, 2 at 10.
    const rated: SetSpec[] = [
      { rpe: 10 },
      { rir: 0 },
      { rpe: 9 },
      { rpe: 9 },
      ...Array.from({ length: 6 }, () => ({ rpe: 8 })),
      ...Array.from({ length: 3 }, () => ({ rir: 2 })),
    ]
    await seed({ at: at('2026-10-27', '12:00'), sets: [...rated, { rpe: 10, warmup: true }] })
    const r = await report()
    expect(r.current.effort?.avgRpe).toBeCloseTo(8.5, 1)
    expect(r.current.effort?.pctAtOrAbove9).toBe(31)
    expect(r.current.effort?.setsAt10).toBe(2)
  })

  it('Too few rated sets hides the effort number', async () => {
    await seed({ at: at('2026-10-27', '12:00'), sets: [...Array.from({ length: 4 }, () => ({ rpe: 9 })), ...Array.from({ length: 6 }, () => ({}))] })
    const r = await report()
    expect(r.current.workingSets).toBe(10)
    expect(r.current.effort).toBeNull()
  })

  it('the effort normal is the mean of the weeks that have effort', async () => {
    await seed({ at: at(PRIOR[5], '12:00'), sets: [{ rpe: 8 }, { rpe: 8 }] })
    await seed({ at: at(PRIOR[6], '12:00'), sets: [{ rpe: 9 }, { rpe: 9 }] })
    await seed({ at: at(PRIOR[7], '12:00'), sets: 5 }) // unrated week
    const r = await report()
    expect(r.normal.avgRpe).toBeCloseTo(8.5, 5)
  })

  it('Empty week: no workouts gives zeros, no effort, a zero normal and no streak', async () => {
    const r = await report()
    expect(r.current).toMatchObject({ weekStart: THIS_WEEK, workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, effort: null })
    expect(r.normal).toMatchObject({ workouts: 0, workingSets: 0, durationSeconds: 0, avgRpe: null })
    expect(r.streak).toBe(0)
    expect(r.weeks).toHaveLength(8)
    expect(r.weeks.every((w) => w.workouts === 0 && w.workingSets === 0 && w.effort === null)).toBe(true)
  })
})

describe('streak and the target', () => {
  async function sixGoodWeeks() {
    // The 6 full weeks before this one at 3 workouts, the week before those at 1.
    await seedWeek(PRIOR[1], 1)
    for (const w of PRIOR.slice(2)) await seedWeek(w, 3)
  }

  it('workouts with no logged sets (Follow Along) count toward the streak', async () => {
    await seedWeek(PRIOR[1], 1, 0)
    for (const w of PRIOR.slice(2)) await seedWeek(w, 3, 0)
    expect((await report()).streak).toBe(6)
  })

  it('Streak: the last 6 full weeks had 3 workouts and the week before had 1, so 6, with this week still short', async () => {
    await sixGoodWeeks()
    await seedWeek(THIS_WEEK, 1)
    expect((await report()).streak).toBe(6)
  })

  it('the current week adds to the streak only once it hits the target', async () => {
    await sixGoodWeeks()
    await seedWeek(THIS_WEEK, 2)
    expect((await report()).streak).toBe(6)
    await seed({ at: at('2026-10-28', '09:00') }) // the third
    expect((await report()).streak).toBe(7)
  })

  it('a past week is judged as finished: a missed week there ends the streak', async () => {
    await sixGoodWeeks()
    const hit = await report({ weekStart: '2026-10-19' })
    expect(hit.isCurrentWeek).toBe(false)
    expect(hit.streak).toBe(6)
    // Make 2026-10-19 a miss: it is over, so it ends the streak instead of being skipped.
    await prisma.workoutCompletion.deleteMany({ where: { userId, completedAt: { gte: at('2026-10-19', '00:00'), lt: at('2026-10-26', '00:00') } } })
    expect((await report({ weekStart: '2026-10-19' })).streak).toBe(0)
  })

  it('a quiet week in the middle ends the streak there', async () => {
    for (const w of PRIOR.slice(5)) await seedWeek(w, 3)
    await seedWeek(PRIOR[3], 3)
    await seedWeek(PRIOR[2], 3)
    // PRIOR[4] (2026-09-28) is empty
    expect((await report()).streak).toBe(3)
  })

  it('Weekly target setting: the target comes from Settings, and the streak uses it', async () => {
    await sixGoodWeeks()
    await setTarget(4)
    const r = await report()
    expect(r.target).toBe(4)
    expect(r.streak).toBe(0)
  })

  it('Weekly target setting: with no settings row the target is 3', async () => {
    expect((await report()).target).toBe(3)
  })

  it('Weekly target setting: a lower target makes the same weeks count', async () => {
    for (const w of PRIOR.slice(4)) await seedWeek(w, 2)
    await setTarget(2)
    expect((await report()).streak).toBe(4)
  })

  it('another user\'s target does not leak', async () => {
    await setTarget(9, otherUserId)
    expect((await report()).target).toBe(3)
  })
})

describe('what counts', () => {
  it('Archived and unfinished workouts don\'t count: neither toward workouts, sets, time, effort, the normal, the chart or the streak', async () => {
    const rated: SetSpec[] = Array.from({ length: 10 }, () => ({ rpe: 9 }))
    // One valid workout this week and in each prior week.
    await seed({ at: at('2026-10-27', '12:00'), sets: 5, durationSeconds: 1000 })
    for (const w of PRIOR) await seed({ at: at(w, '12:00'), sets: 5, durationSeconds: 1000 })
    // The same weeks again, as an archived completed workout and as a draft.
    for (const when of [at('2026-10-28', '11:00'), ...PRIOR.map((w) => at(w, '15:00'))]) {
      await seed({ at: when, sets: rated, durationSeconds: 5000, archived: true })
      await seed({ at: when, sets: rated, durationSeconds: 5000, status: 'draft' })
    }
    const r = await report()
    expect(r.current).toMatchObject({ workouts: 1, workingSets: 5, durationSeconds: 1000, effort: null })
    expect(r.normal.workouts).toBeCloseTo(1, 5)
    expect(r.normal.workingSets).toBeCloseTo(5, 5)
    expect(r.normal.avgRpe).toBeNull()
    expect(r.weeks.map((w) => w.workouts)).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
    expect(r.weeks.map((w) => w.workingSets)).toEqual([5, 5, 5, 5, 5, 5, 5, 5])
    await setTarget(1)
    expect((await report()).streak).toBe(9) // this week and the 8 before, one valid workout each
  })

  it('Only your own data: another user\'s workouts and sets in the same weeks do not count', async () => {
    await seed({ at: at('2026-10-27', '12:00'), sets: 4, durationSeconds: 1200 })
    await seed({ at: at(PRIOR[7], '12:00'), sets: 4 })
    for (const when of [at('2026-10-27', '13:00'), at('2026-10-28', '11:00'), at(PRIOR[7], '13:00')]) {
      await seed({ userId: otherUserId, at: when, sets: 20, durationSeconds: 9000 })
    }
    const r = await report()
    expect(r.current).toMatchObject({ workouts: 1, workingSets: 4, durationSeconds: 1200 })
    // Amended by the lead (2026-11-02, Dustin): normal counts only weeks since the
    // first workout, so the one prior week (PRIOR[7]) is the whole normal.
    expect(r.normal.workouts).toBeCloseTo(1, 5)
    expect(r.normal.workingSets).toBeCloseTo(4, 5)
    // And the other user's own report sees their own rows.
    const theirs = await report({}, otherUserId)
    expect(theirs.current.workouts).toBe(2)
    expect(theirs.current.workingSets).toBe(40)
  })
})

describe('the program week', () => {
  async function program(o: { active: boolean; weekNumber: number; name: string; owner?: string }) {
    const owner = o.owner ?? userId
    const created = await prisma.program.create({
      data: {
        name: o.name,
        userId: owner,
        isActive: o.active,
        weeks: {
          create: [
            {
              weekNumber: o.weekNumber,
              userId: owner,
              workouts: { create: [{ name: 'Day 1', dayNumber: 1, userId: owner }] },
            },
          ],
        },
      },
      include: { weeks: { include: { workouts: true } } },
    })
    return created.weeks[0].workouts[0].id
  }

  it('Active program week in the subtitle: a workout from week 3 of the active "Strength Block" gives week 3 of it', async () => {
    const workoutId = await program({ active: true, weekNumber: 3, name: 'Strength Block' })
    await seed({ at: at('2026-10-27', '12:00'), workoutId })
    const r = await report()
    expect(r.programWeek).toEqual({ weekNumber: 3, programName: 'Strength Block' })
  })

  it('shows no program week when the week has only ad-hoc workouts', async () => {
    await program({ active: true, weekNumber: 3, name: 'Strength Block' })
    await seed({ at: at('2026-10-27', '12:00') })
    expect((await report()).programWeek).toBeNull()
  })

  it('shows no program week when the program is not active', async () => {
    const workoutId = await program({ active: false, weekNumber: 2, name: 'Old Block' })
    await seed({ at: at('2026-10-27', '12:00'), workoutId })
    expect((await report()).programWeek).toBeNull()
  })

  it('shows no program week for an empty week, or when the program workout is archived', async () => {
    expect((await report()).programWeek).toBeNull()
    const workoutId = await program({ active: true, weekNumber: 3, name: 'Strength Block' })
    await seed({ at: at('2026-10-27', '12:00'), workoutId, archived: true })
    expect((await report()).programWeek).toBeNull()
  })

  it('looks at the selected week, not the current one', async () => {
    const workoutId = await program({ active: true, weekNumber: 5, name: 'Strength Block' })
    await seed({ at: at('2026-10-21', '12:00'), workoutId })
    expect((await report({ weekStart: '2026-10-19' })).programWeek).toEqual({ weekNumber: 5, programName: 'Strength Block' })
    expect((await report({ weekStart: THIS_WEEK })).programWeek).toBeNull()
  })

  it('does not take another user\'s program', async () => {
    const workoutId = await program({ active: true, weekNumber: 4, name: 'Their Block', owner: otherUserId })
    await seed({ userId: otherUserId, at: at('2026-10-27', '12:00'), workoutId })
    expect((await report()).programWeek).toBeNull()
  })
})
