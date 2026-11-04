/**
 * Per-lift page: the loader `getLiftHistory` (work item 125). Real test DB. Spec:
 * features/analytics/lift-page.feature, "Lift history API", "A lift that isn't the user's",
 * "A lift with no sessions", "Session list". The maths is pinned in lift-history.test.ts.
 *
 * Pinned (`@/lib/insights/lift-history`):
 *   getLiftHistory(db, userId, exerciseDefinitionId, { timeZone, now? })
 *     (db first, like getWeeklyReport; `now` defaults to the current time)
 *   -> null when the definition does not exist or is another user's private exercise (a system
 *      exercise and the user's own are fine); otherwise
 *      { name, weightUnit: 'lbs' | 'kg' (UserSettings.defaultWeightUnit, lbs without settings),
 *        isBodyweight: true when the lift has working sets and every one has weight 0,
 *        sessions:    computeLiftSessions(...)           (newest first, in the user's unit),
 *        records:     computeRepRecords(..., start of the local week of `now`),
 *        weeklySets:  weeklySets(..., 'All', now, timeZone) }
 *   Counted: the user's completed, un-archived workout completions; working sets (not warm-ups) of
 *   this exercise definition, whichever Exercise row they were logged on (program, ad hoc);
 *   sets inside a session in setNumber order. Nothing of another user's.
 *   The sets come from ONE query, so the query count does not grow with the sessions.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const load = (spec: string) => import(/* @vite-ignore */ spec)

type Sess = {
  completionId: string
  date: Date
  sets: Array<{ weight: number; reps: number }>
  e1rm: number | null
  topSet: { weight: number; reps: number }
  avgRpe: number | null
}
type Loaded = {
  name: string
  weightUnit: 'lbs' | 'kg'
  isBodyweight: boolean
  sessions: Sess[]
  records: Array<{ reps: number; weight: number; date: Date; isNew: boolean }>
  weeklySets: Array<{ weekStart: string; sets: number }>
}
type Opts = { timeZone: string; now?: Date }

const DEN = 'America/Denver'
const NOW = new Date('2026-10-28T18:00:00Z') // Wednesday, week of Oct 26 (Denver)
const KG = 2.20462
const epley = (w: number, r: number) => (r === 1 ? w : w * (1 + r / 30))
const near = (actual: number | null | undefined, expected: number) => expect(actual as number).toBeCloseTo(expected, 3)

let prisma: PrismaClient
let userId: string
let otherUserId: string
let squat: string

const run = async (id: string, o: Partial<Opts> = {}, db: PrismaClient = prisma, forUser = userId) =>
  (await load('@/lib/insights/lift-history')).getLiftHistory(db, forUser, id, { timeZone: DEN, now: NOW, ...o }) as Promise<Loaded | null>

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  squat = (await createTestExerciseDefinition(prisma, { name: 'Back Squat', primaryFAUs: ['quads'] })).id
})

type SetSpec = { reps: number; weight: number; unit?: string; warmup?: boolean; rpe?: number; rir?: number; setNumber?: number }

/** One completion with sets of one exercise definition. */
async function session(
  when: string,
  sets: SetSpec[],
  o: { def?: string; owner?: string; status?: string; archived?: boolean } = {},
) {
  const owner = o.owner ?? userId
  const def = o.def ?? squat
  const at = new Date(when)
  const c = await prisma.workoutCompletion.create({
    data: { userId: owner, status: o.status ?? 'completed', isArchived: o.archived ?? false, completedAt: at, isAdHoc: true },
  })
  const e = await prisma.exercise.create({
    data: { name: 'Back Squat', exerciseDefinitionId: def, order: 1, userId: owner, workoutCompletionId: c.id, isOneOff: true },
  })
  for (const [i, x] of sets.entries()) {
    await prisma.loggedSet.create({
      data: {
        setNumber: x.setNumber ?? i + 1,
        reps: x.reps,
        weight: x.weight,
        weightUnit: x.unit ?? 'lbs',
        isWarmup: x.warmup ?? false,
        rpe: x.rpe ?? null,
        rir: x.rir ?? null,
        exerciseId: e.id,
        completionId: c.id,
        userId: owner,
        createdAt: at,
      },
    })
  }
  return c.id
}

