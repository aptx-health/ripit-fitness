/**
 * Progress S2 fixes from review 113 (work item 115). Real test DB for the loader parts.
 * Spec: features/analytics/weekly-records.feature, "e1RM PRs only count sets of 12 reps or fewer".
 *
 *   1. Only sets of 1 to 12 reps can be an e1RM PR, and only they count toward the earlier best
 *      e1RM a record is judged against. Lifts still shows high-rep sets with their e1RM.
 *   2. The loader reads a bounded set of earlier rows: for this week's exercises, each session's
 *      best set plus each exercise's bests (heaviest at each of 1 to 12 reps, most bodyweight
 *      reps). The rows grow with sessions, not sets, and the records and lifts are the same as
 *      the pure functions give on every set.
 *   3. TrendNote.lightWeeksSearched: how many chart weeks the light-week search covered (8, or
 *      fewer when the first workout is inside the chart), so the page doesn't claim 8.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getWeeklyReport, type WeekStats } from '@/lib/insights/progress'
import { computeTrendNote, computeWeekLifts, computeWeekRecords, type HistorySet } from '@/lib/insights/progress-records'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const WEEK_START = new Date('2026-10-26T00:00:00Z')
const WEEK_END = new Date('2026-11-02T00:00:00Z')
const SEP10 = '2026-09-10T12:00:00Z'
const OCT12 = '2026-10-12T12:00:00Z'
const WED = '2026-10-28T12:00:00Z'
const epley = (w: number, r: number) => (r === 1 ? w : w * (1 + r / 30))

function set(ex: string, when: string, reps: number, weight: number, unit = 'lbs'): HistorySet {
  return {
    completionId: `${ex}@${when}`,
    completedAt: new Date(when),
    exerciseDefinitionId: ex,
    name: ex,
    reps,
    weight,
    weightUnit: unit,
    isWarmup: false,
  }
}
const records = (h: HistorySet[]) => computeWeekRecords(h, WEEK_START, WEEK_END)
const lifts = (h: HistorySet[]) => computeWeekLifts(h, WEEK_START, WEEK_END)

// ---------------------------------------------------------------------------
describe('e1RM PRs only count sets of 12 reps or fewer', () => {
  it('Calf Raise 155 x 16 against 135 x 15 is no PR, and Calf Raise still shows in Lifts', () => {
    const h = [set('calf', OCT12, 15, 135), set('calf', WED, 16, 155)]
    expect(records(h)).toEqual([])
    const [lift] = lifts(h)
    expect(lift).toMatchObject({ exerciseDefinitionId: 'calf', bestSet: { weight: 155, reps: 16 } })
    expect(lift.e1rm).toBeCloseTo(epley(155, 16), 5)
    expect(lift.previousE1rm).toBeCloseTo(epley(135, 15), 5)
  })

  it('12 reps can be an e1RM PR; 13 cannot', () => {
    expect(records([set('a', OCT12, 5, 100), set('a', WED, 12, 100)])).toMatchObject([{ kind: 'e1rm', reps: 12 }])
    expect(records([set('a', OCT12, 5, 100), set('a', WED, 13, 100)])).toEqual([])
  })

  it('the earlier best is the best at 12 reps or fewer: a higher 20-rep e1RM before does not block it', () => {
    const r = records([set('a', SEP10, 20, 200), set('a', OCT12, 10, 150), set('a', WED, 10, 160)])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'e1rm', weight: 160, reps: 10 })
    expect(r[0].previous).toBeCloseTo(epley(150, 10), 5)
  })

  it('a week whose best e1RM is a high-rep set is judged on its best set of 12 or fewer', () => {
    // 100 x 20 (166.7) is the week's top e1RM, but only 130 x 5 (151.7) can be the record.
    const r = records([set('a', OCT12, 5, 125), set('a', WED, 20, 100), set('a', WED, 5, 130)])
    expect(r).toMatchObject([{ kind: 'e1rm', weight: 130, reps: 5 }])
  })

  it('with only high-rep sets before, a first set at 12 or fewer is no e1RM PR', () => {
    expect(records([set('a', OCT12, 15, 100), set('a', WED, 8, 150)])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
describe('the loader (real DB)', () => {
  const DEN = 'America/Denver'
  const NOW = new Date('2026-10-28T18:00:00Z')
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const db = await getTestDatabase()
    await db.reset()
    prisma = db.getPrismaClient()
    userId = (await createTestUser()).id
  })

  type Spec = { reps: number; weight: number; unit?: string; warmup?: boolean }
  async function session(defId: string, at: string, sets: Spec[]) {
    const c = await prisma.workoutCompletion.create({ data: { userId, status: 'completed', completedAt: new Date(at), isAdHoc: true } })
    const e = await prisma.exercise.create({
      data: { name: 'x', exerciseDefinitionId: defId, order: 1, userId, workoutCompletionId: c.id, isOneOff: true },
    })
    await prisma.loggedSet.createMany({
      data: sets.map((s, i) => ({
        setNumber: i + 1,
        reps: s.reps,
        weight: s.weight,
        weightUnit: s.unit ?? 'lbs',
        isWarmup: s.warmup ?? false,
        exerciseId: e.id,
        completionId: c.id,
        userId,
      })),
    })
  }
  // Before the 9 weeks the report reads set by set: these only come back through the earlier-sets query.
  const JUL6 = '2026-07-06T15:00:00Z'
  const JUL20 = '2026-07-20T15:00:00Z'
  const def = async (name: string) => (await createTestExerciseDefinition(prisma, { name, primaryFAUs: ['chest'] })).id

  /** The report, with the rows of every raw query kept. */
  async function report() {
    const raw: unknown[][] = []
    const db = new Proxy(prisma, {
      get(t, prop) {
        const value = Reflect.get(t, prop)
        if (prop !== '$queryRaw') return value
        return async (...args: unknown[]) => {
          const rows = await (value as (...a: unknown[]) => Promise<unknown[]>).apply(t, args)
          raw.push(rows)
          return rows
        }
      },
    })
    const r = await getWeeklyReport(db, userId, { weekStart: '2026-10-26', timeZone: DEN, now: NOW })
    const earlier = raw.find((rows) => rows.some((row) => typeof row === 'object' && row && 'completionId' in row)) ?? []
    return { r, earlierRows: earlier.length }
  }

  /** Every working set of the user, as the pure functions take them. */
  async function allSets(): Promise<HistorySet[]> {
    const rows = await prisma.loggedSet.findMany({
      where: { completion: { userId, status: 'completed', isArchived: false } },
      select: {
        reps: true,
        weight: true,
        weightUnit: true,
        isWarmup: true,
        completion: { select: { id: true, completedAt: true } },
        exercise: { select: { exerciseDefinitionId: true, exerciseDefinition: { select: { name: true } } } },
      },
    })
    return rows.map((s) => ({
      completionId: s.completion.id,
      completedAt: s.completion.completedAt,
      exerciseDefinitionId: s.exercise.exerciseDefinitionId,
      name: s.exercise.exerciseDefinition.name,
      reps: s.reps,
      weight: s.weight,
      weightUnit: s.weightUnit,
      isWarmup: s.isWarmup,
    }))
  }

  /** 20 earlier weekly sessions of `setsPer` mixed sets: reps 1-20, lbs and kg, a warm-up and a bodyweight set. */
  async function longHistory(defId: string, setsPer: number) {
    for (let i = 0; i < 20; i++) {
      const at = new Date(Date.parse('2026-05-04T15:00:00Z') + i * 7 * 86_400_000).toISOString()
      const sets: Spec[] = Array.from({ length: setsPer }, (_, k) => ({
        reps: ((i + k * 7) % 20) + 1,
        weight: 60 + ((i * 13 + k * 29) % 90),
        unit: k % 3 === 0 ? 'kg' : 'lbs',
      }))
      sets.push({ reps: 5, weight: 300, warmup: true }, { reps: 8 + (i % 6), weight: 0 })
      await session(defId, at, sets)
    }
  }

  it('Calf Raise 155 x 16 after 135 x 15: no record, still in Lifts', async () => {
    const calf = await def('Calf Raise')
    await session(calf, '2026-10-13T15:00:00Z', [{ reps: 15, weight: 135 }])
    await session(calf, WED, [{ reps: 16, weight: 155 }])
    const { r } = await report()
    expect(r.records).toEqual([])
    expect(r.lifts.map((l) => l.name)).toEqual(['Calf Raise'])
  })

  it('a long history gives the same records and lifts as every set does', async () => {
    const a = await def('Lift A')
    const b = await def('Lift B')
    await longHistory(a, 12)
    await longHistory(b, 12)
    await session(a, WED, [{ reps: 3, weight: 150 }, { reps: 10, weight: 120 }, { reps: 15, weight: 100 }])
    await session(b, WED, [{ reps: 6, weight: 140 }, { reps: 11, weight: 0 }])
    const { r } = await report()
    const all = await allSets()
    const start = new Date('2026-10-26T06:00:00Z') // Denver midnight
    const end = new Date('2026-11-02T07:00:00Z')
    expect(r.records).toEqual(computeWeekRecords(all, start, end))
    expect(r.lifts).toEqual(computeWeekLifts(all, start, end))
    expect(r.lifts).toHaveLength(2)
  })

  it('a Rep PR is judged against the heaviest earlier set at its reps, even when that set was no session\'s best', async () => {
    const bench = await def('Bench Press')
    await session(bench, JUL6, [{ reps: 5, weight: 225 }, { reps: 8, weight: 170 }])
    await session(bench, JUL20, [{ reps: 5, weight: 220 }, { reps: 8, weight: 180 }])
    await session(bench, WED, [{ reps: 8, weight: 185 }])
    expect((await report()).r.records).toMatchObject([{ kind: 'rep', reps: 8, weight: 185, previous: 180 }])
  })

  it('a bodyweight Rep PR is judged against the most earlier bodyweight reps, in a session with weighted sets too', async () => {
    const dip = await def('Dip')
    await session(dip, JUL6, [{ reps: 5, weight: 45 }, { reps: 12, weight: 0 }])
    await session(dip, JUL20, [{ reps: 10, weight: 0 }])
    await session(dip, WED, [{ reps: 13, weight: 0 }])
    expect((await report()).r.records).toMatchObject([{ kind: 'rep', weight: 0, reps: 13, previous: 12 }])
  })

  it('the earlier rows grow with sessions, not with sets', async () => {
    const a = await def('Lift A')
    await longHistory(a, 4)
    await session(a, WED, [{ reps: 5, weight: 100 }])
    const few = (await report()).earlierRows

    await prisma.loggedSet.deleteMany({})
    await prisma.exercise.deleteMany({})
    await prisma.workoutCompletion.deleteMany({})
    await longHistory(a, 16)
    await session(a, WED, [{ reps: 5, weight: 100 }])
    const many = (await report()).earlierRows

    // 20 sessions x 18 sets in: at most one best per session, 12 rep-count bests, one bodyweight best.
    expect(many).toBeLessThanOrEqual(20 + 12 + 1)
    expect(many).toBeLessThanOrEqual(few + 12)
    expect(many).toBeGreaterThan(0)
  })

  it('the trend note says how many weeks the light-week search covered', async () => {
    const a = await def('Lift A')
    for (const day of ['2026-10-06', '2026-10-13', '2026-10-20', WED]) await session(a, `${day.slice(0, 10)}T15:00:00Z`, [{ reps: 5, weight: 100 }])
    const { r } = await report()
    expect(r.trend?.lightWeeksSearched).toBe(4) // the 3 weeks before the shown one, and the shown week
  })
})

