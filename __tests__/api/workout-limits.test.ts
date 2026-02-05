import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser, createTestProgram } from '@/lib/test/factories'
import { validateWorkoutLimit, validateBatchWorkoutLimit, MAX_WORKOUTS_PER_WEEK } from '@/lib/validation/workout-limits'
import { batchInsertWeekContent } from '@/lib/db/batch-insert'

describe('Workout Limit Validation', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('validateWorkoutLimit()', () => {
    it('should allow adding workout to empty week', async () => {
      // Arrange: Create program and week manually (factory doesn't support 0 workouts)
      const program = await prisma.program.create({
        data: {
          name: 'Test Program',
          description: 'Test',
          userId,
          isActive: true,
          weeks: {
            create: {
              weekNumber: 1,
              userId
            }
          }
        },
        include: { weeks: true }
      })
      const weekId = program.weeks[0].id

      // Act: Validate adding 1 workout
      const result = await validateWorkoutLimit(prisma, weekId, 1)

      // Assert
      expect(result.valid).toBe(true)
      expect(result.currentCount).toBe(0)
      expect(result.error).toBeUndefined()
    })

    it('should allow adding workout when under limit', async () => {
      // Arrange: Create program with 5 workouts
      const program = await createTestProgram(prisma, userId, {
        weeks: 1,
        workoutsPerWeek: 5
      })
      const weekId = program.weeks[0].id

      // Act: Validate adding 1 more workout (total would be 6)
      const result = await validateWorkoutLimit(prisma, weekId, 1)

      // Assert
      expect(result.valid).toBe(true)
      expect(result.currentCount).toBe(5)
      expect(result.error).toBeUndefined()
    })

    it('should allow creating 10th workout (at limit)', async () => {
      // Arrange: Create program with 9 workouts
      const program = await createTestProgram(prisma, userId, {
        weeks: 1,
        workoutsPerWeek: 9
      })
      const weekId = program.weeks[0].id

      // Act: Validate adding 1 more workout (total would be 10)
      const result = await validateWorkoutLimit(prisma, weekId, 1)

      // Assert
      expect(result.valid).toBe(true)
      expect(result.currentCount).toBe(9)
      expect(result.error).toBeUndefined()
    })

    it('should reject creating 11th workout (over limit)', async () => {
      // Arrange: Create program with 10 workouts (at limit)
      const program = await createTestProgram(prisma, userId, {
        weeks: 1,
        workoutsPerWeek: 10
      })
      const weekId = program.weeks[0].id

      // Act: Validate adding 1 more workout (total would be 11)
      const result = await validateWorkoutLimit(prisma, weekId, 1)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.currentCount).toBe(10)
      expect(result.error).toBe(
        `Cannot add 1 workout. Week already has 10 workouts. Maximum ${MAX_WORKOUTS_PER_WEEK} workouts per week allowed.`
      )
    })

    it('should reject adding multiple workouts that exceed limit', async () => {
      // Arrange: Create program with 8 workouts
      const program = await createTestProgram(prisma, userId, {
        weeks: 1,
        workoutsPerWeek: 8
      })
      const weekId = program.weeks[0].id

      // Act: Validate adding 3 workouts (total would be 11)
      const result = await validateWorkoutLimit(prisma, weekId, 3)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.currentCount).toBe(8)
      expect(result.error).toBe(
        `Cannot add 3 workouts. Week already has 8 workouts. Maximum ${MAX_WORKOUTS_PER_WEEK} workouts per week allowed.`
      )
    })

    it('should handle singular/plural correctly in error messages', async () => {
      // Arrange: Create program with 10 workouts
      const program = await createTestProgram(prisma, userId, {
        weeks: 1,
        workoutsPerWeek: 10
      })
      const weekId = program.weeks[0].id

      // Act: Validate adding 1 workout (singular)
      const result = await validateWorkoutLimit(prisma, weekId, 1)

      // Assert: Check singular "workout"
      expect(result.error).toContain('Cannot add 1 workout.')
      expect(result.error).toContain('Week already has 10 workouts.')
    })
  })

  describe('validateBatchWorkoutLimit()', () => {
    it('should allow batch with 10 workouts (at limit)', () => {
      // Act
      const result = validateBatchWorkoutLimit(10)

      // Assert
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should allow batch with fewer than 10 workouts', () => {
      // Act
      const result = validateBatchWorkoutLimit(5)

      // Assert
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject batch with 11 workouts (over limit)', () => {
      // Act
      const result = validateBatchWorkoutLimit(11)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(
        `Cannot import 11 workouts. Maximum ${MAX_WORKOUTS_PER_WEEK} workouts per week allowed.`
      )
    })

    it('should reject batch with many workouts', () => {
      // Act
      const result = validateBatchWorkoutLimit(20)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(
        `Cannot import 20 workouts. Maximum ${MAX_WORKOUTS_PER_WEEK} workouts per week allowed.`
      )
    })
  })

  describe('batchInsertWeekContent() integration', () => {
    it('should successfully insert 10 workouts (at limit)', async () => {
      // Arrange: Create empty week manually (factory doesn't support 0 workouts)
      const program = await prisma.program.create({
        data: {
          name: 'Test Program',
          description: 'Test',
          userId,
          isActive: true,
          weeks: {
            create: {
              weekNumber: 1,
              userId
            }
          }
        },
        include: { weeks: true }
      })
      const weekId = program.weeks[0].id

      // Prepare 10 workouts
      const workouts = Array.from({ length: 10 }, (_, i) => ({
        name: `Workout ${i + 1}`,
        dayNumber: i + 1,
        exercises: []
      }))

      // Act: Insert 10 workouts
      await expect(
        prisma.$transaction(async (tx) => {
          await batchInsertWeekContent(tx, weekId, workouts, userId)
        })
      ).resolves.not.toThrow()

      // Assert: Verify 10 workouts were created
      const count = await prisma.workout.count({ where: { weekId } })
      expect(count).toBe(10)
    })

    it('should reject inserting 11 workouts (over limit)', async () => {
      // Arrange: Create empty week manually (factory doesn't support 0 workouts)
      const program = await prisma.program.create({
        data: {
          name: 'Test Program',
          description: 'Test',
          userId,
          isActive: true,
          weeks: {
            create: {
              weekNumber: 1,
              userId
            }
          }
        },
        include: { weeks: true }
      })
      const weekId = program.weeks[0].id

      // Prepare 11 workouts
      const workouts = Array.from({ length: 11 }, (_, i) => ({
        name: `Workout ${i + 1}`,
        dayNumber: i + 1,
        exercises: []
      }))

      // Act & Assert: Should throw error
      await expect(
        prisma.$transaction(async (tx) => {
          await batchInsertWeekContent(tx, weekId, workouts, userId)
        })
      ).rejects.toThrow(/Maximum.*workouts per week allowed/)

      // Verify no workouts were created (transaction rolled back)
      const count = await prisma.workout.count({ where: { weekId } })
      expect(count).toBe(0)
    })

    it('should reject adding workouts to week that already has some', async () => {
      // Arrange: Create week with 8 workouts
      const program = await createTestProgram(prisma, userId, {
        weeks: 1,
        workoutsPerWeek: 8
      })
      const weekId = program.weeks[0].id

      // Prepare 3 more workouts (total would be 11)
      const workouts = Array.from({ length: 3 }, (_, i) => ({
        name: `Workout ${i + 9}`,
        dayNumber: i + 9,
        exercises: []
      }))

      // Act & Assert: Should throw error
      await expect(
        prisma.$transaction(async (tx) => {
          await batchInsertWeekContent(tx, weekId, workouts, userId)
        })
      ).rejects.toThrow(/Cannot add 3 workouts/)

      // Verify only original 8 workouts exist (transaction rolled back)
      const count = await prisma.workout.count({ where: { weekId } })
      expect(count).toBe(8)
    })
  })
})
