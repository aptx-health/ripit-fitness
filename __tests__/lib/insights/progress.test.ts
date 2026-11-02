/**
 * Progress S1 (weekly report), the pure maths in lib/insights/progress.ts.
 * Spec: features/analytics/weekly-report.feature (work item 107).
 *
 * Pinned interface (all exports of `@/lib/insights/progress`):
 *   weekStartFor(instant: Date, timeZone: string): string
 *       the local Monday of the instant's week, as 'YYYY-MM-DD'
 *   addWeeks(weekStart: string, n: number): string
 *       civil-date arithmetic, n may be negative
 *   weekBounds(weekStart: string, timeZone: string): { start: Date; end: Date }
 *       start = local Monday 00:00, end = the next local Monday 00:00 (exclusive)
 *   summarizeWeeks({ workouts, cardio, weekStarts, timeZone }): WeekStats[]
 *       one entry per weekStart, same order; items outside every week are ignored
 *         workouts: { completedAt: Date; startedAt: Date | null; durationSeconds: number | null;
 *                     sets: { isWarmup: boolean; rpe: number | null; rir: number | null }[] }[]
 *         cardio:   { completedAt: Date; durationMinutes: number }[]
 *         WeekStats { weekStart; workouts; workingSets; durationSeconds; cardioMinutes;
 *                     effort: null | { avgRpe; pctAtOrAbove9; setsAt10; ratedSets } }
 *   computeNormal(weeks: WeekStats[]): { workouts; workingSets; durationSeconds; cardioMinutes; avgRpe: number | null }
 *       the plain mean of the given weeks (the 8 before); avgRpe is the mean of the
 *       weekly averages of the weeks that have effort, null when none do
 *   percentChange(value: number, normal: number | null): number | null
 *       whole percent, null when there is no normal to compare with
 *   computeStreak(weeklyWorkouts: number[], target: number, openWeek: boolean): number
 *       counts oldest to newest; the streak is the weeks in a row, ending at the
 *       newest, with at least `target` workouts. `openWeek` says the newest week
 *       is not over yet: it adds to the streak when it hits the target but never
 *       breaks it when it doesn't.
 */

import { describe, expect, it } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
type WorkoutIn = {
  completedAt: Date
  startedAt: Date | null
  durationSeconds: number | null
  sets: Array<{ isWarmup: boolean; rpe: number | null; rir: number | null }>
}
type Effort = { avgRpe: number; pctAtOrAbove9: number; setsAt10: number; ratedSets: number }
type Stats = {
  weekStart: string
  workouts: number
  workingSets: number
  durationSeconds: number
  cardioMinutes: number
  effort: Effort | null
}
type Mod = {
  weekStartFor: (d: Date, tz: string) => string
  addWeeks: (w: string, n: number) => string
  weekBounds: (w: string, tz: string) => { start: Date; end: Date }
  summarizeWeeks: (i: {
    workouts: WorkoutIn[]
    cardio: Array<{ completedAt: Date; durationMinutes: number }>
    weekStarts: string[]
    timeZone: string
  }) => Stats[]
  computeNormal: (w: Stats[]) => {
    workouts: number
    workingSets: number
    durationSeconds: number
    cardioMinutes: number
    avgRpe: number | null
  }
  percentChange: (v: number, normal: number | null) => number | null
  computeStreak: (counts: number[], target: number, openWeek: boolean) => number
}
const lib = async () => (await load('@/lib/insights/progress')) as Mod

const DEN = 'America/Denver'
const iso = (s: string) => new Date(s)

// --- helpers -----------------------------------------------------------------
const set = (rpe: number | null = null, rir: number | null = null, isWarmup = false) => ({ isWarmup, rpe, rir })
const workout = (completedAt: Date, o: Partial<WorkoutIn> = {}): WorkoutIn => ({
  completedAt,
  startedAt: null,
  durationSeconds: null,
  sets: [],
  ...o,
})
const rpeSets = (n: number, rpe: number | null = 8) => Array.from({ length: n }, () => set(rpe))
const stats = (o: Partial<Stats> = {}): Stats => ({
  weekStart: '2026-10-19',
  workouts: 0,
  workingSets: 0,
  durationSeconds: 0,
  cardioMinutes: 0,
  effort: null,
  ...o,
})
const effort = (avgRpe: number): Effort => ({ avgRpe, pctAtOrAbove9: 0, setsAt10: 0, ratedSets: 10 })

