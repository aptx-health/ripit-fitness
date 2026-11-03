/**
 * Per-lift page fixes after review 127 (work item 128). Spec: features/analytics/lift-page.feature,
 * "After review 127": "The Progress row agrees", "Records include high-rep sets", "Volume counts
 * only the range".
 *
 *   - computeWeekLifts (S2 Lifts row): e1RM, the change and Flat come only from sets of 12 reps or
 *     fewer. A weighted week of only higher-rep sets has no e1RM, and its best set is the heaviest
 *     (more reps on a tie); bodyweight stays the most reps.
 *   - computeRepRecords (this page): weighted records at every rep count done, not only 1 to 12.
 *   - setsInRange: working sets of the sessions on or after the range's exact start.
 */

import { describe, expect, it } from 'vitest'
import { computeRepRecords, type LiftSession, setsInRange } from '@/lib/insights/lift-history'
import { computeWeekLifts, type HistorySet } from '@/lib/insights/progress-records'

const WEEK_START = new Date('2026-10-26T06:00:00Z')
const WEEK_END = new Date('2026-11-02T07:00:00Z')
const epley = (w: number, r: number) => (r === 1 ? w : w * (1 + r / 30))

function set(when: string, reps: number, weight: number, ex = 'calf'): HistorySet {
  return {
    completionId: `${ex}@${when}`,
    completedAt: new Date(when),
    exerciseDefinitionId: ex,
    name: ex,
    reps,
    weight,
    weightUnit: 'lbs',
    isWarmup: false,
  }
}
const lifts = (h: HistorySet[]) => computeWeekLifts(h, WEEK_START, WEEK_END)

describe('the Lifts row caps e1RM at 12 reps', () => {
  it('155 x 16 reads as the best set with no e1RM, no earlier e1RM and no Flat', () => {
    const before = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((d) => set(`${d}T15:00:00Z`, 20, 200))
    const [lift] = lifts([...before, set('2026-10-28T15:00:00Z', 16, 155)])
    expect(lift).toMatchObject({ bestSet: { weight: 155, reps: 16 }, e1rm: null, previousE1rm: null, bestE1rm: null, sessionsBelowBest: 0 })
  })

  it('a high-rep week picks the heaviest set, not the most reps', () => {
    const [lift] = lifts([set('2026-10-28T15:00:00Z', 20, 135), set('2026-10-28T15:00:00Z', 16, 155), set('2026-10-28T15:00:00Z', 18, 155)])
    expect(lift.bestSet).toEqual({ weight: 155, reps: 18 })
    expect(lift.e1rm).toBeNull()
  })

  it('a 12-rep set in the week gives the e1RM, even when a 20-rep set would be higher', () => {
    const [lift] = lifts([set('2026-10-28T15:00:00Z', 20, 150), set('2026-10-28T15:00:00Z', 12, 140)])
    expect(lift.bestSet).toEqual({ weight: 140, reps: 12 })
    expect(lift.e1rm).toBeCloseTo(epley(140, 12), 5)
  })

  it('the earlier e1RM skips a session of only higher-rep sets', () => {
    const [lift] = lifts([set('2026-10-05T15:00:00Z', 10, 100), set('2026-10-19T15:00:00Z', 20, 150), set('2026-10-28T15:00:00Z', 10, 110)])
    expect(lift.previousE1rm).toBeCloseTo(epley(100, 10), 5)
    expect(lift.bestE1rm).toBeCloseTo(epley(110, 10), 5)
  })

  it('bodyweight still reads the most reps', () => {
    const [lift] = lifts([set('2026-10-28T15:00:00Z', 15, 0, 'pull'), set('2026-10-28T15:00:00Z', 18, 0, 'pull')])
    expect(lift).toMatchObject({ bestSet: { weight: 0, reps: 18 }, e1rm: null })
  })
})

describe('rep records include high-rep sets', () => {
  it('lists 15 reps at 135 lb and every other count done, ascending', () => {
    const out = computeRepRecords(
      [set('2026-09-01T15:00:00Z', 15, 135), set('2026-09-08T15:00:00Z', 15, 125), set('2026-09-15T15:00:00Z', 20, 100), set('2026-09-22T15:00:00Z', 8, 185)],
      'lbs',
      WEEK_START,
    )
    expect(out.map((r) => [r.reps, r.weight])).toEqual([
      [8, 185],
      [15, 135],
      [20, 100],
    ])
    expect(out[1].date).toEqual(new Date('2026-09-01T15:00:00Z'))
  })
})

describe('setsInRange counts from the exact range start', () => {
  const NOW = new Date('2026-11-02T18:00:00Z')
  const DAY = 86_400_000
  const ses = (daysAgo: number, sets: number): LiftSession => ({
    completionId: `s${daysAgo}`,
    date: new Date(NOW.getTime() - daysAgo * DAY),
    sets: Array.from({ length: sets }, () => ({ weight: 100, reps: 5 })),
    e1rm: 116.7,
    topSet: { weight: 100, reps: 5 },
    avgRpe: null,
  })
  const sessions = [ses(3, 4), ses(90, 3), ses(92, 5), ses(400, 2)]

  it('3M leaves out a session a day before the start, even in the first shown week', () => {
    expect(setsInRange(sessions, '3M', NOW)).toBe(7)
  })

  it('the longer ranges reach further, and All counts every set', () => {
    expect(setsInRange(sessions, '6M', NOW)).toBe(12)
    expect(setsInRange(sessions, '1Y', NOW)).toBe(12)
    expect(setsInRange(sessions, 'All', NOW)).toBe(14)
    expect(setsInRange([], 'All', NOW)).toBe(0)
  })
})
