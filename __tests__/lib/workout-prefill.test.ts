import { describe, expect, it } from 'vitest'
import { type PrefillCandidateSet, pickPrefillSourceSet } from '@/lib/workout/prefill'

function set(partial: Partial<PrefillCandidateSet> & { setNumber: number }): PrefillCandidateSet {
  return {
    reps: 5,
    weight: 100,
    weightUnit: 'lbs',
    rpe: null,
    rir: null,
    isWarmup: false,
    ...partial,
  }
}

describe('pickPrefillSourceSet', () => {
  it('returns null when there is no prior performance', () => {
    expect(pickPrefillSourceSet([], null)).toBeNull()
    expect(pickPrefillSourceSet([], [])).toBeNull()
    expect(pickPrefillSourceSet([], undefined)).toBeNull()
  })

  it('prefers this session over previous-workout history', () => {
    const sessionSets = [set({ setNumber: 1, reps: 8, weight: 135 })]
    const historySets = [set({ setNumber: 1, reps: 5, weight: 225 })]

    const result = pickPrefillSourceSet(sessionSets, historySets)

    expect(result?.weight).toBe(135)
    expect(result?.reps).toBe(8)
  })

  it('falls back to history when no sets are logged this session', () => {
    const historySets = [
      set({ setNumber: 1, reps: 5, weight: 200 }),
      set({ setNumber: 2, reps: 5, weight: 205 }),
    ]

    const result = pickPrefillSourceSet([], historySets)

    // Last working set from the previous workout
    expect(result?.weight).toBe(205)
    expect(result?.setNumber).toBe(2)
  })

  it('picks the highest-numbered set regardless of array order', () => {
    const sessionSets = [
      set({ setNumber: 3, reps: 4, weight: 150 }),
      set({ setNumber: 1, reps: 6, weight: 140 }),
      set({ setNumber: 2, reps: 5, weight: 145 }),
    ]

    const result = pickPrefillSourceSet(sessionSets, null)

    expect(result?.setNumber).toBe(3)
    expect(result?.weight).toBe(150)
  })

  it('ignores warm-up sets when a working set exists', () => {
    const sessionSets = [
      set({ setNumber: 1, reps: 10, weight: 45, isWarmup: true }),
      set({ setNumber: 2, reps: 5, weight: 185, isWarmup: false }),
      set({ setNumber: 3, reps: 8, weight: 95, isWarmup: true }),
    ]

    const result = pickPrefillSourceSet(sessionSets, null)

    // The last *working* set, not the higher-numbered warm-up
    expect(result?.setNumber).toBe(2)
    expect(result?.weight).toBe(185)
  })

  it('falls back to the last set when every set is a warm-up', () => {
    const sessionSets = [
      set({ setNumber: 1, reps: 10, weight: 45, isWarmup: true }),
      set({ setNumber: 2, reps: 8, weight: 65, isWarmup: true }),
    ]

    const result = pickPrefillSourceSet(sessionSets, null)

    expect(result?.setNumber).toBe(2)
    expect(result?.weight).toBe(65)
  })

  it('carries intensity (rpe/rir) forward from the source set', () => {
    const historySets = [set({ setNumber: 1, reps: 5, weight: 315, rpe: 8, rir: 2 })]

    const result = pickPrefillSourceSet([], historySets)

    expect(result?.rpe).toBe(8)
    expect(result?.rir).toBe(2)
  })
})
