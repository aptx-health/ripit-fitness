import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import {
  calculateE1RM,
  getBestE1RM,
  normalizeWeightToLbs,
  calculateAvgPace,
  recordStrengthPerformance,
  recordCardioPerformance,
  updateStrengthPerformance,
  deleteStrengthPerformance,
  deleteCardioPerformance,
} from '@/lib/stats/exercise-performance'

describe('Exercise Performance Tracking', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('Calculation Functions', () => {
    it('should calculate e1RM using Epley formula', () => {
      expect(calculateE1RM(100, 1)).toBe(100) // 1 rep = weight itself
      expect(calculateE1RM(100, 5)).toBeCloseTo(116.67, 1) // 100 * (1 + 5/30)
      expect(calculateE1RM(135, 8)).toBeCloseTo(171, 0) // 135 * (1 + 8/30)
    })

    it('should get best e1RM from multiple sets', () => {
      const sets = [
        { weight: 100, reps: 5 },
        { weight: 110, reps: 3 },
        { weight: 95, reps: 8 },
      ]
      const bestE1RM = getBestE1RM(sets)
      // 110 * (1 + 3/30) = 121 is the highest
      expect(bestE1RM).toBeCloseTo(121, 0)
    })

    it('should normalize weight to lbs', () => {
      expect(normalizeWeightToLbs(100, 'lbs')).toBe(100)
      expect(normalizeWeightToLbs(100, 'kg')).toBeCloseTo(220.46, 1)
    })

    it('should calculate average pace', () => {
      expect(calculateAvgPace(1800, 3)).toBe(600) // 30 min / 3 miles = 10 min/mile = 600 sec/mile
      expect(calculateAvgPace(2100, 5)).toBe(420) // 35 min / 5 miles = 7 min/mile = 420 sec/mile
      expect(calculateAvgPace(1800, 0)).toBeNull() // No distance
    })
  })

  describe('recordStrengthPerformance', () => {
    it('should create performance logs for completed workout', async () => {
      // Create exercise definition
      const exerciseDef = await prisma.exerciseDefinition.create({
        data: {
          name: 'Bench Press',
          normalizedName: 'bench_press',
          aliases: [],
          isSystem: true,
          userId,
        },
      })

      // Create program structure
      const program = await prisma.program.create({
        data: { name: 'Test Program', userId, isActive: true },
      })

      const week = await prisma.week.create({
        data: { weekNumber: 1, programId: program.id, userId },
      })

      const workout = await prisma.workout.create({
        data: { name: 'Upper Body', dayNumber: 1, weekId: week.id, userId },
      })

      const exercise = await prisma.exercise.create({
        data: {
          name: 'Bench Press',
          exerciseDefinitionId: exerciseDef.id,
          workoutId: workout.id,
          order: 1,
          userId,
        },
      })

      // Create workout completion
      const completion = await prisma.workoutCompletion.create({
        data: {
          workoutId: workout.id,
          userId,
          status: 'completed',
          completedAt: new Date(),
        },
      })

      // Create logged sets
      await prisma.loggedSet.createMany({
        data: [
          {
            exerciseId: exercise.id,
            completionId: completion.id,
            userId,
            setNumber: 1,
            reps: 8,
            weight: 135,
            weightUnit: 'lbs',
            rpe: 7,
          },
          {
            exerciseId: exercise.id,
            completionId: completion.id,
            userId,
            setNumber: 2,
            reps: 8,
            weight: 135,
            weightUnit: 'lbs',
            rpe: 8,
          },
          {
            exerciseId: exercise.id,
            completionId: completion.id,
            userId,
            setNumber: 3,
            reps: 7,
            weight: 135,
            weightUnit: 'lbs',
            rpe: 9,
          },
        ],
      })

      // Record performance
      await recordStrengthPerformance(prisma, completion.id, userId)

      // Verify performance log was created
      const perfLog = await prisma.exercisePerformanceLog.findFirst({
        where: { workoutCompletionId: completion.id },
      })

      expect(perfLog).toBeTruthy()
      expect(perfLog?.type).toBe('strength')
      expect(perfLog?.exerciseName).toBe('Bench Press')
      expect(perfLog?.totalSets).toBe(3)
      expect(perfLog?.totalReps).toBe(23) // 8 + 8 + 7
      expect(perfLog?.totalVolumeLbs).toBe(3105) // 135 * 23
      expect(perfLog?.maxWeightLbs).toBe(135)
      expect(perfLog?.avgRPE).toBeCloseTo(8, 1) // (7 + 8 + 9) / 3
    })

    it('should handle mixed weight units (lbs and kg)', async () => {
      // Create exercise and workout structure
      const exerciseDef = await prisma.exerciseDefinition.create({
        data: {
          name: 'Squat',
          normalizedName: 'squat',
          aliases: [],
          isSystem: true,
          userId,
        },
      })

      const program = await prisma.program.create({
        data: { name: 'Test Program', userId, isActive: true },
      })

      const week = await prisma.week.create({
        data: { weekNumber: 1, programId: program.id, userId },
      })

      const workout = await prisma.workout.create({
        data: { name: 'Lower Body', dayNumber: 1, weekId: week.id, userId },
      })

      const exercise = await prisma.exercise.create({
        data: {
          name: 'Squat',
          exerciseDefinitionId: exerciseDef.id,
          workoutId: workout.id,
          order: 1,
          userId,
        },
      })

      const completion = await prisma.workoutCompletion.create({
        data: {
          workoutId: workout.id,
          userId,
          status: 'completed',
        },
      })

      // Create logged sets with mixed units
      await prisma.loggedSet.createMany({
        data: [
          {
            exerciseId: exercise.id,
            completionId: completion.id,
            userId,
            setNumber: 1,
            reps: 5,
            weight: 100,
            weightUnit: 'kg', // kg
          },
          {
            exerciseId: exercise.id,
            completionId: completion.id,
            userId,
            setNumber: 2,
            reps: 5,
            weight: 220,
            weightUnit: 'lbs', // lbs
          },
        ],
      })

      await recordStrengthPerformance(prisma, completion.id, userId)

      const perfLog = await prisma.exercisePerformanceLog.findFirst({
        where: { workoutCompletionId: completion.id },
      })

      // 100kg = 220.46lbs, so total = (220.46 * 5) + (220 * 5) = 2202.3 lbs
      expect(perfLog?.totalVolumeLbs).toBeCloseTo(2202.3, 0)
    })

    it('should create multiple performance logs for multiple exercises', async () => {
      // Create two exercises
      const benchPress = await prisma.exerciseDefinition.create({
        data: {
          name: 'Bench Press',
          normalizedName: 'bench_press',
          aliases: [],
          isSystem: true,
          userId,
        },
      })

      const squat = await prisma.exerciseDefinition.create({
        data: {
          name: 'Squat',
          normalizedName: 'squat',
          aliases: [],
          isSystem: true,
          userId,
        },
      })

      const program = await prisma.program.create({
        data: { name: 'Test Program', userId, isActive: true },
      })

      const week = await prisma.week.create({
        data: { weekNumber: 1, programId: program.id, userId },
      })

      const workout = await prisma.workout.create({
        data: { name: 'Full Body', dayNumber: 1, weekId: week.id, userId },
      })

      const exercise1 = await prisma.exercise.create({
        data: {
          name: 'Bench Press',
          exerciseDefinitionId: benchPress.id,
          workoutId: workout.id,
          order: 1,
          userId,
        },
      })

      const exercise2 = await prisma.exercise.create({
        data: {
          name: 'Squat',
          exerciseDefinitionId: squat.id,
          workoutId: workout.id,
          order: 2,
          userId,
        },
      })

      const completion = await prisma.workoutCompletion.create({
        data: {
          workoutId: workout.id,
          userId,
          status: 'completed',
        },
      })

      // Create sets for both exercises
      await prisma.loggedSet.createMany({
        data: [
          {
            exerciseId: exercise1.id,
            completionId: completion.id,
            userId,
            setNumber: 1,
            reps: 5,
            weight: 135,
            weightUnit: 'lbs',
          },
          {
            exerciseId: exercise2.id,
            completionId: completion.id,
            userId,
            setNumber: 1,
            reps: 5,
            weight: 185,
            weightUnit: 'lbs',
          },
        ],
      })

      await recordStrengthPerformance(prisma, completion.id, userId)

      const perfLogs = await prisma.exercisePerformanceLog.findMany({
        where: { workoutCompletionId: completion.id },
      })

      expect(perfLogs).toHaveLength(2)
      expect(perfLogs.map(p => p.exerciseName).sort()).toEqual([
        'Bench Press',
        'Squat',
      ])
    })
  })

  describe('recordCardioPerformance', () => {
    it('should create cardio performance log with distance', async () => {
      const session = await prisma.loggedCardioSession.create({
        data: {
          userId,
          name: 'Treadmill Run',
          equipment: 'treadmill',
          duration: 1800, // 30 minutes in seconds
          distance: 3.0,
          status: 'completed',
        },
      })

      await recordCardioPerformance(prisma, session.id, userId)

      const perfLog = await prisma.exercisePerformanceLog.findFirst({
        where: { cardioSessionId: session.id },
      })

      expect(perfLog).toBeTruthy()
      expect(perfLog?.type).toBe('cardio')
      expect(perfLog?.equipment).toBe('treadmill')
      expect(perfLog?.exerciseName).toBe('Treadmill Run')
      expect(perfLog?.distance).toBe(3.0)
      expect(perfLog?.duration).toBe(1800)
      expect(perfLog?.avgPaceSeconds).toBe(600) // 1800 / 3 = 600 sec/mile
    })

    it('should handle cardio without distance', async () => {
      const session = await prisma.loggedCardioSession.create({
        data: {
          userId,
          name: 'Rowing',
          equipment: 'rowing_machine',
          duration: 1200, // 20 minutes
          status: 'completed',
        },
      })

      await recordCardioPerformance(prisma, session.id, userId)

      const perfLog = await prisma.exercisePerformanceLog.findFirst({
        where: { cardioSessionId: session.id },
      })

      expect(perfLog).toBeTruthy()
      expect(perfLog?.distance).toBeNull()
      expect(perfLog?.avgPaceSeconds).toBeNull()
    })
  })

  describe('updateStrengthPerformance', () => {
    it('should delete old logs and create new ones', async () => {
      // Create initial workout and log performance
      const exerciseDef = await prisma.exerciseDefinition.create({
        data: {
          name: 'Bench Press',
          normalizedName: 'bench_press',
          aliases: [],
          isSystem: true,
          userId,
        },
      })

      const program = await prisma.program.create({
        data: { name: 'Test Program', userId, isActive: true },
      })

      const week = await prisma.week.create({
        data: { weekNumber: 1, programId: program.id, userId },
      })

      const workout = await prisma.workout.create({
        data: { name: 'Upper Body', dayNumber: 1, weekId: week.id, userId },
      })

      const exercise = await prisma.exercise.create({
        data: {
          name: 'Bench Press',
          exerciseDefinitionId: exerciseDef.id,
          workoutId: workout.id,
          order: 1,
          userId,
        },
      })

      const completion = await prisma.workoutCompletion.create({
        data: {
          workoutId: workout.id,
          userId,
          status: 'completed',
        },
      })

      await prisma.loggedSet.create({
        data: {
          exerciseId: exercise.id,
          completionId: completion.id,
          userId,
          setNumber: 1,
          reps: 5,
          weight: 100,
          weightUnit: 'lbs',
        },
      })

      await recordStrengthPerformance(prisma, completion.id, userId)

      const initialLog = await prisma.exercisePerformanceLog.findFirst({
        where: { workoutCompletionId: completion.id },
      })
      expect(initialLog?.totalVolumeLbs).toBe(500) // 100 * 5

      // Update: change the set weight
      await prisma.loggedSet.updateMany({
        where: { completionId: completion.id },
        data: { weight: 120 },
      })

      await updateStrengthPerformance(prisma, completion.id, userId)

      const updatedLog = await prisma.exercisePerformanceLog.findFirst({
        where: { workoutCompletionId: completion.id },
      })
      expect(updatedLog?.totalVolumeLbs).toBe(600) // 120 * 5
    })
  })

  describe('deleteStrengthPerformance', () => {
    it('should delete all performance logs for a completion', async () => {
      const exerciseDef = await prisma.exerciseDefinition.create({
        data: {
          name: 'Bench Press',
          normalizedName: 'bench_press',
          aliases: [],
          isSystem: true,
          userId,
        },
      })

      const program = await prisma.program.create({
        data: { name: 'Test Program', userId, isActive: true },
      })

      const week = await prisma.week.create({
        data: { weekNumber: 1, programId: program.id, userId },
      })

      const workout = await prisma.workout.create({
        data: { name: 'Upper Body', dayNumber: 1, weekId: week.id, userId },
      })

      const exercise = await prisma.exercise.create({
        data: {
          name: 'Bench Press',
          exerciseDefinitionId: exerciseDef.id,
          workoutId: workout.id,
          order: 1,
          userId,
        },
      })

      const completion = await prisma.workoutCompletion.create({
        data: {
          workoutId: workout.id,
          userId,
          status: 'completed',
        },
      })

      await prisma.loggedSet.create({
        data: {
          exerciseId: exercise.id,
          completionId: completion.id,
          userId,
          setNumber: 1,
          reps: 5,
          weight: 100,
          weightUnit: 'lbs',
        },
      })

      await recordStrengthPerformance(prisma, completion.id, userId)

      let perfLogs = await prisma.exercisePerformanceLog.findMany({
        where: { workoutCompletionId: completion.id },
      })
      expect(perfLogs).toHaveLength(1)

      // Delete
      await deleteStrengthPerformance(prisma, completion.id, userId)

      perfLogs = await prisma.exercisePerformanceLog.findMany({
        where: { workoutCompletionId: completion.id },
      })
      expect(perfLogs).toHaveLength(0)
    })
  })

  describe('deleteCardioPerformance', () => {
    it('should delete cardio performance log', async () => {
      const session = await prisma.loggedCardioSession.create({
        data: {
          userId,
          name: 'Treadmill Run',
          equipment: 'treadmill',
          duration: 1800,
          distance: 3.0,
          status: 'completed',
        },
      })

      await recordCardioPerformance(prisma, session.id, userId)

      let perfLogs = await prisma.exercisePerformanceLog.findMany({
        where: { cardioSessionId: session.id },
      })
      expect(perfLogs).toHaveLength(1)

      await deleteCardioPerformance(prisma, session.id, userId)

      perfLogs = await prisma.exercisePerformanceLog.findMany({
        where: { cardioSessionId: session.id },
      })
      expect(perfLogs).toHaveLength(0)
    })
  })
})
