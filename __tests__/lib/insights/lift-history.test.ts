/**
 * Per-lift page: the pure maths (work item 125). Spec: features/analytics/lift-page.feature.
 * No DB; the loader and the route are pinned in lift-history-loader.test.ts and
 * progress-lift-route.test.ts.
 *
 * Pinned (all in `@/lib/insights/lift-history`; they extend S2's rules in progress-records.ts:
 * working sets only, Epley e1RM from sets of 12 reps or fewer, 1 rep = the weight, bodyweight =
 * weight 0 has no e1RM; weights come out in the user's unit, raw, unrounded; a set's weight is
 * compared in pounds, 1 kg = 2.20462 lb):
 *
 * Input sets are S2's `HistorySet` of ONE exercise plus optional `rpe` and `rir` (null / absent =
 * not rated). Effort of a set = rpe, else 10 - rir, else none (as `setEffort` in S1).
 *
 * computeLiftSessions(history, unit) -> LiftSession[], newest first, one per completionId:
 *   { completionId, date: Date (the session's completedAt),
 *     sets: [{ weight, reps }]   working sets in the order given,
 *     e1rm: number | null        best Epley of its sets with reps <= 12; null if none,
 *     topSet: { weight, reps }   heaviest weight (more reps on a tie); bodyweight: the most reps, weight 0,
 *     avgRpe: number | null }    mean effort of the rated working sets; null if none rated
 *   A session with only warm-ups does not exist.
 *
 * computeRepRecords(history, unit, weekStart: Date) -> [{ reps, weight, date: Date, isNew }]
 *   ascending by reps; the heaviest working set at each rep count that was done, any count
 *   (lead, work 128: Dustin uncapped records after review 127); on a tie the earliest set keeps the record. isNew = the record's date is at or
 *   after weekStart. Bodyweight (every working set has weight 0): ONE entry, the most reps in a
 *   set (any count, earliest on a tie) as { reps, weight: 0, date, isNew }.
 *
 * chartSeries(sessions, range: '3M' | '6M' | '1Y' | 'All', now: Date, timeZone: string) ->
 *   { points, change, best, heaviest, mostReps, sessions: number, since: Date | null }
 *   points  oldest first. 3M and 6M: one per session in the range. 1Y and All: one per LOCAL week
 *           (Monday to Sunday in timeZone) that has a session, carrying that week's best of each
 *           field; its date is the date of the week's session with the best e1RM (bodyweight: the
 *           most reps; earliest on a tie).
 *           { date, e1rm: number | null, topSet: { weight, reps }, reps: number, isPr: boolean }
 *           reps = the most reps in a set that session (or week) had.
 *   change  { e1rm, topSet, reps }, each { first, last, percent } | null: first and last are the
 *           oldest and newest plotted points' value (e1RM; top-set weight; reps), percent =
 *           (last - first) / first * 100 unrounded; null with fewer than 2 points that have the value.
 *   best    the all-time best session e1RM { e1rm, date } (over ALL sessions, not just the range); null if none.
 *           Exactly the point holding that session has isPr: true (none when it is outside the range).
 *   heaviest the all-time heaviest top set { weight, reps, date } (more reps on a tie); null if no sessions.
 *   mostReps the all-time most reps in a set { reps, date }; null if no sessions.
 *   sessions the number of SESSIONS in the range (not points); since: the oldest of them, or null.
 *   Range edges are not pinned; the tests keep clear of them: 3M ~ 91 days, 6M ~ 182, 1Y ~ 365.
 *
 * weeklySets(history, range, now, timeZone) -> [{ weekStart: 'YYYY-MM-DD', sets: number }]
 *   working sets per local week, oldest first, weeks with none as 0, up to and including the week of
 *   `now`. It starts at the later of the range's first week and the week of the lift's first set
 *   ('All': the first set's week). Empty history -> [].
 */

import { describe, expect, it } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

type Sess = {
  completionId: string
  date: Date
  sets: Array<{ weight: number; reps: number }>
  e1rm: number | null
  topSet: { weight: number; reps: number }
  avgRpe: number | null
}
type Rec = { reps: number; weight: number; date: Date; isNew: boolean }
type Point = { date: Date; e1rm: number | null; topSet: { weight: number; reps: number }; reps: number; isPr: boolean }
type Change = { first: number; last: number; percent: number } | null
type Series = {
  points: Point[]
  change: { e1rm: Change; topSet: Change; reps: Change }
  best: { e1rm: number; date: Date } | null
  heaviest: { weight: number; reps: number; date: Date } | null
  mostReps: { reps: number; date: Date } | null
  sessions: number
  since: Date | null
}
type Set = {
  completionId: string
  completedAt: Date
  exerciseDefinitionId: string
  name: string
  reps: number
  weight: number
  weightUnit: string
  isWarmup: boolean
  rpe?: number | null
  rir?: number | null
}
type Range = '3M' | '6M' | '1Y' | 'All'

