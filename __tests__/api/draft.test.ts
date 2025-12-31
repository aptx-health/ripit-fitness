import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser, createCompleteTestScenario } from '@/lib/test/factories'

describe('Draft API - Critical Deletion Tests', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()
    
    const user = await createTestUser()
    userId = user.id
  })

  describe('DELETE operations (empty array handling)', () => {
    it('should delete all existing sets when empty array is sent', async () => {
      // Arrange: Create workout with logged sets
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 3,
        status: 'draft'
      })
      
      const { workout } = scenario
      
      // Verify initial state - 3 sets exist
      let currentCompletion = await prisma.workoutCompletion.findFirst({
        where: { workoutId: workout.id },
        include: { loggedSets: true }
      })
      
      expect(currentCompletion?.loggedSets).toHaveLength(3)
      
      // Act: Simulate draft API call with empty array (deletion)
      const response = await simulateDraftAPI(prisma, workout.id, userId, [])
      
      // Assert: All sets should be deleted
      expect(response.success).toBe(true)
      
      currentCompletion = await prisma.workoutCompletion.findFirst({
        where: { workoutId: workout.id },
        include: { loggedSets: true }
      })
      
      expect(currentCompletion?.loggedSets).toHaveLength(0)
      expect(response.draft?.setsCount).toBe(0)
    })

    it('should handle deletion of specific sets while keeping others', async () => {
      // Arrange: Create workout with multiple sets
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 5,
        status: 'draft'
      })
      
      const { workout, exercise } = scenario
      
      // Act: Send only 2 sets (simulating deletion of 3 sets)
      const remainingSets = [
        {
          exerciseId: exercise.id,
          setNumber: 1,
          reps: 10,
          weight: 140,
          weightUnit: 'lbs',
          rpe: 7,
          rir: 3
        },
        {
          exerciseId: exercise.id,
          setNumber: 2,
          reps: 8,
          weight: 150,
          weightUnit: 'lbs',
          rpe: 8,
          rir: 2
        }
      ]
      
      const response = await simulateDraftAPI(prisma, workout.id, userId, remainingSets)
      
      // Assert: Only 2 sets remain
      expect(response.success).toBe(true)
      expect(response.draft?.setsCount).toBe(2)
      
      const currentCompletion = await prisma.workoutCompletion.findFirst({
        where: { workoutId: workout.id },
        include: { loggedSets: true }
      })
      
      expect(currentCompletion?.loggedSets).toHaveLength(2)
      expect(currentCompletion?.loggedSets[0].weight).toBe(140)
      expect(currentCompletion?.loggedSets[1].weight).toBe(150)
    })

    it('should create draft completion if none exists and sets are provided', async () => {
      // Arrange: Create workout without any completion
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 0,
        status: 'draft'
      })
      
      const { workout, exercise } = scenario
      
      // Delete the auto-created completion to test creation from scratch
      await prisma.workoutCompletion.deleteMany({
        where: { workoutId: workout.id }
      })
      
      const newSets = [
        {
          exerciseId: exercise.id,
          setNumber: 1,
          reps: 12,
          weight: 120,
          weightUnit: 'lbs',
          rpe: 6,
          rir: 4
        }
      ]
      
      // Act: Send sets to non-existent draft
      const response = await simulateDraftAPI(prisma, workout.id, userId, newSets)
      
      // Assert: Draft completion created with sets
      expect(response.success).toBe(true)
      expect(response.draft?.setsCount).toBe(1)
      
      const createdCompletion = await prisma.workoutCompletion.findFirst({
        where: { workoutId: workout.id },
        include: { loggedSets: true }
      })
      
      expect(createdCompletion).toBeTruthy()
      expect(createdCompletion?.status).toBe('draft')
      expect(createdCompletion?.loggedSets).toHaveLength(1)
    })

    it('should prevent saving to completed workouts', async () => {
      // Arrange: Create completed workout
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 2,
        status: 'completed'
      })
      
      const { workout, exercise } = scenario
      
      const newSets = [
        {
          exerciseId: exercise.id,
          setNumber: 1,
          reps: 10,
          weight: 135,
          weightUnit: 'lbs',
          rpe: 8,
          rir: 2
        }
      ]
      
      // Act: Try to save to completed workout
      const response = await simulateDraftAPI(prisma, workout.id, userId, newSets)
      
      // Assert: Should be rejected
      expect(response.success).toBe(false)
      expect(response.error).toContain('already completed')
    })
  })

  describe('Input validation', () => {
    it('should reject invalid set data structure', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId)
      const { workout } = scenario
      
      const invalidSets = [
        {
          // Missing exerciseId, invalid setNumber
          setNumber: 'invalid' as unknown as number,
          reps: 10,
          weight: 135,
          weightUnit: 'lbs'
        }
      ]
      
      const response = await simulateDraftAPI(prisma, workout.id, userId, invalidSets)
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid set data structure')
    })

    it('should reject empty loggedSets property (vs empty array)', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId)
      const { workout } = scenario
      
      // Simulate malformed request without loggedSets property
      const response = await simulateDraftAPI(prisma, workout.id, userId, null as unknown as never[])
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('loggedSets array is required')
    })
  })
})

