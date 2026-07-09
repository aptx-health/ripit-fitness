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

describe('buildCandidateExercises gated primary implements (#958)', () => {
  const PULL_UP: CatalogExercise = {
    id: 'ex-pullup',
    name: 'Pull-Up',
    equipment: ['pull_up_bar'],
    primaryFAUs: ['lats'],
    secondaryFAUs: ['biceps'],
    movementPattern: 'vertical_pull',
    intensityClass: 'moderate',
  }
  const DIPS: CatalogExercise = {
    id: 'ex-dips',
    name: 'Dips',
    equipment: ['dip_bars'],
    primaryFAUs: ['chest'],
    secondaryFAUs: ['triceps'],
    movementPattern: 'vertical_push',
    intensityClass: 'moderate',
  }
  const EZ_CURL: CatalogExercise = {
    id: 'ex-ezcurl',
    name: 'EZ Bar Curl',
    equipment: ['ez_bar'],
    primaryFAUs: ['biceps'],
    secondaryFAUs: [],
    movementPattern: 'elbow_flexion',
    intensityClass: 'light',
  }
  const AB_WHEEL: CatalogExercise = {
    id: 'ex-abwheel',
    name: 'Ab Wheel',
    equipment: ['ab_wheel'],
    primaryFAUs: ['abs'],
    secondaryFAUs: [],
    movementPattern: 'anti_extension',
    intensityClass: 'moderate',
  }
  const DB_BENCH: CatalogExercise = {
    id: 'ex-dbbench',
    name: 'Dumbbell Bench Press',
    equipment: ['dumbbell', 'bench'],
    primaryFAUs: ['chest'],
    secondaryFAUs: ['triceps'],
    movementPattern: 'horizontal_push',
    intensityClass: 'moderate',
  }

  const catalog = [PULL_UP, DIPS, EZ_CURL, AB_WHEEL, DB_BENCH]

  it('excludes gated primary implements a dumbbell/machine user does not own', () => {
    const { available, unconstrained } = resolveAvailableEquipment(
      ['dumbbell', 'machine', 'bodyweight'],
      true,
    )
    const result = buildCandidateExercises(catalog, {
      available,
      unconstrained,
      bannedIds: NO_BANS,
      preferences: NO_PREFS,
    })
    const ids = result.map((c) => c.id)
    expect(ids).not.toContain('ex-pullup')
    expect(ids).not.toContain('ex-dips')
    expect(ids).not.toContain('ex-ezcurl')
    expect(ids).not.toContain('ex-abwheel')
    // bench is ambient + dumbbell owned → still passes
    expect(ids).toContain('ex-dbbench')
  })

  it('includes pull-up exercises when the user explicitly lists pull_up_bar', () => {
    const { available, unconstrained } = resolveAvailableEquipment(
      ['pull_up_bar'],
      true,
    )
    const result = buildCandidateExercises(catalog, {
      available,
      unconstrained,
      bannedIds: NO_BANS,
      preferences: NO_PREFS,
    })
    expect(result.map((c) => c.id)).toContain('ex-pullup')
  })

  it('passes everything for unconstrained users', () => {
    const { available, unconstrained } = resolveAvailableEquipment([])
    const result = buildCandidateExercises(catalog, {
      available,
      unconstrained,
      bannedIds: NO_BANS,
      preferences: NO_PREFS,
    })
    expect(result.map((c) => c.id).sort()).toEqual(
      ['ex-abwheel', 'ex-dbbench', 'ex-dips', 'ex-ezcurl', 'ex-pullup'].sort(),
    )
  })
})
