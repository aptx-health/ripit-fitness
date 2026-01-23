import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestUser,
  createTestProgram,
  createTestExerciseDefinition,
  createTestWorkoutCompletion,
  createMultiWeekProgram
} from '@/lib/test/factories'

// ============================================================================
// SIMULATION FUNCTIONS
// These simulate the API logic without HTTP requests
// ============================================================================

type AddExerciseRequest = {
  exerciseDefinitionId: string
  applyToFuture: boolean
  workoutCompletionId?: string
  prescribedSets: Array<{
    setNumber: number
    reps: string
    intensityType: 'RIR' | 'RPE' | 'NONE'
    intensityValue?: number
  }>
  notes?: string
}

async function simulateAddExercise(
  prisma: PrismaClient,
  workoutId: string,
  userId: string,
  request: AddExerciseRequest
) {
  const {
    exerciseDefinitionId,
    applyToFuture,
    workoutCompletionId,
    prescribedSets,
    notes
  } = request

  // Validate required fields
  if (!exerciseDefinitionId) {
    return { success: false, error: 'Exercise definition ID is required', status: 400 }
  }

  if (!prescribedSets || prescribedSets.length === 0) {
    return { success: false, error: 'At least one prescribed set is required', status: 400 }
  }

  // Verify workout exists and user owns it
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      exercises: true,
      week: {
        include: {
          program: true
        }
      }
    }
  })

  if (!workout) {
    return { success: false, error: 'Workout not found', status: 404 }
  }

  if (workout.week.program.userId !== userId) {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  // Verify exercise definition exists
  const exerciseDefinition = await prisma.exerciseDefinition.findUnique({
    where: { id: exerciseDefinitionId }
  })

  if (!exerciseDefinition) {
    return { success: false, error: 'Exercise definition not found', status: 404 }
  }

  // Calculate next order number for current workout
  const maxOrder = Math.max(0, ...workout.exercises.map(e => e.order))
  const nextOrder = maxOrder + 1

  let addedExercise: any
  let addedToCount = 0

  if (!applyToFuture) {
    // One-off: Create exercise tied to workout completion only
    let actualCompletionId = workoutCompletionId

    // If no completion ID provided, check if a draft exists or create one
    if (!actualCompletionId) {
      const existingDraft = await prisma.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId,
          status: 'draft'
        }
      })

      if (existingDraft) {
        actualCompletionId = existingDraft.id
      } else {
        // Create a draft completion
        const newDraft = await prisma.workoutCompletion.create({
          data: {
            workoutId,
            userId,
            status: 'draft',
            completedAt: new Date()
          }
        })
        actualCompletionId = newDraft.id
      }
    } else {
      // Verify workout completion exists and belongs to user
      const completion = await prisma.workoutCompletion.findUnique({
        where: { id: workoutCompletionId }
      })

      if (!completion || completion.userId !== userId) {
        return { success: false, error: 'Workout completion not found', status: 404 }
      }
    }

    addedExercise = await prisma.$transaction(async (tx) => {
      const exercise = await tx.exercise.create({
        data: {
          name: exerciseDefinition.name,
          exerciseDefinitionId,
          order: nextOrder,
          workoutId: null, // Not part of program structure
          isOneOff: true,
          workoutCompletionId: actualCompletionId,
          notes: notes || null,
          userId,
        }
      })

      // Create prescribed sets
      await tx.prescribedSet.createMany({
        data: prescribedSets.map(set => ({
          setNumber: set.setNumber,
          reps: set.reps,
          rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
          rir: set.intensityType === 'RIR' ? set.intensityValue : null,
          exerciseId: exercise.id,
          userId,
        }))
      })

      // Return exercise with all relations
      return await tx.exercise.findUnique({
        where: { id: exercise.id },
        include: {
          prescribedSets: {
            orderBy: { setNumber: 'asc' }
          }
        }
      })
    })

    addedToCount = 1
  } else {
    // Apply to future: Add to current workout and all future matching workouts
    const currentWeek = workout.week
    const programId = currentWeek.programId
    const currentWeekNumber = currentWeek.weekNumber
    const dayNumber = workout.dayNumber

    await prisma.$transaction(async (tx) => {
      // Find all weeks with weekNumber >= currentWeekNumber in the same program
      const futureWeeks = await tx.week.findMany({
        where: {
          programId,
          weekNumber: {
            gte: currentWeekNumber
          }
        },
        include: {
          workouts: {
            where: {
              dayNumber
            }
          }
        }
      })

      const workoutsToUpdate = futureWeeks.flatMap(week => week.workouts)

      // Add exercise to each matching workout
      for (const targetWorkout of workoutsToUpdate) {
        // Calculate order for this specific workout
        const existingExercises = await tx.exercise.findMany({
          where: { workoutId: targetWorkout.id },
          select: { order: true }
        })

        const maxOrderInWorkout = Math.max(0, ...existingExercises.map(e => e.order))
        const nextOrderInWorkout = maxOrderInWorkout + 1

        const exercise = await tx.exercise.create({
          data: {
            name: exerciseDefinition.name,
            exerciseDefinitionId,
            order: nextOrderInWorkout,
            workoutId: targetWorkout.id,
            isOneOff: false,
            notes: notes || null,
            userId,
          }
        })

        // Create prescribed sets for this exercise
        await tx.prescribedSet.createMany({
          data: prescribedSets.map(set => ({
            setNumber: set.setNumber,
            reps: set.reps,
            rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
            rir: set.intensityType === 'RIR' ? set.intensityValue : null,
            exerciseId: exercise.id,
            userId,
          }))
        })

        // If this is the current workout, store reference for response
        if (targetWorkout.id === workoutId) {
          addedExercise = await tx.exercise.findUnique({
            where: { id: exercise.id },
            include: {
              prescribedSets: {
                orderBy: { setNumber: 'asc' }
              }
            }
          })
        }
      }

      addedToCount = workoutsToUpdate.length
    })
  }

  return {
    success: true,
    exercise: addedExercise,
    addedToCount
  }
}

type ReplaceExerciseRequest = {
  newExerciseDefinitionId: string
  applyToFuture: boolean
  prescribedSets?: Array<{
    setNumber: number
    reps: string
    intensityType: 'RIR' | 'RPE' | 'NONE'
    intensityValue?: number
  }>
  notes?: string
}

