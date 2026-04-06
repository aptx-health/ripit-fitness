import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createMultiWeekProgram,
  createTestUser,
  createTestWorkoutCompletion,
} from '@/lib/test/factories'

/**
 * Simulates GET /api/programs/[programId]/workout-history
 * Checks for non-archived WorkoutCompletion records on a program
 */
async function simulateWorkoutHistoryCheck(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<{ hasHistory: boolean; completionCount: number }> {
  const completionCount = await prisma.workoutCompletion.count({
    where: {
      workout: {
        week: {
          programId,
        },
      },
      userId,
      isArchived: false,
    },
  })

  return {
    hasHistory: completionCount > 0,
    completionCount,
  }
}

describe('Workout History Check', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('should return no history for a fresh program', async () => {
    const { program } = await createMultiWeekProgram(prisma, userId, {
      weekCount: 2,
      workoutsPerWeek: 3,
    })

    const result = await simulateWorkoutHistoryCheck(prisma, program.id, userId)

    expect(result.hasHistory).toBe(false)
    expect(result.completionCount).toBe(0)
  })

  it('should return history when program has completed workouts', async () => {
    const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
      weekCount: 1,
      workoutsPerWeek: 3,
    })

    await createTestWorkoutCompletion(prisma, workouts[0].id, userId, 'completed')
    await createTestWorkoutCompletion(prisma, workouts[1].id, userId, 'completed')

    const result = await simulateWorkoutHistoryCheck(prisma, program.id, userId)

    expect(result.hasHistory).toBe(true)
    expect(result.completionCount).toBe(2)
  })

  it('should not count archived completions', async () => {
    const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
      weekCount: 1,
      workoutsPerWeek: 3,
    })

    // Create a completion and then archive it (simulating a restart)
    const completion = await createTestWorkoutCompletion(
      prisma,
      workouts[0].id,
      userId,
      'completed'
    )
    await prisma.workoutCompletion.update({
      where: { id: completion.id },
      data: { isArchived: true },
    })

    const result = await simulateWorkoutHistoryCheck(prisma, program.id, userId)

    expect(result.hasHistory).toBe(false)
    expect(result.completionCount).toBe(0)
  })

  it('should count non-archived completions even when archived ones exist', async () => {
    const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
      weekCount: 1,
      workoutsPerWeek: 3,
    })

    // Create an archived completion (from a previous cycle)
    const archivedCompletion = await createTestWorkoutCompletion(
      prisma,
      workouts[0].id,
      userId,
      'completed'
    )
    await prisma.workoutCompletion.update({
      where: { id: archivedCompletion.id },
      data: { isArchived: true },
    })

    // Create a current (non-archived) completion
    await createTestWorkoutCompletion(prisma, workouts[1].id, userId, 'completed')

    const result = await simulateWorkoutHistoryCheck(prisma, program.id, userId)

    expect(result.hasHistory).toBe(true)
    expect(result.completionCount).toBe(1)
  })

  it('should not count completions from other users', async () => {
    const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
      weekCount: 1,
      workoutsPerWeek: 3,
    })

    // Create a completion for our user
    await createTestWorkoutCompletion(prisma, workouts[0].id, userId, 'completed')

    // Query as a different user — should see nothing
    const otherUserId = 'other-user-id'
    const result = await simulateWorkoutHistoryCheck(prisma, program.id, otherUserId)

    expect(result.hasHistory).toBe(false)
    expect(result.completionCount).toBe(0)
  })

  it('should count draft completions as history', async () => {
    const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
      weekCount: 1,
      workoutsPerWeek: 2,
    })

    // A draft completion means the user started but didn't finish
    await createTestWorkoutCompletion(prisma, workouts[0].id, userId, 'draft')

    const result = await simulateWorkoutHistoryCheck(prisma, program.id, userId)

    expect(result.hasHistory).toBe(true)
    expect(result.completionCount).toBe(1)
  })
})
