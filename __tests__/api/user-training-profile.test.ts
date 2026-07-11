import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import {
  EQUIPMENT_AVAILABILITY_VALUES,
  EQUIPMENT_CHECKLIST_GROUPS,
  EQUIPMENT_CHECKLIST_VALUES,
  EQUIPMENT_PRESETS,
  normalizeEquipmentAvailability,
} from '@/lib/equipment-availability'
import { getDefaultMuscleBalanceTargets } from '@/lib/muscle-balance'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import {
  getOrCreateUserTrainingProfile,
  normalizeFauImportance,
  normalizeGoalCategories,
  normalizeImportance,
  normalizeInjuryAreas,
  normalizeOtherActivities,
  normalizePreferredDays,
  normalizeTargetMovements,
  normalizeUserTrainingProfile,
  updateUserTrainingProfile,
} from '@/lib/user-training-profile'

describe('UserTrainingProfile normalization', () => {
  it('trims, dedupes, drops empties, and caps lengths', () => {
    const result = normalizeUserTrainingProfile({
      goalSentences: ['  improve bench  ', 'improve bench', '', 'spare legs'],
      weeklyIntent: ['1 heavy leg day'],
      equipmentAvailable: ['barbell', 'barbell', '  dumbbell ', 'flux_capacitor'],
      bannedExerciseIds: ['ex_1', 'ex_2'],
      ratioTargets: { chest: 1.5 },
      defaultIntensityPreference: 'hypertrophy',
    })

    expect(result.goalSentences).toEqual(['improve bench', 'spare legs'])
    expect(result.weeklyIntent).toEqual(['1 heavy leg day'])
    expect(result.equipmentAvailable).toEqual(['barbell', 'dumbbell'])
    expect(result.bannedExerciseIds).toEqual(['ex_1', 'ex_2'])
    expect(result.defaultIntensityPreference).toBe('hypertrophy')
    expect(result.ratioTargets.chest).toBeCloseTo(1.5)
  })

  it('rejects invalid intensity preference and non-array list inputs', () => {
    const result = normalizeUserTrainingProfile({
      goalSentences: 'not an array' as unknown as string[],
      weeklyIntent: [],
      equipmentAvailable: [],
      bannedExerciseIds: [],
      ratioTargets: {},
      defaultIntensityPreference: 'bogus',
    })

    expect(result.goalSentences).toEqual([])
    expect(result.defaultIntensityPreference).toBeNull()
  })

  it('defaults all expanded fields for a cold-start profile', () => {
    const result = normalizeUserTrainingProfile(null)

    expect(result.birthYear).toBeNull()
    expect(result.biologicalSex).toBeNull()
    expect(result.heightCm).toBeNull()
    expect(result.weightKg).toBeNull()
    expect(result.injuryAreas).toEqual([])
    expect(result.goalCategories).toEqual([])
    expect(result.otherActivities).toEqual([])
    expect(result.fauImportance).toEqual({})
    expect(result.targetSessionsPerWeek).toBeNull()
    expect(result.targetMinutesPerSession).toBeNull()
    expect(result.patternPreference).toBeNull()
    expect(result.preferredDays).toEqual([])
  })

  it('normalizes demographics and rhythm, rejecting out-of-range values', () => {
    const result = normalizeUserTrainingProfile({
      goalSentences: [],
      weeklyIntent: [],
      equipmentAvailable: [],
      bannedExerciseIds: [],
      ratioTargets: {},
      defaultIntensityPreference: null,
      birthYear: 1990,
      biologicalSex: 'prefer_not_to_say',
      heightCm: 180.5,
      weightKg: 9999,
      targetSessionsPerWeek: 4,
      targetMinutesPerSession: 2,
      patternPreference: 'upper_lower',
      preferredDays: ['friday', 'monday', 'bogusday'],
    })

    expect(result.birthYear).toBe(1990)
    expect(result.biologicalSex).toBe('prefer_not_to_say')
    expect(result.heightCm).toBeCloseTo(180.5)
    expect(result.weightKg).toBeNull() // out of range
    expect(result.targetSessionsPerWeek).toBe(4)
    expect(result.targetMinutesPerSession).toBeNull() // below minimum
    expect(result.patternPreference).toBe('upper_lower')
    // Canonical day order, invalid entries dropped
    expect(result.preferredDays).toEqual(['monday', 'friday'])
  })
})