// =====================================================================================
describe('which exercises exist for the user', () => {
  it('returns null for an id that does not exist', async () => {
    expect(await run('no-such-exercise')).toBeNull()
  })

  it('returns null for another user’s private exercise, even when the caller has no sets', async () => {
    const theirs = (await createTestExerciseDefinition(prisma, { name: 'Secret Lift', userId: otherUserId })).id
    expect(await run(theirs)).toBeNull()
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 100 }], { def: theirs, owner: otherUserId })
    expect(await run(theirs)).toBeNull()
  })

  it('finds a system exercise and the user’s own private one', async () => {
    const mine = (await createTestExerciseDefinition(prisma, { name: 'My Lift', userId })).id
    expect((await run(squat))?.name).toBe('Back Squat')
    expect((await run(mine))?.name).toBe('My Lift')
  })

  it('an exercise never logged comes back empty, not null', async () => {
    expect(await run(squat)).toEqual({ name: 'Back Squat', weightUnit: 'lbs', isBodyweight: false, sessions: [], records: [], weeklySets: [] })
  })
})

// =====================================================================================
describe('unit', () => {
  it('is pounds without settings and follows UserSettings.defaultWeightUnit', async () => {
    expect((await run(squat))?.weightUnit).toBe('lbs')
    await prisma.userSettings.create({ data: { userId, defaultWeightUnit: 'kg' } })
    expect((await run(squat))?.weightUnit).toBe('kg')
  })

  it('answers in kg for a kg user, converting pound sets', async () => {
    await prisma.userSettings.create({ data: { userId, defaultWeightUnit: 'kg' } })
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 225 }, { reps: 5, weight: 100, unit: 'kg' }])
    const out = (await run(squat)) as Loaded
    near(out.sessions[0].sets[0].weight, 225 / KG)
    near(out.sessions[0].sets[1].weight, 100)
    near(out.records[0].weight, 225 / KG) // 225 lb = 102.06 kg beats 100 kg
  })

  it('answers in pounds for a pound user, converting kg sets', async () => {
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 100, unit: 'kg' }])
    near(((await run(squat)) as Loaded).sessions[0].sets[0].weight, 100 * KG)
  })
})

// =====================================================================================
describe('what counts', () => {
  it('counts only completed, un-archived workouts of this user and this exercise', async () => {
    const other = (await createTestExerciseDefinition(prisma, { name: 'Bench', primaryFAUs: ['chest'] })).id
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 200 }])
    await session('2026-10-21T18:00:00Z', [{ reps: 5, weight: 300 }], { status: 'draft' })
    await session('2026-10-22T18:00:00Z', [{ reps: 5, weight: 310 }], { archived: true })
    await session('2026-10-23T18:00:00Z', [{ reps: 5, weight: 320 }], { owner: otherUserId })
    await session('2026-10-24T18:00:00Z', [{ reps: 5, weight: 330 }], { def: other })
    const out = (await run(squat)) as Loaded
    expect(out.sessions).toHaveLength(1)
    expect(out.sessions[0].sets).toEqual([{ weight: 200, reps: 5 }])
    expect(out.records.map((r) => r.weight)).toEqual([200])
    expect(out.weeklySets.reduce((n, w) => n + w.sets, 0)).toBe(1)
  })

  it('leaves warm-ups out of sessions, records and weekly sets', async () => {
    await session('2026-10-27T18:00:00Z', [{ reps: 5, weight: 135, warmup: true }, { reps: 1, weight: 400, warmup: true }, { reps: 5, weight: 200 }])
    const out = (await run(squat)) as Loaded
    expect(out.sessions[0].sets).toEqual([{ weight: 200, reps: 5 }])
    expect(out.records).toHaveLength(1)
    expect(out.weeklySets).toEqual([{ weekStart: '2026-10-26', sets: 1 }])
  })

  it('a workout of only warm-ups is not a session', async () => {
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 135, warmup: true }])
    expect((await run(squat))?.sessions).toEqual([])
  })

  it('merges sets of one session logged on different Exercise rows of the same definition', async () => {
    const at = new Date('2026-10-20T18:00:00Z')
    const c = await prisma.workoutCompletion.create({ data: { userId, status: 'completed', completedAt: at, isAdHoc: true } })
    for (const [order, weight] of [[1, 200], [2, 210]]) {
      const e = await prisma.exercise.create({
        data: { name: 'Back Squat', exerciseDefinitionId: squat, order, userId, workoutCompletionId: c.id, isOneOff: true },
      })
      await prisma.loggedSet.create({
        data: { setNumber: 1, reps: 5, weight, weightUnit: 'lbs', exerciseId: e.id, completionId: c.id, userId, createdAt: at },
      })
    }
    const out = (await run(squat)) as Loaded
    expect(out.sessions).toHaveLength(1)
    expect(out.sessions[0].sets).toHaveLength(2)
  })
})

