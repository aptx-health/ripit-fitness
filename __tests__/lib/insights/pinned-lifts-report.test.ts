/**
 * Progress S3 (pinned lifts): the pinned lifts in the weekly report, from the database
 * (work item 116). Real test DB. Spec: features/analytics/pinned-lifts.feature, "Defaults",
 * "Lifts tab", "The report carries pins". Which lifts are pinned is pinned-lifts.test.ts; the
 * S2 numbers (records, lifts, trend) are progress-records-report.test.ts and do not change.
 *
 * Pinned interface: `getWeeklyReport(db, userId, { weekStart, timeZone, now? })` of
 * `@/lib/insights/progress` now also returns
 *   pinned: Array<{
 *     exerciseDefinitionId: string
 *     name: string                       the definition's name, also when never logged
 *     lift: WeekLift | null              this lift's entry of report.lifts (same object shape and
 *                                        numbers), or null when it had no working set that week
 *     last: { weight: number, reps: number, e1rm: number | null, completedAt: Date | string } | null
 *   }>
 * in pin order (resolvePins). `last` is for a pinned lift with no working set in the shown week:
 * the best set (highest e1RM, the heavier on a tie) of its latest completed, un-archived working
 * session that started BEFORE the end of the shown week, from any time back (not only the weeks
 * on the chart), in the user's unit; null when there is none. Warm-ups never count. e1RM is
 * Epley, null for a bodyweight set (weight 0). (For a lift done in the week, `last` is
 * unpinned: the page shows `lift`.) `lifts` still lists every lift of the week, pinned or not.
 * The queries stay bounded: the count does not grow with the number of pins.
 *
 * "Now" is Wednesday 2026-10-28 12:00 Denver; the shown week is Monday 2026-10-26.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const load = (spec: string) => import(/* @vite-ignore */ spec)

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
type Last = { weight: number; reps: number; e1rm: number | null; completedAt: Date | string }
type Pinned = { exerciseDefinitionId: string; name: string; lift: Lift | null; last: Last | null }
type Report = { weekStart: string; weightUnit: 'lbs' | 'kg'; lifts: Lift[]; records: unknown[]; pinned: Pinned[] }
type Opts = { weekStart: string; timeZone: string; now?: Date }

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

async function report(opts: Partial<Opts> = {}, forUser = userId, db: PrismaClient = prisma): Promise<Report> {
  const m = (await load('@/lib/insights/progress')) as { getWeeklyReport: (db: PrismaClient, userId: string, opts: Opts) => Promise<Report> }
  return m.getWeeklyReport(db, forUser, { weekStart: THIS_WEEK, timeZone: DEN, now: NOW, ...opts })
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

// --- seeding --------------------------------------------------------------------------
type SetSpec = { reps: number; weight: number; unit?: string; warmup?: boolean }
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
      isWarmup: s.warmup ?? false,
      exerciseId: exercise.id,
      completionId: completion.id,
      userId: owner,
      createdAt: o.at,
    })),
  })
  return completion
}
const lift = (ex: string, when: Date, reps: number, weight: number, o: Partial<Session> & { unit?: string } = {}) => {
  const { unit, ...rest } = o
  return session({ ex, at: when, sets: [{ reps, weight, unit }], ...rest })
}

/** Pins as saved rows, written directly: the user has customized, in this order. */
async function pin(names: string[], forUser = userId) {
  const ids = await Promise.all(names.map(def))
  await prisma.userSettings.upsert({
    where: { userId: forUser },
    create: { userId: forUser, ...({ pinnedLiftsCustomized: true } as object) },
    update: { ...({ pinnedLiftsCustomized: true } as object) },
  })
  const model = (prisma as unknown as { pinnedExercise: { create: (a: { data: object }) => Promise<unknown> } }).pinnedExercise
  for (const [position, exerciseDefinitionId] of ids.entries()) {
    await model.create({ data: { userId: forUser, exerciseDefinitionId, position } })
  }
  return ids
}
/** Anchors, with the user never having edited pins. Keys are patterns. */
async function anchor(map: Record<string, string[]>, forUser = userId) {
  const targetMovements: Record<string, string[]> = {}
  for (const [pattern, names] of Object.entries(map)) targetMovements[pattern] = await Promise.all(names.map(def))
  await prisma.userTrainingProfile.create({ data: { userId: forUser, ratioTargets: {}, targetMovements } })
  return targetMovements
}
const setUnit = (unit: string, owner = userId) =>
  prisma.userSettings.upsert({ where: { userId: owner }, create: { userId: owner, defaultWeightUnit: unit }, update: { defaultWeightUnit: unit } })
