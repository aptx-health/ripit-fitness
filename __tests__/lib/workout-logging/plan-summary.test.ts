/**
 * Planned sets in the workout logger: the Plan line's text and the next planned set (work item 120).
 * Spec: features/workout-logging/adhoc-planned-sets.feature ("Summary line", "Progress through the plan",
 * "Plan done", "Extra sets beyond the plan").
 *
 * Pinned interface (`@/lib/workout-logging/plan-summary`, pure):
 *   type PlannedSet = { setNumber: number, reps: string, rpe: number | null, rir: number | null, isWarmup?: boolean }
 *   summarizePlan(prescribed: PlannedSet[], loggedCount: number): string | null
 *   nextPlannedSet(prescribed: PlannedSet[], loggedCount: number): PlannedSet | null
 * `loggedCount` is how many working sets of the exercise are logged. The plan is the working sets only
 * (isWarmup true is left out), taken in setNumber order whatever order they arrive in.
 *   - No plan (nothing, or only warm-ups): summarizePlan is null, nextPlannedSet is null.
 *   - Same reps in every set:  "3 × 8"; mixed:  "3 sets · 5, 5, 8 reps". (× is U+00D7.) Reps are the
 *     stored strings as they are ("60", "8-10").
 *   - Effort, when every set has one: " @ RPE 8", " @ 2 RIR". The same in every set: that value; different
 *     values: the range lowest–highest with an en dash ("RPE 7–9", "1–3 RIR"). 0 is a value ("0 RIR").
 *     No effort in any set: nothing is added.
 *   - Progress after " · ": "set <loggedCount + 1> next" while loggedCount is less than the number of
 *     planned sets, otherwise "done" (also for more sets logged than planned).
 *   - nextPlannedSet is the planned set at index loggedCount (setNumber order), null once the plan is done.
 */

import { describe, expect, it } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
type P = { setNumber: number; reps: string; rpe: number | null; rir: number | null; isWarmup?: boolean }
type Mod = {
  summarizePlan: (p: P[], logged: number) => string | null
  nextPlannedSet: (p: P[], logged: number) => P | null
}
const mod = () => load('@/lib/workout-logging/plan-summary') as Promise<Mod>
const summary = async (p: P[], logged = 0) => (await mod()).summarizePlan(p, logged)
const next = async (p: P[], logged = 0) => (await mod()).nextPlannedSet(p, logged)

const sets = (reps: string[], effort: { rpe?: Array<number | null>; rir?: Array<number | null> } = {}): P[] =>
  reps.map((r, i) => ({ setNumber: i + 1, reps: r, rpe: effort.rpe?.[i] ?? null, rir: effort.rir?.[i] ?? null }))
const rpe = (reps: string[], v: number) => sets(reps, { rpe: reps.map(() => v) })
const rir = (reps: string[], v: number) => sets(reps, { rir: reps.map(() => v) })

describe('Collapsed summary under the exercise', () => {
  it('3 sets of 8 reps at RPE 8', async () => {
    expect(await summary(rpe(['8', '8', '8'], 8))).toBe('3 × 8 @ RPE 8 · set 1 next')
  })

  it('RIR plans: 3 sets of 12 reps at 2 RIR', async () => {
    expect(await summary(rir(['12', '12', '12'], 2))).toBe('3 × 12 @ 2 RIR · set 1 next')
  })

  it('Reps only: 3 sets of 60 with no effort target', async () => {
    expect(await summary(sets(['60', '60', '60']))).toBe('3 × 60 · set 1 next')
  })

  it('Mixed sets summarize honestly: 5, 5 and 8 reps at RPE 8', async () => {
    expect(await summary(rpe(['5', '5', '8'], 8))).toBe('3 sets · 5, 5, 8 reps @ RPE 8 · set 1 next')
  })

  it('mixed reps with no effort', async () => {
    expect(await summary(sets(['5', '5', '8']))).toBe('3 sets · 5, 5, 8 reps · set 1 next')
  })

  it('two sets and one set', async () => {
    expect(await summary(rpe(['10', '10'], 7))).toBe('2 × 10 @ RPE 7 · set 1 next')
    expect(await summary(rpe(['6'], 9))).toBe('1 × 6 @ RPE 9 · set 1 next')
  })

  it('a rep range is shown as it is stored', async () => {
    expect(await summary(rir(['8-10', '8-10', '8-10'], 2))).toBe('3 × 8-10 @ 2 RIR · set 1 next')
  })

  it('an effort of 0 RIR is a target, not a missing one', async () => {
    expect(await summary(rir(['5', '5', '5'], 0))).toBe('3 × 5 @ 0 RIR · set 1 next')
  })

  it('RPE 10', async () => {
    expect(await summary(rpe(['3', '3'], 10))).toBe('2 × 3 @ RPE 10 · set 1 next')
  })

  it('efforts that differ are a range, lowest to highest', async () => {
    expect(await summary(sets(['8', '8', '8'], { rpe: [7, 8, 9] }))).toBe('3 × 8 @ RPE 7–9 · set 1 next')
    expect(await summary(sets(['10', '10', '10'], { rir: [3, 2, 1] }))).toBe('3 × 10 @ 1–3 RIR · set 1 next')
  })

  it('mixed reps and mixed efforts', async () => {
    expect(await summary(sets(['8', '8', '6'], { rpe: [7, 8, 9] }))).toBe('3 sets · 8, 8, 6 reps @ RPE 7–9 · set 1 next')
  })

  it('the sets are taken in setNumber order, whatever order they arrive in', async () => {
    const shuffled = [...rpe(['5', '5', '8'], 8)].reverse()
    expect(await summary(shuffled)).toBe('3 sets · 5, 5, 8 reps @ RPE 8 · set 1 next')
  })

  it('warm-up sets are not part of the plan', async () => {
    const plan: P[] = [
      { setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true },
      { setNumber: 2, reps: '8', rpe: 8, rir: null, isWarmup: false },
      { setNumber: 3, reps: '8', rpe: 8, rir: null },
      { setNumber: 4, reps: '8', rpe: 8, rir: null },
    ]
    expect(await summary(plan)).toBe('3 × 8 @ RPE 8 · set 1 next')
  })
})