const lib = async () =>
  (await load('@/lib/insights/lift-history')) as {
    computeLiftSessions: (h: Set[], unit: 'lbs' | 'kg') => Sess[]
    computeRepRecords: (h: Set[], unit: 'lbs' | 'kg', weekStart: Date) => Rec[]
    chartSeries: (s: Sess[], range: Range, now: Date, tz: string) => Series
    weeklySets: (h: Set[], range: Range, now: Date, tz: string) => Array<{ weekStart: string; sets: number }>
  }

const KG = 2.20462
const DEN = 'America/Denver'
const epley = (w: number, r: number) => (r === 1 ? w : w * (1 + r / 30))
const near = (actual: number | null | undefined, expected: number, digits = 3) => expect(actual as number).toBeCloseTo(expected, digits)

function s(c: string, iso: string, reps: number, weight: number, o: Partial<Set> = {}): Set {
  return {
    completionId: c,
    completedAt: new Date(iso),
    exerciseDefinitionId: 'squat',
    name: 'Back Squat',
    reps,
    weight,
    weightUnit: 'lbs',
    isWarmup: false,
    ...o,
  }
}

// =====================================================================================
describe('computeLiftSessions: one entry per session', () => {
  it('is empty without sets, and a session of only warm-ups is not a session', async () => {
    const { computeLiftSessions } = await lib()
    expect(computeLiftSessions([], 'lbs')).toEqual([])
    expect(computeLiftSessions([s('a', '2026-10-01T18:00:00Z', 5, 100, { isWarmup: true })], 'lbs')).toEqual([])
  })

  it('has one entry per completion, newest first, whatever order the sets come in', async () => {
    const { computeLiftSessions } = await lib()
    const out = computeLiftSessions(
      [
        s('mid', '2026-10-10T18:00:00Z', 5, 200),
        s('new', '2026-10-20T18:00:00Z', 5, 210),
        s('old', '2026-10-01T18:00:00Z', 5, 190),
        s('mid', '2026-10-10T18:00:00Z', 5, 200),
      ],
      'lbs',
    )
    expect(out.map((x) => x.completionId)).toEqual(['new', 'mid', 'old'])
    expect(out[1].sets).toHaveLength(2)
    expect(out[0].date).toEqual(new Date('2026-10-20T18:00:00Z'))
  })

  it('two workouts on the same day are two sessions', async () => {
    const { computeLiftSessions } = await lib()
    const out = computeLiftSessions([s('am', '2026-10-30T14:00:00Z', 5, 200), s('pm', '2026-10-30T23:00:00Z', 5, 210)], 'lbs')
    expect(out.map((x) => x.completionId)).toEqual(['pm', 'am'])
  })

  it('lists the working sets in the order given, as weight and reps', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions(
      [s('a', '2026-10-30T18:00:00Z', 4, 275), s('a', '2026-10-30T18:00:00Z', 6, 255), s('a', '2026-10-30T18:00:00Z', 6, 255)],
      'lbs',
    )
    expect(only.sets).toEqual([
      { weight: 275, reps: 4 },
      { weight: 255, reps: 6 },
      { weight: 255, reps: 6 },
    ])
  })

  it('leaves warm-ups out of the sets, the top set, the e1RM and the effort', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions(
      [
        s('a', '2026-10-30T18:00:00Z', 5, 135, { isWarmup: true, rpe: 3 }),
        s('a', '2026-10-30T18:00:00Z', 1, 400, { isWarmup: true }),
        s('a', '2026-10-30T18:00:00Z', 5, 200, { rpe: 8 }),
      ],
      'lbs',
    )
    expect(only.sets).toEqual([{ weight: 200, reps: 5 }])
    expect(only.topSet).toEqual({ weight: 200, reps: 5 })
    near(only.e1rm, epley(200, 5))
    expect(only.avgRpe).toBe(8)
  })

  it('takes the best Epley e1RM, which need not be the heaviest set', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions([s('a', '2026-10-30T18:00:00Z', 1, 300), s('a', '2026-10-30T18:00:00Z', 8, 250)], 'lbs')
    near(only.e1rm, epley(250, 8)) // 316.67 beats the single at 300
    expect(only.topSet).toEqual({ weight: 300, reps: 1 })
  })

  it('reads a single as its own weight, with no Epley bump', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions([s('a', '2026-10-30T18:00:00Z', 1, 300)], 'lbs')
    near(only.e1rm, 300)
  })

  it('gives sets of more than 12 reps no e1RM: 12 counts, 13 does not', async () => {
    const { computeLiftSessions } = await lib()
    const [twelve] = computeLiftSessions([s('a', '2026-10-30T18:00:00Z', 12, 100)], 'lbs')
    near(twelve.e1rm, 140)
    const [thirteen] = computeLiftSessions([s('b', '2026-10-30T18:00:00Z', 13, 100)], 'lbs')
    expect(thirteen.e1rm).toBeNull()
    expect(thirteen.sets).toEqual([{ weight: 100, reps: 13 }]) // still listed
    expect(thirteen.topSet).toEqual({ weight: 100, reps: 13 }) // and still a top set
  })

  it('ignores a high-rep set when another set in the session counts', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions([s('a', '2026-10-30T18:00:00Z', 20, 150), s('a', '2026-10-30T18:00:00Z', 5, 200)], 'lbs')
    near(only.e1rm, epley(200, 5)) // 150 x 20 would be 250
  })

  it('has no e1RM for bodyweight and its top set is the most reps', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions(
      [s('a', '2026-10-30T18:00:00Z', 8, 0), s('a', '2026-10-30T18:00:00Z', 12, 0), s('a', '2026-10-30T18:00:00Z', 10, 0)],
      'lbs',
    )
    expect(only.e1rm).toBeNull()
    expect(only.topSet).toEqual({ weight: 0, reps: 12 })
    expect(only.sets).toHaveLength(3)
  })

  it('breaks a tie on the top set weight by the most reps', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions(
      [s('a', '2026-10-30T18:00:00Z', 3, 225), s('a', '2026-10-30T18:00:00Z', 5, 225), s('a', '2026-10-30T18:00:00Z', 4, 225)],
      'lbs',
    )
    expect(only.topSet).toEqual({ weight: 225, reps: 5 })
  })

  it('shows weights in the user’s unit and compares mixed units by weight', async () => {
    const { computeLiftSessions } = await lib()
    const sets = [s('a', '2026-10-30T18:00:00Z', 3, 100, { weightUnit: 'kg' }), s('a', '2026-10-30T18:00:00Z', 5, 215)]
    const [lbs] = computeLiftSessions(sets, 'lbs')
    expect(lbs.topSet.reps).toBe(3) // 100 kg = 220.46 lb beats 215 lb
    near(lbs.topSet.weight, 100 * KG)
    near(lbs.sets[0].weight, 100 * KG)
    expect(lbs.sets[1]).toEqual({ weight: 215, reps: 5 })
    const [kg] = computeLiftSessions(sets, 'kg')
    expect(kg.sets[0]).toEqual({ weight: 100, reps: 3 })
    near(kg.sets[1].weight, 215 / KG)
    near(kg.topSet.weight, 100)
    near(kg.e1rm, Math.max(epley(100 * KG, 3), epley(215, 5)) / KG)
  })

  it('averages the effort of the rated sets: RIR reads as 10 minus RIR, RPE wins, unrated sets do not count', async () => {
    const { computeLiftSessions } = await lib()
    const at = '2026-10-30T18:00:00Z'
    const [a] = computeLiftSessions([s('a', at, 5, 200, { rpe: 8 }), s('a', at, 5, 200, { rpe: 9 }), s('a', at, 5, 200)], 'lbs')
    expect(a.avgRpe).toBe(8.5) // not 5.67
    const [b] = computeLiftSessions([s('b', at, 5, 200, { rir: 2 }), s('b', at, 5, 200, { rpe: 9 })], 'lbs')
    expect(b.avgRpe).toBe(8.5)
    const [c] = computeLiftSessions([s('c', at, 5, 200, { rpe: 7, rir: 0 })], 'lbs')
    expect(c.avgRpe).toBe(7)
    const [d] = computeLiftSessions([s('d', at, 5, 200), s('d', at, 5, 200, { rpe: null, rir: null })], 'lbs')
    expect(d.avgRpe).toBeNull()
  })

  it('treats RIR 0 as a rating (effort 10), not as missing', async () => {
    const { computeLiftSessions } = await lib()
    const [only] = computeLiftSessions([s('a', '2026-10-30T18:00:00Z', 5, 200, { rir: 0 })], 'lbs')
    expect(only.avgRpe).toBe(10)
  })
})