describe('injury normalization', () => {
  it('keeps valid entries with notes and reportedAt, drops invalid ones', () => {
    const result = normalizeInjuryAreas([
      {
        area: 'lower_back',
        severity: 'avoid_loading',
        notes: '  disc issue  ',
        reportedAt: '2026-06-01T00:00:00.000Z',
      },
      { area: 'shoulder', severity: 'caution' },
      { area: 'knee', severity: 'recovered', reportedAt: 'not a date' },
      { area: 'shoulder', severity: 'caution' }, // duplicate area
      { area: 'spleen', severity: 'caution' }, // invalid area
      { area: 'hip', severity: 'sore' }, // invalid severity
      'not an object',
    ])

    expect(result).toEqual([
      {
        area: 'lower_back',
        severity: 'avoid_loading',
        notes: 'disc issue',
        reportedAt: '2026-06-01T00:00:00.000Z',
      },
      { area: 'shoulder', severity: 'caution' },
      { area: 'knee', severity: 'recovered' },
    ])
  })

  it('returns empty for non-array input', () => {
    expect(normalizeInjuryAreas(null)).toEqual([])
    expect(normalizeInjuryAreas({ area: 'knee' })).toEqual([])
  })
})

describe('importance normalization', () => {
  it('clamps importance to the 1-5 scale', () => {
    expect(normalizeImportance(0)).toBe(1)
    expect(normalizeImportance(3.6)).toBe(4)
    expect(normalizeImportance(99)).toBe(5)
    expect(normalizeImportance('3')).toBeNull()
    expect(normalizeImportance(Number.NaN)).toBeNull()
  })

  it('normalizes goal categories, dropping invalid and duplicate entries', () => {
    const result = normalizeGoalCategories([
      { category: 'build_muscle', importance: 5 },
      { category: 'build_muscle', importance: 2 },
      { category: 'bogus', importance: 3 },
      { category: 'lose_fat', importance: 'high' },
      { category: 'get_stronger', importance: 7 },
    ])

    expect(result).toEqual([
      { category: 'build_muscle', importance: 5 },
      { category: 'get_stronger', importance: 5 },
    ])
  })

  it('normalizes other activities with optional cadence', () => {
    const result = normalizeOtherActivities([
      { activity: 'cycling', importance: 5, cadence: ' 3x/week ' },
      { activity: 'skydiving', importance: 3 },
      { activity: 'yoga', importance: 2 },
    ])

    expect(result).toEqual([
      { activity: 'cycling', importance: 5, cadence: '3x/week' },
      { activity: 'yoga', importance: 2 },
    ])
  })

  it('normalizes per-FAU importance, dropping unknown keys', () => {
    const result = normalizeFauImportance({
      chest: 5,
      quads: 2.4,
      spleen: 5,
      lats: 'high',
    })

    expect(result).toEqual({ chest: 5, quads: 2 })
  })

  it('returns empty fauImportance for non-object input', () => {
    expect(normalizeFauImportance(null)).toEqual({})
    expect(normalizeFauImportance([1, 2])).toEqual({})
  })
})

describe('preferred days normalization', () => {
  it('dedupes and returns canonical order', () => {
    expect(
      normalizePreferredDays(['sunday', 'monday', 'monday', 'wednesday'])
    ).toEqual(['monday', 'wednesday', 'sunday'])
    expect(normalizePreferredDays('monday')).toEqual([])
  })
})

