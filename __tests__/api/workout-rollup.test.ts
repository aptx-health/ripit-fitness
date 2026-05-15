import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createCompleteTestScenario,
  createTestUser,
  createTestWorkoutCompletion,
} from '@/lib/test/factories'
import { computeWorkoutRollup } from '@/lib/stats/workout-rollup'

async function addLoggedSets(
  prisma: PrismaClient,
  completionId: string,
  exerciseId: string,
  userId: string,
  sets: Array<{ setNumber: number; reps: number; weight: number; isWarmup?: boolean }>
) {
  await prisma.loggedSet.createMany({
    data: sets.map((s) => ({
      completionId,
      exerciseId,
      userId,
      setNumber: s.setNumber,
      reps: s.reps,
      weight: s.weight,
      weightUnit: 'lbs',
      isWarmup: s.isWarmup ?? false,
    })),
  })
}

describe('computeWorkoutRollup', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    const user = await createTestUser()
    userId = user.id
  })

  it('returns null for unknown completion', async () => {
    const result = await computeWorkoutRollup(prisma, 'does-not-exist', userId)
    expect(result).toBeNull()
  })

  it('returns null for completion owned by a different user', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })
    const other = await createTestUser()
    const result = await computeWorkoutRollup(prisma, scenario.completion.id, other.id)
    expect(result).toBeNull()
  })

  it('excludes warmup sets from totals', async () => {
    const { completion, exercise } = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })

    await addLoggedSets(prisma, completion.id, exercise.id, userId, [
      { setNumber: 1, reps: 10, weight: 45, isWarmup: true },
      { setNumber: 2, reps: 5, weight: 185 },
      { setNumber: 3, reps: 5, weight: 185 },
    ])

    const rollup = await computeWorkoutRollup(prisma, completion.id, userId)
    expect(rollup).not.toBeNull()
    expect(rollup!.workingSetCount).toBe(2)
    expect(rollup!.totalReps).toBe(10)
    expect(rollup!.totalVolumeLbs).toBe(1850)
    expect(rollup!.exerciseCount).toBe(1)
    expect(rollup!.isMinimal).toBe(false)
  })

  it('returns minimal rollup when all sets are warmups (no working sets)', async () => {
    const { completion, exercise } = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })
    await addLoggedSets(prisma, completion.id, exercise.id, userId, [
      { setNumber: 1, reps: 10, weight: 45, isWarmup: true },
    ])

    const rollup = await computeWorkoutRollup(prisma, completion.id, userId)
    expect(rollup!.isMinimal).toBe(true)
    expect(rollup!.workingSetCount).toBe(0)
    expect(rollup!.exercises).toHaveLength(0)
    expect(rollup!.lifetimeWorkoutCount).toBeGreaterThanOrEqual(1)
  })

  it('returns minimal rollup with zero sets (Follow Along)', async () => {
    const { completion } = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })
    const rollup = await computeWorkoutRollup(prisma, completion.id, userId)
    expect(rollup!.isMinimal).toBe(true)
    expect(rollup!.workingSetCount).toBe(0)
  })

  it('handles bodyweight exercises (weight=0) without dragging volume down', async () => {
    const { completion, exercise } = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })

    await addLoggedSets(prisma, completion.id, exercise.id, userId, [
      { setNumber: 1, reps: 12, weight: 0 },
      { setNumber: 2, reps: 10, weight: 0 },
      { setNumber: 3, reps: 8, weight: 0 },
    ])

    const rollup = await computeWorkoutRollup(prisma, completion.id, userId)
    expect(rollup!.exercises).toHaveLength(1)
    expect(rollup!.exercises[0].isBodyweight).toBe(true)
    expect(rollup!.exercises[0].volumeLbs).toBe(0)
    expect(rollup!.exercises[0].reps).toBe(30)
    expect(rollup!.totalVolumeLbs).toBe(0)
    expect(rollup!.totalReps).toBe(30)
    expect(rollup!.hasBodyweightOnlyExercises).toBe(true)
  })

  it('computes duration from startedAt/completedAt', async () => {
    const { completion } = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })
    const startedAt = new Date(completion.completedAt.getTime() - 45 * 60 * 1000)
    await prisma.workoutCompletion.update({
      where: { id: completion.id },
      data: { startedAt },
    })

    const rollup = await computeWorkoutRollup(prisma, completion.id, userId)
    expect(rollup!.durationSeconds).toBe(45 * 60)
  })

  it('returns null duration when startedAt is missing', async () => {
    const { completion } = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })
    const rollup = await computeWorkoutRollup(prisma, completion.id, userId)
    expect(rollup!.durationSeconds).toBeNull()
  })

  it('counts lifetime workouts and last-7-day workouts', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })

    // 2 older completions outside 7-day window
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    for (let i = 0; i < 2; i++) {
      const c = await createTestWorkoutCompletion(
        prisma,
        scenario.workout.id,
        userId,
        'completed'
      )
      await prisma.workoutCompletion.update({
        where: { id: c.id },
        data: { completedAt: oldDate },
      })
    }

    // 1 recent completion inside 7-day window (other than the scenario one)
    await createTestWorkoutCompletion(prisma, scenario.workout.id, userId, 'completed')

    const rollup = await computeWorkoutRollup(prisma, scenario.completion.id, userId)
    expect(rollup!.lifetimeWorkoutCount).toBe(4)
    expect(rollup!.workoutsLast7Days).toBe(2)
  })

  it('surfaces vs-last-time per exercise', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'completed',
    })

    // Previous completion: same exercise, lower volume
    const previous = await createTestWorkoutCompletion(
      prisma,
      scenario.workout.id,
      userId,
      'completed'
    )
    const previousDate = new Date(scenario.completion.completedAt.getTime() - 7 * 24 * 60 * 60 * 1000)
    await prisma.workoutCompletion.update({
      where: { id: previous.id },
      data: { completedAt: previousDate },
    })
    await addLoggedSets(prisma, previous.id, scenario.exercise.id, userId, [
      { setNumber: 1, reps: 5, weight: 135 },
      { setNumber: 2, reps: 5, weight: 135 },
    ])

    // Current completion: higher volume
    await addLoggedSets(prisma, scenario.completion.id, scenario.exercise.id, userId, [
      { setNumber: 1, reps: 5, weight: 155 },
      { setNumber: 2, reps: 5, weight: 155 },
    ])

    const rollup = await computeWorkoutRollup(prisma, scenario.completion.id, userId)
    const ex = rollup!.exercises[0]
    expect(ex.vsLastTime).not.toBeNull()
    expect(ex.vsLastTime!.previousVolumeLbs).toBe(1350)
    expect(ex.vsLastTime!.previousTopSet).toEqual({ weight: 135, reps: 5 })
    expect(ex.topSet).toEqual({ weight: 155, reps: 5 })
  })
})
