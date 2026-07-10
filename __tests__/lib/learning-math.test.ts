import { describe, expect, it } from 'vitest'
import {
  betaCredibleInterval,
  betaMean,
  betaVariance,
  DEFAULT_EWMA_ALPHA,
  decayBeta,
  effectiveAlpha,
  epleyE1RM,
  gapDecayedEwma,
  sampleBeta,
  UNIFORM_PRIOR,
  updateBeta,
  WEEKLY_DECAY_FACTOR,
} from '@/lib/learning/math'

/** Deterministic LCG for reproducible sampling tests. */
function seededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return (state + 1) / 4294967297 // in (0, 1)
  }
}

describe('gapDecayedEwma', () => {
  it('returns nulls for zero observations', () => {
    const result = gapDecayedEwma([])
    expect(result.estimateLbs).toBeNull()
    expect(result.estimateStalenessDays).toBeNull()
    expect(result.observationCount).toBe(0)
  })

  it('returns the single observation weight and its staleness', () => {
    const result = gapDecayedEwma([{ weightLbs: 185, daysAgo: 12 }])
    expect(result.estimateLbs).toBe(185)
    expect(result.estimateStalenessDays).toBe(12)
    expect(result.observationCount).toBe(1)
  })

  it('processes observations oldest-first regardless of input order', () => {
    const asc = gapDecayedEwma([
      { weightLbs: 185, daysAgo: 14 },
      { weightLbs: 190, daysAgo: 7 },
      { weightLbs: 195, daysAgo: 0 },
    ])
    const shuffled = gapDecayedEwma([
      { weightLbs: 195, daysAgo: 0 },
      { weightLbs: 185, daysAgo: 14 },
      { weightLbs: 190, daysAgo: 7 },
    ])
    expect(shuffled.estimateLbs).toBe(asc.estimateLbs)
    expect(shuffled.estimateStalenessDays).toBe(0)
  })

  it('gap decay: a 21-day layoff stream leans harder on the newest observation than a fresh stream', () => {
    // Same weights; only the gap before the final observation differs.
    const fresh = gapDecayedEwma([
      { weightLbs: 200, daysAgo: 10 },
      { weightLbs: 200, daysAgo: 7 },
      { weightLbs: 170, daysAgo: 0 }, // 7-day gap (typical)
    ])
    const layoff = gapDecayedEwma([
      { weightLbs: 200, daysAgo: 24 },
      { weightLbs: 200, daysAgo: 21 },
      { weightLbs: 170, daysAgo: 0 }, // 21-day gap
    ])
    // Post-layoff, the lighter comeback observation should pull the estimate
    // down much further than in the fresh stream.
    expect(layoff.estimateLbs).toBeLessThan(fresh.estimateLbs as number)
    // With alpha 0.3 / typical 7: fresh final step alpha' = 0.3;
    // layoff final step alpha' = 1 - 0.7^3 = 0.657.
    expect(fresh.estimateLbs).toBeCloseTo(0.3 * 170 + 0.7 * 200, 5)
    expect(layoff.estimateLbs).toBeCloseTo(0.657 * 170 + 0.343 * 200, 5)
  })

  it('emits staleness reflecting the newest observation, not the stream shape', () => {
    const stale = gapDecayedEwma([
      { weightLbs: 200, daysAgo: 28 },
      { weightLbs: 205, daysAgo: 21 },
    ])
    expect(stale.estimateStalenessDays).toBe(21)
  })

  it('throws on warmup observations', () => {
    expect(() =>
      gapDecayedEwma([{ weightLbs: 135, daysAgo: 0, isWarmup: true }])
    ).toThrow(/warmup/)
  })

  it('throws on bodyweight-exercise observations', () => {
    expect(() =>
      gapDecayedEwma([{ weightLbs: 0, daysAgo: 0, isBodyweight: true }])
    ).toThrow(/bodyweight/)
  })

  it('throws on invalid weights and daysAgo', () => {
    expect(() => gapDecayedEwma([{ weightLbs: -5, daysAgo: 0 }])).toThrow(
      /weightLbs/
    )
    expect(() => gapDecayedEwma([{ weightLbs: NaN, daysAgo: 0 }])).toThrow(
      /weightLbs/
    )
    expect(() => gapDecayedEwma([{ weightLbs: 100, daysAgo: -1 }])).toThrow(
      /daysAgo/
    )
  })
})

describe('effectiveAlpha', () => {
  it('reproduces base alpha at the typical gap', () => {
    expect(effectiveAlpha(0.3, 7, 7)).toBeCloseTo(0.3, 10)
  })

  it('increases monotonically with gap size', () => {
    const a1 = effectiveAlpha(0.3, 7, 7)
    const a2 = effectiveAlpha(0.3, 14, 7)
    const a3 = effectiveAlpha(0.3, 21, 7)
    expect(a2).toBeGreaterThan(a1)
    expect(a3).toBeGreaterThan(a2)
    expect(a3).toBeCloseTo(1 - 0.7 ** 3, 10)
  })

  it('clamps same-day gaps to 1 day so observations are not ignored', () => {
    expect(effectiveAlpha(0.3, 0, 7)).toBeCloseTo(
      1 - 0.7 ** (1 / 7),
      10
    )
    expect(effectiveAlpha(0.3, 0, 7)).toBeGreaterThan(0)
  })

  it('rejects invalid parameters', () => {
    expect(() => effectiveAlpha(0, 7, 7)).toThrow(/alpha/)
    expect(() => effectiveAlpha(1, 7, 7)).toThrow(/alpha/)
    expect(() => effectiveAlpha(0.3, 7, 0)).toThrow(/typicalGapDays/)
  })

  it('exports a sane default alpha', () => {
    expect(DEFAULT_EWMA_ALPHA).toBeGreaterThan(0)
    expect(DEFAULT_EWMA_ALPHA).toBeLessThan(1)
  })
})

