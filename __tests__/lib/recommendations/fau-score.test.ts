import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FAU_HEAVY_STALENESS_WEIGHT,
  DEFAULT_FAU_RECOVERY_PENALTY_WEIGHT,
  DEFAULT_FAU_STALENESS_WEIGHT,
  type FauScoreInput,
  type FauScoreWeights,
  scoreFaus,
} from '@/lib/recommendations/fau-score'

const WEIGHTS: FauScoreWeights = {
  stalenessWeight: DEFAULT_FAU_STALENESS_WEIGHT,
  heavyStalenessWeight: DEFAULT_FAU_HEAVY_STALENESS_WEIGHT,
  recoveryPenaltyWeight: DEFAULT_FAU_RECOVERY_PENALTY_WEIGHT,
}

/** Rank and return the FAU keys, highest need first. */
function order(inputs: FauScoreInput[], comebackMode = false): string[] {
  return scoreFaus(inputs, { weights: WEIGHTS, comebackMode }).map((r) => r.fau)
}

describe('scoreFaus — each term moves the ranking', () => {
  it('deficit dominates the baseline ordering', () => {
    const inputs: FauScoreInput[] = [
      { fau: 'chest', deficitShare: 0.05, lastTrainedDaysAgo: 0 },
      { fau: 'quads', deficitShare: 0.2, lastTrainedDaysAgo: 0 },
    ]
    expect(order(inputs)).toEqual(['quads', 'chest'])
  })

  it('staleness reorders FAUs with equal deficits (staler ranks first)', () => {
    const inputs: FauScoreInput[] = [
      { fau: 'chest', deficitShare: 0.03, lastTrainedDaysAgo: 0 },
      { fau: 'quads', deficitShare: 0.03, lastTrainedDaysAgo: 10 },
    ]
    expect(order(inputs)).toEqual(['quads', 'chest'])
  })

  it('heavy staleness lifts an overdue-for-heavy FAU above a recently-heavy one', () => {
    const inputs: FauScoreInput[] = [
      { fau: 'chest', deficitShare: 0.02, lastTrainedDaysAgo: 3, lastHeavyDaysAgo: 0 },
      { fau: 'quads', deficitShare: 0.02, lastTrainedDaysAgo: 3, lastHeavyDaysAgo: 21 },
    ]
    expect(order(inputs)).toEqual(['quads', 'chest'])
  })

  it('recovery penalty pushes a just-hammered FAU down', () => {
    const inputs: FauScoreInput[] = [
      { fau: 'chest', deficitShare: 0.05, lastTrainedDaysAgo: 1, recentlyHammered: true },
      { fau: 'quads', deficitShare: 0.05, lastTrainedDaysAgo: 1, recentlyHammered: false },
    ]
    const ranked = scoreFaus(inputs, { weights: WEIGHTS })
    expect(ranked.map((r) => r.fau)).toEqual(['quads', 'chest'])
    const chest = ranked.find((r) => r.fau === 'chest')
    expect(chest?.need).toBeLessThan(0)
  })
})

describe('scoreFaus — comeback mode', () => {
  // A fresh but high-deficit FAU vs a stale but low-deficit FAU. Normally the
  // deficit wins; in comeback mode the deficit is dampened so staleness leads.
  const inputs: FauScoreInput[] = [
    { fau: 'chest', deficitShare: 0.1, lastTrainedDaysAgo: 0 },
    { fau: 'quads', deficitShare: 0.02, lastTrainedDaysAgo: 14 },
  ]

  it('ranks the high-deficit FAU first when not in comeback mode', () => {
    expect(order(inputs, false)).toEqual(['chest', 'quads'])
  })

  it('flips toward the stale FAU in comeback mode', () => {
    expect(order(inputs, true)).toEqual(['quads', 'chest'])
  })
})

describe('scoreFaus — graceful degradation', () => {
  it('ranks on deficit + staleness alone when aggregates fields are absent', () => {
    const inputs: FauScoreInput[] = [
      { fau: 'chest', deficitShare: 0.04, lastTrainedDaysAgo: 2 },
      { fau: 'quads', deficitShare: 0.04, lastTrainedDaysAgo: 12 },
      { fau: 'abs', deficitShare: 0.09, lastTrainedDaysAgo: 0 },
    ]
    expect(() => scoreFaus(inputs, { weights: WEIGHTS })).not.toThrow()
    // Highest deficit first, then the staler of the equal-deficit pair.
    expect(order(inputs)).toEqual(['abs', 'quads', 'chest'])
  })

  it('treats an undefined lastHeavyDaysAgo as "term off", null as "maximally overdue"', () => {
    const [withoutAgg] = scoreFaus(
      [{ fau: 'chest', deficitShare: 0.03, lastTrainedDaysAgo: 3 }],
      { weights: WEIGHTS },
    )
    const [neverHeavy] = scoreFaus(
      [{ fau: 'chest', deficitShare: 0.03, lastTrainedDaysAgo: 3, lastHeavyDaysAgo: null }],
      { weights: WEIGHTS },
    )
    // null adds the full heavy-staleness term; undefined adds nothing.
    expect(neverHeavy.need - withoutAgg.need).toBeCloseTo(DEFAULT_FAU_HEAVY_STALENESS_WEIGHT)
  })

  it('is deterministic: identical needs break ties on the FAU key', () => {
    const inputs: FauScoreInput[] = [
      { fau: 'chest', deficitShare: 0.05, lastTrainedDaysAgo: 0 },
      { fau: 'abs', deficitShare: 0.05, lastTrainedDaysAgo: 0 },
    ]
    expect(order(inputs)).toEqual(['abs', 'chest'])
  })
})

describe('scoreFaus — reason chips (at most one per FAU)', () => {
  const reasonFor = (input: FauScoreInput, comebackMode = false) =>
    scoreFaus([input], { weights: WEIGHTS, comebackMode })[0].reason

  it('shows "recovering" for a just-hammered FAU', () => {
    expect(reasonFor({ fau: 'chest', deficitShare: 0.05, lastTrainedDaysAgo: 1, recentlyHammered: true }))
      .toEqual({ label: 'recovering', kind: 'recovering' })
  })

  it('shows "heavy overdue" when the heavy term dominates', () => {
    expect(
      reasonFor({ fau: 'chest', deficitShare: 0.02, lastTrainedDaysAgo: 2, lastHeavyDaysAgo: 21 }),
    ).toEqual({ label: 'heavy overdue', kind: 'heavy' })
  })

  it('shows the never-logged staleness label for an untrained FAU', () => {
    expect(reasonFor({ fau: 'chest', deficitShare: 0.02, lastTrainedDaysAgo: null }))
      .toEqual({ label: 'New — never logged', kind: 'stale' })
  })

  it('shows a day-count staleness label for a trained-but-stale FAU', () => {
    expect(reasonFor({ fau: 'chest', deficitShare: 0.01, lastTrainedDaysAgo: 12 }))
      .toEqual({ label: '12d since', kind: 'stale' })
  })

  it('emits no chip when all recovery weights are zero', () => {
    const zero: FauScoreWeights = {
      stalenessWeight: 0,
      heavyStalenessWeight: 0,
      recoveryPenaltyWeight: 0,
    }
    const [result] = scoreFaus(
      [{ fau: 'chest', deficitShare: 0.05, lastTrainedDaysAgo: 10, lastHeavyDaysAgo: 20 }],
      { weights: zero },
    )
    expect(result.reason).toBeNull()
    expect(result.need).toBeCloseTo(0.05)
  })
})
