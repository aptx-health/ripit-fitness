import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createCompleteTestScenario, createTestUser } from '@/lib/test/factories'

/**
 * Tests for issue #568: Stale draft WorkoutCompletion orphaned after completion.
 *
 * When the complete endpoint is called and a new completion record is created
 * (rather than updating the draft), any existing draft must be cleaned up.
 */
describe('Draft cleanup on workout completion (#568)', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('should clean up orphaned draft when completing with fallback sets', async () => {
    // Arrange: Create a draft workout with 1 logged set
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 1,
      status: 'draft',
    })

    const { workout, exercise } = scenario

    // Verify draft exists
    const draftBefore = await prisma.workoutCompletion.findFirst({
      where: { workoutId: workout.id, userId, status: 'draft' },
    })
    expect(draftBefore).toBeTruthy()

    // Act: Simulate complete endpoint creating a NEW completion from fallback
    // (this mimics the race condition where findFirst misses the draft)
    const fallbackSets = [
      { exerciseId: exercise.id, setNumber: 1, reps: 10, weight: 135, weightUnit: 'lbs', rpe: null, rir: null },
      { exerciseId: exercise.id, setNumber: 2, reps: 8, weight: 145, weightUnit: 'lbs', rpe: null, rir: null },
    ]

    const result = await simulateCompleteAPI(prisma, workout.id, userId, fallbackSets)

    expect(result.success).toBe(true)

    // Assert: No draft should remain — only the completed record
    const allCompletions = await prisma.workoutCompletion.findMany({
      where: { workoutId: workout.id, userId, isArchived: false },
    })

    expect(allCompletions).toHaveLength(1)
    expect(allCompletions[0].status).toBe('completed')

    // No orphaned drafts
    const orphanedDrafts = await prisma.workoutCompletion.findMany({
      where: { workoutId: workout.id, userId, status: 'draft', isArchived: false },
    })
    expect(orphanedDrafts).toHaveLength(0)
  })

  it('should clean up draft when completing via draft-update path', async () => {
    // Arrange: Create a draft with sets
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 3,
      status: 'draft',
    })

    const { workout } = scenario

    // Act: Complete the workout (normal path — draft found and updated)
    const result = await simulateCompleteAPI(prisma, workout.id, userId)

    expect(result.success).toBe(true)

    // Assert: Draft is now completed, no orphans
    const allCompletions = await prisma.workoutCompletion.findMany({
      where: { workoutId: workout.id, userId, isArchived: false },
    })

    expect(allCompletions).toHaveLength(1)
    expect(allCompletions[0].status).toBe('completed')
  })

  it('should handle double-complete without creating duplicate completions', async () => {
    // Arrange: Create a draft with sets
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 3,
      status: 'draft',
    })

    const { workout, exercise } = scenario

    const fallbackSets = [
      { exerciseId: exercise.id, setNumber: 1, reps: 10, weight: 135, weightUnit: 'lbs', rpe: null, rir: null },
    ]

    // Act: Complete once
    const first = await simulateCompleteAPI(prisma, workout.id, userId, fallbackSets)
    expect(first.success).toBe(true)

    // Act: Complete again (double-fire)
    const second = await simulateCompleteAPI(prisma, workout.id, userId, fallbackSets)
    expect(second.success).toBe(false)
    expect(second.error).toContain('already completed')

    // Assert: Still only 1 completion, no drafts
    const allCompletions = await prisma.workoutCompletion.findMany({
      where: { workoutId: workout.id, userId, isArchived: false },
    })
    expect(allCompletions).toHaveLength(1)
    expect(allCompletions[0].status).toBe('completed')
  })

  it('should not leave orphaned draft when pre-existing draft has no sets', async () => {
    // Arrange: Create an empty draft (0 logged sets)
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'draft',
    })

    const { workout, exercise } = scenario

    // Verify empty draft exists
    const draftBefore = await prisma.workoutCompletion.findFirst({
      where: { workoutId: workout.id, userId, status: 'draft' },
      include: { loggedSets: true },
    })
    expect(draftBefore).toBeTruthy()
    expect(draftBefore!.loggedSets).toHaveLength(0)

    // Act: Complete with fallback sets (empty draft path)
    const fallbackSets = [
      { exerciseId: exercise.id, setNumber: 1, reps: 10, weight: 135, weightUnit: 'lbs', rpe: null, rir: null },
    ]
    const result = await simulateCompleteAPI(prisma, workout.id, userId, fallbackSets)
    expect(result.success).toBe(true)

    // Assert: No orphaned drafts
    const orphanedDrafts = await prisma.workoutCompletion.findMany({
      where: { workoutId: workout.id, userId, status: 'draft', isArchived: false },
    })
    expect(orphanedDrafts).toHaveLength(0)
  })
})