describe('epleyE1RM', () => {
  it('returns weight for a single rep', () => {
    expect(epleyE1RM(225, 1)).toBe(225)
  })

  it('applies weight * (1 + reps/30)', () => {
    expect(epleyE1RM(200, 5)).toBeCloseTo(200 * (1 + 5 / 30), 10)
  })

  it('rejects non-positive reps', () => {
    expect(() => epleyE1RM(200, 0)).toThrow(/reps/)
  })
})

describe('updateBeta', () => {
  it('adds accept/reject evidence to the counts', () => {
    const posterior = updateBeta(UNIFORM_PRIOR, 3, 1)
    expect(posterior).toEqual({ alpha: 4, beta: 2 })
  })

  it('rejects negative evidence and invalid params', () => {
    expect(() => updateBeta(UNIFORM_PRIOR, -1, 0)).toThrow(/counts/)
    expect(() => updateBeta({ alpha: 0, beta: 1 }, 1, 1)).toThrow(/alpha/)
  })
})

describe('decayBeta', () => {
  it('is identity at zero weeks', () => {
    const params = { alpha: 10, beta: 4 }
    expect(decayBeta(params, 0)).toEqual(params)
  })

  it('halves evidence above the prior at the ~46-week half-life of 0.985/week', () => {
    const halfLifeWeeks = Math.log(0.5) / Math.log(WEEKLY_DECAY_FACTOR)
    expect(halfLifeWeeks).toBeCloseTo(45.86, 1)

    const params = { alpha: 11, beta: 5 } // evidence: 10 accepts, 4 rejects
    const decayed = decayBeta(params, halfLifeWeeks)
    expect(decayed.alpha).toBeCloseTo(1 + 10 / 2, 6)
    expect(decayed.beta).toBeCloseTo(1 + 4 / 2, 6)
  })

  it('relaxes toward the prior (never below valid Beta parameters) as weeks grow', () => {
    const decayed = decayBeta({ alpha: 20, beta: 2 }, 10_000)
    expect(decayed.alpha).toBeCloseTo(UNIFORM_PRIOR.alpha, 6)
    expect(decayed.beta).toBeCloseTo(UNIFORM_PRIOR.beta, 6)
    expect(decayed.alpha).toBeGreaterThan(0)
    expect(decayed.beta).toBeGreaterThan(0)
  })

  it('fades an ancient dislike behind recent signal', () => {
    // A year-old pile of rejects, decayed, then updated with recent accepts.
    const ancientDislike = updateBeta(UNIFORM_PRIOR, 0, 10)
    const afterYear = decayBeta(ancientDislike, 52)
    const withRecentAccepts = updateBeta(afterYear, 4, 0)
    expect(betaMean(withRecentAccepts)).toBeGreaterThan(0.4)
    // Without decay the old rejects dominate.
    expect(betaMean(updateBeta(ancientDislike, 4, 0))).toBeLessThan(0.35)
  })

  it('rejects invalid inputs', () => {
    expect(() => decayBeta({ alpha: 2, beta: 2 }, -1)).toThrow(/weeks/)
    expect(() => decayBeta({ alpha: 2, beta: 2 }, 1, 1.5)).toThrow(/factor/)
  })
})

describe('betaMean / betaVariance / betaCredibleInterval', () => {
  it('computes mean and variance', () => {
    expect(betaMean({ alpha: 3, beta: 1 })).toBeCloseTo(0.75, 10)
    // Beta(2,2): mean 0.5, var = 4/(16*5) = 0.05
    expect(betaVariance({ alpha: 2, beta: 2 })).toBeCloseTo(0.05, 10)
  })

  it('produces a clamped interval around the mean', () => {
    const wide = betaCredibleInterval(UNIFORM_PRIOR)
    expect(wide.lower).toBeGreaterThanOrEqual(0)
    expect(wide.upper).toBeLessThanOrEqual(1)
    expect(wide.lower).toBeLessThan(wide.upper)

    const tight = betaCredibleInterval({ alpha: 300, beta: 100 })
    expect(tight.lower).toBeGreaterThan(0.7)
    expect(tight.upper).toBeLessThan(0.8)
    expect(betaMean({ alpha: 300, beta: 100 })).toBeGreaterThan(tight.lower)
    expect(betaMean({ alpha: 300, beta: 100 })).toBeLessThan(tight.upper)
  })
})

describe('sampleBeta', () => {
  it('draws values in (0, 1) and converges near the mean', () => {
    const rng = seededRng(42)
    const params = { alpha: 8, beta: 2 } // mean 0.8
    const draws: number[] = []
    for (let i = 0; i < 2000; i++) {
      const x = sampleBeta(params, rng)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(1)
      draws.push(x)
    }
    const avg = draws.reduce((s, x) => s + x, 0) / draws.length
    expect(avg).toBeCloseTo(betaMean(params), 1)
  })

  it('handles shape parameters below 1 (boosted gamma path)', () => {
    const rng = seededRng(7)
    for (let i = 0; i < 200; i++) {
      const x = sampleBeta({ alpha: 0.5, beta: 0.5 }, rng)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('is deterministic with a seeded rng', () => {
    const a = sampleBeta({ alpha: 3, beta: 5 }, seededRng(123))
    const b = sampleBeta({ alpha: 3, beta: 5 }, seededRng(123))
    expect(a).toBe(b)
  })
})