// Helper function to simulate the draft API endpoint logic
async function simulateDraftAPI(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  loggedSets: unknown
) {
  try {
    // Enhanced input validation (matching real API)
    if (!loggedSets || !Array.isArray(loggedSets)) {
      return {
        success: false,
        error: 'loggedSets array is required'
      }
    }

    // Log operation type for safety monitoring
    if (loggedSets.length === 0) {
      console.warn(`⚠️ Draft API: Deletion-only sync for workout ${workoutId} - will remove all existing sets`)
    } else {
      console.log(`📝 Draft API: Sync ${loggedSets.length} sets for workout ${workoutId}`)
    }

    // Validate set data structure
    for (const set of loggedSets) {
      if (!set.exerciseId || typeof set.setNumber !== 'number' || typeof set.reps !== 'number') {
        return {
          success: false,
          error: 'Invalid set data structure'
        }
      }
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        week: {
          include: {
            program: true,
          },
        },
      },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (workout.week.program.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if workout is already completed
    const existingCompletion = await prisma.workoutCompletion.findFirst({
      where: {
        workoutId,
        userId,
        status: 'completed',
      },
    })

    if (existingCompletion) {
      return {
        success: false,
        error: 'Workout already completed. Cannot save draft.'
      }
    }

    // Find or create draft completion
    const result = await prisma.$transaction(async (tx) => {
      // Look for existing draft and get current set count for safety logging
      const existingDraft = await tx.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId,
          status: 'draft',
        },
        include: {
          loggedSets: true
        }
      })

      const currentSetCount = existingDraft?.loggedSets?.length || 0
      
      // Create or update draft completion
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
              completedAt: new Date(),
            },
          })

      // Remove existing logged sets for this draft (we'll replace them)
      const deletedSets = await tx.loggedSet.deleteMany({
        where: {
          completionId: draftCompletion.id,
        },
      })
      
      // Enhanced safety logging with data transformation details
      console.log(`Draft sync: Deleted ${deletedSets.count} existing sets, creating ${loggedSets.length} new sets`)
      
      if (loggedSets.length === 0 && deletedSets.count > 0) {
        console.log('🗑️ DELETION OPERATION: All sets deleted - this was a deletion-only sync')
      } else if (currentSetCount > loggedSets.length) {
        console.warn(`⚠️ PARTIAL DELETION: ${currentSetCount} → ${loggedSets.length} sets (${currentSetCount - loggedSets.length} sets removed)`)
      } else if (currentSetCount < loggedSets.length) {
        console.log(`📈 ADDITION: ${currentSetCount} → ${loggedSets.length} sets (${loggedSets.length - currentSetCount} sets added)`)
      } else {
        console.log(`📝 UPDATE: ${loggedSets.length} sets modified (same count)`)
      }

      // Create all logged sets for the draft
      if (loggedSets.length > 0) {
        await tx.loggedSet.createMany({
          data: loggedSets.map((set: {
            exerciseId: string;
            setNumber: number;
            reps: number;
            weight: number;
            weightUnit: string;
            rpe?: number | null;
            rir?: number | null;
          }) => ({
            exerciseId: set.exerciseId,
            completionId: draftCompletion.id,
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
        lastUpdated: result.completedAt,
        status: result.status,
        setsCount: loggedSets.length,
      },
    }
  } catch (error) {
    console.error('Error saving workout draft:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}