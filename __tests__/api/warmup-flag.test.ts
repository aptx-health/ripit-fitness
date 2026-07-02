import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createCompleteTestScenario,
  createTestPrescribedSets,
  createTestProgram,
  createTestUser,
} from '@/lib/test/factories'
import {
  simulateDraftLoad,
  simulateDraftSave,
  simulateWorkoutDuplication,
} from './warmup-simulations'

describe('isWarmup flag', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('Draft save/load round-trips isWarmup', () => {
    it('should preserve isWarmup flag through draft save and load', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 0,
        status: 'draft',
      })
      const { workout, exercise } = scenario

      await prisma.workoutCompletion.deleteMany({
        where: { workoutId: workout.id },
      })

      const sets = [
        { exerciseId: exercise.id, setNumber: 1, reps: 10, weight: 45, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: true },
        { exerciseId: exercise.id, setNumber: 2, reps: 5, weight: 135, weightUnit: 'lbs', rpe: 7, rir: 3, isWarmup: false },
        { exerciseId: exercise.id, setNumber: 3, reps: 5, weight: 185, weightUnit: 'lbs', rpe: 9, rir: 1, isWarmup: false },
      ]

      const saveResponse = await simulateDraftSave(prisma, workout.id, userId, sets)
      expect(saveResponse.success).toBe(true)

      const loadResponse = await simulateDraftLoad(prisma, workout.id, userId)
      expect(loadResponse.success).toBe(true)
      expect(loadResponse.sets).toHaveLength(3)
      expect(loadResponse.sets![0].isWarmup).toBe(true)
      expect(loadResponse.sets![1].isWarmup).toBe(false)
      expect(loadResponse.sets![2].isWarmup).toBe(false)
    })
  })

  describe('Duplication preserves isWarmup flag', () => {
    it('should preserve isWarmup on prescribed sets when duplicating workout', async () => {
      const program = await createTestProgram(prisma, userId, { weeks: 1 })
      const workout = program.weeks[0].workouts[0]
      const exercise = workout.exercises[0]

      await prisma.prescribedSet.createMany({
        data: [
          { exerciseId: exercise.id, userId, setNumber: 1, reps: '10', weight: '45lbs', isWarmup: true },
          { exerciseId: exercise.id, userId, setNumber: 2, reps: '5', weight: '135lbs', isWarmup: false },
          { exerciseId: exercise.id, userId, setNumber: 3, reps: '5', weight: '185lbs', isWarmup: false },
        ],
      })

      const result = await simulateWorkoutDuplication(prisma, workout.id, program.weeks[0].id, userId)
      expect(result.success).toBe(true)

      const duplicatedWorkout = await prisma.workout.findUnique({
        where: { id: result.workoutId! },
        include: {
          exercises: {
            include: { prescribedSets: { orderBy: { setNumber: 'asc' } } },
          },
        },
      })

      const dupSets = duplicatedWorkout!.exercises[0].prescribedSets
      expect(dupSets).toHaveLength(3)
      expect(dupSets[0].isWarmup).toBe(true)
      expect(dupSets[1].isWarmup).toBe(false)
      expect(dupSets[2].isWarmup).toBe(false)
    })

    it('should default isWarmup to false for sets without flag', async () => {
      const program = await createTestProgram(prisma, userId)
      const exercise = program.weeks[0].workouts[0].exercises[0]

      await createTestPrescribedSets(prisma, exercise.id, userId, 3)

      const sets = await prisma.prescribedSet.findMany({
        where: { exerciseId: exercise.id },
      })

      for (const set of sets) {
        expect(set.isWarmup).toBe(false)
      }
    })
  })

  describe('Logged sets default isWarmup to false', () => {
    it('should default isWarmup to false on logged sets', async () => {
      const scenario = await createCompleteTestScenario(prisma, userId, {
        loggedSetCount: 3,
        status: 'draft',
      })

      const loggedSets = await prisma.loggedSet.findMany({
        where: { completionId: scenario.completion.id },
      })

      expect(loggedSets).toHaveLength(3)
      for (const set of loggedSets) {
        expect(set.isWarmup).toBe(false)
      }
    })
  })
})