// =====================================================================================
describe('sessions', () => {
  it('come newest first with the sets in setNumber order, whatever order they were saved in', async () => {
    await session('2026-10-10T18:00:00Z', [{ reps: 5, weight: 200 }])
    await session('2026-10-30T18:00:00Z', [
      { reps: 6, weight: 255, setNumber: 3 },
      { reps: 4, weight: 275, setNumber: 1 },
      { reps: 6, weight: 255, setNumber: 2 },
    ])
    const out = (await run(squat)) as Loaded
    expect(out.sessions.map((x) => new Date(x.date).toISOString().slice(0, 10))).toEqual(['2026-10-30', '2026-10-10'])
    expect(out.sessions[0].sets).toEqual([
      { weight: 275, reps: 4 },
      { weight: 255, reps: 6 },
      { weight: 255, reps: 6 },
    ])
    expect(out.sessions[0].topSet).toEqual({ weight: 275, reps: 4 })
  })

  it('carry the e1RM and the average effort', async () => {
    await session('2026-10-20T18:00:00Z', [{ reps: 5, weight: 200, rpe: 8 }, { reps: 5, weight: 200, rir: 1 }])
    const [only] = ((await run(squat)) as Loaded).sessions
    near(only.e1rm, epley(200, 5))
    expect(only.avgRpe).toBe(8.5)
    expect(only.date).toEqual(new Date('2026-10-20T18:00:00Z'))
  })

  it('a bodyweight lift has no e1RM and is flagged', async () => {
    const pull = (await createTestExerciseDefinition(prisma, { name: 'Pull-up', primaryFAUs: ['lats'] })).id
    await session('2026-10-20T18:00:00Z', [{ reps: 10, weight: 0 }, { reps: 12, weight: 0 }], { def: pull })
    const out = (await run(pull)) as Loaded
    expect(out.isBodyweight).toBe(true)
    expect(out.sessions[0].e1rm).toBeNull()
    expect(out.sessions[0].topSet).toEqual({ weight: 0, reps: 12 })
    expect(out.records).toMatchObject([{ reps: 12, weight: 0 }])
  })

  it('is not bodyweight once any working set has a weight, and not for a lift with no sets or only warm-ups', async () => {
    const pull = (await createTestExerciseDefinition(prisma, { name: 'Pull-up', primaryFAUs: ['lats'] })).id
    await session('2026-10-20T18:00:00Z', [{ reps: 10, weight: 0 }], { def: pull })
    await session('2026-10-22T18:00:00Z', [{ reps: 5, weight: 25 }], { def: pull })
    expect(((await run(pull)) as Loaded).isBodyweight).toBe(false)
    const dips = (await createTestExerciseDefinition(prisma, { name: 'Dips', primaryFAUs: ['chest'] })).id
    await session('2026-10-20T18:00:00Z', [{ reps: 10, weight: 0, warmup: true }, { reps: 8, weight: 45 }], { def: dips })
    expect(((await run(dips)) as Loaded).isBodyweight).toBe(false)
    expect(((await run(squat)) as Loaded).isBodyweight).toBe(false)
  })
})

