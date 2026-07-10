import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  type CompletionForBalance,
  calculateMuscleBalanceSnapshot,
  getDefaultMuscleBalanceTargets,
  getMuscleBalanceSnapshot,
  normalizeMuscleBalanceSettings,
} from '@/lib/muscle-balance'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

describe('Muscle balance calculations', () => {
  it('applies warmup exclusion and secondary set weighting', () => {
    const settings = normalizeMuscleBalanceSettings({
      targets: getDefaultMuscleBalanceTargets(),
      lookbackWorkouts: 8,
      includeSecondary: true,
      secondaryWeight: 0.5,
      excludeWarmups: true,
    })

    const snapshot = calculateMuscleBalanceSnapshot(settings, [
      {
        loggedSets: [
          {
            isWarmup: false,
            exercise: {
              exerciseDefinition: {
                primaryFAUs: ['chest'],
                secondaryFAUs: ['triceps'],
              },
            },
          },
          {
            isWarmup: true,
            exercise: {
              exerciseDefinition: {
                primaryFAUs: ['chest'],
                secondaryFAUs: ['triceps'],
              },
            },
          },
        ],
      },
    ])

    expect(snapshot.items.find((item) => item.fau === 'chest')?.actualSets).toBe(1)
    expect(snapshot.items.find((item) => item.fau === 'triceps')?.actualSets).toBe(0.5)
    expect(snapshot.lookback.totalEffectiveSets).toBe(1.5)
  })
})

describe('Muscle balance v2 (time window + recency blend)', () => {
  const settings = normalizeMuscleBalanceSettings({
    targets: getDefaultMuscleBalanceTargets(),
    lookbackWorkouts: 8,
    lookbackDays: 14,
    includeSecondary: true,
    secondaryWeight: 0.5,
    excludeWarmups: true,
  })
  const now = new Date('2026-07-10T00:00:00Z')

  function makeCompletion(
    primaryFAUs: string[],
    setCount: number,
    completedAt: Date
  ): CompletionForBalance {
    return {
      completedAt,
      loggedSets: Array.from({ length: setCount }, () => ({
        isWarmup: false,
        exercise: {
          exerciseDefinition: { primaryFAUs, secondaryFAUs: [] as string[] },
        },
      })),
    }
  }

  function daysAgo(days: number): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  }

  it('(a) time window beats workout count on a gap-heavy history', () => {
    // Chest was the most recent trained FAU by *workout count*, but it falls
    // outside the 14-day window; side-delts is the only in-window training.
    const snapshot = calculateMuscleBalanceSnapshot(
      settings,
      [
        makeCompletion(['side-delts'], 5, daysAgo(2)),
        makeCompletion(['chest'], 5, daysAgo(20)),
      ],
      now
    )

    const chest = snapshot.items.find((item) => item.fau === 'chest')
    const sideDelts = snapshot.items.find((item) => item.fau === 'side-delts')

    // Chest is excluded by the time window even though it is recent by count.
    expect(chest?.actualSets).toBe(0)
    expect(chest?.lastTrainedDaysAgo).toBeNull()
    expect(chest?.recencyScore).toBe(1)
    expect(chest?.status).toBe('neglected')

    // Side-delts is the only in-window volume, so it is not neglected.
    expect(sideDelts?.actualSets).toBe(5)
    expect(sideDelts?.status).not.toBe('neglected')

    // Chest outranks side-delts in the neglected ordering.
    const chestIndex = snapshot.items.findIndex((item) => item.fau === 'chest')
    const sideDeltIndex = snapshot.items.findIndex((item) => item.fau === 'side-delts')
    expect(chestIndex).toBeLessThan(sideDeltIndex)
  })

  it('(b) recency reorders FAUs with equal deficits', () => {
    // Biceps and triceps get identical in-window volume => identical deficit.
    // Biceps was trained longer ago, so it should rank ahead of triceps.
    const snapshot = calculateMuscleBalanceSnapshot(
      settings,
      [
        makeCompletion(['biceps'], 3, daysAgo(10)),
        makeCompletion(['triceps'], 3, daysAgo(2)),
      ],
      now
    )

    const biceps = snapshot.items.find((item) => item.fau === 'biceps')
    const triceps = snapshot.items.find((item) => item.fau === 'triceps')

    expect(biceps?.actualSets).toBe(3)
    expect(triceps?.actualSets).toBe(3)
    expect(biceps?.deficitShare).toBeCloseTo(triceps?.deficitShare ?? Number.NaN, 10)
    expect(biceps?.recencyScore).toBeGreaterThan(triceps?.recencyScore ?? 0)

    const bicepsIndex = snapshot.items.findIndex((item) => item.fau === 'biceps')
    const tricepsIndex = snapshot.items.findIndex((item) => item.fau === 'triceps')
    expect(bicepsIndex).toBeLessThan(tricepsIndex)
  })

  it('(c) zero-history user gets stable, neutral output', () => {
    const first = calculateMuscleBalanceSnapshot(settings, [], now)
    const second = calculateMuscleBalanceSnapshot(settings, [], now)

    expect(first.items).toHaveLength(18)
    expect(first.lookback.totalEffectiveSets).toBe(0)

    for (const item of first.items) {
      expect(item.lastTrainedDaysAgo).toBeNull()
      expect(item.recencyScore).toBe(1)
      expect(Number.isNaN(item.deficitShare)).toBe(false)
      expect(Number.isNaN(item.recencyScore)).toBe(false)
    }

    // All deficits are equal, so ordering is deterministic across runs.
    expect(first.items.map((item) => item.fau)).toEqual(
      second.items.map((item) => item.fau)
    )
  })
})