async function simulateReplaceExercise(
  prisma: PrismaClient,
  exerciseId: string,
  userId: string,
  request: ReplaceExerciseRequest
) {
  const { newExerciseDefinitionId, applyToFuture, prescribedSets, notes } = request

  // Validate required fields
  if (!newExerciseDefinitionId) {
    return { success: false, error: 'New exercise definition ID is required', status: 400 }
  }

  // Verify exercise exists and user owns it
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      workout: {
        include: {
          week: {
            include: {
              program: true
            }
          }
        }
      },
      exerciseDefinition: true
    }
  })

  if (!exercise) {
    return { success: false, error: 'Exercise not found', status: 404 }
  }

  // Check ownership through workout/program
  if (exercise.workout && exercise.workout.week.program.userId !== userId) {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  // If one-off exercise, check ownership directly
  if (exercise.isOneOff && exercise.userId !== userId) {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  // Verify new exercise definition exists
  const newExerciseDefinition = await prisma.exerciseDefinition.findUnique({
    where: { id: newExerciseDefinitionId }
  })

  if (!newExerciseDefinition) {
    return { success: false, error: 'New exercise definition not found', status: 404 }
  }

  // Execute replacement
  let updatedCount = 0
  let updatedExercises: any[] = []

  if (!applyToFuture || !exercise.workout) {
    // Just update this single exercise
    const updated = await prisma.$transaction(async (tx) => {
      // Update exercise
      const updatedExercise = await tx.exercise.update({
        where: { id: exerciseId },
        data: {
          exerciseDefinitionId: newExerciseDefinitionId,
          name: newExerciseDefinition.name,
          notes: notes !== undefined ? notes : undefined // Update notes if provided
        }
      })

      // If prescribed sets are provided, replace them
      if (prescribedSets && prescribedSets.length > 0) {
        // Delete old prescribed sets
        await tx.prescribedSet.deleteMany({
          where: { exerciseId }
        })

        // Create new prescribed sets
        await tx.prescribedSet.createMany({
          data: prescribedSets.map(set => ({
            setNumber: set.setNumber,
            reps: set.reps,
            rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
            rir: set.intensityType === 'RIR' ? set.intensityValue : null,
            exerciseId,
            userId
          }))
        })
      }

      // Return exercise with all relations
      return await tx.exercise.findUnique({
        where: { id: exerciseId },
        include: {
          prescribedSets: {
            orderBy: { setNumber: 'asc' }
          }
        }
      })
    })

    updatedCount = 1
    updatedExercises = [updated!]
  } else {
    // Apply to future weeks
    const currentWeek = exercise.workout.week
    const programId = currentWeek.programId
    const currentWeekNumber = currentWeek.weekNumber
    const oldExerciseDefinitionId = exercise.exerciseDefinitionId

    await prisma.$transaction(async (tx) => {
      // Find all weeks with weekNumber >= currentWeekNumber in the same program
      const futureWeeks = await tx.week.findMany({
        where: {
          programId,
          weekNumber: {
            gte: currentWeekNumber
          }
        },
        include: {
          workouts: {
            include: {
              exercises: true
            }
          }
        }
      })

      // Find all exercises with matching exerciseDefinitionId in those weeks
      const exercisesToUpdate: string[] = []

      for (const week of futureWeeks) {
        for (const workout of week.workouts) {
          for (const ex of workout.exercises) {
            if (ex.exerciseDefinitionId === oldExerciseDefinitionId) {
              exercisesToUpdate.push(ex.id)
            }
          }
        }
      }

      // Update all matching exercises
      for (const exerciseIdToUpdate of exercisesToUpdate) {
        // Update exercise definition, name, and notes
        await tx.exercise.update({
          where: { id: exerciseIdToUpdate },
          data: {
            exerciseDefinitionId: newExerciseDefinitionId,
            name: newExerciseDefinition.name,
            notes: notes !== undefined ? notes : undefined // Update notes if provided
          }
        })

        // If prescribed sets are provided, replace them
        if (prescribedSets && prescribedSets.length > 0) {
          // Delete old prescribed sets
          await tx.prescribedSet.deleteMany({
            where: { exerciseId: exerciseIdToUpdate }
          })

          // Create new prescribed sets
          await tx.prescribedSet.createMany({
            data: prescribedSets.map(set => ({
              setNumber: set.setNumber,
              reps: set.reps,
              rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
              rir: set.intensityType === 'RIR' ? set.intensityValue : null,
              exerciseId: exerciseIdToUpdate,
              userId
            }))
          })
        }
      }

      updatedCount = exercisesToUpdate.length

      // Fetch updated exercises for response
      updatedExercises = await tx.exercise.findMany({
        where: {
          id: {
            in: exercisesToUpdate
          }
        },
        include: {
          prescribedSets: {
            orderBy: { setNumber: 'asc' }
          }
        }
      })
    })
  }

  return {
    success: true,
    updatedCount,
    exercises: updatedExercises
  }
}

type DeleteExerciseRequest = {
  applyToFuture: boolean
}

async function simulateDeleteExercise(
  prisma: PrismaClient,
  exerciseId: string,
  userId: string,
  request: DeleteExerciseRequest
) {
  const { applyToFuture } = request

  // Get exercise and verify ownership
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      workout: {
        include: {
          week: {
            include: {
              program: true
            }
          }
        }
      }
    }
  })

  if (!exercise) {
    return { success: false, error: 'Exercise not found', status: 404 }
  }

  // Verify ownership
  if (exercise.userId !== userId) {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  // Verify program ownership if exercise is part of a workout
  if (exercise.workout && exercise.workout.week.program.userId !== userId) {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  let deletedCount = 0

  if (!applyToFuture) {
    // Delete only this exercise
    await prisma.exercise.delete({
      where: { id: exerciseId }
    })
    deletedCount = 1
  } else {
    // Delete from current and future weeks
    if (!exercise.workout) {
      // One-off exercise - just delete it
      await prisma.exercise.delete({
        where: { id: exerciseId }
      })
      deletedCount = 1
    } else {
      // Program exercise - delete from future weeks too
      const currentWeek = exercise.workout.week
      const programId = currentWeek.programId
      const currentWeekNumber = currentWeek.weekNumber
      const dayNumber = exercise.workout.dayNumber
      const exerciseDefinitionId = exercise.exerciseDefinitionId

      await prisma.$transaction(async (tx) => {
        // Find all weeks with weekNumber >= currentWeekNumber in the same program
        const futureWeeks = await tx.week.findMany({
          where: {
            programId,
            weekNumber: {
              gte: currentWeekNumber
            }
          },
          include: {
            workouts: {
              where: {
                dayNumber
              }
            }
          }
        })

        const workoutsToUpdate = futureWeeks.flatMap(week => week.workouts)

        // Delete matching exercises from each workout
        for (const targetWorkout of workoutsToUpdate) {
          const exercisesToDelete = await tx.exercise.findMany({
            where: {
              workoutId: targetWorkout.id,
              exerciseDefinitionId
            }
          })

          for (const ex of exercisesToDelete) {
            await tx.exercise.delete({
              where: { id: ex.id }
            })
            deletedCount++
          }
        }
      })
    }
  }

  return {
    success: true,
    deletedCount
  }
}

type EditExerciseRequest = {
  notes?: string
  applyToFuture: boolean
  prescribedSets: Array<{
    setNumber: number
    reps: string
    rpe: number | null
    rir: number | null
  }>
}

async function simulateEditExercise(
  prisma: PrismaClient,
  exerciseId: string,
  userId: string,
  request: EditExerciseRequest
) {
  const { notes, prescribedSets, applyToFuture } = request

  // Verify exercise exists and user owns it
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      workout: {
        include: {
          week: {
            include: {
              program: true
            }
          }
        }
      },
      exerciseDefinition: true
    }
  })

  if (!exercise) {
    return { success: false, error: 'Exercise not found', status: 404 }
  }

  // Check ownership through workout/program
  if (exercise.workout) {
    if (exercise.workout.week.program.userId !== userId) {
      return { success: false, error: 'Unauthorized', status: 403 }
    }
  } else {
    if (exercise.userId !== userId) {
      return { success: false, error: 'Unauthorized', status: 403 }
    }
  }

  let updatedCount = 0
  let updatedExercises: any[] = []

  if (!applyToFuture || !exercise.workout) {
    // Update only this exercise
    const updated = await prisma.$transaction(async (tx) => {
      // Update exercise notes
      const ex = await tx.exercise.update({
        where: { id: exerciseId },
        data: {
          notes: notes || null,
        }
      })

      // Delete existing prescribed sets
      await tx.prescribedSet.deleteMany({
        where: { exerciseId }
      })

      // Create new prescribed sets
      if (prescribedSets && prescribedSets.length > 0) {
        await tx.prescribedSet.createMany({
          data: prescribedSets.map((set: any) => ({
            setNumber: set.setNumber,
            reps: set.reps,
            rpe: set.rpe || null,
            rir: set.rir || null,
            exerciseId: ex.id,
            userId
          }))
        })
      }

      // Return exercise with all relations
      return await tx.exercise.findUnique({
        where: { id: ex.id },
        include: {
          prescribedSets: {
            orderBy: { setNumber: 'asc' }
          }
        }
      })
    })

    updatedCount = 1
    updatedExercises = [updated!]
  } else {
    // Apply to future weeks: update matching exercises in current + future weeks
    const currentWeek = exercise.workout.week
    const programId = currentWeek.programId
    const currentWeekNumber = currentWeek.weekNumber
    const exerciseDefinitionId = exercise.exerciseDefinitionId

    await prisma.$transaction(async (tx) => {
      // Find all weeks with weekNumber >= currentWeekNumber in the same program
      const futureWeeks = await tx.week.findMany({
        where: {
          programId,
          weekNumber: {
            gte: currentWeekNumber
          }
        },
        include: {
          workouts: {
            include: {
              exercises: true
            }
          }
        }
      })

      // Find all exercises with matching exerciseDefinitionId in those weeks
      const exercisesToUpdate: string[] = []

      for (const week of futureWeeks) {
        for (const workout of week.workouts) {
          for (const ex of workout.exercises) {
            if (ex.exerciseDefinitionId === exerciseDefinitionId) {
              exercisesToUpdate.push(ex.id)
            }
          }
        }
      }

      // Update all matching exercises
      for (const exerciseIdToUpdate of exercisesToUpdate) {
        // Update exercise notes
        await tx.exercise.update({
          where: { id: exerciseIdToUpdate },
          data: {
            notes: notes || null
          }
        })

        // Delete existing prescribed sets
        await tx.prescribedSet.deleteMany({
          where: { exerciseId: exerciseIdToUpdate }
        })

        // Create new prescribed sets
        if (prescribedSets && prescribedSets.length > 0) {
          await tx.prescribedSet.createMany({
            data: prescribedSets.map((set: any) => ({
              setNumber: set.setNumber,
              reps: set.reps,
              rpe: set.rpe || null,
              rir: set.rir || null,
              exerciseId: exerciseIdToUpdate,
              userId
            }))
          })
        }
      }

      updatedCount = exercisesToUpdate.length

      // Fetch updated exercises for response
      updatedExercises = await tx.exercise.findMany({
        where: {
          id: {
            in: exercisesToUpdate
          }
        },
        include: {
          prescribedSets: {
            orderBy: { setNumber: 'asc' }
          }
        }
      })
    })
  }

  return {
    success: true,
    updatedCount,
    exercises: updatedExercises
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Exercise Modifications API', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  // ==========================================================================
  // ADD EXERCISE TESTS
  // ==========================================================================

  describe('Add Exercise', () => {
    describe('One-off mode', () => {
      it('should add one-off exercise to existing draft completion', async () => {
        // Arrange: Create program with workout completion
        const { program, workouts } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 2
        })
        const workout = workouts[0]
        const completion = await createTestWorkoutCompletion(
          prisma,
          workout.id,
          userId,
          'draft'
        )

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Face Pulls'
        })

        // Verify initial state
        const initialExercises = await prisma.exercise.findMany({
          where: { workoutId: workout.id }
        })
        expect(initialExercises).toHaveLength(2) // Default from factory

        // Act: Add exercise
        const response = await simulateAddExercise(prisma, workout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false,
          workoutCompletionId: completion.id,
          prescribedSets: [
            { setNumber: 1, reps: '15', intensityType: 'NONE' },
            { setNumber: 2, reps: '15', intensityType: 'NONE' }
          ],
          notes: 'Upper back work'
        })

        // Assert: Verify response
        expect(response.success).toBe(true)
        expect(response.addedToCount).toBe(1)
        expect(response.exercise.isOneOff).toBe(true)
        expect(response.exercise.workoutCompletionId).toBe(completion.id)
        expect(response.exercise.workoutId).toBeNull()
        expect(response.exercise.notes).toBe('Upper back work')

        // Assert: Verify database state
        const updatedExercises = await prisma.exercise.findMany({
          where: { workoutCompletionId: completion.id },
          include: { prescribedSets: true }
        })
        expect(updatedExercises).toHaveLength(1)
        expect(updatedExercises[0].prescribedSets).toHaveLength(2)

        // Assert: Verify future weeks unaffected
        const futureWorkouts = workouts.slice(1)
        for (const futureWorkout of futureWorkouts) {
          const futureExercises = await prisma.exercise.findMany({
            where: { workoutId: futureWorkout.id }
          })
          expect(futureExercises).toHaveLength(2) // Still original count
        }
      })

      it('should create draft workout completion if none exists', async () => {
        // Arrange: Create program without completion
        const { workouts } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 1
        })
        const workout = workouts[0]

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Leg Curls'
        })

        // Act: Add exercise without providing completion ID
        const response = await simulateAddExercise(prisma, workout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false,
          prescribedSets: [
            { setNumber: 1, reps: '12', intensityType: 'RIR', intensityValue: 2 }
          ]
        })

        // Assert: Draft completion was created
        expect(response.success).toBe(true)

        const createdCompletion = await prisma.workoutCompletion.findFirst({
          where: { workoutId: workout.id }
        })
        expect(createdCompletion).toBeDefined()
        expect(createdCompletion?.status).toBe('draft')
        expect(response.exercise.workoutCompletionId).toBe(createdCompletion?.id)
      })

      it('should add exercise with RIR prescribed sets', async () => {
        // Arrange
        const { workouts } = await createMultiWeekProgram(prisma, userId, { weekCount: 1 })
        const workout = workouts[0]

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Dumbbell Rows'
        })

        // Act
        const response = await simulateAddExercise(prisma, workout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false,
          prescribedSets: [
            { setNumber: 1, reps: '10', intensityType: 'RIR', intensityValue: 3 },
            { setNumber: 2, reps: '10', intensityType: 'RIR', intensityValue: 2 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.exercise.prescribedSets).toHaveLength(2)
        expect(response.exercise.prescribedSets[0].rir).toBe(3)
        expect(response.exercise.prescribedSets[0].rpe).toBeNull()
        expect(response.exercise.prescribedSets[1].rir).toBe(2)
      })

      it('should add exercise with RPE prescribed sets', async () => {
        // Arrange
        const { workouts } = await createMultiWeekProgram(prisma, userId, { weekCount: 1 })
        const workout = workouts[0]

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Cable Flyes'
        })

        // Act
        const response = await simulateAddExercise(prisma, workout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false,
          prescribedSets: [
            { setNumber: 1, reps: '12', intensityType: 'RPE', intensityValue: 7 },
            { setNumber: 2, reps: '12', intensityType: 'RPE', intensityValue: 8 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.exercise.prescribedSets).toHaveLength(2)
        expect(response.exercise.prescribedSets[0].rpe).toBe(7)
        expect(response.exercise.prescribedSets[0].rir).toBeNull()
        expect(response.exercise.prescribedSets[1].rpe).toBe(8)
      })
    })

    describe('Program-wide mode', () => {
      it('should add exercise to current and all future weeks', async () => {
        // Arrange: Create 4-week program, add in week 2
        const { weeks, workouts } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1 }
        )

        // Get workout from week 2
        const week2 = weeks[1]
        const week2Workout = workouts.find(w => w.weekId === week2.id)!

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Lateral Raises'
        })

        // Act: Add exercise
        const response = await simulateAddExercise(prisma, week2Workout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '12', intensityType: 'RIR', intensityValue: 2 }
          ]
        })

        // Assert: Verify response
        expect(response.success).toBe(true)
        expect(response.addedToCount).toBe(3) // Weeks 2, 3, 4

        // Assert: Verify affected workouts (weeks 2-4)
        const affectedWeeks = weeks.slice(1) // Weeks 2-4
        for (const week of affectedWeeks) {
          const dayWorkouts = await prisma.workout.findMany({
            where: { weekId: week.id },
            include: { exercises: true }
          })

          const lateralRaises = dayWorkouts[0].exercises.find(
            e => e.exerciseDefinitionId === newExerciseDef.id
          )
          expect(lateralRaises).toBeDefined()
          expect(lateralRaises?.isOneOff).toBe(false)
          expect(lateralRaises?.workoutId).toBe(dayWorkouts[0].id)
        }

        // Assert: Verify week 1 unaffected
        const week1Exercises = await prisma.exercise.findMany({
          where: { workoutId: { in: weeks[0].workouts.map(w => w.id) } }
        })
        expect(week1Exercises.every(e => e.exerciseDefinitionId !== newExerciseDef.id)).toBe(true)
      })

      it('should add exercise with prescribed sets to all future weeks', async () => {
        // Arrange
        const { weeks, workouts } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 3, workoutsPerWeek: 1 }
        )

        const week1Workout = workouts.find(w => w.weekId === weeks[0].id)!
        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Tricep Extensions'
        })

        // Act
        const response = await simulateAddExercise(prisma, week1Workout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '10', intensityType: 'RPE', intensityValue: 7 },
            { setNumber: 2, reps: '10', intensityType: 'RPE', intensityValue: 8 },
            { setNumber: 3, reps: '10', intensityType: 'RPE', intensityValue: 9 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.addedToCount).toBe(3) // All 3 weeks

        // Verify prescribed sets in each week
        for (const week of weeks) {
          const exercises = await prisma.exercise.findMany({
            where: {
              workoutId: { in: week.workouts.map(w => w.id) },
              exerciseDefinitionId: newExerciseDef.id
            },
            include: { prescribedSets: true }
          })

          expect(exercises).toHaveLength(1)
          expect(exercises[0].prescribedSets).toHaveLength(3)
        }
      })

      it('should add to first week and affect all weeks', async () => {
        // Arrange
        const { weeks, workouts } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1 }
        )

        const week1Workout = workouts.find(w => w.weekId === weeks[0].id)!
        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Calf Raises'
        })

        // Act
        const response = await simulateAddExercise(prisma, week1Workout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '15', intensityType: 'NONE' }
          ]
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.addedToCount).toBe(4) // All 4 weeks

        const allExercises = await prisma.exercise.findMany({
          where: { exerciseDefinitionId: newExerciseDef.id }
        })
        expect(allExercises).toHaveLength(4)
      })

      it('should add to last week and affect only last week', async () => {
        // Arrange
        const { weeks, workouts } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1 }
        )

        const lastWeek = weeks[weeks.length - 1]
        const lastWeekWorkout = workouts.find(w => w.weekId === lastWeek.id)!
        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Farmers Walk'
        })

        // Act
        const response = await simulateAddExercise(prisma, lastWeekWorkout.id, userId, {
          exerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '60s', intensityType: 'NONE' }
          ]
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.addedToCount).toBe(1) // Only last week

        const allExercises = await prisma.exercise.findMany({
          where: { exerciseDefinitionId: newExerciseDef.id }
        })
        expect(allExercises).toHaveLength(1)
        expect(allExercises[0].workoutId).toBe(lastWeekWorkout.id)
      })
    })
  })

  // ==========================================================================
  // REPLACE EXERCISE TESTS
  // ==========================================================================

  describe('Replace Exercise', () => {
    describe('One-off mode', () => {
      it('should replace single exercise definition', async () => {
        // Arrange
        const { workouts, exercises } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 2
        })
        const workout = workouts[0]
        const exercise = exercises.find(e => e.workoutId === workout.id)!

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Incline Bench Press'
        })

        // Act
        const response = await simulateReplaceExercise(prisma, exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.updatedCount).toBe(1)

        const updatedExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id }
        })
        expect(updatedExercise?.exerciseDefinitionId).toBe(newExerciseDef.id)
        expect(updatedExercise?.name).toBe('Incline Bench Press')

        // Verify other weeks unchanged
        const futureWorkout = workouts[1]
        const futureExercise = exercises.find(e => e.workoutId === futureWorkout.id)!
        const unchangedExercise = await prisma.exercise.findUnique({
          where: { id: futureExercise.id }
        })
        expect(unchangedExercise?.exerciseDefinitionId).toBe(exercise.exerciseDefinitionId)
      })

      it('should replace and update prescribed sets', async () => {
        // Arrange
        const { workouts, exercises } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 1
        })
        const exercise = exercises[0]

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Bulgarian Split Squats'
        })

        // Act
        const response = await simulateReplaceExercise(prisma, exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false,
          prescribedSets: [
            { setNumber: 1, reps: '8', intensityType: 'RIR', intensityValue: 3 },
            { setNumber: 2, reps: '8', intensityType: 'RIR', intensityValue: 2 },
            { setNumber: 3, reps: '8', intensityType: 'RIR', intensityValue: 2 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)

        const updatedExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id },
          include: { prescribedSets: true }
        })
        expect(updatedExercise?.prescribedSets).toHaveLength(3)
        expect(updatedExercise?.prescribedSets[0].reps).toBe('8')
        expect(updatedExercise?.prescribedSets[0].rir).toBe(3)
      })

      it('should replace and update intensity type from RPE to RIR', async () => {
        // Arrange
        const { exercises } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 1
        })
        const exercise = exercises[0]

        // Create initial RPE sets
        await prisma.prescribedSet.createMany({
          data: [
            { exerciseId: exercise.id, setNumber: 1, reps: '10', rpe: 8, userId }
          ]
        })

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Hack Squats'
        })

        // Act: Replace with RIR sets
        const response = await simulateReplaceExercise(prisma, exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false,
          prescribedSets: [
            { setNumber: 1, reps: '10', intensityType: 'RIR', intensityValue: 2 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)

        const updatedExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id },
          include: { prescribedSets: true }
        })
        expect(updatedExercise?.prescribedSets).toHaveLength(1)
        expect(updatedExercise?.prescribedSets[0].rir).toBe(2)
        expect(updatedExercise?.prescribedSets[0].rpe).toBeNull()
      })

      it('should replace and update notes', async () => {
        // Arrange
        const { exercises } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 1
        })
        const exercise = exercises[0]

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Leg Extensions'
        })

        // Act
        const response = await simulateReplaceExercise(prisma, exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: false,
          notes: 'Focus on slow eccentric'
        })

        // Assert
        expect(response.success).toBe(true)

        const updatedExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id }
        })
        expect(updatedExercise?.notes).toBe('Focus on slow eccentric')
      })
    })

    describe('Program-wide mode', () => {
      it('should replace matching exercises in current and future weeks', async () => {
        // Arrange: 4-week program, replace in week 2
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1 }
        )

        const week2 = weeks[1]
        const week2Workout = workouts.find(w => w.weekId === week2.id)!
        const week2Exercise = exercises.find(e => e.workoutId === week2Workout.id)!
        const oldExerciseDefId = week2Exercise.exerciseDefinitionId

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Close Grip Bench'
        })

        // Act
        const response = await simulateReplaceExercise(prisma, week2Exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true
        })

        // Assert: Verify count (should update weeks 2, 3, 4)
        expect(response.success).toBe(true)
        expect(response.updatedCount).toBeGreaterThanOrEqual(3)

        // Verify week 1 unchanged
        const week1Exercises = await prisma.exercise.findMany({
          where: {
            workoutId: { in: weeks[0].workouts.map(w => w.id) },
            exerciseDefinitionId: oldExerciseDefId
          }
        })
        expect(week1Exercises.length).toBeGreaterThan(0)

        // Verify weeks 2-4 updated
        const updatedExercises = await prisma.exercise.findMany({
          where: {
            workoutId: { in: weeks.slice(1).flatMap(w => w.workouts.map(wo => wo.id)) },
            exerciseDefinitionId: newExerciseDef.id
          }
        })
        expect(updatedExercises.length).toBeGreaterThanOrEqual(3)
      })

      it('should replace all prescribed sets program-wide', async () => {
        // Arrange
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 3, workoutsPerWeek: 1 }
        )

        const week1Workout = workouts.find(w => w.weekId === weeks[0].id)!
        const week1Exercise = exercises.find(e => e.workoutId === week1Workout.id)!

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Dumbbell Bench'
        })

        // Act: Replace with new sets
        const response = await simulateReplaceExercise(prisma, week1Exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '8', intensityType: 'RPE', intensityValue: 7 },
            { setNumber: 2, reps: '8', intensityType: 'RPE', intensityValue: 8 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)

        // Verify all weeks have new prescribed sets
        const allUpdatedExercises = await prisma.exercise.findMany({
          where: { exerciseDefinitionId: newExerciseDef.id },
          include: { prescribedSets: true }
        })

        for (const ex of allUpdatedExercises) {
          expect(ex.prescribedSets).toHaveLength(2)
          expect(ex.prescribedSets[0].rpe).toBe(7)
        }
      })

      it('should handle different set count when replacing (3 sets to 5 sets)', async () => {
        // Arrange
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 2, workoutsPerWeek: 1 }
        )

        const week1Workout = workouts.find(w => w.weekId === weeks[0].id)!
        const week1Exercise = exercises.find(e => e.workoutId === week1Workout.id)!

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Squats'
        })

        // Act: Replace with 5 sets
        const response = await simulateReplaceExercise(prisma, week1Exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '5', intensityType: 'RIR', intensityValue: 4 },
            { setNumber: 2, reps: '5', intensityType: 'RIR', intensityValue: 3 },
            { setNumber: 3, reps: '5', intensityType: 'RIR', intensityValue: 2 },
            { setNumber: 4, reps: '5', intensityType: 'RIR', intensityValue: 1 },
            { setNumber: 5, reps: '5', intensityType: 'RIR', intensityValue: 0 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)

        const updatedExercises = await prisma.exercise.findMany({
          where: { exerciseDefinitionId: newExerciseDef.id },
          include: { prescribedSets: true }
        })

        for (const ex of updatedExercises) {
          expect(ex.prescribedSets).toHaveLength(5)
        }
      })

      it('should replace in week 2 of 4-week program (verify weeks 2-4 updated, week 1 untouched)', async () => {
        // Arrange
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1 }
        )

        const week2 = weeks[1]
        const week2Workout = workouts.find(w => w.weekId === week2.id)!
        const week2Exercise = exercises.find(e => e.workoutId === week2Workout.id)!
        const oldExerciseDefId = week2Exercise.exerciseDefinitionId

        const newExerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Romanian Deadlifts'
        })

        // Act
        const response = await simulateReplaceExercise(prisma, week2Exercise.id, userId, {
          newExerciseDefinitionId: newExerciseDef.id,
          applyToFuture: true
        })

        // Assert: Week 1 should have old exercise
        const week1Exercises = await prisma.exercise.findMany({
          where: {
            workoutId: { in: weeks[0].workouts.map(w => w.id) },
            exerciseDefinitionId: oldExerciseDefId
          }
        })
        expect(week1Exercises.length).toBeGreaterThan(0)

        // Assert: Weeks 2-4 should have new exercise
        for (let i = 1; i < 4; i++) {
          const weekExercises = await prisma.exercise.findMany({
            where: {
              workoutId: { in: weeks[i].workouts.map(w => w.id) },
              exerciseDefinitionId: newExerciseDef.id
            }
          })
          expect(weekExercises.length).toBeGreaterThan(0)
        }
      })
    })
  })

  // ==========================================================================
  // DELETE EXERCISE TESTS
  // ==========================================================================

  describe('Delete Exercise', () => {
    describe('One-off mode', () => {
      it('should delete single exercise from workout', async () => {
        // Arrange
        const { workouts, exercises } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 2
        })
        const workout = workouts[0]
        const exercise = exercises.find(e => e.workoutId === workout.id)!

        // Act
        const response = await simulateDeleteExercise(prisma, exercise.id, userId, {
          applyToFuture: false
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.deletedCount).toBe(1)

        const deletedExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id }
        })
        expect(deletedExercise).toBeNull()

        // Verify other workout still has exercise
        const futureWorkout = workouts[1]
        const futureExercises = await prisma.exercise.findMany({
          where: { workoutId: futureWorkout.id }
        })
        expect(futureExercises).toHaveLength(2) // Still has exercises
      })

      it('should delete one-off exercise (isOneOff: true)', async () => {
        // Arrange: Create one-off exercise
        const { workouts } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 1
        })
        const workout = workouts[0]
        const completion = await createTestWorkoutCompletion(
          prisma,
          workout.id,
          userId,
          'draft'
        )

        const exerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Extra Exercise'
        })

        const oneOffExercise = await prisma.exercise.create({
          data: {
            name: exerciseDef.name,
            exerciseDefinitionId: exerciseDef.id,
            order: 99,
            isOneOff: true,
            workoutCompletionId: completion.id,
            userId
          }
        })

        // Act
        const response = await simulateDeleteExercise(prisma, oneOffExercise.id, userId, {
          applyToFuture: false
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.deletedCount).toBe(1)

        const deletedExercise = await prisma.exercise.findUnique({
          where: { id: oneOffExercise.id }
        })
        expect(deletedExercise).toBeNull()
      })
    })

    describe('Program-wide mode', () => {
      it('should delete matching exercises from current and future weeks', async () => {
        // Arrange
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1 }
        )

        const week2 = weeks[1]
        const week2Workout = workouts.find(w => w.weekId === week2.id)!
        const week2Exercise = exercises.find(e => e.workoutId === week2Workout.id)!
        const exerciseDefId = week2Exercise.exerciseDefinitionId

        // Act
        const response = await simulateDeleteExercise(prisma, week2Exercise.id, userId, {
          applyToFuture: true
        })

        // Assert: Should delete from weeks 2, 3, 4
        expect(response.success).toBe(true)
        expect(response.deletedCount).toBeGreaterThanOrEqual(3)

        // Verify week 1 still has the exercise
        const week1Exercises = await prisma.exercise.findMany({
          where: {
            workoutId: { in: weeks[0].workouts.map(w => w.id) },
            exerciseDefinitionId: exerciseDefId
          }
        })
        expect(week1Exercises.length).toBeGreaterThan(0)

        // Verify weeks 2-4 don't have the exercise
        for (let i = 1; i < 4; i++) {
          const weekExercises = await prisma.exercise.findMany({
            where: {
              workoutId: { in: weeks[i].workouts.map(w => w.id) },
              exerciseDefinitionId: exerciseDefId
            }
          })
          expect(weekExercises).toHaveLength(0)
        }
      })

      it('should delete from week 2 of 4-week program (verify weeks 2-4 affected)', async () => {
        // Arrange
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1, exercisesPerWorkout: 3 }
        )

        const week2 = weeks[1]
        const week2Workout = workouts.find(w => w.weekId === week2.id)!
        const week2Exercise = exercises.find(e => e.workoutId === week2Workout.id)!
        const exerciseDefId = week2Exercise.exerciseDefinitionId

        // Count initial exercises
        const initialCount = await prisma.exercise.count({
          where: { exerciseDefinitionId: exerciseDefId }
        })
        expect(initialCount).toBe(4) // One per week

        // Act
        const response = await simulateDeleteExercise(prisma, week2Exercise.id, userId, {
          applyToFuture: true
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.deletedCount).toBe(3) // Weeks 2, 3, 4

        // Verify final count
        const finalCount = await prisma.exercise.count({
          where: { exerciseDefinitionId: exerciseDefId }
        })
        expect(finalCount).toBe(1) // Only week 1 remains
      })

      it('should delete when exercise appears multiple times in same workout (supersets)', async () => {
        // Arrange: Create workout with same exercise twice (superset scenario)
        const { weeks, workouts } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 2, workoutsPerWeek: 1 }
        )

        const workout = workouts[0]
        const exerciseDef = await createTestExerciseDefinition(prisma, {
          name: 'Bicep Curls'
        })

        // Add same exercise twice to same workout (simulating superset)
        await prisma.exercise.createMany({
          data: [
            {
              name: exerciseDef.name,
              exerciseDefinitionId: exerciseDef.id,
              order: 10,
              workoutId: workout.id,
              userId
            },
            {
              name: exerciseDef.name,
              exerciseDefinitionId: exerciseDef.id,
              order: 11,
              workoutId: workout.id,
              userId
            }
          ]
        })

        // Do the same for week 2
        const week2Workout = workouts[1]
        await prisma.exercise.createMany({
          data: [
            {
              name: exerciseDef.name,
              exerciseDefinitionId: exerciseDef.id,
              order: 10,
              workoutId: week2Workout.id,
              userId
            },
            {
              name: exerciseDef.name,
              exerciseDefinitionId: exerciseDef.id,
              order: 11,
              workoutId: week2Workout.id,
              userId
            }
          ]
        })

        // Get one exercise from week 1
        const exerciseToDelete = await prisma.exercise.findFirst({
          where: {
            workoutId: workout.id,
            exerciseDefinitionId: exerciseDef.id
          }
        })

        // Act: Delete with applyToFuture
        const response = await simulateDeleteExercise(prisma, exerciseToDelete!.id, userId, {
          applyToFuture: true
        })

        // Assert: Should delete all 4 instances (2 from each week)
        expect(response.success).toBe(true)
        expect(response.deletedCount).toBe(4)

        const remainingExercises = await prisma.exercise.findMany({
          where: { exerciseDefinitionId: exerciseDef.id }
        })
        expect(remainingExercises).toHaveLength(0)
      })
    })
  })

  // ==========================================================================
  // AUTHORIZATION TESTS
  // ==========================================================================

  describe('Authorization', () => {
    it('should reject add when user does not own workout', async () => {
      // Arrange: Create workout for different user
      const otherUser = await createTestUser()
      const { workouts } = await createMultiWeekProgram(prisma, otherUser.id, {
        weekCount: 1
      })
      const workout = workouts[0]

      const exerciseDef = await createTestExerciseDefinition(prisma, {
        name: 'Unauthorized Exercise'
      })

      // Act: Try to add exercise as different user
      const response = await simulateAddExercise(prisma, workout.id, userId, {
        exerciseDefinitionId: exerciseDef.id,
        applyToFuture: false,
        prescribedSets: [
          { setNumber: 1, reps: '10', intensityType: 'NONE' }
        ]
      })

      // Assert
      expect(response.success).toBe(false)
      expect(response.status).toBe(403)
      expect(response.error).toBe('Unauthorized')
    })

    it('should reject replace when user does not own exercise', async () => {
      // Arrange: Create exercise for different user
      const otherUser = await createTestUser()
      const { exercises } = await createMultiWeekProgram(prisma, otherUser.id, {
        weekCount: 1
      })
      const exercise = exercises[0]

      const newExerciseDef = await createTestExerciseDefinition(prisma, {
        name: 'Unauthorized Replacement'
      })

      // Act: Try to replace as different user
      const response = await simulateReplaceExercise(prisma, exercise.id, userId, {
        newExerciseDefinitionId: newExerciseDef.id,
        applyToFuture: false
      })

      // Assert
      expect(response.success).toBe(false)
      expect(response.status).toBe(403)
      expect(response.error).toBe('Unauthorized')
    })

    it('should reject delete when user does not own exercise', async () => {
      // Arrange: Create exercise for different user
      const otherUser = await createTestUser()
      const { exercises } = await createMultiWeekProgram(prisma, otherUser.id, {
        weekCount: 1
      })
      const exercise = exercises[0]

      // Act: Try to delete as different user
      const response = await simulateDeleteExercise(prisma, exercise.id, userId, {
        applyToFuture: false
      })

      // Assert
      expect(response.success).toBe(false)
      expect(response.status).toBe(403)
      expect(response.error).toBe('Unauthorized')
    })
  })

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================

  describe('Validation', () => {
    it('should reject add with missing exerciseDefinitionId', async () => {
      // Arrange
      const { workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1
      })
      const workout = workouts[0]

      // Act
      const response = await simulateAddExercise(prisma, workout.id, userId, {
        exerciseDefinitionId: '', // Missing!
        applyToFuture: false,
        prescribedSets: [
          { setNumber: 1, reps: '10', intensityType: 'NONE' }
        ]
      })

      // Assert
      expect(response.success).toBe(false)
      expect(response.status).toBe(400)
      expect(response.error).toBe('Exercise definition ID is required')
    })

    it('should reject add with empty prescribed sets array', async () => {
      // Arrange
      const { workouts } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1
      })
      const workout = workouts[0]

      const exerciseDef = await createTestExerciseDefinition(prisma, {
        name: 'Invalid Exercise'
      })

      // Act
      const response = await simulateAddExercise(prisma, workout.id, userId, {
        exerciseDefinitionId: exerciseDef.id,
        applyToFuture: false,
        prescribedSets: [] // Empty!
      })

      // Assert
      expect(response.success).toBe(false)
      expect(response.status).toBe(400)
      expect(response.error).toBe('At least one prescribed set is required')
    })

    it('should reject replace with invalid newExerciseDefinitionId', async () => {
      // Arrange
      const { exercises } = await createMultiWeekProgram(prisma, userId, {
        weekCount: 1
      })
      const exercise = exercises[0]

      // Act: Use non-existent exercise definition ID
      const response = await simulateReplaceExercise(prisma, exercise.id, userId, {
        newExerciseDefinitionId: 'non-existent-id',
        applyToFuture: false
      })

      // Assert
      expect(response.success).toBe(false)
      expect(response.status).toBe(404)
      expect(response.error).toBe('New exercise definition not found')
    })
  })

  // ==========================================================================
  // EDIT EXERCISE TESTS
  // ==========================================================================

  describe('Edit Exercise', () => {
    describe('One-off mode', () => {
      it('should update exercise sets and notes for single workout', async () => {
        // Arrange
        const { workouts, exercises } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 2
        })
        const exercise = exercises.find(e => e.workoutId === workouts[0].id)!

        // Create initial prescribed sets
        await prisma.prescribedSet.createMany({
          data: [
            { exerciseId: exercise.id, setNumber: 1, reps: '8', userId },
            { exerciseId: exercise.id, setNumber: 2, reps: '8', userId }
          ]
        })

        // Verify initial state
        const initialExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id },
          include: { prescribedSets: true }
        })
        expect(initialExercise?.prescribedSets).toHaveLength(2)

        // Act: Update with new sets and notes
        const response = await simulateEditExercise(prisma, exercise.id, userId, {
          notes: 'Updated form cue',
          applyToFuture: false,
          prescribedSets: [
            { setNumber: 1, reps: '10', rpe: 8, rir: null },
            { setNumber: 2, reps: '10', rpe: 9, rir: null },
            { setNumber: 3, reps: '8', rpe: 9, rir: null }
          ]
        })

        // Assert: Verify response
        expect(response.success).toBe(true)
        expect(response.updatedCount).toBe(1)
        expect(response.exercises).toHaveLength(1)
        expect(response.exercises![0].notes).toBe('Updated form cue')
        expect(response.exercises![0].prescribedSets).toHaveLength(3)

        // Assert: Verify database state
        const updatedExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id },
          include: { prescribedSets: { orderBy: { setNumber: 'asc' } } }
        })
        expect(updatedExercise?.notes).toBe('Updated form cue')
        expect(updatedExercise?.prescribedSets).toHaveLength(3)
        expect(updatedExercise?.prescribedSets[0].reps).toBe('10')
        expect(updatedExercise?.prescribedSets[0].rpe).toBe(8)

        // Assert: Verify other workout unaffected
        const futureExercise = exercises.find(e => e.workoutId === workouts[1].id)!
        const unchangedExercise = await prisma.exercise.findUnique({
          where: { id: futureExercise.id },
          include: { prescribedSets: true }
        })
        expect(unchangedExercise?.prescribedSets).toHaveLength(0) // No prescribed sets created for this exercise
        expect(unchangedExercise?.notes).toBeNull() // No notes
      })

      it('should change intensity type from RIR to RPE', async () => {
        // Arrange
        const { exercises } = await createMultiWeekProgram(prisma, userId, {
          weekCount: 1
        })
        const exercise = exercises[0]

        // Set initial RIR values
        await prisma.prescribedSet.createMany({
          data: [
            { exerciseId: exercise.id, setNumber: 1, reps: '10', rir: 3, userId }
          ]
        })

        // Act: Change to RPE
        const response = await simulateEditExercise(prisma, exercise.id, userId, {
          applyToFuture: false,
          prescribedSets: [
            { setNumber: 1, reps: '10', rpe: 7, rir: null }
          ]
        })

        // Assert
        expect(response.success).toBe(true)

        const updatedExercise = await prisma.exercise.findUnique({
          where: { id: exercise.id },
          include: { prescribedSets: true }
        })
        expect(updatedExercise?.prescribedSets).toHaveLength(1)
        expect(updatedExercise?.prescribedSets[0].rpe).toBe(7)
        expect(updatedExercise?.prescribedSets[0].rir).toBeNull()
      })
    })

    describe('Program-wide mode', () => {
      it('should update matching exercises in current and all future weeks', async () => {
        // Arrange: 4-week program, edit in week 2
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 4, workoutsPerWeek: 1 }
        )

        const week2 = weeks[1]
        const week2Workout = workouts.find(w => w.weekId === week2.id)!
        const week2Exercise = exercises.find(e => e.workoutId === week2Workout.id)!
        const exerciseDefId = week2Exercise.exerciseDefinitionId

        // Create initial prescribed sets for all exercises
        for (const ex of exercises) {
          await prisma.prescribedSet.createMany({
            data: [
              { exerciseId: ex.id, setNumber: 1, reps: '10', userId },
              { exerciseId: ex.id, setNumber: 2, reps: '10', userId }
            ]
          })
        }

        // Act: Update with new sets and notes
        const response = await simulateEditExercise(prisma, week2Exercise.id, userId, {
          notes: 'Focus on tempo 3-1-1',
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '12', rpe: null, rir: 3 },
            { setNumber: 2, reps: '12', rpe: null, rir: 2 }
          ]
        })

        // Assert: Verify response (should update weeks 2, 3, 4)
        expect(response.success).toBe(true)
        expect(response.updatedCount).toBeGreaterThanOrEqual(3)

        // Verify week 1 unchanged
        const week1Exercises = await prisma.exercise.findMany({
          where: {
            workoutId: { in: weeks[0].workouts.map(w => w.id) },
            exerciseDefinitionId: exerciseDefId
          },
          include: { prescribedSets: true }
        })
        expect(week1Exercises.length).toBeGreaterThan(0)
        expect(week1Exercises[0].notes).toBeNull()
        expect(week1Exercises[0].prescribedSets).toHaveLength(2) // Original count

        // Verify weeks 2-4 updated
        for (let i = 1; i < 4; i++) {
          const weekExercises = await prisma.exercise.findMany({
            where: {
              workoutId: { in: weeks[i].workouts.map(w => w.id) },
              exerciseDefinitionId: exerciseDefId
            },
            include: { prescribedSets: { orderBy: { setNumber: 'asc' } } }
          })
          expect(weekExercises.length).toBeGreaterThan(0)
          expect(weekExercises[0].notes).toBe('Focus on tempo 3-1-1')
          expect(weekExercises[0].prescribedSets).toHaveLength(2)
          expect(weekExercises[0].prescribedSets[0].reps).toBe('12')
          expect(weekExercises[0].prescribedSets[0].rir).toBe(3)
        }
      })

      it('should update set count program-wide (3 sets to 5 sets)', async () => {
        // Arrange
        const { weeks, workouts, exercises } = await createMultiWeekProgram(
          prisma,
          userId,
          { weekCount: 3, workoutsPerWeek: 1, exercisesPerWorkout: 1 }
        )

        const week1Workout = workouts.find(w => w.weekId === weeks[0].id)!
        const week1Exercise = exercises.find(e => e.workoutId === week1Workout.id)!

        // Act: Update to 5 sets
        const response = await simulateEditExercise(prisma, week1Exercise.id, userId, {
          applyToFuture: true,
          prescribedSets: [
            { setNumber: 1, reps: '5', rpe: null, rir: 4 },
            { setNumber: 2, reps: '5', rpe: null, rir: 3 },
            { setNumber: 3, reps: '5', rpe: null, rir: 2 },
            { setNumber: 4, reps: '5', rpe: null, rir: 1 },
            { setNumber: 5, reps: '5', rpe: null, rir: 0 }
          ]
        })

        // Assert
        expect(response.success).toBe(true)
        expect(response.updatedCount).toBe(3) // All 3 weeks

        // Verify all weeks have 5 sets
        const allExercises = await prisma.exercise.findMany({
          where: {
            exerciseDefinitionId: week1Exercise.exerciseDefinitionId
          },
          include: { prescribedSets: true }
        })

        expect(allExercises).toHaveLength(3) // One per week
        for (const ex of allExercises) {
          expect(ex.prescribedSets).toHaveLength(5)
        }
      })
    })
  })
})
