import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createCompleteTestScenario, createTestUser } from '@/lib/test/factories'

describe('Draft Timer Persistence', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('startedAt field', () => {
    it('should set startedAt when creating a new draft', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 0,
        status: 'draft'
      })
      const { workout, exercise } = scenario

      // Delete auto-created completion to test fresh creation
      await prisma.workoutCompletion.deleteMany({
        where: { workoutId: workout.id }
      })

      const before = new Date()

      // Simulate creating a new draft
      const result = await simulateDraftSave(prisma, workout.id, userId, [
        {
          exerciseId: exercise.id,
          setNumber: 1,
          reps: 10,
          weight: 135,
          weightUnit: 'lbs',
          rpe: null,
          rir: null,
        }
      ])

      expect(result.success).toBe(true)

      const completion = await prisma.workoutCompletion.findFirst({
        where: { workoutId: workout.id, userId }
      })

      expect(completion?.startedAt).toBeTruthy()
      expect(new Date(completion!.startedAt!).getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('should NOT overwrite startedAt when updating an existing draft', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 0,
        status: 'draft'
      })
      const { workout, exercise } = scenario

      // Delete and recreate with a known startedAt
      await prisma.workoutCompletion.deleteMany({
        where: { workoutId: workout.id }
      })

      const originalStartedAt = new Date('2026-05-01T10:00:00Z')
      await prisma.workoutCompletion.create({
        data: {
          workoutId: workout.id,
          userId,
          status: 'draft',
          startedAt: originalStartedAt,
          completedAt: new Date(),
        }
      })

      // Simulate updating the draft with new sets
      const result = await simulateDraftSave(prisma, workout.id, userId, [
        {
          exerciseId: exercise.id,
          setNumber: 1,
          reps: 12,
          weight: 145,
          weightUnit: 'lbs',
          rpe: null,
          rir: null,
        }
      ])

      expect(result.success).toBe(true)

      const completion = await prisma.workoutCompletion.findFirst({
        where: { workoutId: workout.id, userId }
      })

      // startedAt should remain unchanged
      expect(completion?.startedAt?.toISOString()).toBe(originalStartedAt.toISOString())
    })

    it('should return startedAt in GET draft response', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 2,
        status: 'draft'
      })
      const { workout } = scenario

      const knownStart = new Date('2026-05-01T14:30:00Z')
      await prisma.workoutCompletion.updateMany({
        where: { workoutId: workout.id, userId },
        data: { startedAt: knownStart }
      })

      const response = await simulateDraftGet(prisma, workout.id, userId)

      expect(response.success).toBe(true)
      expect(response.draft).toBeTruthy()
      expect(response.draft!.startedAt).toBe(knownStart.toISOString())
    })

    it('should return null startedAt for drafts created before migration', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 1,
        status: 'draft'
      })
      const { workout } = scenario

      // Simulate pre-migration draft (no startedAt)
      await prisma.workoutCompletion.updateMany({
        where: { workoutId: workout.id, userId },
        data: { startedAt: null }
      })

      const response = await simulateDraftGet(prisma, workout.id, userId)

      expect(response.success).toBe(true)
      expect(response.draft!.startedAt).toBeNull()
    })
  })
})

/**
 * Simulates the POST /api/workouts/[workoutId]/draft logic
 */
async function simulateDraftSave(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  loggedSets: Array<{
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
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: { week: { include: { program: true } } },
    })

    if (!workout || workout.week.program.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const existingCompleted = await prisma.workoutCompletion.findFirst({
      where: { workoutId, userId, status: 'completed', isArchived: false },
    })

    if (existingCompleted) {
      return { success: false, error: 'Workout already completed' }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingDraft = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId, status: 'draft', isArchived: false },
        include: { loggedSets: true }
      })

      const draftCompletion = existingDraft
        ? await tx.workoutCompletion.update({
            where: { id: existingDraft.id },
            data: { completedAt: new Date() }
          })
        : await tx.workoutCompletion.create({
            data: {
              workoutId,
              userId,
              status: 'draft',
              startedAt: new Date(),
              completedAt: new Date(),
            },
          })

      await tx.loggedSet.deleteMany({
        where: { completionId: draftCompletion.id },
      })

      if (loggedSets.length > 0) {
        await tx.loggedSet.createMany({
          data: loggedSets.map((set) => ({
            exerciseId: set.exerciseId,
            completionId: draftCompletion.id,
            userId,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            weightUnit: set.weightUnit,
            rpe: set.rpe,
            rir: set.rir,
          })),
        })
      }

      return draftCompletion
    })

    return {
      success: true,
      draft: {
        id: result.id,
        startedAt: result.startedAt,
        setsCount: loggedSets.length,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Simulates the GET /api/workouts/[workoutId]/draft logic
 */
async function simulateDraftGet(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
) {
  const draftCompletion = await prisma.workoutCompletion.findFirst({
    where: { workoutId, userId, status: 'draft', isArchived: false },
    include: {
      loggedSets: {
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }]
      }
    }
  })

  if (!draftCompletion) {
    return { success: true, draft: null }
  }

  return {
    success: true,
    draft: {
      id: draftCompletion.id,
      lastUpdated: draftCompletion.completedAt.toISOString(),
      startedAt: draftCompletion.startedAt?.toISOString() ?? null,
      status: draftCompletion.status,
      loggedSets: draftCompletion.loggedSets,
      setsCount: draftCompletion.loggedSets.length,
    },
  }
}
