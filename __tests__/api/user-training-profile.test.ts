import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDefaultMuscleBalanceTargets } from '@/lib/muscle-balance'
import {
  getOrCreateUserTrainingProfile,
  normalizeUserTrainingProfile,
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