const names = (r: Report) => r.pinned.map((p) => p.name)
const when = (last: Last | null) => (last ? new Date(last.completedAt).getTime() : null)

const WED = at('2026-10-28', '08:00')
const MON_BEFORE = at('2026-10-19', '08:00')
const OCT5 = at('2026-10-05', '08:00')
const OCT12 = at('2026-10-12', '08:00')
const SEP10 = at('2026-09-10', '08:00')

// =====================================================================================
describe('which lifts the report pins', () => {
  it('a user with no pins and no anchors gets an empty list, and the week\'s lifts as before', async () => {
    await lift('Leg Press', WED, 10, 300)
    const r = await report()
    expect(r.pinned).toEqual([])
    expect(r.lifts.map((l) => l.name)).toEqual(['Leg Press'])
  })

  it('Anchor lifts are the starting pins, in anchor order (pattern order, not stored order)', async () => {
    await anchor({ vertical_push: ['Overhead Press'], horizontal_push: ['Bench Press'], squat: ['Back Squat'], hinge: ['Deadlift'] })
    const r = await report()
    expect(names(r)).toEqual(['Deadlift', 'Back Squat', 'Bench Press', 'Overhead Press'])
  })

  it('Anchor duplicates appear once', async () => {
    await anchor({ hinge: ['Back Squat', 'Deadlift'], squat: ['Back Squat'] })
    expect(names(await report())).toEqual(['Back Squat', 'Deadlift'])
  })

  it('Once edited, anchors no longer apply: nothing is pinned though the user has anchors', async () => {
    await anchor({ squat: ['Back Squat'] })
    await pin([])
    expect((await report()).pinned).toEqual([])
  })

  it('saved pins are used in their saved order, and each has the id and name of its definition', async () => {
    const ids = await pin(['Bench Press', 'Back Squat', 'Deadlift'])
    const r = await report()
    expect(r.pinned.map((p) => p.exerciseDefinitionId)).toEqual(ids)
    expect(names(r)).toEqual(['Bench Press', 'Back Squat', 'Deadlift'])
  })

  it('an anchor that points at a deleted exercise is not listed and does not break the report', async () => {
    await anchor({ squat: ['Back Squat'], hinge: ['Deadlift'] })
    await prisma.exerciseDefinition.delete({ where: { id: await def('Deadlift') } })
    expect(names(await report())).toEqual(['Back Squat'])
  })

  it('Pins are per user: another user\'s pins are not in this report, and theirs have their own', async () => {
    await pin(['Hack Squat'], otherUserId)
    await pin(['Back Squat'])
    expect(names(await report())).toEqual(['Back Squat'])
    expect(names(await report({}, otherUserId))).toEqual(['Hack Squat'])
  })

  it('pins do not hide lifts: lifts still has every exercise done that week', async () => {
    await pin(['Back Squat'])
    await lift('Back Squat', WED, 5, 200)
    await lift('Leg Press', WED, 10, 300)
    await lift('Pull-up', WED, 8, 0)
    const r = await report()
    expect(r.lifts.map((l) => l.name).sort()).toEqual(['Back Squat', 'Leg Press', 'Pull-up'])
  })
})

