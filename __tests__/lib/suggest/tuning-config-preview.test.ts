import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildTrainingStatePayload,
  type SuggestRequestInput,
} from '@/lib/suggest/training-state-builder'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import { DEFAULT_TUNING_CONFIG, type TuningConfig } from '@/lib/tuning/config'
import { TUNING_CONFIG_SINGLETON_ID } from '@/lib/tuning/store'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = new Date('2026-07-01T18:00:00.000Z')

const REQUEST: SuggestRequestInput = {
  time_budget_minutes: 45,
  intensity_vibe: 'solid',
  deprioritize_freetext: null,
  prioritize_freetext: null,
  equipment_override: null,
}

const SQUAT_FAU = 'quads'

/**
 * Seed a controlled squat-only history designed so the heaviness knobs are the
 * deciding signal: RPE is never logged (effort branch can't fire), the pattern
 * has ≥3 calibration observations (EWMA branch active), and the most recent
 * top set sits at ~93% of the movement EWMA. Sessions span >30d so some fall
 * outside the calibration window but inside the heavy-scan window.
 */
async function seedSquatHistory(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.exerciseDefinition.create({
    data: {
      id: `def-squat-${userId}`,
      name: 'Test Barbell Squat',
      normalizedName: `test barbell squat ${userId}`,
      aliases: [],
      userId: 'system-fixture',
      isSystem: true,
      equipment: ['barbell'],
      primaryFAUs: [SQUAT_FAU],
      secondaryFAUs: ['glutes'],
      movementPattern: 'squat',
      intensityClass: 'moderate',
      isBodyweight: false,
    },
  })

  await prisma.userTrainingProfile.create({
    data: {
      userId,
      goalSentences: ['Get stronger on squat'],
      weeklyIntent: [],
      equipmentAvailable: ['barbell'],
      bannedExerciseIds: [],
      ratioTargets: {},
      defaultIntensityPreference: null,
    },
  })

  // Older sessions at 225 lb, most recent at 200 lb; all 5 reps, no RPE.
  const plan: { daysAgo: number; weight: number }[] = [
    { daysAgo: 40, weight: 225 },
    { daysAgo: 33, weight: 225 },
    { daysAgo: 26, weight: 225 },
    { daysAgo: 19, weight: 225 },
    { daysAgo: 12, weight: 225 },
    { daysAgo: 2, weight: 200 },
  ]

  for (const s of plan) {
    const completedAt = new Date(NOW.getTime() - s.daysAgo * DAY_MS)
    const completion = await prisma.workoutCompletion.create({
      data: {
        userId,
        status: 'completed',
        isAdHoc: true,
        name: 'Squat Day',
        startedAt: new Date(completedAt.getTime() - 55 * 60 * 1000),
        completedAt,
      },
    })
    await prisma.exercise.create({
      data: {
        name: 'Test Barbell Squat',
        exerciseDefinitionId: `def-squat-${userId}`,
        order: 1,
        userId,
        workoutCompletionId: completion.id,
        loggedSets: {
          create: [1, 2, 3].map((setNumber) => ({
            setNumber,
            reps: 5,
            weight: s.weight,
            weightUnit: 'lbs',
            rpe: null,
            isWarmup: false,
            completionId: completion.id,
            userId,
            createdAt: completedAt,
          })),
        },
      },
    })
  }
}

describe('TuningConfig payload preview / plumbing', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    const user = await createTestUser()
    userId = user.id
    await seedSquatHistory(prisma, userId)
  })

  const build = (tuning?: TuningConfig) =>
    buildTrainingStatePayload(prisma, userId, REQUEST, NOW, tuning)

  it('with NO config row is byte-identical to explicit code defaults', async () => {
    const noRow = await build(undefined)
    const explicitDefaults = await build(DEFAULT_TUNING_CONFIG)

    expect(JSON.stringify(noRow.payload)).toBe(JSON.stringify(explicitDefaults.payload))
    expect(noRow.configStamp).toEqual(DEFAULT_TUNING_CONFIG)
  })

  it('a malformed config row never breaks the pipeline — falls back to defaults', async () => {
    const defaults = await build(DEFAULT_TUNING_CONFIG)

    await prisma.tuningConfig.create({
      data: {
        id: TUNING_CONFIG_SINGLETON_ID,
        // Garbage: wrong types, out of range, unknown keys, missing fields.
        values: { heavyE1rmFraction: 'heavy', ewmaAlpha: 999, bogus: true },
      },
    })

    const malformed = await build(undefined)
    expect(JSON.stringify(malformed.payload)).toBe(JSON.stringify(defaults.payload))
    expect(malformed.configStamp).toEqual(DEFAULT_TUNING_CONFIG)
  })

  it('a saved config row is loaded and stamped when no override is passed', async () => {
    const saved: TuningConfig = { ...DEFAULT_TUNING_CONFIG, lowDataMinSessions: 1, lowDataMinSets: 5 }
    await prisma.tuningConfig.create({
      data: { id: TUNING_CONFIG_SINGLETON_ID, values: { ...saved } },
    })

    const result = await build(undefined)
    expect(result.configStamp).toEqual(saved)
  })

  it('heavyE1rmFraction override provably changes the payload', async () => {
    const low = await build({ ...DEFAULT_TUNING_CONFIG, heavyE1rmFraction: 0.85 })
    const high = await build({ ...DEFAULT_TUNING_CONFIG, heavyE1rmFraction: 0.99 })

    // The whole payload must differ...
    expect(JSON.stringify(low.payload)).not.toBe(JSON.stringify(high.payload))

    // ...specifically per_fau.last_heavy_days_ago for the squat FAU: at 0.85 the
    // recent 200 lb session counts heavy (days_ago 2); at 0.99 only the earlier
    // 225 lb sessions do (a larger days_ago).
    const lowFau = low.payload.training_state.per_fau.find((f) => f.fau === SQUAT_FAU)
    const highFau = high.payload.training_state.per_fau.find((f) => f.fau === SQUAT_FAU)
    expect(lowFau?.last_heavy_days_ago).not.toBe(highFau?.last_heavy_days_ago)
    expect(lowFau?.last_heavy_days_ago).toBe(2)
    expect(highFau?.last_heavy_days_ago).toBeGreaterThan(2)
  })

  it('low-data thresholds override flips per_fau.low_data and the payload', async () => {
    // Default: only 2 sessions / 6 effective sets in 14d → low_data true.
    const strict = await build(DEFAULT_TUNING_CONFIG)
    // Relaxed thresholds clear the flag.
    const relaxed = await build({
      ...DEFAULT_TUNING_CONFIG,
      lowDataMinSessions: 1,
      lowDataMinSets: 5,
    })

    const strictFau = strict.payload.training_state.per_fau.find((f) => f.fau === SQUAT_FAU)
    const relaxedFau = relaxed.payload.training_state.per_fau.find((f) => f.fau === SQUAT_FAU)

    expect(strictFau?.low_data).toBe(true)
    expect(relaxedFau?.low_data).toBe(false)
    // low_data suppresses the status label; clearing it surfaces one.
    expect(strictFau?.status).toBeUndefined()
    expect(relaxedFau?.status).toBeDefined()
    expect(JSON.stringify(strict.payload)).not.toBe(JSON.stringify(relaxed.payload))
  })
})
