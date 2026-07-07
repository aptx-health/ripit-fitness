import { describe, expect, it } from 'vitest'
import {
  buildCandidateExercises,
  type CatalogExercise,
  type DecayedPreference,
  resolveAvailableEquipment,
} from '@/lib/suggest/candidates'

const NO_PREFS = new Map<string, DecayedPreference>()
const NO_BANS = new Set<string>()

const BARBELL_SQUAT: CatalogExercise = {
  id: 'ex-squat',
  name: 'Barbell Squat',
  equipment: ['barbell'],
  primaryFAUs: ['quads'],
  secondaryFAUs: ['glutes'],
  movementPattern: 'squat',
  intensityClass: 'heavy',
}

const PUSHUP: CatalogExercise = {
  id: 'ex-pushup',
  name: 'Push-up',
  equipment: ['bodyweight'],
  primaryFAUs: ['chest'],
  secondaryFAUs: ['triceps'],
  movementPattern: 'horizontal_push',
  intensityClass: 'moderate',
}

describe('resolveAvailableEquipment', () => {
  it('treats an empty list as unconstrained when no explicit record exists', () => {
    const { available, unconstrained } = resolveAvailableEquipment([])
    expect(unconstrained).toBe(true)
    expect(available.has('bodyweight')).toBe(true)
  })

  it('defaults to unconstrained when equipmentSet is omitted (back-compat)', () => {
    expect(resolveAvailableEquipment(['dumbbell']).unconstrained).toBe(false)
    expect(resolveAvailableEquipment([]).unconstrained).toBe(true)
  })

  it('treats an empty list as bodyweight-only when the record is explicit', () => {
    const { available, unconstrained } = resolveAvailableEquipment([], true)
    expect(unconstrained).toBe(false)
    expect(available.has('bodyweight')).toBe(true)
    expect(available.size).toBe(1) // only bodyweight
  })

  it('keeps a populated explicit list constrained to its tokens', () => {
    const { available, unconstrained } = resolveAvailableEquipment(['dumbbells'], true)
    expect(unconstrained).toBe(false)
    expect(available.has('dumbbell')).toBe(true) // normalized alias
    expect(available.has('bodyweight')).toBe(true)
  })
})

describe('buildCandidateExercises equipment gating', () => {
  const catalog = [BARBELL_SQUAT, PUSHUP]

  it('includes non-bodyweight exercises when equipment is unconstrained', () => {
    const { available, unconstrained } = resolveAvailableEquipment([])
    const result = buildCandidateExercises(catalog, {
      available,
      unconstrained,
      bannedIds: NO_BANS,
      preferences: NO_PREFS,
    })
    expect(result.map((c) => c.id).sort()).toEqual(['ex-pushup', 'ex-squat'])
  })

  it('restricts to bodyweight when the explicit list is empty', () => {
    const { available, unconstrained } = resolveAvailableEquipment([], true)
    const result = buildCandidateExercises(catalog, {
      available,
      unconstrained,
      bannedIds: NO_BANS,
      preferences: NO_PREFS,
    })
    expect(result.map((c) => c.id)).toEqual(['ex-pushup'])
  })
})