// =====================================================================================
describe('a pinned lift done in the shown week', () => {
  it('Pinned lifts keep the S2 numbers: its lift is the same as its entry in lifts', async () => {
    await pin(['Back Squat'])
    await lift('Back Squat', OCT12, 4, 250)
    await lift('Back Squat', WED, 4, 275)
    const r = await report()
    expect(r.pinned).toHaveLength(1)
    const entry = r.lifts.find((l) => l.name === 'Back Squat')
    expect(entry).toBeDefined()
    expect(r.pinned[0].lift).toEqual(entry)
    expect(r.pinned[0].lift).toMatchObject({ name: 'Back Squat', workingSets: 1, bestSet: { weight: 275, reps: 4 }, sessionsBelowBest: 0 })
    approx(r.pinned[0].lift?.e1rm, epley(275, 4))
    approx(r.pinned[0].lift?.previousE1rm, epley(250, 4))
  })

  it('Overhead Press, the 3rd session in a row below its best, carries sessionsBelowBest 3', async () => {
    await pin(['Overhead Press'])
    await lift('Overhead Press', SEP10, 5, 135) // the best
    await lift('Overhead Press', at('2026-10-05', '08:00'), 5, 125)
    await lift('Overhead Press', at('2026-10-12', '08:00'), 5, 125)
    await lift('Overhead Press', WED, 5, 125)
    const r = await report()
    expect(r.pinned[0].lift?.sessionsBelowBest).toBe(3)
    expect(r.pinned[0].lift).toEqual(r.lifts[0])
  })

  it('the name is the exercise definition\'s', async () => {
    await pin(['Back Squat'])
    await lift('Back Squat', WED, 5, 200)
    expect((await report()).pinned[0].name).toBe('Back Squat')
  })

  it('a lift with only warm-ups that week has no lift, and its last session is the earlier working one', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', OCT12, 8, 185)
    await session({ ex: 'Bench Press', at: WED, sets: [{ reps: 10, weight: 95, warmup: true }] })
    const r = await report()
    expect(r.pinned[0].lift).toBeNull()
    expect(r.pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
  })
})