// =====================================================================================
describe('computeRepRecords: the heaviest set at each rep count', () => {
  const WEEK = new Date('2026-10-26T06:00:00Z') // Monday 00:00 Denver (MDT)

  it('is empty without sets', async () => {
    const { computeRepRecords } = await lib()
    expect(computeRepRecords([], 'lbs', WEEK)).toEqual([])
  })

  it('lists only the rep counts that were done, ascending, each with the heaviest weight and its date', async () => {
    const { computeRepRecords } = await lib()
    const out = computeRepRecords(
      [
        s('a', '2026-08-14T18:00:00Z', 1, 270),
        s('b', '2026-09-01T18:00:00Z', 5, 255),
        s('c', '2026-10-23T18:00:00Z', 5, 265),
        s('d', '2026-10-09T18:00:00Z', 3, 275),
        s('e', '2026-09-20T18:00:00Z', 5, 245), // lighter, later than the first five
      ],
      'lbs',
      WEEK,
    )
    expect(out.map((r) => r.reps)).toEqual([1, 3, 5])
    expect(out.map((r) => r.weight)).toEqual([270, 275, 265])
    expect(out[2].date).toEqual(new Date('2026-10-23T18:00:00Z'))
    expect(out[0].date).toEqual(new Date('2026-08-14T18:00:00Z'))
  })

  it('counts every rep count, 13 and above included (work 128)', async () => {
    const { computeRepRecords } = await lib()
    const out = computeRepRecords([s('a', '2026-09-01T18:00:00Z', 12, 100), s('b', '2026-09-02T18:00:00Z', 13, 90), s('c', '2026-09-03T18:00:00Z', 20, 60)], 'lbs', WEEK)
    expect(out.map((r) => r.reps)).toEqual([12, 13, 20])
  })

  it('leaves warm-ups out', async () => {
    const { computeRepRecords } = await lib()
    const out = computeRepRecords([s('a', '2026-09-01T18:00:00Z', 5, 300, { isWarmup: true }), s('b', '2026-09-02T18:00:00Z', 5, 200)], 'lbs', WEEK)
    expect(out).toHaveLength(1)
    expect(out[0].weight).toBe(200)
  })

  it('on a tie the earlier set keeps the record, so a later equal set is not new', async () => {
    const { computeRepRecords } = await lib()
    const [rec] = computeRepRecords([s('a', '2026-09-01T18:00:00Z', 4, 275), s('b', '2026-10-28T18:00:00Z', 4, 275)], 'lbs', WEEK)
    expect(rec.date).toEqual(new Date('2026-09-01T18:00:00Z'))
    expect(rec.isNew).toBe(false)
  })

  it('marks a record set in the week as new, and an earlier one as not, with the week start itself inside the week', async () => {
    const { computeRepRecords } = await lib()
    const out = computeRepRecords(
      [
        s('a', '2026-10-25T20:00:00Z', 3, 250), // Sunday evening, before the week
        s('b', '2026-10-26T06:00:00Z', 5, 250), // exactly at the week start
        s('c', '2026-10-30T18:00:00Z', 4, 275),
      ],
      'lbs',
      WEEK,
    )
    expect(out.map((r) => [r.reps, r.isNew])).toEqual([
      [3, false],
      [4, true],
      [5, true],
    ])
  })

  it('a heavier set in the week replaces an older record and is new', async () => {
    const { computeRepRecords } = await lib()
    const [rec] = computeRepRecords([s('a', '2026-09-01T18:00:00Z', 5, 245), s('b', '2026-10-28T18:00:00Z', 5, 255)], 'lbs', WEEK)
    expect(rec.weight).toBe(255)
    expect(rec.isNew).toBe(true)
  })

  it('compares units by weight and answers in the user’s unit', async () => {
    const { computeRepRecords } = await lib()
    const sets = [s('a', '2026-09-01T18:00:00Z', 5, 100, { weightUnit: 'kg' }), s('b', '2026-09-02T18:00:00Z', 5, 200)]
    const [lbs] = computeRepRecords(sets, 'lbs', WEEK)
    near(lbs.weight, 100 * KG) // 220.46 lb beats 200 lb
    const [kg] = computeRepRecords(sets, 'kg', WEEK)
    near(kg.weight, 100)
    const [kg2] = computeRepRecords([s('a', '2026-09-01T18:00:00Z', 5, 90, { weightUnit: 'kg' }), s('b', '2026-09-02T18:00:00Z', 5, 220)], 'kg', WEEK)
    near(kg2.weight, 220 / KG) // 99.79 kg beats 90 kg
  })

  it('bodyweight: one record, the most reps in a set, with its date', async () => {
    const { computeRepRecords } = await lib()
    const out = computeRepRecords(
      [s('a', '2026-09-01T18:00:00Z', 8, 0), s('b', '2026-09-08T18:00:00Z', 15, 0), s('c', '2026-09-15T18:00:00Z', 12, 0), s('d', '2026-09-22T18:00:00Z', 15, 0)],
      'lbs',
      WEEK,
    )
    expect(out).toEqual([{ reps: 15, weight: 0, date: new Date('2026-09-08T18:00:00Z'), isNew: false }])
  })

  it('bodyweight: new when the most reps came in the week', async () => {
    const { computeRepRecords } = await lib()
    const [rec] = computeRepRecords([s('a', '2026-09-01T18:00:00Z', 8, 0), s('b', '2026-10-29T18:00:00Z', 12, 0)], 'lbs', WEEK)
    expect(rec).toMatchObject({ reps: 12, weight: 0, isNew: true })
  })
})