async function week(workouts: WorkoutIn[], cardio: Array<{ completedAt: Date; durationMinutes: number }> = [], weekStart = '2026-10-26') {
  const { summarizeWeeks } = await lib()
  return (await summarizeWeeks({ workouts, cardio, weekStarts: [weekStart], timeZone: DEN }))[0]
}

// ---------------------------------------------------------------------------
describe('weekStartFor: weeks run Monday to Sunday in the local timezone', () => {
  it('A Sunday-evening workout counts in its local week: Sunday 21:00 Denver (Monday 03:00 UTC) is in the week that started the Monday before', async () => {
    const { weekStartFor } = await lib()
    // Sunday 2026-10-25 21:00 MDT = Monday 2026-10-26 03:00 UTC.
    expect(weekStartFor(iso('2026-10-26T03:00:00Z'), DEN)).toBe('2026-10-19')
  })

  it('the same instant is in a different week in UTC: the zone, not UTC, decides', async () => {
    const { weekStartFor } = await lib()
    const instant = iso('2026-10-26T03:00:00Z')
    expect(weekStartFor(instant, 'UTC')).toBe('2026-10-26')
    expect(weekStartFor(instant, DEN)).toBe('2026-10-19')
    // Ahead of UTC the same instant is already Monday morning.
    expect(weekStartFor(iso('2026-10-25T20:00:00Z'), 'Pacific/Auckland')).toBe('2026-10-26')
  })

  it('local Monday 00:00 starts a week; one millisecond before it is still the week before', async () => {
    const { weekStartFor } = await lib()
    // Monday 2026-10-26 00:00 MDT = 06:00 UTC.
    expect(weekStartFor(iso('2026-10-26T06:00:00.000Z'), DEN)).toBe('2026-10-26')
    expect(weekStartFor(iso('2026-10-26T05:59:59.999Z'), DEN)).toBe('2026-10-19')
  })

  it('every day of a week maps to the same Monday', async () => {
    const { weekStartFor } = await lib()
    for (const day of ['26', '27', '28', '29', '30', '31']) {
      expect(weekStartFor(iso(`2026-10-${day}T18:00:00Z`), DEN)).toBe('2026-10-26')
    }
    // Sunday 2026-11-01 evening, after the clocks went back, is still that week.
    expect(weekStartFor(iso('2026-11-02T05:00:00Z'), DEN)).toBe('2026-10-26')
  })

  it('across the spring DST change (2026-03-08) Sunday night is still the week of 03-02 and Monday 00:00 MDT starts 03-09', async () => {
    const { weekStartFor } = await lib()
    // Sunday 23:30 MDT = 05:30 UTC Monday.
    expect(weekStartFor(iso('2026-03-09T05:30:00Z'), DEN)).toBe('2026-03-02')
    // Monday 03-09 00:00 MDT = 06:00 UTC.
    expect(weekStartFor(iso('2026-03-09T06:00:00Z'), DEN)).toBe('2026-03-09')
  })

  it('across the fall DST change (2026-11-01) the extra hour stays in the week of 10-26 and Monday 00:00 MST starts 11-02', async () => {
    const { weekStartFor } = await lib()
    expect(weekStartFor(iso('2026-11-02T06:59:59.999Z'), DEN)).toBe('2026-10-26')
    expect(weekStartFor(iso('2026-11-02T07:00:00.000Z'), DEN)).toBe('2026-11-02')
  })
})

describe('addWeeks', () => {
  it('moves by whole weeks in either direction', async () => {
    const { addWeeks } = await lib()
    expect(addWeeks('2026-10-26', 1)).toBe('2026-11-02')
    expect(addWeeks('2026-10-26', -1)).toBe('2026-10-19')
    expect(addWeeks('2026-10-26', 0)).toBe('2026-10-26')
    expect(addWeeks('2026-10-26', -7)).toBe('2026-09-07')
    expect(addWeeks('2026-10-26', 8)).toBe('2026-12-21')
  })

  it('crosses month, year and DST boundaries without drifting a day', async () => {
    const { addWeeks } = await lib()
    expect(addWeeks('2026-12-28', 1)).toBe('2027-01-04')
    expect(addWeeks('2027-01-04', -1)).toBe('2026-12-28')
    expect(addWeeks('2026-03-02', 1)).toBe('2026-03-09')
    expect(addWeeks('2026-10-26', 1)).toBe('2026-11-02')
    expect(addWeeks('2026-02-23', 1)).toBe('2026-03-02')
  })
})