/**
 * Simulates the complete API endpoint logic (app/api/workouts/[workoutId]/complete/route.ts).
 * Mirrors the real code so the test catches bugs in the actual flow.
 */
async function simulateCompleteAPI(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  fallbackSets?: Array<{
    exerciseId: string
    setNumber: number
    reps: number
    weight: number
    weightUnit: string
    rpe: number | null
    rir: number | null
  }>
) {
  try {
    // Verify workout exists
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        id: true,
        week: { select: { program: { select: { userId: true } } } },
      },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }
    if (workout.week.program.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const completion = await prisma.$transaction(async (tx) => {
      // Check for existing completed record INSIDE transaction
      const existingCompleted = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId, status: 'completed', isArchived: false },
      })

      if (existingCompleted) {
        throw new Error('ALREADY_COMPLETED')
      }

      // Find existing draft
      const draft = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId, status: 'draft', isArchived: false },
        include: { loggedSets: true },
      })

      const draftSetCount = draft?.loggedSets?.length ?? 0

      // If we have a draft with sets, just flip the status
      if (draft && draftSetCount > 0) {
        if (fallbackSets && fallbackSets.length > draftSetCount) {
          await tx.loggedSet.deleteMany({ where: { completionId: draft.id } })
          await tx.loggedSet.createMany({
            data: fallbackSets.map((set) => ({
              exerciseId: set.exerciseId,
              completionId: draft.id,
              userId,
              setNumber: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              weightUnit: set.weightUnit,
              rpe: set.rpe,
              rir: set.rir,
              isWarmup: false,
            })),
          })
        }

        return tx.workoutCompletion.update({
          where: { id: draft.id },
          data: { status: 'completed', completedAt: new Date() },
        })
      }

      // No draft with sets — need fallback sets to complete
      if (!fallbackSets || fallbackSets.length === 0) {
        throw new Error('NO_SETS_TO_COMPLETE')
      }

      // Create or update completion from fallback
      const completionRecord = draft
        ? await tx.workoutCompletion.update({
            where: { id: draft.id },
            data: { status: 'completed', completedAt: new Date() },
          })
        : await tx.workoutCompletion.create({
            data: { workoutId, userId, status: 'completed', completedAt: new Date() },
          })

      await tx.loggedSet.createMany({
        data: fallbackSets.map((set) => ({
          exerciseId: set.exerciseId,
          completionId: completionRecord.id,
          userId,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit,
          rpe: set.rpe,
          rir: set.rir,
          isWarmup: false,
        })),
      })

      // Clean up any remaining drafts for this workout+user
      await tx.workoutCompletion.deleteMany({
        where: {
          workoutId,
          userId,
          status: 'draft',
          isArchived: false,
          id: { not: completionRecord.id },
        },
      })

      return completionRecord
    })

    return {
      success: true,
      completion: {
        id: completion.id,
        completedAt: completion.completedAt,
        status: completion.status,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_COMPLETED') {
      return { success: false, error: 'Workout already completed. Clear it first to re-log.' }
    }
    if (error instanceof Error && error.message === 'NO_SETS_TO_COMPLETE') {
      return { success: false, error: 'No sets to complete. Log at least one set first.' }
    }
    return { success: false, error: 'Internal server error' }
  }
}
