import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json() as ReplaceExerciseRequest
    const { newExerciseDefinitionId, applyToFuture, prescribedSets, notes } = body

    // Validate required fields
    if (!newExerciseDefinitionId) {
      return NextResponse.json(
        { error: 'New exercise definition ID is required' },
        { status: 400 }
      )
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
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Check ownership through workout/program
    if (exercise.workout && exercise.workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If one-off exercise, check ownership directly
    if (exercise.isOneOff && exercise.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify new exercise definition exists
    const newExerciseDefinition = await prisma.exerciseDefinition.findUnique({
      where: { id: newExerciseDefinitionId }
    })

    if (!newExerciseDefinition) {
      return NextResponse.json(
        { error: 'New exercise definition not found' },
        { status: 404 }
      )
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
              userId: user.id
            }))
          })
        }

        // Return exercise with all relations
        return await tx.exercise.findUnique({
          where: { id: exerciseId },
          include: {
            prescribedSets: {
              orderBy: { setNumber: 'asc' }
            },
            exerciseDefinition: {
              select: {
                id: true,
                name: true,
                primaryFAUs: true,
                secondaryFAUs: true,
                equipment: true,
                instructions: true
              }
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
                userId: user.id
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
            },
            exerciseDefinition: {
              select: {
                id: true,
                name: true,
                primaryFAUs: true,
                secondaryFAUs: true,
                equipment: true,
                instructions: true
              }
            }
          }
        })
      })
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      exercises: updatedExercises
    })
  } catch (error) {
    console.error('Error replacing exercise:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
