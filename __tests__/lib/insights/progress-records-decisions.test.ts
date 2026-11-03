/**
 * Progress S2: the lead's decisions after tests 111 (work item 114). Real test DB for the
 * loader part. Spec: the "Lead decisions" scenarios of features/analytics/weekly-records.feature
 * and work/111-handback.md ("Unpinned, decided for the build").
 *
 * Pinned (on top of progress-records.test.ts, progress-records-report.test.ts):
 *   1. computeTrendNote(weeks, normalWeeks, { openWeek }): with openWeek the shown (last) week
 *      is never the light week. The search starts at the week before it, and lastLightWeeksAgo
 *      still counts back from the shown week (the week before = 1). Without openWeek, as before
 *      (the shown week can be 0). getWeeklyReport passes openWeek = the shown week has not ended
 *      at `now`: the current week is open, a past week is not.
 *   2. Several Rep PRs for one exercise in a week: the one with the largest percentage gain over
 *      the earlier heaviest set at its rep count is the record (not the heaviest, the biggest
 *      absolute gain, the highest e1RM, nor the first listed).
 *   3. Records come e1RM PRs first, then Rep PRs, each group by name (A to Z).
 *   4. A Rep PR needs an earlier set at that rep count: a first ever 9-rep set is no record, even
 *      when it is heavier than everything done at other rep counts.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const load = (spec: string) => import(/* @vite-ignore */ spec)

type HSet = {
  completionId: string
  completedAt: Date
  exerciseDefinitionId: string
  name: string
  reps: number
  weight: number
  weightUnit: string
  isWarmup: boolean
}
type Rec = { exerciseDefinitionId: string; name: string; kind: 'e1rm' | 'rep'; weight: number; reps: number; e1rm: number | null; previous: number }
type Stats = {
  weekStart: string
  workouts: number
  workingSets: number
  durationSeconds: number
  cardioMinutes: number
  effort: { avgRpe: number; pctAtOrAbove9: number; setsAt10: number; ratedSets: number } | null
}
type Trend = { effortRisingWeeks: number; effortFrom: number | null; effortTo: number | null; lastLightWeeksAgo: number | null }
type Mod = {
  computeWeekRecords: (h: HSet[], start: Date, end: Date, unit?: string) => Rec[]
  computeTrendNote: (weeks: Stats[], normalWeeks: Stats[], o?: { openWeek?: boolean }) => Trend | null
}
const mod = () => load('@/lib/insights/progress-records') as Promise<Mod>

const WEEK_START = new Date('2026-10-26T00:00:00Z')
const WEEK_END = new Date('2026-11-02T00:00:00Z')
const OCT12 = '2026-10-12T12:00:00Z'
const SEP10 = '2026-09-10T12:00:00Z'
const WED = '2026-10-28T12:00:00Z'
const NAMES: Record<string, string> = { bench: 'Bench Press', squat: 'Back Squat' }

function set(ex: string, when: string, reps: number, weight: number): HSet {
  return {
    completionId: `${ex}@${when}`,
    completedAt: new Date(when),
    exerciseDefinitionId: ex,
    name: NAMES[ex] ?? ex,
    reps,
    weight,
    weightUnit: 'lbs',
    isWarmup: false,
  }
}
const records = async (h: HSet[]) => (await mod()).computeWeekRecords(h, WEEK_START, WEEK_END, 'lbs')

// ============================================================ 1. the open week ======================
const addWeeks = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 7 * 86_400_000).toISOString().slice(0, 10)
const wk = (weekStart: string, workingSets: number, avgRpe: number | null = null): Stats => ({
  weekStart,
  workouts: workingSets > 0 ? 3 : 0,
  workingSets,
  durationSeconds: 0,
  cardioMinutes: 0,
  effort: avgRpe == null ? null : { avgRpe, pctAtOrAbove9: 0, setsAt10: 0, ratedSets: Math.max(1, workingSets) },
})
const FIRST = '2026-09-07'
const chart = (sets: number[], rpes: Array<number | null> = []): Stats[] => sets.map((n, i) => wk(addWeeks(FIRST, i), n, rpes[i] ?? null))
/** A normal of 7 weeks at 50 working sets: light is 30 sets or fewer. */
const NORMAL = Array.from({ length: 7 }, (_, i) => wk(addWeeks(FIRST, i), 50))
const note = async (weeks: Stats[], openWeek?: boolean) => (await mod()).computeTrendNote(weeks, NORMAL, openWeek === undefined ? undefined : { openWeek })

