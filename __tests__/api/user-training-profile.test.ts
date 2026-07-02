import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
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
  normalizeUserTrainingProfile,
  updateUserTrainingProfile,
} from '@/lib/user-training-profile'

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
    expect(result.weeklyIntent).toEqual(['1 heavy leg day'])
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