// =====================================================================================
describe('chartSeries', () => {
  const NOW = new Date('2026-11-02T18:00:00Z') // Monday, noon Denver
  const ses = (id: string, iso: string, e1rm: number | null, top: [number, number], extra: Partial<Sess> = {}): Sess => ({
    completionId: id,
    date: new Date(iso),
    sets: [{ weight: top[0], reps: top[1] }],
    e1rm,
    topSet: { weight: top[0], reps: top[1] },
    avgRpe: null,
    ...extra,
  })
  // newest first, as computeLiftSessions returns them
  const SESSIONS = [
    ses('A', '2026-10-30T18:00:00Z', 287, [275, 4]), // 3 days ago
    ses('B', '2026-09-20T18:00:00Z', 276, [265, 5]), // ~6 weeks
    ses('C', '2026-06-10T18:00:00Z', 270, [255, 5]), // ~5 months
    ses('D', '2026-02-01T18:00:00Z', 265, [245, 5]), // ~9 months
    ses('E', '2025-06-01T18:00:00Z', 240, [225, 5]), // ~17 months
  ]

  it('plots the sessions inside each range, oldest first', async () => {
    const { chartSeries } = await lib()
    const dates = (r: Range) => chartSeries(SESSIONS, r, NOW, DEN).points.map((p) => p.date.toISOString().slice(0, 10))
    expect(dates('3M')).toEqual(['2026-09-20', '2026-10-30'])
    expect(dates('6M')).toEqual(['2026-06-10', '2026-09-20', '2026-10-30'])
    // 1Y and All plot weeks, but each of these sessions sits in its own week
    expect(dates('1Y')).toEqual(['2026-02-01', '2026-06-10', '2026-09-20', '2026-10-30'])
    expect(dates('All')).toEqual(['2025-06-01', '2026-02-01', '2026-06-10', '2026-09-20', '2026-10-30'])
  })

  it('the ranges are about 3 months, 6 months and a year', async () => {
    const { chartSeries } = await lib()
    const days = (n: number) => ses(`d${n}`, new Date(NOW.getTime() - n * 86_400_000).toISOString(), 200, [190, 5])
    const all = [days(80), days(100), days(170), days(195), days(350), days(380)]
    const count = (r: Range) => chartSeries(all, r, NOW, DEN).sessions
    expect(count('3M')).toBe(1) // 80
    expect(count('6M')).toBe(3) // 80, 100, 170
    expect(count('1Y')).toBe(5) // 80 ... 350
    expect(count('All')).toBe(6)
  })

  it('plots every session at 3M and 6M, even two in the same week', async () => {
    const { chartSeries } = await lib()
    const two = [ses('x', '2026-10-30T18:00:00Z', 290, [280, 3]), ses('y', '2026-10-28T18:00:00Z', 280, [270, 3])]
    expect(chartSeries(two, '3M', NOW, DEN).points).toHaveLength(2)
    expect(chartSeries(two, '6M', NOW, DEN).points).toHaveLength(2)
  })

  it('plots one point per local week at 1Y and All, carrying the week’s best of each field', async () => {
    const { chartSeries } = await lib()
    const week = [
      ses('x', '2026-10-27T18:00:00Z', 290, [270, 5], { sets: [{ weight: 270, reps: 5 }, { weight: 200, reps: 9 }] }), // best e1RM
      ses('y', '2026-10-30T18:00:00Z', 280, [285, 2], { sets: [{ weight: 285, reps: 2 }, { weight: 180, reps: 12 }] }), // heaviest, most reps
      ses('z', '2026-10-12T18:00:00Z', 250, [240, 4]), // another week
    ]
    for (const range of ['1Y', 'All'] as const) {
      const out = chartSeries(week, range, NOW, DEN)
      expect(out.points).toHaveLength(2)
      const last = out.points[1]
      expect(last.e1rm).toBe(290)
      expect(last.topSet).toEqual({ weight: 285, reps: 2 })
      expect(last.reps).toBe(12)
      expect(last.date).toEqual(new Date('2026-10-27T18:00:00Z')) // the week's best-e1RM session, not its latest
      expect(out.points[0].e1rm).toBe(250)
    }
  })

  it('a week’s e1RM is null only when none of its sessions has one', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries([ses('x', '2026-10-30T18:00:00Z', null, [100, 15]), ses('y', '2026-10-28T18:00:00Z', 140, [100, 12])], 'All', NOW, DEN)
    expect(out.points).toHaveLength(1)
    expect(out.points[0].e1rm).toBe(140)
    const none = chartSeries([ses('x', '2026-10-30T18:00:00Z', null, [100, 15]), ses('y', '2026-10-28T18:00:00Z', null, [100, 14])], 'All', NOW, DEN)
    expect(none.points[0].e1rm).toBeNull()
  })

  it('splits weeks in the user’s zone, not UTC: Sunday 23:30 and Monday 00:30 Denver are two weeks', async () => {
    const { chartSeries } = await lib()
    const split = [
      ses('mon', '2026-01-12T07:30:00Z', 200, [190, 5]), // Mon Jan 12, 00:30 MST
      ses('sun', '2026-01-12T06:30:00Z', 190, [180, 5]), // Sun Jan 11, 23:30 MST (Monday already in UTC)
    ]
    expect(chartSeries(split, 'All', new Date('2026-02-01T18:00:00Z'), DEN).points).toHaveLength(2)
    expect(chartSeries(split, 'All', new Date('2026-02-01T18:00:00Z'), 'UTC').points).toHaveLength(1)
  })

  it('keeps a week that has a DST change whole: Monday to Sunday is 167 hours on the spring-forward week', async () => {
    const { chartSeries } = await lib()
    const now = new Date('2026-04-01T18:00:00Z')
    const out = chartSeries(
      [
        ses('next', '2026-03-09T06:30:00Z', 210, [200, 5]), // Mon Mar 9, 00:30 MDT: the next week
        ses('sun', '2026-03-09T05:30:00Z', 205, [195, 5]), // Sun Mar 8, 23:30 MDT: the DST week
        ses('mon', '2026-03-02T08:00:00Z', 200, [190, 5]), // Mon Mar 2, 01:00 MST: the DST week
      ],
      '1Y',
      now,
      DEN,
    )
    expect(out.points).toHaveLength(2)
    expect(out.points[0].e1rm).toBe(205)
    expect(out.points[1].e1rm).toBe(210)
  })

  it('marks the all-time best e1RM session as the PR point, and no other', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries(SESSIONS, '6M', NOW, DEN)
    expect(out.points.map((p) => p.isPr)).toEqual([false, false, true])
    expect(out.best?.e1rm).toBe(287)
    expect(out.best?.date).toEqual(new Date('2026-10-30T18:00:00Z'))
  })

  it('the PR point is the best session wherever it falls, not the latest', async () => {
    const { chartSeries } = await lib()
    const mid = [ses('c', '2026-10-30T18:00:00Z', 270, [255, 5]), ses('b', '2026-10-10T18:00:00Z', 300, [280, 5]), ses('a', '2026-09-20T18:00:00Z', 260, [245, 5])]
    const out = chartSeries(mid, '6M', NOW, DEN)
    expect(out.points.map((p) => p.isPr)).toEqual([false, true, false])
  })

  it('marks the PR in the week point that holds it at 1Y and All', async () => {
    const { chartSeries } = await lib()
    const two = [ses('x', '2026-10-30T18:00:00Z', 290, [270, 5]), ses('y', '2026-10-27T18:00:00Z', 280, [285, 2]), ses('z', '2026-10-12T18:00:00Z', 250, [240, 4])]
    expect(chartSeries(two, 'All', NOW, DEN).points.map((p) => p.isPr)).toEqual([false, true])
  })

  it('reports the all-time best even when it is outside the range, and then marks no point', async () => {
    const { chartSeries } = await lib()
    const old = [ses('n', '2026-10-30T18:00:00Z', 250, [240, 5]), ses('o', '2025-06-01T18:00:00Z', 300, [280, 5])]
    const out = chartSeries(old, '3M', NOW, DEN)
    expect(out.points).toHaveLength(1)
    expect(out.points[0].isPr).toBe(false)
    expect(out.best).toEqual({ e1rm: 300, date: new Date('2025-06-01T18:00:00Z') })
    expect(out.sessions).toBe(1)
  })

  it('has no best e1RM when no session has one', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries([ses('a', '2026-10-30T18:00:00Z', null, [0, 12]), ses('b', '2026-10-20T18:00:00Z', null, [0, 10])], '6M', NOW, DEN)
    expect(out.best).toBeNull()
    expect(out.points.every((p) => !p.isPr)).toBe(true)
  })

  it('the change tile: first and last plotted e1RM and the unrounded percent', async () => {
    const { chartSeries } = await lib()
    const rise = [ses('b', '2026-10-30T18:00:00Z', 287, [275, 4]), ses('m', '2026-09-20T18:00:00Z', 270, [255, 5]), ses('a', '2026-08-20T18:00:00Z', 265, [245, 5])]
    const out = chartSeries(rise, '6M', NOW, DEN)
    expect(out.change.e1rm?.first).toBe(265)
    expect(out.change.e1rm?.last).toBe(287)
    near(out.change.e1rm?.percent, (22 / 265) * 100) // 8.30188...
  })

  it('the change can fall', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries([ses('b', '2026-10-30T18:00:00Z', 180, [170, 5]), ses('a', '2026-10-01T18:00:00Z', 200, [190, 5])], '3M', NOW, DEN)
    near(out.change.e1rm?.percent, -10)
  })

  it('the change covers the range only, not the sessions before it', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries(SESSIONS, '3M', NOW, DEN)
    expect(out.change.e1rm?.first).toBe(276) // B, not E
    expect(out.change.e1rm?.last).toBe(287)
  })

  it('the change at 1Y is between the first and last weeks’ bests', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries(SESSIONS, '1Y', NOW, DEN)
    expect(out.change.e1rm?.first).toBe(265) // D
    expect(out.change.e1rm?.last).toBe(287)
  })

  it('the top-set and reps changes follow their own values', async () => {
    const { chartSeries } = await lib()
    const sets = (w: number, r: number) => ({ sets: [{ weight: w, reps: r }] })
    const out = chartSeries(
      [ses('b', '2026-10-30T18:00:00Z', 200, [250, 3], sets(250, 3)), ses('a', '2026-10-01T18:00:00Z', 210, [200, 5], sets(200, 5))],
      '3M',
      NOW,
      DEN,
    )
    expect(out.change.topSet).toMatchObject({ first: 200, last: 250 })
    near(out.change.topSet?.percent, 25)
    expect(out.change.reps).toMatchObject({ first: 5, last: 3 })
    near(out.change.reps?.percent, -40)
  })

  it('one session in the range: one point, every change null, one session', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries(SESSIONS, '3M', NOW, DEN)
    const solo = chartSeries([SESSIONS[0], SESSIONS[2]], '3M', NOW, DEN) // only A is within 3M
    expect(out.points).toHaveLength(2)
    expect(solo.points).toHaveLength(1)
    expect(solo.change).toEqual({ e1rm: null, topSet: null, reps: null })
    expect(solo.sessions).toBe(1)
  })

  it('the e1RM change skips points that have no e1RM', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries(
      [ses('c', '2026-10-30T18:00:00Z', 300, [250, 6]), ses('b', '2026-10-20T18:00:00Z', null, [100, 20]), ses('a', '2026-10-01T18:00:00Z', 250, [220, 6])],
      '3M',
      NOW,
      DEN,
    )
    expect(out.points).toHaveLength(3)
    expect(out.change.e1rm).toMatchObject({ first: 250, last: 300 })
    const single = chartSeries([ses('c', '2026-10-30T18:00:00Z', 300, [250, 6]), ses('b', '2026-10-20T18:00:00Z', null, [100, 20])], '3M', NOW, DEN)
    expect(single.change.e1rm).toBeNull()
  })

  it('counts the sessions in the range, not the points, and says when the first began', async () => {
    const { chartSeries } = await lib()
    const week = [ses('x', '2026-10-30T18:00:00Z', 290, [270, 5]), ses('y', '2026-10-27T18:00:00Z', 280, [285, 2]), ses('z', '2026-10-12T18:00:00Z', 250, [240, 4])]
    const out = chartSeries(week, '1Y', NOW, DEN)
    expect(out.points).toHaveLength(2)
    expect(out.sessions).toBe(3)
    expect(out.since).toEqual(new Date('2026-10-12T18:00:00Z'))
    const all = chartSeries(SESSIONS, 'All', NOW, DEN)
    expect(all.sessions).toBe(5)
    expect(all.since).toEqual(new Date('2025-06-01T18:00:00Z'))
    expect(chartSeries(SESSIONS, '6M', NOW, DEN).sessions).toBe(3)
  })

  it('an empty range has no points, no change and nothing since', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries([SESSIONS[4]], '3M', NOW, DEN)
    expect(out.points).toEqual([])
    expect(out.change).toEqual({ e1rm: null, topSet: null, reps: null })
    expect(out.sessions).toBe(0)
    expect(out.since).toBeNull()
    expect(chartSeries([], 'All', NOW, DEN)).toMatchObject({ points: [], best: null, heaviest: null, mostReps: null, sessions: 0, since: null })
  })

  it('the heaviest top set and the most reps are all-time, with the heavier set’s reps on a tie', async () => {
    const { chartSeries } = await lib()
    const out = chartSeries(
      [
        ses('a', '2026-10-30T18:00:00Z', 287, [275, 4], { sets: [{ weight: 275, reps: 4 }, { weight: 200, reps: 14 }] }),
        ses('b', '2025-06-01T18:00:00Z', 280, [275, 6], { sets: [{ weight: 275, reps: 6 }, { weight: 150, reps: 20 }] }),
      ],
      '3M',
      NOW,
      DEN,
    )
    expect(out.heaviest).toEqual({ weight: 275, reps: 6, date: new Date('2025-06-01T18:00:00Z') })
    expect(out.mostReps).toEqual({ reps: 20, date: new Date('2025-06-01T18:00:00Z') })
  })

  it('bodyweight sessions plot reps', async () => {
    const { chartSeries } = await lib()
    const pull = (id: string, iso: string, reps: number): Sess => ({
      completionId: id,
      date: new Date(iso),
      sets: [{ weight: 0, reps }],
      e1rm: null,
      topSet: { weight: 0, reps },
      avgRpe: null,
    })
    const out = chartSeries([pull('b', '2026-10-30T18:00:00Z', 12), pull('a', '2026-10-01T18:00:00Z', 8)], '3M', NOW, DEN)
    expect(out.points.map((p) => p.reps)).toEqual([8, 12])
    expect(out.change.reps).toMatchObject({ first: 8, last: 12 })
    near(out.change.reps?.percent, 50)
    expect(out.mostReps?.reps).toBe(12)
    expect(out.best).toBeNull()
  })
})