describe('The open current week is never called light', () => {
  it('an open week with few sets is not the light week; the same week closed is (0 weeks ago)', async () => {
    const weeks = chart([50, 50, 50, 50, 50, 50, 50, 5])
    expect((await note(weeks, true))?.lastLightWeeksAgo).toBeNull()
    expect((await note(weeks, false))?.lastLightWeeksAgo).toBe(0)
    expect((await note(weeks))?.lastLightWeeksAgo).toBe(0) // closed unless said otherwise
  })

  it('an open week with no sets yet (Monday morning) is not light either', async () => {
    expect((await note(chart([50, 50, 50, 50, 50, 50, 50, 0]), true))?.lastLightWeeksAgo).toBeNull()
  })

  it('it is skipped, not the end of the search: the last completed light week is still found, counted from the shown week', async () => {
    const weeks = chart([50, 50, 50, 50, 50, 20, 50, 5]) // light at index 5, open week light too
    expect((await note(weeks, true))?.lastLightWeeksAgo).toBe(2)
    expect((await note(weeks, false))?.lastLightWeeksAgo).toBe(0)
  })

  it('the week before the open one is a completed week: 1 week ago', async () => {
    expect((await note(chart([50, 50, 50, 50, 50, 50, 10, 5]), true))?.lastLightWeeksAgo).toBe(1)
  })

  it('an open week that is not light changes nothing', async () => {
    const weeks = chart([50, 50, 30, 50, 50, 50, 50, 40])
    expect((await note(weeks, true))?.lastLightWeeksAgo).toBe(5)
    expect((await note(weeks, false))?.lastLightWeeksAgo).toBe(5)
  })

  it('the open week still counts for the effort run, and for having a note at all', async () => {
    const t = await note(chart([50, 50, 50, 50, 50, 50, 50, 5], [8.4, 8.1, 8.6, 8.2, 8.0, 8.2, 8.5, 8.7]), true)
    expect(t).not.toBeNull()
    expect(t?.effortRisingWeeks).toBe(4)
    expect(t?.effortTo).toBeCloseTo(8.7, 5)
  })
})

// ============================================================ 2. which rep PR =======================
describe('Several Rep PRs: the largest percentage gain is shown', () => {
  // A prior best e1RM of 262.5 (225 x 5) keeps every set below from being an e1RM PR.
  const base = [set('bench', SEP10, 5, 225)]

  it('105 x 10 (+5, 5%) beats 185 x 8 (+5, 2.8%), whichever is listed first', async () => {
    const before = [set('bench', OCT12, 8, 180), set('bench', OCT12, 10, 100)]
    const a = await records([...base, ...before, set('bench', WED, 8, 185), set('bench', WED, 10, 105)])
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ kind: 'rep', reps: 10, weight: 105, previous: 100 })
    const b = await records([...base, ...before, set('bench', WED, 10, 105), set('bench', WED, 8, 185)])
    expect(b[0]).toMatchObject({ kind: 'rep', reps: 10, weight: 105, previous: 100 })
  })

  it('the biggest gain of three, wherever it sits', async () => {
    const before = [set('bench', OCT12, 8, 180), set('bench', OCT12, 10, 100), set('bench', OCT12, 12, 120)]
    const r = await records([...base, ...before, set('bench', WED, 10, 105), set('bench', WED, 12, 130), set('bench', WED, 8, 185)])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'rep', reps: 12, weight: 130, previous: 120 }) // +8.3%
  })

  it('it is the percentage, not the biggest absolute gain: +10 lb at 10.5% beats +15 lb at 7.9%', async () => {
    const before = [set('bench', OCT12, 3, 190), set('bench', OCT12, 10, 95)]
    const r = await records([...base, ...before, set('bench', WED, 3, 205), set('bench', WED, 10, 105)])
    expect(r[0]).toMatchObject({ kind: 'rep', reps: 10, weight: 105, previous: 95 })
  })

  it('and the reported previous is the earlier heaviest at that rep count', async () => {
    const before = [set('bench', SEP10, 10, 90), set('bench', OCT12, 10, 95), set('bench', OCT12, 8, 180)]
    const r = await records([...base, ...before, set('bench', WED, 10, 105), set('bench', WED, 8, 185)])
    expect(r[0]).toMatchObject({ reps: 10, weight: 105, previous: 95 })
  })

  it('an e1RM PR still wins over any Rep PR', async () => {
    const r = await records([
      ...base,
      set('bench', OCT12, 10, 150),
      set('bench', WED, 10, 200), // +33% as a Rep PR, but e1RM 266.7 beats 262.5 first
    ])
    expect(r[0]).toMatchObject({ kind: 'e1rm' })
  })
})

