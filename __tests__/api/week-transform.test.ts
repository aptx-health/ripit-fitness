import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser, createMultiWeekProgram } from '@/lib/test/factories'
import { applyIntensityAdjustment, applyVolumeAdjustment } from '@/lib/transformations/week-transform'

/**
 * Simulation function for week transformation
 * Replicates the API logic without HTTP requests
 */
async function simulateWeekTransform(
  prisma: PrismaClient,
  weekId: string,
  userId: string,
  data: {
    intensityAdjustment?: number
    volumeAdjustment?: number
  }
) {
  // Fetch week with full nested structure
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      program: true,
      workouts: {
        include: {
          exercises: {
            include: {
              prescribedSets: {
                orderBy: { setNumber: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { dayNumber: 'asc' }
      }
    }
  })

  if (!week) {
    throw new Error('Week not found')
  }

  // Authorization check
  if (week.program.userId !== userId) {
    throw new Error('Unauthorized')
  }

  // Apply transformations in transaction
  const stats = await prisma.$transaction(async (tx) => {
    let intensityUpdatedCount = 0
    let volumeAddedCount = 0
    let volumeRemovedCount = 0
    let skippedExercises = 0

    // Apply intensity adjustment if present
    if (data.intensityAdjustment !== undefined) {
      intensityUpdatedCount = await applyIntensityAdjustment(
        tx,
        week,
        data.intensityAdjustment
      )
    }

    // Apply volume adjustment if present
    if (data.volumeAdjustment !== undefined) {
      const volumeResult = await applyVolumeAdjustment(
        tx,
        week,
        data.volumeAdjustment,
        userId
      )
      volumeAddedCount = volumeResult.addedCount
      volumeRemovedCount = volumeResult.removedCount
      skippedExercises = volumeResult.skippedCount
    }

    return {
      intensityUpdatedCount,
      volumeAddedCount,
      volumeRemovedCount,
      skippedExercises
    }
  }, { timeout: 30000 })

  return {
    success: true,
    week,
    stats
  }
}

describe('Week Transformation API', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('Intensity Adjustments', () => {
    it('should clamp RPE adjustments to 1-10 range', async () => {
      // Arrange: Create program with exercises that have RPE values near boundaries
      const { weeks } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 3
      })

      const week = weeks[0]
      const exercises = week.workouts[0].exercises

      // Exercise 1: RPE 9 (near max boundary)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[0].id, setNumber: 1, reps: '5', weight: '135lbs', rpe: 9, userId },
          { exerciseId: exercises[0].id, setNumber: 2, reps: '5', weight: '135lbs', rpe: 9, userId }
        ]
      })

      // Exercise 2: RPE 2 (near min boundary)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[1].id, setNumber: 1, reps: '8', weight: '225lbs', rpe: 2, userId },
          { exerciseId: exercises[1].id, setNumber: 2, reps: '8', weight: '225lbs', rpe: 2, userId }
        ]
      })

      // Exercise 3: RPE 5 (middle value)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[2].id, setNumber: 1, reps: '10', weight: '100lbs', rpe: 5, userId }
        ]
      })

      // Act: Apply +3 intensity adjustment (should clamp ex1 to 10, ex2 to 5, ex3 to 8)
      await simulateWeekTransform(prisma, week.id, userId, {
        intensityAdjustment: 3
      })

      // Assert: Verify RPE values are clamped correctly
      const updatedSets = await prisma.prescribedSet.findMany({
        where: { exerciseId: { in: exercises.map(e => e.id) } },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }]
      })

      // Exercise 1: 9 + 3 = 12 → clamped to 10
      expect(updatedSets[0].rpe).toBe(10)
      expect(updatedSets[1].rpe).toBe(10)

      // Exercise 2: 2 + 3 = 5 (no clamping)
      expect(updatedSets[2].rpe).toBe(5)
      expect(updatedSets[3].rpe).toBe(5)

      // Exercise 3: 5 + 3 = 8 (no clamping)
      expect(updatedSets[4].rpe).toBe(8)
    })

    it('should clamp RIR adjustments to 0-10 range with inverse direction', async () => {
      // Arrange: Create program with exercises that have RIR values near boundaries
      const { weeks } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 3
      })

      const week = weeks[0]
      const exercises = week.workouts[0].exercises

      // Exercise 1: RIR 1 (near min boundary - hardest)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[0].id, setNumber: 1, reps: '5', weight: '225lbs', rir: 1, userId },
          { exerciseId: exercises[0].id, setNumber: 2, reps: '5', weight: '225lbs', rir: 1, userId }
        ]
      })

      // Exercise 2: RIR 8 (near max boundary - easiest)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[1].id, setNumber: 1, reps: '10', weight: '50lbs', rir: 8, userId },
          { exerciseId: exercises[1].id, setNumber: 2, reps: '10', weight: '50lbs', rir: 8, userId }
        ]
      })

      // Exercise 3: RIR 5 (middle value)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[2].id, setNumber: 1, reps: '8', weight: '135lbs', rir: 5, userId }
        ]
      })

      // Act: Apply +2 intensity adjustment
      // Intensity +2 means HARDER workout, so RIR should DECREASE by 2
      await simulateWeekTransform(prisma, week.id, userId, {
        intensityAdjustment: 2
      })

      // Assert: Verify RIR values are adjusted inversely and clamped
      const updatedSets = await prisma.prescribedSet.findMany({
        where: { exerciseId: { in: exercises.map(e => e.id) } },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }]
      })

      // Exercise 1: RIR 1 - 2 = -1 → clamped to 0 (hardest possible)
      expect(updatedSets[0].rir).toBe(0)
      expect(updatedSets[1].rir).toBe(0)

      // Exercise 2: RIR 8 - 2 = 6 (no clamping)
      expect(updatedSets[2].rir).toBe(6)
      expect(updatedSets[3].rir).toBe(6)

      // Exercise 3: RIR 5 - 2 = 3 (no clamping)
      expect(updatedSets[4].rir).toBe(3)
    })
  })

  describe('Volume Adjustments - Addition', () => {
    it('should add sets by cloning the first set and renumber', async () => {
      // Arrange: Create program with varying set counts and intensities
      const { weeks } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 2
      })

      const week = weeks[0]
      const exercises = week.workouts[0].exercises

      // Exercise 1: 3 sets with varying RIR (first=4, middle=3, last=1 - last is hardest)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[0].id, setNumber: 1, reps: '5', weight: '225lbs', rir: 4, userId },
          { exerciseId: exercises[0].id, setNumber: 2, reps: '5', weight: '225lbs', rir: 3, userId },
          { exerciseId: exercises[0].id, setNumber: 3, reps: '5', weight: '225lbs', rir: 1, userId }
        ]
      })

      // Exercise 2: 2 sets with RPE
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[1].id, setNumber: 1, reps: '10', weight: '135lbs', rpe: 7, userId },
          { exerciseId: exercises[1].id, setNumber: 2, reps: '10', weight: '135lbs', rpe: 8, userId }
        ]
      })

      // Act: Add 1 set to each exercise
      const result = await simulateWeekTransform(prisma, week.id, userId, {
        volumeAdjustment: 1
      })

      // Assert: Verify sets were added and renumbered correctly
      const ex1Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[0].id },
        orderBy: { setNumber: 'asc' }
      })

      const ex2Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[1].id },
        orderBy: { setNumber: 'asc' }
      })

      // Exercise 1: Should have 4 sets now
      expect(ex1Sets).toHaveLength(4)
      // New set should match first set's intensity (RIR 4, not the hardest set)
      expect(ex1Sets[0].rir).toBe(4)
      expect(ex1Sets[1].rir).toBe(4) // New cloned set
      expect(ex1Sets[2].rir).toBe(3) // Original middle set
      expect(ex1Sets[3].rir).toBe(1) // Original last set (hardest preserved)
      // All sets properly numbered 1,2,3,4
      expect(ex1Sets.map(s => s.setNumber)).toEqual([1, 2, 3, 4])

      // Exercise 2: Should have 3 sets now
      expect(ex2Sets).toHaveLength(3)
      // New set should match first set (RPE 7)
      expect(ex2Sets[0].rpe).toBe(7)
      expect(ex2Sets[1].rpe).toBe(7) // New cloned set
      expect(ex2Sets[2].rpe).toBe(8) // Original second set
      // All sets properly numbered 1,2,3
      expect(ex2Sets.map(s => s.setNumber)).toEqual([1, 2, 3])

      // Verify stats
      expect(result.stats.volumeAddedCount).toBe(2)
    })
  })

  describe('Volume Adjustments - Removal', () => {
    it('should remove sets from beginning and preserve harder sets at end', async () => {
      // Arrange: Create program with 4 sets where difficulty increases
      const { weeks } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 1
      })

      const week = weeks[0]
      const exercise = week.workouts[0].exercises[0]

      // 4 sets with increasing difficulty (RIR: 4, 3, 2, 0 - last is hardest)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercise.id, setNumber: 1, reps: '5', weight: '225lbs', rir: 4, userId },
          { exerciseId: exercise.id, setNumber: 2, reps: '5', weight: '225lbs', rir: 3, userId },
          { exerciseId: exercise.id, setNumber: 3, reps: '5', weight: '225lbs', rir: 2, userId },
          { exerciseId: exercise.id, setNumber: 4, reps: '5', weight: '225lbs', rir: 0, userId }
        ]
      })

      // Act: Remove 2 sets
      const result = await simulateWeekTransform(prisma, week.id, userId, {
        volumeAdjustment: -2
      })

      // Assert: Should have 2 sets remaining (the harder ones: RIR 2 and 0)
      const remainingSets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercise.id },
        orderBy: { setNumber: 'asc' }
      })

      expect(remainingSets).toHaveLength(2)
      expect(remainingSets[0].rir).toBe(2) // Third original set
      expect(remainingSets[1].rir).toBe(0) // Fourth original set (hardest)
      // Properly renumbered
      expect(remainingSets.map(s => s.setNumber)).toEqual([1, 2])

      // Verify stats
      expect(result.stats.volumeRemovedCount).toBe(2)
    })

    it('should skip single-set exercises when removing', async () => {
      // Arrange: Create program with exercises having different set counts
      const { weeks } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 3
      })

      const week = weeks[0]
      const exercises = week.workouts[0].exercises

      // Exercise 1: 1 set (should be skipped)
      await prisma.prescribedSet.create({
        data: { exerciseId: exercises[0].id, setNumber: 1, reps: '5', weight: '225lbs', rir: 2, userId }
      })

      // Exercise 2: 3 sets
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[1].id, setNumber: 1, reps: '8', weight: '135lbs', rpe: 7, userId },
          { exerciseId: exercises[1].id, setNumber: 2, reps: '8', weight: '135lbs', rpe: 8, userId },
          { exerciseId: exercises[1].id, setNumber: 3, reps: '8', weight: '135lbs', rpe: 9, userId }
        ]
      })

      // Exercise 3: 2 sets
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[2].id, setNumber: 1, reps: '10', weight: '100lbs', rir: 3, userId },
          { exerciseId: exercises[2].id, setNumber: 2, reps: '10', weight: '100lbs', rir: 1, userId }
        ]
      })

      // Act: Remove 1 set from each exercise
      const result = await simulateWeekTransform(prisma, week.id, userId, {
        volumeAdjustment: -1
      })

      // Assert: Exercise 1 unchanged, Exercises 2-3 reduced by 1
      const ex1Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[0].id },
        orderBy: { setNumber: 'asc' }
      })
      expect(ex1Sets).toHaveLength(1) // Unchanged

      const ex2Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[1].id },
        orderBy: { setNumber: 'asc' }
      })
      expect(ex2Sets).toHaveLength(2) // Reduced from 3 to 2
      expect(ex2Sets[0].rpe).toBe(8) // Second original set
      expect(ex2Sets[1].rpe).toBe(9) // Third original set
      expect(ex2Sets.map(s => s.setNumber)).toEqual([1, 2])

      const ex3Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[2].id },
        orderBy: { setNumber: 'asc' }
      })
      expect(ex3Sets).toHaveLength(1) // Reduced from 2 to 1
      expect(ex3Sets[0].rir).toBe(1) // Second original set (harder one)
      expect(ex3Sets[0].setNumber).toBe(1)

      // Verify stats
      expect(result.stats.volumeRemovedCount).toBe(2) // 1 from ex2, 1 from ex3
      expect(result.stats.skippedExercises).toBe(1) // ex1 was skipped
    })
  })

  describe('API Integration', () => {
    it('should reject unauthorized users', async () => {
      // Arrange: Create program for one user
      const { weeks } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 1
      })

      // Act: Try to transform with different user
      const differentUser = await createTestUser()

      try {
        await simulateWeekTransform(prisma, weeks[0].id, differentUser.id, {
          intensityAdjustment: 1
        })
        expect.fail('Should have thrown unauthorized error')
      } catch (error) {
        // Assert: Should throw authorization error
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Unauthorized')
      }
    })

    it('should apply combined intensity and volume adjustments', async () => {
      // Arrange: Create program with mixed intensity types
      const { weeks } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 1,
        exercisesPerWorkout: 3
      })

      const week = weeks[0]
      const exercises = week.workouts[0].exercises

      // Exercise 1: RPE sets
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[0].id, setNumber: 1, reps: '5', weight: '225lbs', rpe: 7, userId },
          { exerciseId: exercises[0].id, setNumber: 2, reps: '5', weight: '225lbs', rpe: 8, userId }
        ]
      })

      // Exercise 2: RIR sets
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[1].id, setNumber: 1, reps: '8', weight: '135lbs', rir: 3, userId },
          { exerciseId: exercises[1].id, setNumber: 2, reps: '8', weight: '135lbs', rir: 2, userId }
        ]
      })

      // Exercise 3: No intensity (weight only)
      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercises[2].id, setNumber: 1, reps: '10', weight: '100lbs', userId },
          { exerciseId: exercises[2].id, setNumber: 2, reps: '10', weight: '100lbs', userId }
        ]
      })

      // Act: Apply both intensity (+1) and volume (+1) adjustments
      const result = await simulateWeekTransform(prisma, week.id, userId, {
        intensityAdjustment: 1,
        volumeAdjustment: 1
      })

      // Assert: Verify intensity changes
      const ex1Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[0].id },
        orderBy: { setNumber: 'asc' }
      })
      expect(ex1Sets).toHaveLength(3) // Added 1 set
      expect(ex1Sets[0].rpe).toBe(8) // 7 + 1
      expect(ex1Sets[1].rpe).toBe(8) // Cloned from first set (after intensity adjustment)
      expect(ex1Sets[2].rpe).toBe(9) // 8 + 1

      const ex2Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[1].id },
        orderBy: { setNumber: 'asc' }
      })
      expect(ex2Sets).toHaveLength(3) // Added 1 set
      expect(ex2Sets[0].rir).toBe(2) // 3 - 1 (inverse)
      expect(ex2Sets[1].rir).toBe(2) // Cloned from first set (after intensity adjustment)
      expect(ex2Sets[2].rir).toBe(1) // 2 - 1 (inverse)

      // Exercise 3: Volume added but no intensity change
      const ex3Sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercises[2].id },
        orderBy: { setNumber: 'asc' }
      })
      expect(ex3Sets).toHaveLength(3) // Added 1 set
      expect(ex3Sets[0].rpe).toBeNull()
      expect(ex3Sets[0].rir).toBeNull()

      // Verify stats
      expect(result.stats.intensityUpdatedCount).toBe(4) // 2 RPE + 2 RIR
      expect(result.stats.volumeAddedCount).toBe(3) // 1 per exercise
    })
  })
})