// ---------------------------------------------------------------------------
describe('lightWeeksSearched (pure)', () => {
  const addWeeks = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 7 * 86_400_000).toISOString().slice(0, 10)
  const wk = (weekStart: string, workingSets: number): WeekStats => ({
    weekStart,
    workouts: 3,
    workingSets,
    durationSeconds: 0,
    cardioMinutes: 0,
    effort: null,
  })
  const chart = Array.from({ length: 8 }, (_, i) => wk(addWeeks('2026-09-07', i), i < 3 ? 0 : 50))

  it('the first workout inside the chart: only the weeks from it on', () => {
    const t = computeTrendNote(chart, chart.slice(3, 7))
    expect(t).toMatchObject({ lastLightWeeksAgo: null, lightWeeksSearched: 5 })
  })

  it('the first workout before the chart: all 8', () => {
    const normal = [wk('2026-08-31', 50), ...chart.slice(0, 7).map((w) => ({ ...w, workingSets: 50 }))]
    expect(computeTrendNote(chart.map((w) => ({ ...w, workingSets: 50 })), normal)?.lightWeeksSearched).toBe(8)
  })

  it('an open shown week is still one of the weeks covered (it just is never light)', () => {
    expect(computeTrendNote(chart, chart.slice(3, 7), { openWeek: true })?.lightWeeksSearched).toBe(5)
  })
})
