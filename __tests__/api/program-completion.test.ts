import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestUser,
  createTestProgram,
  createMultiWeekProgram,
  createTestWorkoutCompletion,
} from '@/lib/test/factories'
import {
  getProgramCompletionStatus,
  getProgramCompletionStats,
} from '@/lib/db/program-completion'

describe('Program Completion Detection', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('getProgramCompletionStatus', () => {
    it('should return not complete for new program with no completions', async () => {
      // Arrange
      const program = await createTestProgram(prisma, userId, {
        workoutsPerWeek: 3,
      })

      // Act
      const status = await getProgramCompletionStatus(prisma, program.id, userId)

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(0)
      expect(status.skippedWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(3)
      expect(status.completionPercentage).toBe(0)
    })

    it('should return not complete for partially completed program', async () => {
      // Arrange
      const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 3,
      })

      // Complete first workout
      await createTestWorkoutCompletion(
        prisma,
        workouts[0].id,
        userId,
        'completed'
      )

      // Act
      const status = await getProgramCompletionStatus(prisma, program.id, userId)

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(1)
      expect(status.skippedWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(2)
      expect(status.completionPercentage).toBe(33)
    })

    it('should return complete when all workouts are completed', async () => {
      // Arrange
      const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 3,
      })

      // Complete all workouts
      for (const workout of workouts) {
        await createTestWorkoutCompletion(
          prisma,
          workout.id,
          userId,
          'completed'
        )
      }

      // Act
      const status = await getProgramCompletionStatus(prisma, program.id, userId)

      // Assert
      expect(status.isComplete).toBe(true)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(3)
      expect(status.skippedWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(0)
      expect(status.completionPercentage).toBe(100)
    })

    it('should return complete when all workouts are skipped', async () => {
      // Arrange
      const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 3,
      })

      // Skip all workouts
      for (const workout of workouts) {
        await createTestWorkoutCompletion(prisma, workout.id, userId, 'skipped')
      }

      // Act
      const status = await getProgramCompletionStatus(prisma, program.id, userId)

      // Assert
      expect(status.isComplete).toBe(true)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(0)
      expect(status.skippedWorkouts).toBe(3)
      expect(status.remainingWorkouts).toBe(0)
      expect(status.completionPercentage).toBe(100)
    })

    it('should return complete with mix of completed and skipped', async () => {
      // Arrange
      const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 3,
      })

      // Complete first two, skip last one
      await createTestWorkoutCompletion(
        prisma,
        workouts[0].id,
        userId,
        'completed'
      )
      await createTestWorkoutCompletion(
        prisma,
        workouts[1].id,
        userId,
        'completed'
      )
      await createTestWorkoutCompletion(prisma, workouts[2].id, userId, 'skipped')

      // Act
      const status = await getProgramCompletionStatus(prisma, program.id, userId)

      // Assert
      expect(status.isComplete).toBe(true)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(2)
      expect(status.skippedWorkouts).toBe(1)
      expect(status.remainingWorkouts).toBe(0)
      expect(status.completionPercentage).toBe(100)
    })

    it('should not count abandoned or draft workouts as complete', async () => {
      // Arrange
      const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1,
        workoutsPerWeek: 3,
      })

      // One completed, one abandoned, one draft
      await createTestWorkoutCompletion(
        prisma,
        workouts[0].id,
        userId,
        'completed'
      )
      await createTestWorkoutCompletion(
        prisma,
        workouts[1].id,
        userId,
        'abandoned'
      )
      await createTestWorkoutCompletion(prisma, workouts[2].id, userId, 'draft')

      // Act
      const status = await getProgramCompletionStatus(prisma, program.id, userId)

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(3)
      expect(status.completedWorkouts).toBe(1)
      expect(status.skippedWorkouts).toBe(0)
      expect(status.remainingWorkouts).toBe(2)
      expect(status.completionPercentage).toBe(33)
    })

    it('should handle multi-week programs', async () => {
      // Arrange - Create 2 weeks with 2 workouts each
      const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 2,
        workoutsPerWeek: 2,
      })

      // Complete first 3 workouts
      await createTestWorkoutCompletion(
        prisma,
        workouts[0].id,
        userId,
        'completed'
      )
      await createTestWorkoutCompletion(
        prisma,
        workouts[1].id,
        userId,
        'completed'
      )
      await createTestWorkoutCompletion(
        prisma,
        workouts[2].id,
        userId,
        'completed'
      )

      // Act
      const status = await getProgramCompletionStatus(prisma, program.id, userId)

      // Assert
      expect(status.isComplete).toBe(false)
      expect(status.totalWorkouts).toBe(4)
      expect(status.completedWorkouts).toBe(3)
      expect(status.remainingWorkouts).toBe(1)
      expect(status.completionPercentage).toBe(75)
    })
  })

  describe('getProgramCompletionStats', () => {
    it('should return detailed stats for completed program', async () => {
      // Arrange
      const { program, workouts, exercises } = await createMultiWeekProgram(
        prisma,
        userId,
        {
          weekCount: 1,
          workoutsPerWeek: 2,
        }
      )

      // Complete all workouts with logged sets
      for (const workout of workouts) {
        const completion = await createTestWorkoutCompletion(
          prisma,
          workout.id,
          userId,
          'completed'
        )

        // Add logged sets
        const workoutExercises = exercises.filter(
          (ex) => ex.workoutId === workout.id
        )
        for (const exercise of workoutExercises) {
          await prisma.loggedSet.create({
            data: {
              exerciseId: exercise.id,
              completionId: completion.id,
              userId,
              setNumber: 1,
              reps: 5,
              weight: 135,
              weightUnit: 'lbs',
            },
          })
        }
      }

      // Act
      const stats = await getProgramCompletionStats(prisma, program.id, userId)

      // Assert
      expect(stats.programName).toBe(program.name)
      expect(stats.totalWorkouts).toBe(2)
      expect(stats.completedWorkouts).toBe(2)
      expect(stats.skippedWorkouts).toBe(0)
      expect(stats.totalExercises).toBeGreaterThan(0)
      expect(stats.totalVolumeLbs).toBeGreaterThan(0)
      expect(stats.durationDays).toBeGreaterThanOrEqual(0)
      expect(stats.startDate).toBeInstanceOf(Date)
      expect(stats.endDate).toBeInstanceOf(Date)
    })

    it('should only count volume from completed workouts, not skipped', async () => {
      // Arrange
      const { program, workouts, exercises } = await createMultiWeekProgram(
        prisma,
        userId,
        {
          weekCount: 1,
          workoutsPerWeek: 2,
        }
      )

      // Complete first workout with logged sets
      const completion1 = await createTestWorkoutCompletion(
        prisma,
        workouts[0].id,
        userId,
        'completed'
      )
      const workout1Exercises = exercises.filter(
        (ex) => ex.workoutId === workouts[0].id
      )
      for (const exercise of workout1Exercises) {
        await prisma.loggedSet.create({
          data: {
            exerciseId: exercise.id,
            completionId: completion1.id,
            userId,
            setNumber: 1,
            reps: 5,
            weight: 135,
            weightUnit: 'lbs',
          },
        })
      }

      // Skip second workout (no logged sets expected)
      await createTestWorkoutCompletion(
        prisma,
        workouts[1].id,
        userId,
        'skipped'
      )

      // Act
      const stats = await getProgramCompletionStats(prisma, program.id, userId)

      // Assert
      expect(stats.completedWorkouts).toBe(1)
      expect(stats.skippedWorkouts).toBe(1)
      expect(stats.totalVolumeLbs).toBeGreaterThan(0)
      // Only count exercises from completed workout
      expect(stats.totalExercises).toBe(workout1Exercises.length)
    })
  })
})