// =====================================================================================
describe('a pinned lift not done in the shown week: its last session', () => {
  it('A pinned lift not done this week: its last session before the week end was 185 lb x 8', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', OCT12, 8, 185)
    const r = await report()
    expect(r.pinned[0].lift).toBeNull()
    expect(r.pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
    approx(r.pinned[0].last?.e1rm, epley(185, 8))
    expect(when(r.pinned[0].last)).toBe(OCT12.getTime())
  })

  it('it is the latest session, not the best ever one', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', SEP10, 5, 225) // e1RM 262.5, the best
    await lift('Bench Press', OCT5, 8, 185)
    await lift('Bench Press', OCT12, 6, 175) // the latest, lower
    const last = (await report()).pinned[0].last
    expect(last).toMatchObject({ weight: 175, reps: 6 })
    expect(when(last)).toBe(OCT12.getTime())
  })

  it('within that session it is the set with the best e1RM', async () => {
    await pin(['Bench Press'])
    await session({
      ex: 'Bench Press',
      at: OCT12,
      sets: [
        { reps: 10, weight: 135 }, // 180
        { reps: 8, weight: 185 }, // 234.3
        { reps: 12, weight: 155 }, // 217
      ],
    })
    expect((await report()).pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
  })

  it('warm-up sets never count, even when they are the heaviest', async () => {
    await pin(['Bench Press'])
    await session({
      ex: 'Bench Press',
      at: OCT12,
      sets: [
        { reps: 3, weight: 300, warmup: true },
        { reps: 8, weight: 185 },
      ],
    })
    expect((await report()).pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
  })

  it('a session of only warm-ups is skipped for the one before it', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', OCT5, 8, 185)
    await session({ ex: 'Bench Press', at: OCT12, sets: [{ reps: 5, weight: 95, warmup: true }] })
    expect(when((await report()).pinned[0].last)).toBe(OCT5.getTime())
  })

  it('draft and archived sessions are not "last"; neither is another user\'s', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', OCT5, 8, 185)
    await lift('Bench Press', OCT12, 8, 200, { status: 'draft' })
    await lift('Bench Press', MON_BEFORE, 8, 210, { archived: true })
    await lift('Bench Press', MON_BEFORE, 8, 250, { userId: otherUserId })
    const last = (await report()).pinned[0].last
    expect(last).toMatchObject({ weight: 185, reps: 8 })
    expect(when(last)).toBe(OCT5.getTime())
  })

  it('it looks back past the chart: a session months ago is still the last one', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', at('2026-03-02', '08:00'), 5, 205)
    const last = (await report()).pinned[0].last
    expect(last).toMatchObject({ weight: 205, reps: 5 })
    expect(when(last)).toBe(at('2026-03-02', '08:00').getTime())
  })

  it('a 1-rep session has e1RM equal to its weight', async () => {
    await pin(['Deadlift'])
    await lift('Deadlift', OCT12, 1, 405)
    approx((await report()).pinned[0].last?.e1rm, 405)
  })

  it('a bodyweight session is its reps and no e1RM', async () => {
    await pin(['Pull-up'])
    await lift('Pull-up', OCT12, 12, 0)
    expect((await report()).pinned[0].last).toMatchObject({ weight: 0, reps: 12, e1rm: null })
  })

  it('A pinned lift never done: no lift, no last, but its name', async () => {
    await pin(['Front Squat'])
    await lift('Leg Press', WED, 10, 300)
    const r = await report()
    expect(r.pinned).toEqual([{ exerciseDefinitionId: await def('Front Squat'), name: 'Front Squat', lift: null, last: null }])
  })

  it('the entry has exactly the pinned fields, and last exactly its four', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', OCT12, 8, 185)
    const entry = (await report()).pinned[0]
    expect(Object.keys(entry).sort()).toEqual(['exerciseDefinitionId', 'last', 'lift', 'name'])
    expect(Object.keys(entry.last as Last).sort()).toEqual(['completedAt', 'e1rm', 'reps', 'weight'])
  })

  it('only the pinned lifts are asked for: a lift not pinned does not appear in pinned', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', OCT12, 8, 185)
    await lift('Row', OCT12, 8, 100)
    expect(names(await report())).toEqual(['Bench Press'])
  })
})

// =====================================================================================
describe('Past weeks use history up to that week', () => {
  const PAST = { weekStart: '2026-10-12', now: NOW }

  it('"last" comes only from sessions before that week ended', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', at('2026-10-05', '08:00'), 8, 185)
    await lift('Bench Press', at('2026-10-21', '08:00'), 5, 225) // after the shown week
    const last = (await report(PAST)).pinned[0].last
    expect(last).toMatchObject({ weight: 185, reps: 8 })
    expect(when(last)).toBe(at('2026-10-05', '08:00').getTime())
  })

  it('a session at the very end of the week (next Monday 00:00 local) is not before it', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', at('2026-10-05', '08:00'), 8, 185)
    await lift('Bench Press', at('2026-10-19', '00:00'), 5, 225)
    expect((await report(PAST)).pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
  })

  it('the zone sets the week end: a Sunday-evening set is in the week for Denver but after it for UTC', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', at('2026-10-05', '08:00'), 8, 185)
    // Sun 2026-10-18 21:00 Denver = Mon 2026-10-19 03:00 UTC
    await lift('Bench Press', new Date('2026-10-19T03:00:00Z'), 5, 225)
    const denver = await report({ ...PAST, timeZone: DEN })
    expect(denver.pinned[0].lift).toMatchObject({ bestSet: { weight: 225, reps: 5 } })
    const utc = await report({ ...PAST, timeZone: 'UTC' })
    expect(utc.pinned[0].lift).toBeNull()
    expect(utc.pinned[0].last).toMatchObject({ weight: 185, reps: 8 })
  })

  it('a lift done in that earlier week shows that week\'s numbers', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', at('2026-10-05', '08:00'), 8, 185)
    await lift('Bench Press', at('2026-10-14', '08:00'), 8, 190)
    await lift('Bench Press', WED, 8, 200)
    const r = await report(PAST)
    expect(r.pinned[0].lift).toMatchObject({ bestSet: { weight: 190, reps: 8 } })
  })

  it('a lift first done after that week had no sessions yet then', async () => {
    await pin(['Front Squat'])
    await lift('Front Squat', WED, 5, 185)
    const r = await report(PAST)
    expect(r.pinned[0]).toMatchObject({ name: 'Front Squat', lift: null, last: null })
  })
})