describe('weekBounds', () => {
  it('is local Monday 00:00 to the next local Monday 00:00', async () => {
    const { weekBounds } = await lib()
    const b = weekBounds('2026-07-06', DEN) // MDT, UTC-6
    expect(b.start.toISOString()).toBe('2026-07-06T06:00:00.000Z')
    expect(b.end.toISOString()).toBe('2026-07-13T06:00:00.000Z')
  })

  it('the spring DST week is 167 hours long', async () => {
    const { weekBounds } = await lib()
    const b = weekBounds('2026-03-02', DEN)
    expect(b.start.toISOString()).toBe('2026-03-02T07:00:00.000Z') // MST, UTC-7
    expect(b.end.toISOString()).toBe('2026-03-09T06:00:00.000Z') // MDT, UTC-6
  })

  it('the fall DST week is 169 hours long', async () => {
    const { weekBounds } = await lib()
    const b = weekBounds('2026-10-26', DEN)
    expect(b.start.toISOString()).toBe('2026-10-26T06:00:00.000Z') // MDT
    expect(b.end.toISOString()).toBe('2026-11-02T07:00:00.000Z') // MST
  })

  it('in UTC it is exactly seven days', async () => {
    const { weekBounds } = await lib()
    const b = weekBounds('2026-10-26', 'UTC')
    expect(b.start.toISOString()).toBe('2026-10-26T00:00:00.000Z')
    expect(b.end.toISOString()).toBe('2026-11-02T00:00:00.000Z')
  })
})

// ---------------------------------------------------------------------------
describe('summarizeWeeks: bucketing', () => {
  it('A Sunday-evening workout counts in its local week, not the UTC one', async () => {
    const { summarizeWeeks } = await lib()
    const sundayEvening = workout(iso('2026-10-26T03:00:00Z'), { sets: rpeSets(4) }) // Sun 21:00 MDT
    const out = summarizeWeeks({
      workouts: [sundayEvening],
      cardio: [],
      weekStarts: ['2026-10-19', '2026-10-26'],
      timeZone: DEN,
    })
    expect(out.map((w) => [w.weekStart, w.workouts, w.workingSets])).toEqual([
      ['2026-10-19', 1, 4],
      ['2026-10-26', 0, 0],
    ])
  })

  it('returns one entry per requested week, in the order given, with zeros for empty weeks', async () => {
    const { summarizeWeeks } = await lib()
    const out = summarizeWeeks({
      workouts: [workout(iso('2026-10-28T18:00:00Z'), { sets: rpeSets(3, null) })],
      cardio: [],
      weekStarts: ['2026-10-12', '2026-10-19', '2026-10-26'],
      timeZone: DEN,
    })
    expect(out.map((w) => w.weekStart)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26'])
    expect(out[0]).toMatchObject({ workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, effort: null })
    expect(out[1]).toMatchObject({ workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, effort: null })
    expect(out[2]).toMatchObject({ workouts: 1, workingSets: 3 })
  })

  it('uses the half-open week: Monday 00:00 local is in, the next Monday 00:00 is out, across the DST change', async () => {
    const { summarizeWeeks } = await lib()
    const out = summarizeWeeks({
      workouts: [
        workout(iso('2026-10-26T06:00:00.000Z'), { sets: rpeSets(1) }), // Mon 00:00 MDT: first moment of 10-26
        workout(iso('2026-11-02T06:59:59.999Z'), { sets: rpeSets(1) }), // last moment of the 169-hour week
        workout(iso('2026-11-02T07:00:00.000Z'), { sets: rpeSets(1) }), // Mon 00:00 MST: next week
      ],
      cardio: [],
      weekStarts: ['2026-10-26', '2026-11-02'],
      timeZone: DEN,
    })
    expect(out.map((w) => w.workouts)).toEqual([2, 1])
  })

  it('ignores workouts that fall outside every requested week', async () => {
    const { summarizeWeeks } = await lib()
    const out = summarizeWeeks({
      workouts: [workout(iso('2026-08-01T18:00:00Z'), { sets: rpeSets(5) }), workout(iso('2026-12-30T18:00:00Z'), { sets: rpeSets(5) })],
      cardio: [{ completedAt: iso('2026-08-01T18:00:00Z'), durationMinutes: 30 }],
      weekStarts: ['2026-10-26'],
      timeZone: DEN,
    })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ workouts: 0, workingSets: 0, cardioMinutes: 0 })
  })
})