// =====================================================================================
describe('weeklySets', () => {
  const NOW = new Date('2026-10-28T18:00:00Z') // Wednesday, week of Oct 26

  it('is empty without sets', async () => {
    const { weeklySets } = await lib()
    expect(weeklySets([], 'All', NOW, DEN)).toEqual([])
  })

  it('counts working sets per local week with the empty weeks as 0, up to the week of now', async () => {
    const { weeklySets } = await lib()
    const out = weeklySets(
      [
        s('a', '2026-10-06T18:00:00Z', 5, 200),
        s('a', '2026-10-06T18:00:00Z', 5, 200),
        s('a', '2026-10-06T18:00:00Z', 5, 200),
        s('b', '2026-10-27T18:00:00Z', 5, 200),
        s('b', '2026-10-27T18:00:00Z', 5, 200),
      ],
      'All',
      NOW,
      DEN,
    )
    expect(out).toEqual([
      { weekStart: '2026-10-05', sets: 3 },
      { weekStart: '2026-10-12', sets: 0 },
      { weekStart: '2026-10-19', sets: 0 },
      { weekStart: '2026-10-26', sets: 2 },
    ])
  })

  it('does not count warm-ups', async () => {
    const { weeklySets } = await lib()
    const out = weeklySets([s('a', '2026-10-27T18:00:00Z', 5, 100, { isWarmup: true }), s('a', '2026-10-27T18:00:00Z', 5, 200)], 'All', NOW, DEN)
    expect(out).toEqual([{ weekStart: '2026-10-26', sets: 1 }])
  })

  it('ends with the current week even when it has no sets yet', async () => {
    const { weeklySets } = await lib()
    const out = weeklySets([s('a', '2026-10-14T18:00:00Z', 5, 200)], 'All', NOW, DEN)
    expect(out.at(-1)).toEqual({ weekStart: '2026-10-26', sets: 0 })
    expect(out[0]).toEqual({ weekStart: '2026-10-12', sets: 1 })
  })

  it('weeks are local Mondays: Sunday 23:30 Denver belongs to the week that ends', async () => {
    const { weeklySets } = await lib()
    const out = weeklySets(
      [s('a', '2026-01-12T06:30:00Z', 5, 200), s('b', '2026-01-12T07:30:00Z', 5, 200)], // Sun Jan 11 23:30 and Mon Jan 12 00:30 MST
      'All',
      new Date('2026-01-14T18:00:00Z'),
      DEN,
    )
    expect(out).toEqual([
      { weekStart: '2026-01-05', sets: 1 },
      { weekStart: '2026-01-12', sets: 1 },
    ])
  })

  it('buckets across the spring-forward change without dropping or doubling a week', async () => {
    const { weeklySets } = await lib()
    const out = weeklySets(
      [s('a', '2026-03-02T08:00:00Z', 5, 200), s('b', '2026-03-09T05:30:00Z', 5, 200), s('c', '2026-03-09T06:30:00Z', 5, 200), s('d', '2026-03-23T18:00:00Z', 5, 200)],
      'All',
      new Date('2026-03-25T18:00:00Z'),
      DEN,
    )
    expect(out).toEqual([
      { weekStart: '2026-03-02', sets: 2 }, // Mon 01:00 MST and Sun 23:30 MDT
      { weekStart: '2026-03-09', sets: 1 },
      { weekStart: '2026-03-16', sets: 0 },
      { weekStart: '2026-03-23', sets: 1 },
    ])
  })

  it('buckets across the fall-back change too', async () => {
    const { weeklySets } = await lib()
    // Nov 2 2025 is the fall-back Sunday: 23:30 MST is Nov 3 06:30Z, and Monday 00:30 MST is 07:30Z
    const out = weeklySets(
      [s('a', '2025-10-27T18:00:00Z', 5, 200), s('b', '2025-11-03T06:30:00Z', 5, 200), s('c', '2025-11-03T07:30:00Z', 5, 200)],
      'All',
      new Date('2025-11-05T18:00:00Z'),
      DEN,
    )
    expect(out).toEqual([
      { weekStart: '2025-10-27', sets: 2 }, // Monday noon, and the Sunday night set
      { weekStart: '2025-11-03', sets: 1 },
    ])
  })

  it('3M leaves out sets from months before; the weeks run from the range start to this week', async () => {
    const { weeklySets } = await lib()
    const out = weeklySets([s('old', '2026-03-03T18:00:00Z', 5, 200), s('new', '2026-10-27T18:00:00Z', 5, 200)], '3M', NOW, DEN)
    expect(out.at(-1)).toEqual({ weekStart: '2026-10-26', sets: 1 })
    expect(out.length).toBeGreaterThanOrEqual(12)
    expect(out.length).toBeLessThanOrEqual(14)
    expect(out.reduce((n, w) => n + w.sets, 0)).toBe(1)
  })

  it('6M and 1Y reach further back than 3M, and All back to the first set', async () => {
    const { weeklySets } = await lib()
    const hist = [s('first', '2025-03-04T18:00:00Z', 5, 200), s('new', '2026-10-27T18:00:00Z', 5, 200)]
    const len = (r: Range) => weeklySets(hist, r, NOW, DEN).length
    expect(len('6M')).toBeGreaterThanOrEqual(25)
    expect(len('6M')).toBeLessThanOrEqual(27)
    expect(len('1Y')).toBeGreaterThanOrEqual(51)
    expect(len('1Y')).toBeLessThanOrEqual(53)
    expect(weeklySets(hist, 'All', NOW, DEN)[0]).toEqual({ weekStart: '2025-03-03', sets: 1 })
  })

  it('does not pad weeks from before the lift’s first set', async () => {
    const { weeklySets } = await lib()
    const out = weeklySets([s('a', '2026-10-23T18:00:00Z', 5, 200)], '3M', NOW, DEN) // Friday Oct 23
    expect(out).toEqual([
      { weekStart: '2026-10-19', sets: 1 },
      { weekStart: '2026-10-26', sets: 0 },
    ])
  })
})
