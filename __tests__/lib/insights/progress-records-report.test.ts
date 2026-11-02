/**
 * Progress S2: Records, Lifts and the trend note, from the database. Real test DB.
 * Spec: features/analytics/weekly-records.feature (work item 111). The maths is pinned
 * in progress-records.test.ts; this file pins what the loader feeds it.
 *
 * Pinned interface: `getWeeklyReport(db, userId, { weekStart, timeZone, now? })` of
 * `@/lib/insights/progress` (S1, unchanged) now also returns
 *   weightUnit: 'lbs' | 'kg'            UserSettings.defaultWeightUnit, 'lbs' with no settings row
 *   records:    WeekRecord[]            computeWeekRecords for the shown week, in weightUnit
 *   lifts:      WeekLift[]              computeWeekLifts for the shown week, in weightUnit
 *   trend:      TrendNote | null        computeTrendNote(report.weeks, the weeks `normal` averages)
 * (shapes: progress-records.test.ts). It reads the user's completed, un-archived workouts and
 * their sets, the week in the user's zone (local Monday to Monday), and does so in a number of
 * queries that does not grow with the number of exercises.
 *
 * "Now" is Wednesday 2026-10-28 12:00 Denver; the shown week is Monday 2026-10-26 (the week
 * the fall DST change, Sunday 11-01, ends). Only whole-number RPEs: the column is an Int.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const load = (spec: string) => import(/* @vite-ignore */ spec)

type Rec = { exerciseDefinitionId: string; name: string; kind: 'e1rm' | 'rep'; weight: number; reps: number; e1rm: number | null; previous: number }
type Lift = {
  exerciseDefinitionId: string
  name: string
  workingSets: number
  bestSet: { weight: number; reps: number }
  e1rm: number | null
  previousE1rm: number | null
  bestE1rm: number | null
  sessionsBelowBest: number
}
type Trend = { effortRisingWeeks: number; effortFrom: number | null; effortTo: number | null; lastLightWeeksAgo: number | null }
type Report = { weekStart: string; weightUnit: 'lbs' | 'kg'; records: Rec[]; lifts: Lift[]; trend: Trend | null }
type Opts = { weekStart: string; timeZone: string; now?: Date }
type Db = PrismaClient

const DEN = 'America/Denver'
const NOW = new Date('2026-10-28T18:00:00Z')
const THIS_WEEK = '2026-10-26'
const KG = 2.20462
const epley = (w: number, r: number) => (r === 1 ? w : w * (1 + r / 30))
const approx = (actual: number | null | undefined, expected: number) => expect(actual as number).toBeCloseTo(expected, 1)

let prisma: PrismaClient
let userId: string
let otherUserId: string
const defs = new Map<string, string>()

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  defs.clear()
})

async function def(name: string): Promise<string> {
  let id = defs.get(name)
  if (!id) {
    id = (await createTestExerciseDefinition(prisma, { name, primaryFAUs: ['chest'] })).id
    defs.set(name, id)
  }
  return id
}

async function report(opts: Partial<Opts> = {}, forUser = userId, db: Db = prisma): Promise<Report> {
  const mod = (await load('@/lib/insights/progress')) as { getWeeklyReport: (db: Db, userId: string, opts: Opts) => Promise<Report> }
  return mod.getWeeklyReport(db, forUser, { weekStart: THIS_WEEK, timeZone: DEN, now: NOW, ...opts })
}

// --- time ---------------------------------------------------------------------------
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

// --- seeding --------------------------------------------------------------------------
type SetSpec = { reps: number; weight: number; unit?: string; warmup?: boolean; rpe?: number | null }
type Session = { ex: string; at: Date; sets: SetSpec[]; userId?: string; status?: string; archived?: boolean }
async function session(o: Session) {
  const owner = o.userId ?? userId
  const defId = await def(o.ex)
  const completion = await prisma.workoutCompletion.create({
    data: { userId: owner, status: o.status ?? 'completed', completedAt: o.at, isArchived: o.archived ?? false, isAdHoc: true },
  })
  const exercise = await prisma.exercise.create({
    data: { name: o.ex, exerciseDefinitionId: defId, order: 1, userId: owner, workoutCompletionId: completion.id, isOneOff: true },
  })
  await prisma.loggedSet.createMany({
    data: o.sets.map((s, i) => ({
      setNumber: i + 1,
      reps: s.reps,
      weight: s.weight,
      weightUnit: s.unit ?? 'lbs',
      rpe: s.rpe ?? null,
      isWarmup: s.warmup ?? false,
      exerciseId: exercise.id,
      completionId: completion.id,
      userId: owner,
      createdAt: o.at,
    })),
  })
  return completion
}
/** One working set, as a session. */
const lift = (ex: string, when: Date, reps: number, weight: number, o: Partial<Session> & { unit?: string } = {}) => {
  const { unit, ...rest } = o
  return session({ ex, at: when, sets: [{ reps, weight, unit }], ...rest })
}
const setUnit = (unit: string, owner = userId) => prisma.userSettings.create({ data: { userId: owner, defaultWeightUnit: unit } })