// ============================================================ 3. order ==============================
describe('Records order: e1RM PRs first, then Rep PRs, each by name', () => {
  // Zeta and Beta set e1RM PRs; Mid (bodyweight) and Alpha set Rep PRs. Listed in a scrambled order.
  const history = (): HSet[] => [
    set('Zeta', OCT12, 5, 100),
    set('Mid', OCT12, 8, 0),
    set('Alpha', SEP10, 5, 225),
    set('Alpha', OCT12, 8, 180),
    set('Beta', OCT12, 5, 100),
    set('Zeta', WED, 5, 110),
    set('Alpha', WED, 8, 185),
    set('Mid', WED, 10, 0),
    set('Beta', WED, 5, 110),
  ]

  it('Beta, Zeta (e1RM), then Alpha, Mid (Rep PR)', async () => {
    const r = await records(history())
    expect(r.map((x) => [x.name, x.kind])).toEqual([
      ['Beta', 'e1rm'],
      ['Zeta', 'e1rm'],
      ['Alpha', 'rep'],
      ['Mid', 'rep'],
    ])
  })

  it('whatever order the history comes in', async () => {
    const r = await records(history().reverse())
    expect(r.map((x) => x.name)).toEqual(['Beta', 'Zeta', 'Alpha', 'Mid'])
  })
})

// ============================================================ 4. first set at a rep count ===========
describe('A rep PR needs an earlier set at that rep count', () => {
  const base = [set('bench', SEP10, 5, 225), set('bench', OCT12, 8, 180)]

  it('A first ever 9-rep set is not a Rep PR', async () => {
    expect(await records([...base, set('bench', WED, 9, 185)])).toEqual([])
  })

  it('not even when it is heavier than everything done at other rep counts', async () => {
    // 230 x 2 is e1RM 245, below 262.5; heavier than the 225 x 5 and the 180 x 8, but there was never a double.
    expect(await records([...base, set('bench', WED, 2, 230)])).toEqual([])
  })

  it('a first-time set does not crowd out a real Rep PR in the same week', async () => {
    const r = await records([...base, set('bench', WED, 9, 185), set('bench', WED, 8, 185)])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'rep', reps: 8, weight: 185, previous: 180 })
  })

  it('an earlier set at that rep count, however old, is enough', async () => {
    const r = await records([...base, set('bench', '2026-05-01T12:00:00Z', 9, 170), set('bench', WED, 9, 185)])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'rep', reps: 9, previous: 170 })
  })
})

// ============================================================ the loader ============================
const DEN = 'America/Denver'
const NOW = new Date('2026-10-28T18:00:00Z') // Wednesday, inside the shown week 2026-10-26
let prisma: PrismaClient
let userId: string
const defs = new Map<string, string>()

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  defs.clear()
})

type Report = { weekStart: string; isCurrentWeek: boolean; records: Rec[]; trend: Trend | null }
async function report(opts: { weekStart?: string; now?: Date } = {}): Promise<Report> {
  const m = (await load('@/lib/insights/progress')) as {
    getWeeklyReport: (db: PrismaClient, userId: string, o: { weekStart: string; timeZone: string; now: Date }) => Promise<Report>
  }
  return m.getWeeklyReport(prisma, userId, { weekStart: '2026-10-26', timeZone: DEN, now: NOW, ...opts })
}

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
function at(day: string, time = '10:00', tz = DEN): Date {
  const guess = Date.parse(`${day}T${time}:00Z`)
  const first = guess - offsetMs(guess, tz)
  return new Date(guess - offsetMs(first, tz))
}
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