describe('summarizeWeeks: sets and time', () => {
  it('Working sets against normal: warm-up sets are not counted', async () => {
    const w = await week([
      workout(iso('2026-10-27T18:00:00Z'), { sets: [...rpeSets(5), set(null, null, true), set(null, null, true)] }),
      workout(iso('2026-10-29T18:00:00Z'), { sets: [...rpeSets(4), set(8, null, true)] }),
    ])
    expect(w.workouts).toBe(2)
    expect(w.workingSets).toBe(9)
  })

  it('Time trained: sums the stored duration of each workout', async () => {
    const w = await week([
      workout(iso('2026-10-27T18:00:00Z'), { durationSeconds: 3600 }),
      workout(iso('2026-10-28T18:00:00Z'), { durationSeconds: 4020 }),
      workout(iso('2026-10-30T18:00:00Z'), { durationSeconds: 4500 }),
    ])
    expect(w.durationSeconds).toBe(12120) // 3h 22m
  })

  it('a workout without a duration uses completedAt minus startedAt', async () => {
    const w = await week([
      workout(iso('2026-10-27T19:00:00Z'), { startedAt: iso('2026-10-27T18:00:00Z'), durationSeconds: null }),
      workout(iso('2026-10-28T18:45:00Z'), { startedAt: iso('2026-10-28T18:00:00Z') }),
    ])
    expect(w.durationSeconds).toBe(3600 + 2700)
  })

  it('a stored duration wins over the timestamps', async () => {
    const w = await week([workout(iso('2026-10-27T19:00:00Z'), { startedAt: iso('2026-10-27T18:00:00Z'), durationSeconds: 1800 })])
    expect(w.durationSeconds).toBe(1800)
  })

  it('a workout with neither counts as 0 and does not break the sum', async () => {
    const w = await week([
      workout(iso('2026-10-27T18:00:00Z'), { durationSeconds: 3000 }),
      workout(iso('2026-10-28T18:00:00Z'), { startedAt: null, durationSeconds: null }),
    ])
    expect(w.workouts).toBe(2)
    expect(w.durationSeconds).toBe(3000)
  })

  it('a start after the finish adds nothing rather than negative time', async () => {
    const w = await week([
      workout(iso('2026-10-27T18:00:00Z'), { startedAt: iso('2026-10-27T19:00:00Z'), durationSeconds: null }),
      workout(iso('2026-10-28T18:00:00Z'), { durationSeconds: 600 }),
    ])
    expect(w.durationSeconds).toBe(600)
  })

  it('Time trained: cardio minutes are summed by week and kept apart from lifting time', async () => {
    const { summarizeWeeks } = await lib()
    const out = summarizeWeeks({
      workouts: [workout(iso('2026-10-27T18:00:00Z'), { durationSeconds: 3600 })],
      cardio: [
        { completedAt: iso('2026-10-28T18:00:00Z'), durationMinutes: 20 },
        { completedAt: iso('2026-10-30T18:00:00Z'), durationMinutes: 15 },
        { completedAt: iso('2026-10-21T18:00:00Z'), durationMinutes: 40 },
      ],
      weekStarts: ['2026-10-19', '2026-10-26'],
      timeZone: DEN,
    })
    expect(out[1].cardioMinutes).toBe(35)
    expect(out[1].durationSeconds).toBe(3600)
    expect(out[0].cardioMinutes).toBe(40)
  })

  it('cardio near midnight lands in its local week', async () => {
    const { summarizeWeeks } = await lib()
    const out = summarizeWeeks({
      workouts: [],
      cardio: [{ completedAt: iso('2026-10-26T03:00:00Z'), durationMinutes: 25 }], // Sun 21:00 MDT
      weekStarts: ['2026-10-19', '2026-10-26'],
      timeZone: DEN,
    })
    expect(out.map((w) => w.cardioMinutes)).toEqual([25, 0])
  })
})