// Days of the shown week: Mon 10-26 .. Sun 11-01.
const WED = at('2026-10-28', '08:00')
const THU = at('2026-10-29', '08:00')
const LAST_MON = at('2026-10-19', '08:00')
const OCT12 = at('2026-10-12', '08:00')
const SEP10 = at('2026-09-10', '08:00')

// =====================================================================================
describe('Records and lifts: the shape', () => {
  it('Records and lifts come with the week: a user with nothing logged gets empty lists, no note, and pounds', async () => {
    const r = await report()
    expect(r.records).toEqual([])
    expect(r.lifts).toEqual([])
    expect(r.trend).toBeNull()
    expect(r.weightUnit).toBe('lbs')
  })

  it('e1RM PR: Back Squat 275 x 4 against an earlier best, with raw numbers', async () => {
    const back = await def('Back Squat')
    await lift('Back Squat', SEP10, 4, 260) // 294.67
    await lift('Back Squat', OCT12, 4, 240)
    await lift('Back Squat', WED, 4, 275)
    const r = await report()
    expect(r.records).toHaveLength(1)
    expect(r.records[0]).toMatchObject({ exerciseDefinitionId: back, name: 'Back Squat', kind: 'e1rm', weight: 275, reps: 4 })
    approx(r.records[0].e1rm, epley(275, 4))
    approx(r.records[0].previous, epley(260, 4))
  })

  it('Rep PR: Bench Press 185 x 8 against a best 8-rep set of 180', async () => {
    await lift('Bench Press', SEP10, 5, 225)
    await lift('Bench Press', OCT12, 8, 180)
    await lift('Bench Press', WED, 8, 185)
    const r = await report()
    expect(r.records).toHaveLength(1)
    expect(r.records[0]).toMatchObject({ name: 'Bench Press', kind: 'rep', weight: 185, reps: 8, previous: 180 })
  })

  it('Bodyweight rep PR: 12 reps against 10', async () => {
    await lift('Pull-up', OCT12, 10, 0)
    await lift('Pull-up', WED, 12, 0)
    const r = await report()
    expect(r.records).toHaveLength(1)
    expect(r.records[0]).toMatchObject({ name: 'Pull-up', kind: 'rep', weight: 0, reps: 12, previous: 10, e1rm: null })
  })

  it('An exercise\'s first ever session is not a PR, but it is in Lifts', async () => {
    await lift('Hack Squat', WED, 8, 225)
    const r = await report()
    expect(r.records).toEqual([])
    expect(r.lifts).toHaveLength(1)
    expect(r.lifts[0]).toMatchObject({ name: 'Hack Squat', workingSets: 1, previousE1rm: null, sessionsBelowBest: 0 })
  })

  it('Lifts lists each exercise done this week, most working sets first, with the week\'s best set', async () => {
    await session({ ex: 'Pull-up', at: WED, sets: [{ reps: 8, weight: 0 }, { reps: 9, weight: 0 }] })
    await session({
      ex: 'Overhead Press',
      at: WED,
      sets: [{ reps: 5, weight: 95, warmup: true }, ...Array.from({ length: 4 }, () => ({ reps: 5, weight: 115 })), { reps: 8, weight: 110 }],
    })
    await session({ ex: 'Back Squat', at: THU, sets: Array.from({ length: 3 }, () => ({ reps: 5, weight: 250 })) })
    await lift('Barbell Row', LAST_MON, 8, 135) // last week: not listed
    const r = await report()
    expect(r.lifts.map((l) => [l.name, l.workingSets])).toEqual([
      ['Overhead Press', 5],
      ['Back Squat', 3],
      ['Pull-up', 2],
    ])
    expect(r.lifts[0].bestSet).toEqual({ weight: 110, reps: 8 })
    approx(r.lifts[0].e1rm, epley(110, 8))
    expect(r.lifts[2]).toMatchObject({ bestSet: { weight: 0, reps: 9 }, e1rm: null })
  })

  it('Flat lift: the 3rd session in a row below the best is 3, and 2 sessions is 2', async () => {
    await lift('Overhead Press', SEP10, 10, 100) // 133.33
    await lift('Overhead Press', at('2026-09-24', '08:00'), 10, 95)
    await lift('Overhead Press', OCT12, 10, 90)
    await lift('Overhead Press', WED, 10, 85)
    const flat = await report()
    expect(flat.lifts[0].sessionsBelowBest).toBe(3)
    approx(flat.lifts[0].bestE1rm, epley(100, 10))
    approx(flat.lifts[0].previousE1rm, epley(90, 10))
    // Last week's report: the week of Oct 12 had 2 sessions below it by then.
    const earlier = await report({ weekStart: '2026-10-12' })
    expect(earlier.lifts[0].sessionsBelowBest).toBe(2)
  })
})