describe('equipment availability normalization', () => {
  it('has enum parity: every ExerciseDefinition.equipment value is representable', () => {
    const allValues = Object.keys(EQUIPMENT_LABELS)
    expect(EQUIPMENT_AVAILABILITY_VALUES).toEqual(allValues)
    expect(normalizeEquipmentAvailability(allValues)).toEqual(allValues)
  })

  it('drops unknown values, dedupes, and returns canonical order', () => {
    expect(
      normalizeEquipmentAvailability([
        'dumbbell',
        'barbell',
        'barbell',
        'dumbbells',
        'flux_capacitor',
        42,
      ])
    ).toEqual(['barbell', 'dumbbell'])
    expect(normalizeEquipmentAvailability('barbell')).toEqual([])
    expect(normalizeEquipmentAvailability(null)).toEqual([])
  })

  it('every preset contains only canonical values', () => {
    for (const preset of EQUIPMENT_PRESETS) {
      for (const value of preset.values) {
        expect(EQUIPMENT_AVAILABILITY_VALUES).toContain(value)
      }
      expect(normalizeEquipmentAvailability(preset.values)).toHaveLength(
        preset.values.length
      )
    }
  })

  it('checklist groups render only canonical values with no duplicates', () => {
    for (const group of EQUIPMENT_CHECKLIST_GROUPS) {
      for (const value of group.values) {
        expect(EQUIPMENT_AVAILABILITY_VALUES).toContain(value)
      }
    }
    // No value appears in more than one group.
    expect(new Set(EQUIPMENT_CHECKLIST_VALUES).size).toBe(
      EQUIPMENT_CHECKLIST_VALUES.length
    )
  })

  it('every preset value is offered as a checklist toggle', () => {
    const offered = new Set(EQUIPMENT_CHECKLIST_VALUES)
    for (const preset of EQUIPMENT_PRESETS) {
      for (const value of preset.values) {
        expect(offered).toContain(value)
      }
    }
  })
})