// =====================================================================================
describe('units', () => {
  it('last is in the user\'s unit: kilograms logged in pounds', async () => {
    await setUnit('kg')
    await pin(['Bench Press'])
    await lift('Bench Press', OCT12, 5, 100 * KG, { unit: 'lbs' })
    const last = (await report()).pinned[0].last
    approx(last?.weight, 100)
    approx(last?.e1rm, epley(100, 5))
  })

  it('last is in the user\'s unit: pounds logged in kilograms', async () => {
    await pin(['Bench Press'])
    await lift('Bench Press', OCT12, 5, 100, { unit: 'kg' })
    const last = (await report()).pinned[0].last
    approx(last?.weight, 100 * KG)
    approx(last?.e1rm, epley(100 * KG, 5))
  })

  it('the best set of the session is judged across units', async () => {
    await pin(['Bench Press'])
    await session({
      ex: 'Bench Press',
      at: OCT12,
      sets: [
        { reps: 5, weight: 100, unit: 'kg' }, // 220.5 lb, the better set
        { reps: 5, weight: 215, unit: 'lbs' },
      ],
    })
    approx((await report()).pinned[0].last?.weight, 100 * KG)
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

  const NAMES = Array.from({ length: 12 }, (_, i) => `Pin ${String(i).padStart(2, '0')}`)
  async function history(lifts: string[]) {
    for (const [i, name] of lifts.entries()) {
      await lift(name, OCT12, 5, 100 + i)
      if (i % 2 === 0) await lift(name, WED, 5, 105 + i) // half are done this week
    }
  }

  it('3 saved pins and 12 saved pins cost the same number of queries, and not many', async () => {
    await history(NAMES)
    await pin(NAMES.slice(0, 3))
    const small = counting(prisma)
    const few = await report({}, userId, small.db)
    expect(few.pinned).toHaveLength(3)

    await prisma.userSettings.deleteMany({ where: { userId } })
    await (prisma as unknown as { pinnedExercise: { deleteMany: (a: object) => Promise<unknown> } }).pinnedExercise.deleteMany({ where: { userId } })
    await pin(NAMES)
    const large = counting(prisma)
    const lots = await report({}, userId, large.db)
    expect(lots.pinned).toHaveLength(12)
    expect(lots.pinned.filter((p) => p.lift === null).length).toBeGreaterThanOrEqual(5)
    expect(lots.pinned.filter((p) => p.lift === null && p.last === null)).toEqual([])

    expect(large.count()).toBe(small.count())
    expect(small.count()).toBeLessThanOrEqual(14)
  })

  it('the anchors default does not run a query per anchor either', async () => {
    await history(NAMES)
    await anchor({ hinge: NAMES.slice(0, 2) })
    const small = counting(prisma)
    expect((await report({}, userId, small.db)).pinned).toHaveLength(2)

    await prisma.userTrainingProfile.update({
      where: { userId },
      data: {
        targetMovements: {
          hinge: await Promise.all(NAMES.slice(0, 4).map(def)),
          squat: await Promise.all(NAMES.slice(4, 8).map(def)),
          horizontal_push: await Promise.all(NAMES.slice(8, 12).map(def)),
        },
      },
    })
    const large = counting(prisma)
    expect((await report({}, userId, large.db)).pinned).toHaveLength(12)
    expect(large.count()).toBe(small.count())
  })

  it('with nothing to look up, a report is no dearer than with pins', async () => {
    await history(NAMES.slice(0, 2))
    const none = counting(prisma)
    await report({}, userId, none.db)
    expect(none.count()).toBeLessThanOrEqual(14)
  })
})
