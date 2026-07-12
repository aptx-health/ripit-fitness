import { describe, expect, it } from 'vitest'
import {
  appliedSetToForm,
  type PrefillCandidateSet,
  pickPrefillSourceSet,
  resolvePrefill,
} from '@/lib/workout/prefill'

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

describe('resolvePrefill', () => {
  const blank = { reps: '', weight: '', rpe: '', rir: '' }
  const prescribed = { reps: '5', rpe: null, rir: null }

  it('prefills a freshly-entered exercise from history', () => {
    const history = [set({ setNumber: 1, reps: 5, weight: 200 })]

    const values = resolvePrefill({
      isNewTarget: true,
      current: blank,
      snapshot: null,
      sessionSets: [],
      historySets: history,
      prescribed,
    })

    expect(values).not.toBeNull()
    expect(values?.weight).toBe('200')
    expect(values?.reps).toBe('5')
  })

  it('upgrades a prescribed fallback to history once it arrives (form untouched)', () => {
    // First pass: history not loaded yet — falls back to prescribed reps + 0.
    const fallback = resolvePrefill({
      isNewTarget: true,
      current: blank,
      snapshot: null,
      sessionSets: [],
      historySets: null,
      prescribed,
    })
    expect(fallback?.reps).toBe('5')
    expect(fallback?.weight).toBe('0')

    const snapshot = {
      reps: fallback!.reps,
      weight: fallback!.weight,
      rpe: fallback!.rpe,
      rir: fallback!.rir,
    }

    // History arrives; the form still shows the fallback (untouched).
    const upgraded = resolvePrefill({
      isNewTarget: false,
      current: snapshot,
      snapshot,
      sessionSets: [],
      historySets: [set({ setNumber: 1, reps: 8, weight: 315 })],
      prescribed,
    })

    expect(upgraded?.weight).toBe('315')
    expect(upgraded?.reps).toBe('8')
  })

  it('does not clobber the form after the user edits it', () => {
    const snapshot = { reps: '5', weight: '0', rpe: '', rir: '' }
    const edited = { reps: '5', weight: '185', rpe: '', rir: '' } // user typed weight

    const values = resolvePrefill({
      isNewTarget: false,
      current: edited,
      snapshot,
      sessionSets: [],
      historySets: [set({ setNumber: 1, reps: 8, weight: 315 })],
      prescribed,
    })

    expect(values).toBeNull()
  })

  it('skips a redundant re-apply when nothing changed', () => {
    const snapshot = { reps: '5', weight: '200', rpe: '', rir: '' }

    const values = resolvePrefill({
      isNewTarget: false,
      current: snapshot,
      snapshot,
      sessionSets: [],
      historySets: [set({ setNumber: 1, reps: 5, weight: 200 })],
      prescribed,
    })

    expect(values).toBeNull()
  })
})

describe('appliedSetToForm (tap-to-prefill)', () => {
  it('maps a set to string form values with intensity', () => {
    const v = appliedSetToForm(
      { reps: 9, weight: 60, weightUnit: 'lbs', rpe: null, rir: 2 },
      true
    )

    expect(v).toEqual({ reps: '9', weight: '60', weightUnit: 'lbs', rpe: '', rir: '2' })
  })

  it('drops intensity when the user has it disabled', () => {
    const v = appliedSetToForm(
      { reps: 5, weight: 225, weightUnit: 'kg', rpe: 8, rir: 2 },
      false
    )

    expect(v.rpe).toBe('')
    expect(v.rir).toBe('')
    expect(v.weightUnit).toBe('kg')
  })

  it('returns null weightUnit when the source unit is unknown (keep current)', () => {
    const v = appliedSetToForm({ reps: 10, weight: 0, rpe: null, rir: null }, true)

    expect(v.weightUnit).toBeNull()
    expect(v.weight).toBe('0')
  })
})