// =====================================================================================
describe('Records and lifts: what counts', () => {
  it('Archived and unfinished workouts are not history and not this week: they block nothing and set nothing', async () => {
    await lift('Back Squat', OCT12, 4, 250)
    // A huge earlier set, archived or unfinished, must not stand in the way of a real PR.
    await lift('Back Squat', SEP10, 4, 400, { archived: true })
    await lift('Back Squat', at('2026-09-24', '08:00'), 4, 400, { status: 'draft' })
    await lift('Back Squat', WED, 4, 255)
    // And an archived or unfinished big set this week sets nothing on its own.
    await lift('Bench Press', OCT12, 5, 185)
    await lift('Bench Press', WED, 5, 300, { archived: true })
    await lift('Bench Press', THU, 5, 300, { status: 'draft' })
    await lift('Row', WED, 8, 135, { archived: true })
    const r = await report()
    expect(r.records.map((x) => x.name)).toEqual(['Back Squat'])
    expect(r.lifts.map((l) => l.name)).toEqual(['Back Squat'])
  })

  it('Only your own data: another user\'s sets neither block a PR nor show up', async () => {
    await lift('Back Squat', OCT12, 4, 250)
    await lift('Back Squat', OCT12, 4, 500, { userId: otherUserId })
    await lift('Back Squat', WED, 4, 255)
    await lift('Bench Press', WED, 5, 300, { userId: otherUserId })
    await lift('Bench Press', OCT12, 5, 100, { userId: otherUserId })
    const mine = await report()
    expect(mine.records.map((x) => x.name)).toEqual(['Back Squat'])
    expect(mine.lifts.map((l) => l.name)).toEqual(['Back Squat'])
    const theirs = await report({}, otherUserId)
    expect(theirs.records.map((x) => x.name)).toEqual(['Bench Press'])
    expect(theirs.lifts.map((l) => l.name)).toEqual(['Bench Press'])
  })

  it('Warm-ups are not records: a heavy warm-up this week sets nothing, and one before the week blocks nothing', async () => {
    await session({ ex: 'Back Squat', at: OCT12, sets: [{ reps: 5, weight: 200 }, { reps: 1, weight: 400, warmup: true }] })
    await session({ ex: 'Back Squat', at: WED, sets: [{ reps: 1, weight: 450, warmup: true }, { reps: 5, weight: 210 }] })
    const r = await report()
    expect(r.records).toHaveLength(1)
    expect(r.records[0]).toMatchObject({ kind: 'e1rm', weight: 210, reps: 5 })
    expect(r.lifts[0].workingSets).toBe(1)
  })

  it('Past weeks show the records set in that week, compared only with history before it', async () => {
    await lift('Back Squat', OCT12, 4, 250)
    await lift('Back Squat', LAST_MON, 4, 275) // a PR in the week of Oct 19
    await lift('Back Squat', WED, 4, 300) // a PR in the week of Oct 26, against 275
    const earlier = await report({ weekStart: '2026-10-19' })
    expect(earlier.records).toHaveLength(1)
    expect(earlier.records[0]).toMatchObject({ weight: 275 })
    approx(earlier.records[0].previous, epley(250, 4))
    const shown = await report()
    expect(shown.records[0]).toMatchObject({ weight: 300 })
    approx(shown.records[0].previous, epley(275, 4))
    // And nothing after the earlier week leaks into its lifts.
    expect(earlier.lifts).toHaveLength(1)
    expect(earlier.lifts[0].bestSet).toEqual({ weight: 275, reps: 4 })
  })

  it('The week is the user\'s local week: Sunday 21:00 in Denver (Monday 03:00 UTC) is last week; Sunday 21:00 at the DST change is this one', async () => {
    await lift('Back Squat', OCT12, 4, 250)
    // Sunday Oct 25, 21:00 MDT: the week before the shown one, but already Monday in UTC.
    await lift('Back Squat', at('2026-10-25', '21:00'), 4, 270)
    // 265 is less than the 270 that already happened last week: no record.
    await lift('Back Squat', WED, 4, 265)
    expect((await report()).records).toEqual([])

    // Sunday Nov 1, 21:00 MST (after the clocks went back): still this week, but Monday 04:00 in UTC.
    await lift('Bench Press', OCT12, 5, 185)
    await lift('Bench Press', at('2026-11-01', '21:00'), 5, 195)
    const r = await report()
    expect(r.records.map((x) => x.name)).toEqual(['Bench Press'])
    expect(r.lifts.map((l) => l.name).sort()).toEqual(['Back Squat', 'Bench Press'])
  })

  it('a different zone gives a different week: the same Sunday-evening set is this week in UTC', async () => {
    await lift('Back Squat', OCT12, 4, 250)
    await lift('Back Squat', at('2026-10-25', '21:00'), 4, 270) // Monday 03:00 UTC
    const utc = await report({ timeZone: 'UTC' })
    expect(utc.records).toHaveLength(1)
    expect(utc.records[0]).toMatchObject({ weight: 270 })
  })
})

