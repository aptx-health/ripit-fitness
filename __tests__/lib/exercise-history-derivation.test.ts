import { describe, expect, it } from 'vitest'
import {
  allTimePRSessionIndex,
  bestSetE1RM,
  bestWorkingSet,
  e1rmTrend,
  sessionE1RMs,
} from '@/lib/stats/exercise-history-derivation'

type Set = {
  reps: number
  weight: number
  weightUnit?: string
  isWarmup?: boolean
}

function set(s: Set) {
  return { weightUnit: 'lbs', isWarmup: false, ...s }
}

function session(sets: Set[]) {
  return { sets: sets.map(set) }
}

describe('bestWorkingSet', () => {
  it('picks the set with the highest Epley e1RM', () => {
    // 200x3 -> 220, 185x5 -> ~215.8, 225x1 -> 225 (winner)
    const best = bestWorkingSet([
      set({ reps: 3, weight: 200 }),
      set({ reps: 5, weight: 185 }),
      set({ reps: 1, weight: 225 }),
    ])
    expect(best?.weight).toBe(225)
  })

  it('excludes warmup sets', () => {
    const best = bestWorkingSet([
      set({ reps: 1, weight: 315, isWarmup: true }),
      set({ reps: 5, weight: 135 }),
    ])
    expect(best?.weight).toBe(135)
  })

  it('excludes bodyweight / zero-weight sets', () => {
    const best = bestWorkingSet([
      set({ reps: 20, weight: 0 }),
      set({ reps: 8, weight: 95 }),
    ])
    expect(best?.weight).toBe(95)
  })

  it('returns null when no set qualifies', () => {
    expect(
      bestWorkingSet([
        set({ reps: 10, weight: 0 }),
        set({ reps: 5, weight: 135, isWarmup: true }),
      ])
    ).toBeNull()
  })

  it('breaks ties toward the earliest qualifying set', () => {
    const best = bestWorkingSet([
      set({ reps: 5, weight: 100 }),
      set({ reps: 5, weight: 100 }),
    ])
    // Same e1RM — first one wins (strict >).
    expect(best).toBe(bestWorkingSet([set({ reps: 5, weight: 100 })]))
  })
})

describe('bestSetE1RM', () => {
  it('computes Epley on the best working set', () => {
    // 135x5 -> 135 * (1 + 5/30) = 157.5
    expect(bestSetE1RM([set({ reps: 5, weight: 135 })])).toBeCloseTo(157.5, 5)
  })

  it('normalizes kg to lbs before comparing', () => {
    // 100kg x1 -> 220.462 lbs beats 200lbs x1.
    const best = bestWorkingSet([
      set({ reps: 1, weight: 200, weightUnit: 'lbs' }),
      set({ reps: 1, weight: 100, weightUnit: 'kg' }),
    ])
    expect(best?.weightUnit).toBe('kg')
  })

  it('returns null with no qualifying set', () => {
    expect(bestSetE1RM([set({ reps: 10, weight: 0 })])).toBeNull()
  })
})

describe('sessionE1RMs', () => {
  it('maps each session to its best e1RM, null when none qualifies', () => {
    const result = sessionE1RMs([
      session([{ reps: 1, weight: 200 }]),
      session([{ reps: 20, weight: 0 }]),
    ])
    expect(result[0]).toBeCloseTo(200, 5)
    expect(result[1]).toBeNull()
  })
})

describe('allTimePRSessionIndex', () => {
  it('finds the session with the all-time best e1RM (newest-first input)', () => {
    const sessions = [
      session([{ reps: 5, weight: 135 }]), // 157.5
      session([{ reps: 1, weight: 225 }]), // 225 <- PR
      session([{ reps: 5, weight: 185 }]), // ~215.8
    ]
    expect(allTimePRSessionIndex(sessions)).toBe(1)
  })

  it('resolves ties to the most recent (earliest index)', () => {
    const sessions = [
      session([{ reps: 1, weight: 200 }]),
      session([{ reps: 1, weight: 200 }]),
    ]
    expect(allTimePRSessionIndex(sessions)).toBe(0)
  })

  it('returns null when no session has a qualifying set', () => {
    expect(
      allTimePRSessionIndex([session([{ reps: 10, weight: 0 }])])
    ).toBeNull()
  })
})

describe('e1rmTrend', () => {
  it('is up when newest exceeds oldest', () => {
    // newest-first: 225 (newest) vs 135 (oldest)
    const sessions = [
      session([{ reps: 1, weight: 225 }]),
      session([{ reps: 1, weight: 135 }]),
    ]
    expect(e1rmTrend(sessions)).toBe('up')
  })

  it('is down when newest is below oldest', () => {
    const sessions = [
      session([{ reps: 1, weight: 135 }]),
      session([{ reps: 1, weight: 225 }]),
    ]
    expect(e1rmTrend(sessions)).toBe('down')
  })

  it('is flat within the epsilon band', () => {
    // 200 vs 201 -> 0.5% change, under the 1% epsilon
    const sessions = [
      session([{ reps: 1, weight: 201 }]),
      session([{ reps: 1, weight: 200 }]),
    ]
    expect(e1rmTrend(sessions)).toBe('flat')
  })

  it('is flat with fewer than two qualifying sessions', () => {
    const sessions = [
      session([{ reps: 1, weight: 200 }]),
      session([{ reps: 20, weight: 0 }]),
    ]
    expect(e1rmTrend(sessions)).toBe('flat')
  })

  it('ignores non-qualifying sessions at the ends', () => {
    // newest qualifying = 225, oldest qualifying = 135 -> up
    const sessions = [
      session([{ reps: 20, weight: 0 }]),
      session([{ reps: 1, weight: 225 }]),
      session([{ reps: 1, weight: 135 }]),
      session([{ reps: 10, weight: 0 }]),
    ]
    expect(e1rmTrend(sessions)).toBe('up')
  })
})
