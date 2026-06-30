import { describe, expect, it } from 'vitest'
import {
  formatLastSessionSummary,
  type LastSessionSet,
} from '@/lib/format/last-session-reference'

function mkSet(overrides: Partial<LastSessionSet> = {}): LastSessionSet {
  return {
    setNumber: 1,
    reps: 5,
    weight: 185,
    weightUnit: 'lbs',
    rpe: null,
    rir: null,
    isWarmup: false,
    ...overrides,
  }
}

describe('formatLastSessionSummary', () => {
  it('returns never-logged when history is null', () => {
    const result = formatLastSessionSummary(null)
    expect(result.summary).toBeNull()
    expect(result.emptyReason).toBe('never-logged')
  })

  it('returns never-logged when sets array is empty', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [],
    })
    expect(result.emptyReason).toBe('never-logged')
  })

  it('returns warmups-only when only warmups are present', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [mkSet({ isWarmup: true }), mkSet({ setNumber: 2, isWarmup: true })],
    })
    expect(result.summary).toBeNull()
    expect(result.emptyReason).toBe('warmups-only')
  })

  it('collapses uniform working sets into "weight × reps × sets"', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [
        mkSet({ setNumber: 1 }),
        mkSet({ setNumber: 2 }),
        mkSet({ setNumber: 3 }),
      ],
    })
    expect(result.summary).toBe('185 lbs × 5 × 3')
    expect(result.emptyReason).toBeNull()
  })

  it('appends uniform RIR tag when present on all working sets', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [
        mkSet({ setNumber: 1, rir: 2 }),
        mkSet({ setNumber: 2, rir: 2 }),
        mkSet({ setNumber: 3, rir: 2 }),
      ],
    })
    expect(result.summary).toBe('185 lbs × 5 × 3 @ RIR 2')
  })

  it('appends uniform RPE tag when RIR not present', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [
        mkSet({ setNumber: 1, rpe: 8 }),
        mkSet({ setNumber: 2, rpe: 8 }),
      ],
    })
    expect(result.summary).toBe('185 lbs × 5 × 2 @ RPE 8')
  })

  it('omits intensity tag when values vary across sets', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [
        mkSet({ setNumber: 1, rpe: 7 }),
        mkSet({ setNumber: 2, rpe: 9 }),
      ],
    })
    expect(result.summary).toBe('185 lbs × 5 × 2')
  })

  it('shows comma list when reps vary', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [
        mkSet({ setNumber: 1, reps: 5 }),
        mkSet({ setNumber: 2, reps: 5 }),
        mkSet({ setNumber: 3, reps: 4 }),
      ],
    })
    expect(result.summary).toBe('185 lbs × 5,5,4')
  })

  it('shows weight range when weights vary', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [
        mkSet({ setNumber: 1, weight: 135 }),
        mkSet({ setNumber: 2, weight: 185 }),
      ],
    })
    expect(result.summary).toBe('135–185 lbs × 5')
  })

  it('renders BW for bodyweight (weight=0)', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [mkSet({ weight: 0 }), mkSet({ setNumber: 2, weight: 0 })],
    })
    expect(result.summary).toBe('BW × 5 × 2')
  })

  it('excludes warmups from the summary', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [
        mkSet({ setNumber: 1, weight: 95, isWarmup: true }),
        mkSet({ setNumber: 2 }),
        mkSet({ setNumber: 3 }),
      ],
    })
    expect(result.summary).toBe('185 lbs × 5 × 2')
  })

  it('produces a relative time string when working sets exist', () => {
    const result = formatLastSessionSummary({
      completedAt: new Date(),
      sets: [mkSet()],
    })
    expect(result.relative).not.toBeNull()
  })
})