// =====================================================================================
describe('Records and lifts: the user\'s unit', () => {
  it('Weights are shown in the user\'s unit: a kg user sees kilos, whatever the sets were logged in', async () => {
    await setUnit('kg')
    await lift('Back Squat', OCT12, 5, 100) // logged in lbs: 116.67 lb e1RM
    await lift('Back Squat', WED, 5, 60, { unit: 'kg' }) // 70 kg e1RM
    const r = await report()
    expect(r.weightUnit).toBe('kg')
    expect(r.records).toHaveLength(1)
    approx(r.records[0].weight, 60)
    approx(r.records[0].e1rm, 70)
    approx(r.records[0].previous, epley(100, 5) / KG)
    approx(r.lifts[0].bestSet.weight, 60)
    approx(r.lifts[0].e1rm, 70)
    approx(r.lifts[0].previousE1rm, epley(100, 5) / KG)
  })

  it('a pounds user sees pounds, from sets logged in kilos', async () => {
    await setUnit('lbs')
    await lift('Back Squat', OCT12, 5, 100)
    await lift('Back Squat', WED, 5, 60, { unit: 'kg' })
    const r = await report()
    expect(r.weightUnit).toBe('lbs')
    approx(r.records[0].weight, 60 * KG)
    approx(r.records[0].e1rm, epley(60 * KG, 5))
  })

  it('the unit is the user\'s own setting', async () => {
    await setUnit('kg', otherUserId)
    expect((await report()).weightUnit).toBe('lbs')
    expect((await report({}, otherUserId)).weightUnit).toBe('kg')
  })
})