describe('no plan', () => {
  it('no prescribed sets: no summary', async () => {
    expect(await summary([])).toBeNull()
    expect(await summary([], 3)).toBeNull()
  })

  it('only warm-ups: no summary', async () => {
    expect(await summary([{ setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true }])).toBeNull()
  })
})

describe('progress through the plan', () => {
  const squat = () => rpe(['8', '8', '8'], 8)

  it('Progress through the plan: after 1 set it is set 2, after 2 sets set 3', async () => {
    expect(await summary(squat(), 1)).toBe('3 × 8 @ RPE 8 · set 2 next')
    expect(await summary(squat(), 2)).toBe('3 × 8 @ RPE 8 · set 3 next')
  })

  it('Plan done: 3 sets logged of 3', async () => {
    expect(await summary(squat(), 3)).toBe('3 × 8 @ RPE 8 · done')
  })

  it('Extra sets beyond the plan: 4 sets logged of 3 is still done', async () => {
    expect(await summary(squat(), 4)).toBe('3 × 8 @ RPE 8 · done')
    expect(await summary(squat(), 9)).toBe('3 × 8 @ RPE 8 · done')
  })

  it('progress on a mixed plan and on reps only', async () => {
    expect(await summary(rpe(['5', '5', '8'], 8), 2)).toBe('3 sets · 5, 5, 8 reps @ RPE 8 · set 3 next')
    expect(await summary(sets(['60', '60', '60']), 3)).toBe('3 × 60 · done')
  })

  it('a one-set plan is done after one', async () => {
    expect(await summary(rpe(['6'], 9), 1)).toBe('1 × 6 @ RPE 9 · done')
  })
})

describe('nextPlannedSet', () => {
  it('is the first planned set when nothing is logged', async () => {
    expect(await next(rpe(['5', '5', '8'], 8))).toMatchObject({ setNumber: 1, reps: '5', rpe: 8, rir: null })
  })

  it('moves along with the logged count', async () => {
    const plan = rpe(['5', '5', '8'], 8)
    expect(await next(plan, 1)).toMatchObject({ setNumber: 2, reps: '5' })
    expect(await next(plan, 2)).toMatchObject({ setNumber: 3, reps: '8' })
  })

  it('is null when the plan is done, and for extra sets', async () => {
    const plan = rpe(['5', '5', '8'], 8)
    expect(await next(plan, 3)).toBeNull()
    expect(await next(plan, 5)).toBeNull()
  })

  it('is null when there is no plan', async () => {
    expect(await next([], 0)).toBeNull()
    expect(await next([{ setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true }], 0)).toBeNull()
  })

  it('carries RIR and rep ranges as they are', async () => {
    expect(await next(rir(['8-10', '8-10'], 2), 1)).toMatchObject({ reps: '8-10', rir: 2, rpe: null })
  })

  it('goes by position in setNumber order, not by setNumber value, and skips warm-ups', async () => {
    const plan: P[] = [
      { setNumber: 3, reps: '8', rpe: 8, rir: null },
      { setNumber: 1, reps: '12', rpe: null, rir: null, isWarmup: true },
      { setNumber: 2, reps: '6', rpe: 7, rir: null },
    ]
    expect(await next(plan, 0)).toMatchObject({ reps: '6', rpe: 7 })
    expect(await next(plan, 1)).toMatchObject({ reps: '8', rpe: 8 })
    expect(await next(plan, 2)).toBeNull()
  })

  it('an RIR of 0 comes back as 0', async () => {
    expect((await next(rir(['5'], 0)))?.rir).toBe(0)
  })
})
