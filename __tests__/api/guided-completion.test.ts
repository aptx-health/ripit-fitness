import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createCompleteTestScenario, createTestUser } from '@/lib/test/factories'

/**
 * Simulates the workout complete API with guidedCompletion support.
 * Mirrors the logic in app/api/workouts/[workoutId]/complete/route.ts
 */
async function simulateCompleteAPI(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  options: {
    fallbackSets?: Array<{
      exerciseId: string
      setNumber: number
      reps: number
      weight: number
      weightUnit: string
      rpe: number | null
      rir: number | null
    }>
    guidedCompletion?: boolean
  } = {}
) {
  const { fallbackSets, guidedCompletion } = options

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      id: true,
      week: { select: { program: { select: { userId: true } } } },
    },
  })

  if (!workout) return { success: false, error: 'Workout not found' }
  if (workout.week.program.userId !== userId) return { success: false, error: 'Unauthorized' }

  try {
    const completion = await prisma.$transaction(async (tx) => {
      const existingCompleted = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId, status: 'completed', isArchived: false },
      })
      if (existingCompleted) throw new Error('ALREADY_COMPLETED')

      const draft = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId, status: 'draft', isArchived: false },
        include: { loggedSets: true },
      })

      const draftSetCount = draft?.loggedSets?.length ?? 0

      if (draft && draftSetCount > 0) {
        return tx.workoutCompletion.update({
          where: { id: draft.id },
          data: { status: 'completed', completedAt: new Date() },
        })
      }

      // Guided completion — allow zero-set completion
      if (guidedCompletion) {
        const completionRecord = draft
          ? await tx.workoutCompletion.update({
              where: { id: draft.id },
              data: { status: 'completed', completedAt: new Date() },
            })
          : await tx.workoutCompletion.create({
              data: { workoutId, userId, status: 'completed', completedAt: new Date() },
            })
        return completionRecord
      }

      if (!fallbackSets || fallbackSets.length === 0) {
        throw new Error('NO_SETS_TO_COMPLETE')
      }

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

      return completionRecord
    })

    return { success: true, completion }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Unknown error' }
  }
}

describe('Guided Completion (Follow Along Mode)', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('should complete a workout with zero logged sets when guidedCompletion is true', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'draft',
    })

    const result = await simulateCompleteAPI(prisma, scenario.workout.id, userId, {
      guidedCompletion: true,
    })

    expect(result.success).toBe(true)
    expect(result.completion).toBeDefined()
    expect(result.completion!.status).toBe('completed')
    expect(result.completion!.completedAt).toBeDefined()

    // Verify no logged sets exist
    const sets = await prisma.loggedSet.findMany({
      where: { completionId: result.completion!.id },
    })
    expect(sets).toHaveLength(0)
  })

  it('should reject zero-set completion without guidedCompletion flag', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'draft',
    })

    const result = await simulateCompleteAPI(prisma, scenario.workout.id, userId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('NO_SETS_TO_COMPLETE')
  })

  it('should create a new completion record if no draft exists', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
    })

    // Delete any draft that was created
    await prisma.workoutCompletion.deleteMany({
      where: { workoutId: scenario.workout.id },
    })

    const result = await simulateCompleteAPI(prisma, scenario.workout.id, userId, {
      guidedCompletion: true,
    })

    expect(result.success).toBe(true)
    expect(result.completion!.status).toBe('completed')

    // Verify exactly one completion record exists
    const completions = await prisma.workoutCompletion.findMany({
      where: { workoutId: scenario.workout.id, userId },
    })
    expect(completions).toHaveLength(1)
    expect(completions[0].status).toBe('completed')
  })

  it('should flip existing empty draft to completed with guidedCompletion', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'draft',
    })

    const draft = await prisma.workoutCompletion.findFirst({
      where: { workoutId: scenario.workout.id, userId, status: 'draft' },
    })
    expect(draft).toBeDefined()

    const result = await simulateCompleteAPI(prisma, scenario.workout.id, userId, {
      guidedCompletion: true,
    })

    expect(result.success).toBe(true)
    expect(result.completion!.id).toBe(draft!.id) // Same record, flipped status
    expect(result.completion!.status).toBe('completed')
  })

  it('should not allow guided completion on already-completed workout', async () => {
    const scenario = await createCompleteTestScenario(prisma, userId, {
      loggedSetCount: 0,
      status: 'draft',
    })

    // First guided completion
    await simulateCompleteAPI(prisma, scenario.workout.id, userId, {
      guidedCompletion: true,
    })

    // Second attempt
    const result = await simulateCompleteAPI(prisma, scenario.workout.id, userId, {
      guidedCompletion: true,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('ALREADY_COMPLETED')
  })
})
