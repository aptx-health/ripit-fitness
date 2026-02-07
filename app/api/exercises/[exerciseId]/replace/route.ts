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
        // Find all matching exercises in future weeks with a single query
        const exercisesToUpdate = await tx.exercise.findMany({
          where: {
            exerciseDefinitionId: oldExerciseDefinitionId,
            workout: {
              week: {
                programId,
                weekNumber: {
                  gte: currentWeekNumber
                }
              }
            }
          },
          select: { id: true }
        })

        const exerciseIds = exercisesToUpdate.map(e => e.id)

        // Bulk update all matching exercises in one query
        await tx.exercise.updateMany({
          where: { id: { in: exerciseIds } },
          data: {
            exerciseDefinitionId: newExerciseDefinitionId,
            name: newExerciseDefinition.name,
            ...(notes !== undefined ? { notes } : {})
          }
        })

        // If prescribed sets are provided, replace them in bulk
        if (prescribedSets && prescribedSets.length > 0) {
          // Bulk delete all old prescribed sets
          await tx.prescribedSet.deleteMany({
            where: { exerciseId: { in: exerciseIds } }
          })

          // Bulk create new prescribed sets for all exercises
          await tx.prescribedSet.createMany({
            data: exerciseIds.flatMap(exerciseId =>
              prescribedSets.map(set => ({
                setNumber: set.setNumber,
                reps: set.reps,
                rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
                rir: set.intensityType === 'RIR' ? set.intensityValue : null,
                exerciseId,
                userId: user.id
              }))
            )
          })
        }

        updatedCount = exerciseIds.length

        // Fetch updated exercises for response
        updatedExercises = await tx.exercise.findMany({
          where: { id: { in: exerciseIds } },
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
