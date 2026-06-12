import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import {
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

  it('uses the last N completed strength workouts', async () => {
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
        lookbackWorkouts: 1,
        includeSecondary: true,
        secondaryWeight: 0.5,
        excludeWarmups: true,
      },
    })

    await createCompletedWorkout(prisma, userId, sideDeltDefinition.id, 4, {
      completedAt: new Date('2026-01-01T00:00:00Z'),
    })
    await createCompletedWorkout(prisma, userId, chestDefinition.id, 4, {
      completedAt: new Date('2026-01-02T00:00:00Z'),
    })
    await createCompletedWorkout(prisma, userId, sideDeltDefinition.id, 10, {
      completedAt: new Date('2026-01-03T00:00:00Z'),
      status: 'draft',
    })

    const snapshot = await getMuscleBalanceSnapshot(prisma, userId)
    const chest = snapshot.items.find((item) => item.fau === 'chest')
    const sideDelts = snapshot.items.find((item) => item.fau === 'side-delts')

    expect(snapshot.lookback.completedWorkouts).toBe(1)
    expect(chest?.actualSets).toBe(4)
    expect(sideDelts?.actualSets).toBe(0)
    expect(sideDelts?.status).toBe('neglected')
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