async function session(ex: string, when: Date, sets: Array<{ reps: number; weight: number }>) {
  let defId = defs.get(ex)
  if (!defId) {
    defId = (await createTestExerciseDefinition(prisma, { name: ex, primaryFAUs: ['chest'] })).id
    defs.set(ex, defId)
  }
  const c = await prisma.workoutCompletion.create({ data: { userId, status: 'completed', completedAt: when, isAdHoc: true } })
  const e = await prisma.exercise.create({
    data: { name: ex, exerciseDefinitionId: defId, order: 1, userId, workoutCompletionId: c.id, isOneOff: true },
  })
  await prisma.loggedSet.createMany({
    data: sets.map((s, i) => ({
      setNumber: i + 1,
      reps: s.reps,
      weight: s.weight,
      weightUnit: 'lbs',
      exerciseId: e.id,
      completionId: c.id,
      userId,
      createdAt: when,
    })),
  })
}
/** A workout in the week with `n` working sets of bench. */
const weekWith = (weekStart: string, n: number, day = 1) =>
  session('Bench Press', at(addDays(weekStart, day)), Array.from({ length: n }, () => ({ reps: 5, weight: 100 })))
/** Seven weeks from 09-07 to 10-19 of 4 sets each, `light` of them at one set. */
async function history(light: string[] = []) {
  for (let i = 0; i < 7; i++) {
    const w = addDays(FIRST, i * 7)
    await weekWith(w, light.includes(w) ? 1 : 4)
  }
}

describe('The open current week, from the database', () => {
  it('a current week with one set so far is not the light week', async () => {
    await history()
    await weekWith('2026-10-26', 1, 0) // Monday, one set, week still open at NOW
    const r = await report()
    expect(r.isCurrentWeek).toBe(true)
    expect(r.trend).not.toBeNull()
    expect(r.trend?.lastLightWeeksAgo).toBeNull()
  })

  it('and the last completed light week is still found, counted from the open week', async () => {
    await history(['2026-09-21'])
    await weekWith('2026-10-26', 1, 0)
    expect((await report()).trend?.lastLightWeeksAgo).toBe(5)
  })

  it('the same week once it has ended is judged: light, 0 weeks ago', async () => {
    await history()
    await weekWith('2026-10-26', 1, 0)
    const r = await report({ now: new Date('2026-11-04T18:00:00Z') })
    expect(r.isCurrentWeek).toBe(false)
    expect(r.trend?.lastLightWeeksAgo).toBe(0)
  })

  it('a past week shown while later weeks are open is judged too', async () => {
    await history()
    // The week of Oct 19 is complete at NOW and had a single set: it is the shown week, light, 0 ago.
    await prisma.workoutCompletion.deleteMany({ where: { userId, completedAt: { gte: at('2026-10-19', '00:00'), lt: at('2026-10-26', '00:00') } } })
    await weekWith('2026-10-19', 1)
    const r = await report({ weekStart: '2026-10-19' })
    expect(r.isCurrentWeek).toBe(false)
    expect(r.trend?.lastLightWeeksAgo).toBe(0)
  })
})

describe('Records order and the chosen Rep PR, from the database', () => {
  it('e1RM PRs first, then Rep PRs, by name', async () => {
    await session('Zeta', at('2026-10-12'), [{ reps: 5, weight: 100 }])
    await session('Zeta', at('2026-10-28'), [{ reps: 5, weight: 110 }])
    await session('Alpha', at('2026-09-10'), [{ reps: 5, weight: 225 }])
    await session('Alpha', at('2026-10-12'), [{ reps: 8, weight: 180 }])
    await session('Alpha', at('2026-10-28'), [{ reps: 8, weight: 185 }])
    await session('Beta', at('2026-10-12'), [{ reps: 5, weight: 100 }])
    await session('Beta', at('2026-10-28'), [{ reps: 5, weight: 110 }])
    expect((await report()).records.map((r) => [r.name, r.kind])).toEqual([
      ['Beta', 'e1rm'],
      ['Zeta', 'e1rm'],
      ['Alpha', 'rep'],
    ])
  })

  it('several Rep PRs: the largest percentage gain; a first-time rep count is no record', async () => {
    await session('Bench Press', at('2026-09-10'), [{ reps: 5, weight: 225 }])
    await session('Bench Press', at('2026-10-12'), [{ reps: 8, weight: 180 }, { reps: 10, weight: 100 }])
    await session('Bench Press', at('2026-10-28'), [{ reps: 8, weight: 185 }, { reps: 10, weight: 105 }, { reps: 9, weight: 190 }])
    const r = (await report()).records
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'rep', reps: 10, weight: 105, previous: 100 })
  })
})