describe('UserTrainingProfile persistence', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('creates a default profile when none exists', async () => {
    const profile = await getOrCreateUserTrainingProfile(prisma, userId)

    expect(profile.goalSentences).toEqual([])
    expect(profile.weeklyIntent).toEqual([])
    expect(profile.equipmentAvailable).toEqual([])
    expect(profile.equipmentAvailableSet).toBe(false)
    expect(profile.bannedExerciseIds).toEqual([])
    expect(profile.defaultIntensityPreference).toBeNull()
    expect(profile.ratioTargets).toEqual(getDefaultMuscleBalanceTargets())
  })

  it('round-trips the equipment checklist and applies presets', async () => {
    // Apply a preset
    const preset = EQUIPMENT_PRESETS.find(
      (p) => p.id === 'home_dumbbells_bands'
    )
    expect(preset).toBeDefined()
    if (!preset) return

    const afterPreset = await updateUserTrainingProfile(prisma, userId, {
      equipmentAvailable: preset.values,
    })
    expect(afterPreset.equipmentAvailable.slice().sort()).toEqual(
      preset.values.slice().sort()
    )

    // Round-trip: read back matches what was saved
    const readBack = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(readBack.equipmentAvailable).toEqual(afterPreset.equipmentAvailable)

    // Unknown values are dropped on write
    const afterJunk = await updateUserTrainingProfile(prisma, userId, {
      equipmentAvailable: ['barbell', 'not_real_equipment'],
    })
    expect(afterJunk.equipmentAvailable).toEqual(['barbell'])

    // An intentional empty selection persists as a real (set) record — it is
    // NOT re-interpreted as "no record → full gym".
    const cleared = await updateUserTrainingProfile(prisma, userId, {
      equipmentAvailable: [],
    })
    expect(cleared.equipmentAvailable).toEqual([])
    expect(cleared.equipmentAvailableSet).toBe(true)
  })

  it('tracks equipmentAvailableSet: unset by default, set once written', async () => {
    // Default (untouched) profile has no record.
    const fresh = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(fresh.equipmentAvailableSet).toBe(false)

    // Writing a non-empty list marks the record as set.
    const afterSave = await updateUserTrainingProfile(prisma, userId, {
      equipmentAvailable: ['dumbbell'],
    })
    expect(afterSave.equipmentAvailableSet).toBe(true)

    // The flag survives a round-trip read.
    const readBack = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(readBack.equipmentAvailableSet).toBe(true)
  })

  it('backfills equipmentAvailableSet for legacy non-empty rows', () => {
    // A row written before the flag existed: list present, flag still false.
    const legacy = normalizeUserTrainingProfile({
      goalSentences: [],
      weeklyIntent: [],
      equipmentAvailable: ['barbell', 'dumbbell'],
      equipmentAvailableSet: false,
      bannedExerciseIds: [],
      ratioTargets: getDefaultMuscleBalanceTargets(),
      defaultIntensityPreference: null,
    })
    expect(legacy.equipmentAvailableSet).toBe(true)
  })

  it('is idempotent on repeated calls', async () => {
    const a = await getOrCreateUserTrainingProfile(prisma, userId)
    const b = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(a).toEqual(b)

    const rows = await prisma.userTrainingProfile.findMany({ where: { userId } })
    expect(rows).toHaveLength(1)
  })

  it('seeds ratioTargets from existing UserMuscleBalanceSettings if present', async () => {
    const customTargets = {
      ...getDefaultMuscleBalanceTargets(),
      chest: 1.5,
      quads: 0.5,
    }
    await prisma.userMuscleBalanceSettings.create({
      data: {
        userId,
        targets: customTargets,
        lookbackWorkouts: 8,
        includeSecondary: true,
        secondaryWeight: 0.5,
        excludeWarmups: true,
      },
    })

    const profile = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(profile.ratioTargets.chest).toBeCloseTo(1.5)
    expect(profile.ratioTargets.quads).toBeCloseTo(0.5)
  })

  it('defaults expanded fields on a freshly created profile', async () => {
    const profile = await getOrCreateUserTrainingProfile(prisma, userId)

    expect(profile.birthYear).toBeNull()
    expect(profile.biologicalSex).toBeNull()
    expect(profile.injuryAreas).toEqual([])
    expect(profile.goalCategories).toEqual([])
    expect(profile.otherActivities).toEqual([])
    expect(profile.fauImportance).toEqual({})
    expect(profile.targetSessionsPerWeek).toBeNull()
    expect(profile.patternPreference).toBeNull()
    expect(profile.preferredDays).toEqual([])
  })

  it('round-trips a full profile through updateUserTrainingProfile', async () => {
    const updated = await updateUserTrainingProfile(prisma, userId, {
      birthYear: 1988,
      biologicalSex: 'female',
      heightCm: 165,
      weightKg: 62.5,
      injuryAreas: [
        {
          area: 'lower_back',
          severity: 'caution',
          notes: 'tweaked deadlifting',
          reportedAt: '2026-05-15T12:00:00.000Z',
        },
      ],
      goalCategories: [{ category: 'get_stronger', importance: 5 }],
      otherActivities: [
        { activity: 'cycling', importance: 4, cadence: '2x/week' },
      ],
      fauImportance: { chest: 5, quads: 3 },
      targetSessionsPerWeek: 3,
      targetMinutesPerSession: 60,
      patternPreference: 'full_body',
      preferredDays: ['monday', 'wednesday', 'friday'],
    })

    const read = await getOrCreateUserTrainingProfile(prisma, userId)
    expect(read).toEqual(updated)
    expect(read.birthYear).toBe(1988)
    expect(read.biologicalSex).toBe('female')
    expect(read.heightCm).toBeCloseTo(165)
    expect(read.weightKg).toBeCloseTo(62.5)
    expect(read.injuryAreas).toEqual([
      {
        area: 'lower_back',
        severity: 'caution',
        notes: 'tweaked deadlifting',
        reportedAt: '2026-05-15T12:00:00.000Z',
      },
    ])
    expect(read.goalCategories).toEqual([
      { category: 'get_stronger', importance: 5 },
    ])
    expect(read.otherActivities).toEqual([
      { activity: 'cycling', importance: 4, cadence: '2x/week' },
    ])
    expect(read.fauImportance).toEqual({ chest: 5, quads: 3 })
    expect(read.targetSessionsPerWeek).toBe(3)
    expect(read.targetMinutesPerSession).toBe(60)
    expect(read.patternPreference).toBe('full_body')
    expect(read.preferredDays).toEqual(['monday', 'wednesday', 'friday'])
  })

  it('supports partial updates without clobbering other fields', async () => {
    await updateUserTrainingProfile(prisma, userId, {
      goalSentences: ['bench 225'],
      birthYear: 1995,
    })

    const after = await updateUserTrainingProfile(prisma, userId, {
      targetSessionsPerWeek: 4,
    })

    expect(after.goalSentences).toEqual(['bench 225'])
    expect(after.birthYear).toBe(1995)
    expect(after.targetSessionsPerWeek).toBe(4)
  })

  it('allows clearing fields by writing null', async () => {
    await updateUserTrainingProfile(prisma, userId, { birthYear: 1995 })
    const cleared = await updateUserTrainingProfile(prisma, userId, {
      birthYear: null,
      injuryAreas: [],
    })

    expect(cleared.birthYear).toBeNull()
    expect(cleared.injuryAreas).toEqual([])
  })

  it('bumps updatedAt on profile writes (profile_age_days freshness)', async () => {
    await getOrCreateUserTrainingProfile(prisma, userId)
    const before = await prisma.userTrainingProfile.findUniqueOrThrow({
      where: { userId },
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    await updateUserTrainingProfile(prisma, userId, {
      targetSessionsPerWeek: 5,
    })

    const after = await prisma.userTrainingProfile.findUniqueOrThrow({
      where: { userId },
    })
    expect(after.updatedAt.getTime()).toBeGreaterThan(
      before.updatedAt.getTime()
    )
  })
})

describe('normalizeTargetMovements', () => {
  it('returns {} for non-object / array / nullish input', () => {
    expect(normalizeTargetMovements(null)).toEqual({})
    expect(normalizeTargetMovements(undefined)).toEqual({})
    expect(normalizeTargetMovements('nope')).toEqual({})
    expect(normalizeTargetMovements(42)).toEqual({})
    expect(normalizeTargetMovements([])).toEqual({})
  })

  it('keeps only known anchor patterns, dropping unknown keys', () => {
    const result = normalizeTargetMovements({
      hinge: ['ex_dl'],
      lunge: ['ex_lunge'], // valid MovementPattern but not an anchor
      bogus: ['ex_x'],
    })
    expect(result).toEqual({ hinge: ['ex_dl'] })
  })

  it('coerces values: trims, drops non-strings/blanks, dedupes, caps at 5', () => {
    const result = normalizeTargetMovements({
      squat: [
        '  ex_a ',
        'ex_a', // dupe of trimmed ex_a
        '',
        42, // non-string
        'ex_b',
        'ex_c',
        'ex_d',
        'ex_e',
        'ex_f', // 6th distinct -> dropped by the cap
      ],
    })
    expect(result.squat).toEqual(['ex_a', 'ex_b', 'ex_c', 'ex_d', 'ex_e'])
  })

  it('drops patterns that normalize to an empty list', () => {
    const result = normalizeTargetMovements({
      hinge: [],
      squat: ['', 7],
      vertical_push: ['ex_ohp'],
    })
    expect(result).toEqual({ vertical_push: ['ex_ohp'] })
  })
})