// =====================================================================================
describe('records and weekly sets use the user’s week', () => {
  it('marks a record from this week as new and an older one as not', async () => {
    await session('2026-10-14T18:00:00Z', [{ reps: 3, weight: 250 }])
    await session('2026-10-30T18:00:00Z', [{ reps: 4, weight: 275 }])
    // now is Wed Oct 28 in the test; move it to Sat Oct 31 so the Friday set is in the week
    const out = (await run(squat, { now: new Date('2026-10-31T18:00:00Z') })) as Loaded
    expect(out.records.map((r) => [r.reps, r.isNew])).toEqual([
      [3, false],
      [4, true],
    ])
  })

  it('this week is the user\u2019s local week: Sunday evening Denver is still the old week in UTC terms', async () => {
    await session('2026-10-24T18:00:00Z', [{ reps: 4, weight: 275 }]) // Sat Oct 24
    // Mon Oct 26 02:00Z is Sun Oct 25 20:00 in Denver: the week of Oct 19 is still running
    const out = (await run(squat, { now: new Date('2026-10-26T02:00:00Z') })) as Loaded
    expect(out.records[0].isNew).toBe(true)
  })

  it('puts Sunday night and Monday morning Denver in different weeks', async () => {
    await session('2026-10-26T05:30:00Z', [{ reps: 5, weight: 200 }]) // Sun Oct 25 23:30 MDT
    await session('2026-10-26T06:30:00Z', [{ reps: 4, weight: 210 }]) // Mon Oct 26 00:30 MDT
    const out = (await run(squat)) as Loaded
    expect(out.weeklySets).toEqual([
      { weekStart: '2026-10-19', sets: 1 },
      { weekStart: '2026-10-26', sets: 1 },
    ])
    expect(out.records.map((r) => [r.reps, r.isNew])).toEqual([
      [4, true],
      [5, false],
    ])
    const utc = (await run(squat, { timeZone: 'UTC' })) as Loaded
    expect(utc.weeklySets).toEqual([{ weekStart: '2026-10-26', sets: 2 }])
  })

  it('fills the weeks without sets with 0 up to this week', async () => {
    await session('2026-10-06T18:00:00Z', [{ reps: 5, weight: 200 }, { reps: 5, weight: 200 }])
    expect(((await run(squat)) as Loaded).weeklySets).toEqual([
      { weekStart: '2026-10-05', sets: 2 },
      { weekStart: '2026-10-12', sets: 0 },
      { weekStart: '2026-10-19', sets: 0 },
      { weekStart: '2026-10-26', sets: 0 },
    ])
  })
})

// =====================================================================================
describe('the queries stay bounded', () => {
  function counting(db: PrismaClient) {
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

  it('3 sessions and 25 sessions cost the same number of queries, and not many', async () => {
    for (let i = 0; i < 3; i++) await session(`2026-10-${String(10 + i).padStart(2, '0')}T18:00:00Z`, [{ reps: 5, weight: 200 + i }, { reps: 5, weight: 200 }])
    const small = counting(prisma)
    expect(((await run(squat, {}, small.db)) as Loaded).sessions).toHaveLength(3)
    for (let i = 3; i < 25; i++) await session(`2026-09-${String(1 + i).padStart(2, '0')}T18:00:00Z`, [{ reps: 5, weight: 150 + i }, { reps: 6, weight: 150 }, { reps: 8, weight: 130 }])
    const large = counting(prisma)
    expect(((await run(squat, {}, large.db)) as Loaded).sessions).toHaveLength(25)
    expect(large.count()).toBe(small.count())
    expect(small.count()).toBeLessThanOrEqual(4)
  })
})