describe('summarizeWeeks: effort', () => {
  // 13 rated sets: efforts 10, 10 (as RIR 0), 9, 9, six at 8.5, three at 8 (as RIR 2).
  // Mean 113 / 13 = 8.69; 4 of 13 are 9+ (31%); 2 are 10.
  const spec = () => [
    set(10),
    set(null, 0),
    set(9),
    set(9),
    ...Array.from({ length: 6 }, () => set(8.5)),
    ...Array.from({ length: 3 }, () => set(null, 2)),
  ]

  it('Effort: average RPE, share at 9 or more, and sets at 10', async () => {
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets: spec() })])
    expect(w.effort).not.toBeNull()
    expect(w.effort?.avgRpe).toBeCloseTo(8.7, 1)
    expect(w.effort?.pctAtOrAbove9).toBe(31)
    expect(w.effort?.setsAt10).toBe(2)
    expect(w.effort?.ratedSets).toBe(13)
  })

  it('RIR is read as RPE 10 minus RIR', async () => {
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets: [set(null, 1), set(null, 3)] })])
    // RIR 1 -> 9, RIR 3 -> 7
    expect(w.effort?.avgRpe).toBeCloseTo(8, 5)
    expect(w.effort?.pctAtOrAbove9).toBe(50)
    expect(w.effort?.setsAt10).toBe(0)
  })

  it('RIR 0 counts as a set at 10', async () => {
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets: [set(null, 0), set(8)] })])
    expect(w.effort?.setsAt10).toBe(1)
  })

  it('when a set has both, RPE is used', async () => {
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets: [set(8, 0)] })])
    expect(w.effort?.avgRpe).toBeCloseTo(8, 5)
    expect(w.effort?.setsAt10).toBe(0)
  })

  it('warm-up sets have no say in effort', async () => {
    const w = await week([
      workout(iso('2026-10-27T18:00:00Z'), { sets: [set(8), set(8), set(10, null, true), set(10, null, true)] }),
    ])
    expect(w.effort?.avgRpe).toBeCloseTo(8, 5)
    expect(w.effort?.setsAt10).toBe(0)
    expect(w.effort?.ratedSets).toBe(2)
  })

  it('Too few rated sets hides the effort number: under half rated gives no effort', async () => {
    // 4 of 10 working sets are rated.
    const sets = [...rpeSets(4, 9), ...rpeSets(6, null)]
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets })])
    expect(w.workingSets).toBe(10)
    expect(w.effort).toBeNull()
  })

  it('exactly half rated is enough', async () => {
    const sets = [...rpeSets(5, 9), ...rpeSets(5, null)]
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets })])
    expect(w.effort).not.toBeNull()
    expect(w.effort?.avgRpe).toBeCloseTo(9, 5)
  })

  it('coverage counts working sets only: warm-ups without a rating do not dilute it', async () => {
    const sets = [...rpeSets(3, 8), ...Array.from({ length: 10 }, () => set(null, null, true))]
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets })])
    expect(w.effort).not.toBeNull()
  })

  it('coverage is over the whole week, across workouts', async () => {
    const w = await week([
      workout(iso('2026-10-27T18:00:00Z'), { sets: rpeSets(6, 9) }), // 6 rated
      workout(iso('2026-10-29T18:00:00Z'), { sets: rpeSets(8, null) }), // 8 unrated: 6 of 14 is under half
    ])
    expect(w.effort).toBeNull()
  })

  it('a week with no sets has no effort', async () => {
    const w = await week([workout(iso('2026-10-27T18:00:00Z'), { sets: [] })])
    expect(w.effort).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('computeNormal: the mean of the 8 weeks before', () => {
  it('Workouts against the target: averages workouts, sets and time over the weeks given', async () => {
    const { computeNormal } = await lib()
    const counts = [3, 3, 4, 3, 4, 3, 4, 3] // 27 / 8
    const weeks = counts.map((n, i) => stats({ weekStart: `w${i}`, workouts: n, workingSets: 50 + i * 2, durationSeconds: 3600 * n }))
    const normal = computeNormal(weeks)
    expect(normal.workouts).toBeCloseTo(3.375, 5)
    expect(normal.workingSets).toBeCloseTo(57, 5) // 50..64 step 2 averages 57
    expect(normal.durationSeconds).toBeCloseTo((3600 * 27) / 8, 5)
  })

  it('quiet weeks count as zero: they pull the normal down', async () => {
    const { computeNormal } = await lib()
    const weeks = [4, 4, 4, 4, 0, 0, 0, 0].map((n) => stats({ workouts: n, workingSets: n * 10 }))
    const normal = computeNormal(weeks)
    expect(normal.workouts).toBeCloseTo(2, 5)
    expect(normal.workingSets).toBeCloseTo(20, 5)
  })

  it('the cardio minutes are averaged too', async () => {
    const { computeNormal } = await lib()
    const normal = computeNormal([stats({ cardioMinutes: 40 }), stats({ cardioMinutes: 0 })])
    expect(normal.cardioMinutes).toBeCloseTo(20, 5)
  })

  it('the effort normal is the mean of the weekly averages, skipping weeks without effort', async () => {
    const { computeNormal } = await lib()
    const weeks = [
      stats({ effort: effort(8.0) }),
      stats({ effort: effort(8.2) }),
      stats({ effort: null }),
      stats({ effort: null }),
    ]
    expect(computeNormal(weeks).avgRpe).toBeCloseTo(8.1, 5)
  })

  it('has no effort normal when no week has effort', async () => {
    const { computeNormal } = await lib()
    expect(computeNormal([stats(), stats(), stats()]).avgRpe).toBeNull()
  })

  it('Empty week: with no history at all the normal is all zeros', async () => {
    const { computeNormal } = await lib()
    const normal = computeNormal(Array.from({ length: 8 }, () => stats()))
    expect(normal).toMatchObject({ workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, avgRpe: null })
  })
})

describe('percentChange', () => {
  it('Working sets against normal: 66 against 58 is +14%', async () => {
    const { percentChange } = await lib()
    expect(percentChange(66, 58)).toBe(14)
  })

  it('is negative below the normal and rounds to a whole percent', async () => {
    const { percentChange } = await lib()
    expect(percentChange(50, 58)).toBe(-14) // -13.79
    expect(percentChange(40, 80)).toBe(-50)
    expect(percentChange(58, 58)).toBe(0)
    expect(percentChange(0, 58)).toBe(-100)
  })

  it('Empty week: nothing to compare with gives null, not Infinity or NaN', async () => {
    const { percentChange } = await lib()
    expect(percentChange(0, 0)).toBeNull()
    expect(percentChange(10, 0)).toBeNull()
    expect(percentChange(10, null)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('computeStreak', () => {
  it('Streak: six full weeks at the target after a week of 1 is 6; the open week with 1 does not break it', async () => {
    const { computeStreak } = await lib()
    // oldest -> newest: 1, 3 x 6, then this week so far
    expect(computeStreak([1, 3, 3, 3, 3, 3, 3, 1], 3, true)).toBe(6)
  })

  it('the current week adds to the streak only once it hits the target', async () => {
    const { computeStreak } = await lib()
    expect(computeStreak([1, 3, 3, 3, 3, 3, 3, 2], 3, true)).toBe(6)
    expect(computeStreak([1, 3, 3, 3, 3, 3, 3, 3], 3, true)).toBe(7)
    expect(computeStreak([1, 3, 3, 3, 3, 3, 3, 5], 3, true)).toBe(7)
  })

  it('a finished week that missed the target ends the streak', async () => {
    const { computeStreak } = await lib()
    expect(computeStreak([3, 3, 3, 3, 3, 3, 2], 3, false)).toBe(0)
    expect(computeStreak([3, 3, 3, 3, 3, 3, 3], 3, false)).toBe(7)
  })

  it('exactly the target counts; one under does not', async () => {
    const { computeStreak } = await lib()
    expect(computeStreak([4, 4, 4], 4, false)).toBe(3)
    expect(computeStreak([4, 3, 4], 4, false)).toBe(1)
  })

  it('a gap in the middle ends the streak at the gap', async () => {
    const { computeStreak } = await lib()
    expect(computeStreak([3, 3, 0, 3, 3], 3, false)).toBe(2)
    expect(computeStreak([3, 3, 0, 3, 3, 1], 3, true)).toBe(2)
  })

  it('Weekly target setting: the streak uses the target it is given', async () => {
    const { computeStreak } = await lib()
    const counts = [3, 3, 3, 3, 3, 3, 3]
    expect(computeStreak(counts, 3, false)).toBe(7)
    expect(computeStreak(counts, 4, false)).toBe(0)
    expect(computeStreak(counts, 1, false)).toBe(7)
    expect(computeStreak(counts, 14, false)).toBe(0)
  })

  it('has nothing to count with no history, or an open week alone that has not hit it', async () => {
    const { computeStreak } = await lib()
    expect(computeStreak([], 3, true)).toBe(0)
    expect(computeStreak([], 3, false)).toBe(0)
    expect(computeStreak([0, 0, 0, 1], 3, true)).toBe(0)
    expect(computeStreak([0, 0, 0, 3], 3, true)).toBe(1)
  })
})