// =====================================================================================
describe('The trend note', () => {
  const WEEKS = Array.from({ length: 8 }, (_, i) => addDays('2026-09-07', i * 7)) // the chart weeks, oldest first

  /** A workout on the Tuesday of the week with `sets` sets of which the first `rated` carry `rpe`. */
  async function week(weekStart: string, rpe: number | null, sets = 4, rated = sets) {
    await session({
      ex: 'Bench Press',
      at: at(addDays(weekStart, 1), '10:00'),
      sets: Array.from({ length: sets }, (_, i) => ({ reps: 5, weight: 100, rpe: i < rated ? rpe : null })),
    })
  }
  const RPES = [9, 9, 9, 9, 7, 8, 9, 10]

  it('Rising effort: average RPE rose 4 weeks running', async () => {
    for (let i = 0; i < 8; i++) await week(WEEKS[i], RPES[i])
    const t = (await report()).trend
    expect(t).not.toBeNull()
    expect(t?.effortRisingWeeks).toBe(4)
    approx(t?.effortFrom, 7)
    approx(t?.effortTo, 10)
  })

  it('Last light week: the week with a quarter of the usual sets was 5 weeks ago, and nothing else is light', async () => {
    for (let i = 0; i < 8; i++) await week(WEEKS[i], 9, i === 2 ? 1 : 4)
    const t = (await report()).trend
    expect(t?.lastLightWeeksAgo).toBe(5)
    expect(t?.effortRisingWeeks).toBe(0)
  })

  it('No light week in the 8 weeks', async () => {
    for (let i = 0; i < 8; i++) await week(WEEKS[i], 9)
    const t = (await report()).trend
    expect(t).not.toBeNull()
    expect(t?.lastLightWeeksAgo).toBeNull()
  })

  it('Little effort data: a week with fewer than half its sets rated ends the run, exactly half does not', async () => {
    for (let i = 0; i < 8; i++) await week(WEEKS[i], RPES[i], 4, i === 6 ? 1 : 4)
    expect((await report()).trend?.effortRisingWeeks).toBe(0)
  })

  it('Little effort data: half of the sets rated is enough', async () => {
    for (let i = 0; i < 8; i++) await week(WEEKS[i], RPES[i], 4, i === 6 ? 2 : 4)
    expect((await report()).trend?.effortRisingWeeks).toBe(4)
  })

  it('Not enough history: a user whose first workout was last week gets no note', async () => {
    await week('2026-10-19', 9)
    await week(THIS_WEEK, 9)
    expect((await report()).trend).toBeNull()
  })

  it('Not enough history: a user whose first workout is this week gets no note', async () => {
    await week(THIS_WEEK, 9)
    expect((await report()).trend).toBeNull()
  })

  it('3 weeks before the shown one is enough history; the empty weeks before the first workout are not light', async () => {
    for (const w of ['2026-10-05', '2026-10-12', '2026-10-19', THIS_WEEK]) await week(w, 9)
    const t = (await report()).trend
    expect(t).not.toBeNull()
    expect(t?.lastLightWeeksAgo).toBeNull()
  })

  it('Only your own data: another user\'s sets do not make a note for you', async () => {
    for (let i = 0; i < 8; i++) {
      await session({
        ex: 'Bench Press',
        at: at(addDays(WEEKS[i], 1), '10:00'),
        userId: otherUserId,
        sets: Array.from({ length: 4 }, () => ({ reps: 5, weight: 100, rpe: 9 })),
      })
    }
    expect((await report()).trend).toBeNull()
  })

  it('an earlier week gets its own note, from its own 8 weeks', async () => {
    for (let i = 0; i < 8; i++) await week(WEEKS[i], RPES[i])
    // Seen from the week of Oct 19 the chart ends 7, 8, 9: the 10 of the week after is not in it.
    const t = (await report({ weekStart: '2026-10-19' })).trend
    expect(t).not.toBeNull()
    expect(t?.effortRisingWeeks).toBe(3)
    approx(t?.effortFrom, 7)
    approx(t?.effortTo, 9)
  })
})

// =====================================================================================
describe('Query count', () => {
  /** The client with every model call and raw query counted. */
  function counting(db: PrismaClient): { db: PrismaClient; count: () => number } {
    let n = 0
    const counted = (fn: unknown, self: object) => (...args: unknown[]) => {
      n++
      return (fn as (...a: unknown[]) => unknown).apply(self, args)
    }
    const proxy = new Proxy(db, {
      get(t, prop) {
        const value = Reflect.get(t, prop)
        if (typeof prop !== 'string') return value
        if (prop.startsWith('$')) return typeof value === 'function' ? counted(value, t) : value
        if (value && typeof value === 'object') {
          return new Proxy(value, {
            get(model, method) {
              const fn = Reflect.get(model, method)
              return typeof fn === 'function' ? counted(fn, model) : fn
            },
          })
        }
        return value
      },
    })
    return { db: proxy as PrismaClient, count: () => n }
  }

  async function many(names: string[]) {
    for (const name of names) {
      await lift(name, OCT12, 5, 100)
      await lift(name, WED, 5, 105)
    }
  }

  it('does not run a query per exercise: 3 exercises and 15 exercises cost the same, and not many', async () => {
    await many(['Ex A', 'Ex B', 'Ex C'])
    const small = counting(prisma)
    const few = await report({}, userId, small.db)
    expect(few.records).toHaveLength(3)
    expect(few.lifts).toHaveLength(3)

    await many(Array.from({ length: 12 }, (_, i) => `Ex ${i + 10}`))
    const large = counting(prisma)
    const lots = await report({}, userId, large.db)
    expect(lots.records).toHaveLength(15)
    expect(lots.lifts).toHaveLength(15)

    expect(large.count()).toBe(small.count())
    expect(small.count()).toBeLessThanOrEqual(10)
  })

  it('does not run a query per week or per session either', async () => {
    await many(['Ex A'])
    const base = counting(prisma)
    await report({}, userId, base.db)
    for (let i = 0; i < 8; i++) await lift('Ex A', at(addDays('2026-09-07', i * 7 + 1), '09:00'), 5, 90)
    const more = counting(prisma)
    await report({}, userId, more.db)
    expect(more.count()).toBe(base.count())
  })
})
