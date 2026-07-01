import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDefaultMuscleBalanceTargets } from '@/lib/muscle-balance'
import {
  getOrCreateUserTrainingProfile,
  normalizeUserTrainingProfile,
  normalizeImportance,
  normalizeBiologicalSex,
  normalizePatternPreference,
  normalizeInjuryAreas,
  normalizeGoalCategories,
  normalizeOtherActivities,
  normalizeWeeklyIntent,
} from '@/lib/user-training-profile'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

describe('UserTrainingProfile normalization', () => {
  it('trims, dedupes, drops empties, and caps lengths', () => {
    const result = normalizeUserTrainingProfile({
      goalSentences: ['  improve bench  ', 'improve bench', '', 'spare legs'],
      weeklyIntent: ['1 heavy leg day'],
      equipmentAvailable: ['barbell', 'barbell', '  dumbbells '],
      bannedExerciseIds: ['ex_1', 'ex_2'],
      ratioTargets: { chest: 1.5 },
      defaultIntensityPreference: 'hypertrophy',
    })

    expect(result.goalSentences).toEqual(['improve bench', 'spare legs'])
    expect(result.weeklyIntent).toEqual([
      { type: 'free_text', text: '1 heavy leg day' },
    ])
    expect(result.equipmentAvailable).toEqual(['barbell', 'dumbbells'])
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

  it('normalizes new demographic and rhythm fields', () => {
    const result = normalizeUserTrainingProfile({
      goalSentences: [],
      weeklyIntent: [],
      equipmentAvailable: [],
      bannedExerciseIds: [],
      ratioTargets: {},
      defaultIntensityPreference: null,
      age: 34.7,
      biologicalSex: 'female',
      heightCm: 170,
      weightKg: 65,
      injuryAreas: null,
      injuryFreeNotes: '  no notable injuries  ',
      goalCategories: null,
      otherActivities: null,
      targetSessionsPerWeek: 4,
      targetMinutesPerSession: 60,
      patternPreference: 'upper_lower',
    })

    expect(result.age).toBe(35)
    expect(result.biologicalSex).toBe('female')
    expect(result.heightCm).toBe(170)
    expect(result.weightKg).toBe(65)
    expect(result.injuryFreeNotes).toBe('no notable injuries')
    expect(result.targetSessionsPerWeek).toBe(4)
    expect(result.targetMinutesPerSession).toBe(60)
    expect(result.patternPreference).toBe('upper_lower')
  })

  it('rejects out-of-range demographics and bad enum strings', () => {
    const result = normalizeUserTrainingProfile({
      goalSentences: [],
      weeklyIntent: [],
      equipmentAvailable: [],
      bannedExerciseIds: [],
      ratioTargets: {},
      defaultIntensityPreference: null,
      age: 2, // below MIN_AGE
      biologicalSex: 'bogus',
      heightCm: 1000,
      weightKg: -5,
      targetSessionsPerWeek: 99,
      targetMinutesPerSession: 0,
      patternPreference: 'invalid',
    })

    expect(result.age).toBeNull()
    expect(result.biologicalSex).toBeNull()
    expect(result.heightCm).toBeNull()
    expect(result.weightKg).toBeNull()
    expect(result.targetSessionsPerWeek).toBeNull()
    expect(result.targetMinutesPerSession).toBeNull()
    expect(result.patternPreference).toBeNull()
  })
})

describe('normalizeImportance', () => {
  it('clamps to [1,5] and rounds', () => {
    expect(normalizeImportance(3)).toBe(3)
    expect(normalizeImportance(0)).toBe(1)
    expect(normalizeImportance(-2)).toBe(1)
    expect(normalizeImportance(6)).toBe(5)
    expect(normalizeImportance(4.6)).toBe(5)
    expect(normalizeImportance(4.4)).toBe(4)
  })

  it('rejects non-numeric values', () => {
    expect(normalizeImportance('4')).toBeNull()
    expect(normalizeImportance(null)).toBeNull()
    expect(normalizeImportance(Number.NaN)).toBeNull()
  })
})

describe('enum whitelisters', () => {
  it('normalizeBiologicalSex whitelists known values', () => {
    expect(normalizeBiologicalSex('female')).toBe('female')
    expect(normalizeBiologicalSex('male')).toBe('male')
    expect(normalizeBiologicalSex('prefer_not_to_say')).toBe('prefer_not_to_say')
    expect(normalizeBiologicalSex('nonbinary')).toBeNull()
    expect(normalizeBiologicalSex(42)).toBeNull()
  })

  it('normalizePatternPreference whitelists known values', () => {
    expect(normalizePatternPreference('full_body')).toBe('full_body')
    expect(normalizePatternPreference('body_part_split')).toBe('body_part_split')
    expect(normalizePatternPreference('bro_split')).toBeNull()
    expect(normalizePatternPreference(null)).toBeNull()
  })
})

describe('normalizeWeeklyIntent', () => {
  it('coerces legacy strings to free_text entries', () => {
    const result = normalizeWeeklyIntent([
      '  Deadlift day  ',
      'Deadlift day', // dedup
      '',
      'Squat day',
    ])
    expect(result).toEqual([
      { type: 'free_text', text: 'Deadlift day' },
      { type: 'free_text', text: 'Squat day' },
    ])
  })

  it('accepts structured free_text entries', () => {
    const result = normalizeWeeklyIntent([
      { type: 'free_text', text: 'Bench focus' },
      { type: 'free_text', text: '' }, // empty is dropped
      { type: 'unknown' as unknown as 'free_text', text: 'ignored' },
    ])
    expect(result).toEqual([{ type: 'free_text', text: 'Bench focus' }])
  })

  it('returns [] for non-array input', () => {
    expect(normalizeWeeklyIntent(null)).toEqual([])
    expect(normalizeWeeklyIntent('string')).toEqual([])
  })
})

describe('normalizeInjuryAreas', () => {
  it('whitelists area/severity, trims notes, dedupes by area', () => {
    const result = normalizeInjuryAreas([
      { area: 'shoulder', severity: 'active', notes: '  right side  ' },
      { area: 'shoulder', severity: 'past' }, // duplicate area, dropped
      { area: 'knee', severity: 'mindful' },
      { area: 'nose', severity: 'active' }, // invalid area
      { area: 'wrist', severity: 'wonky' }, // invalid severity
    ])
    expect(result).toEqual([
      { area: 'shoulder', severity: 'active', notes: 'right side' },
      { area: 'knee', severity: 'mindful' },
    ])
  })

  it('returns [] for non-array', () => {
    expect(normalizeInjuryAreas(null)).toEqual([])
  })
})

describe('normalizeGoalCategories', () => {
  it('whitelists categories, clamps importance, dedupes', () => {
    const result = normalizeGoalCategories([
      { category: 'build_muscle', importance: 5 },
      { category: 'build_muscle', importance: 3 }, // dup dropped
      { category: 'lose_fat', importance: 10 }, // clamp to 5
      { category: 'get_stronger', importance: 0 }, // clamp to 1
      { category: 'bogus', importance: 3 }, // invalid category
      { category: 'general_fitness' }, // missing importance
    ])
    expect(result).toEqual([
      { category: 'build_muscle', importance: 5 },
      { category: 'lose_fat', importance: 5 },
      { category: 'get_stronger', importance: 1 },
    ])
  })
})

describe('normalizeOtherActivities', () => {
  it('whitelists activities, clamps importance, dedupes, trims cadence', () => {
    const result = normalizeOtherActivities([
      { activity: 'cycling', importance: 4, cadence: '  2x/week  ' },
      { activity: 'cycling', importance: 2 }, // dup
      { activity: 'yoga', importance: 100 }, // clamp
      { activity: 'skydiving', importance: 3 }, // invalid
    ])
    expect(result).toEqual([
      { activity: 'cycling', importance: 4, cadence: '2x/week' },
      { activity: 'yoga', importance: 5 },
    ])
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
    expect(profile.bannedExerciseIds).toEqual([])
    expect(profile.defaultIntensityPreference).toBeNull()
    expect(profile.ratioTargets).toEqual(getDefaultMuscleBalanceTargets())
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
})