describe('Muscle balance persistence', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('creates default settings and includes every FAU in the snapshot', async () => {
    const snapshot = await getMuscleBalanceSnapshot(prisma, userId)

    expect(snapshot.settings.lookbackWorkouts).toBe(8)
    expect(snapshot.items).toHaveLength(18)
    expect(snapshot.items.find((item) => item.fau === 'side-delts')).toBeTruthy()
    expect(snapshot.items.some((item) => String(item.fau) === 'neck')).toBe(false)
  })

  it('counts only completed strength workouts inside the days window', async () => {
    const chestDefinition = await createTestExerciseDefinition(prisma, {
      name: `Chest Press ${Date.now()}`,
      primaryFAUs: ['chest'],
      secondaryFAUs: ['triceps'],
    })
    const sideDeltDefinition = await createTestExerciseDefinition(prisma, {
      name: `Lateral Raise ${Date.now()}`,
      primaryFAUs: ['side-delts'],
      secondaryFAUs: [],
    })

    await prisma.userMuscleBalanceSettings.create({
      data: {
        userId,
        targets: getDefaultMuscleBalanceTargets(),
        lookbackWorkouts: 8,
        lookbackDays: 14,
        includeSecondary: true,
        secondaryWeight: 0.5,
        excludeWarmups: true,
      },
    })

    const now = Date.now()
    const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000)

    // Chest trained 20 days ago -> outside the 14-day window.
    await createCompletedWorkout(prisma, userId, chestDefinition.id, 4, {
      completedAt: daysAgo(20),
    })
    // Side-delts trained 3 days ago -> inside the window.
    await createCompletedWorkout(prisma, userId, sideDeltDefinition.id, 4, {
      completedAt: daysAgo(3),
    })
    // Draft workout is ignored regardless of recency.
    await createCompletedWorkout(prisma, userId, sideDeltDefinition.id, 10, {
      completedAt: daysAgo(1),
      status: 'draft',
    })

    const snapshot = await getMuscleBalanceSnapshot(prisma, userId)
    const chest = snapshot.items.find((item) => item.fau === 'chest')
    const sideDelts = snapshot.items.find((item) => item.fau === 'side-delts')

    expect(snapshot.lookback.windowDays).toBe(14)
    expect(snapshot.lookback.completedWorkouts).toBe(1)
    expect(chest?.actualSets).toBe(0)
    expect(chest?.status).toBe('neglected')
    expect(sideDelts?.actualSets).toBe(4)
    expect(sideDelts?.lastTrainedDaysAgo).toBe(3)
  })

})

async function createCompletedWorkout(
  prisma: PrismaClient,
  userId: string,
  exerciseDefinitionId: string,
  setCount: number,
  options: {
    completedAt: Date
    status?: 'completed' | 'draft'
  }
) {
  const completion = await prisma.workoutCompletion.create({
    data: {
      userId,
      status: options.status ?? 'completed',
      isAdHoc: true,
      completedAt: options.completedAt,
      startedAt: options.completedAt,
      name: 'Test Workout',
    },
  })
  const definition = await prisma.exerciseDefinition.findUniqueOrThrow({
    where: { id: exerciseDefinitionId },
  })
  const exercise = await prisma.exercise.create({
    data: {
      userId,
      name: definition.name,
      order: 1,
      exerciseDefinitionId,
      workoutCompletionId: completion.id,
      isOneOff: true,
    },
  })

  for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
    await prisma.loggedSet.create({
      data: {
        userId,
        completionId: completion.id,
        exerciseId: exercise.id,
        setNumber,
        reps: 10,
        weight: 50,
        weightUnit: 'lbs',
      },
    })
  }
}
