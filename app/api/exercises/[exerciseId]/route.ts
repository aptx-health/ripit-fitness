import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function PATCH(
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
    const body = await request.json()
    const { notes, prescribedSets, applyToFuture } = body

    // Verify exercise exists and user owns it (through the program)
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
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Check ownership - either through workout or direct userId for one-offs
    if (exercise.workout) {
      if (exercise.workout.week.program.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else {
      if (exercise.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    let updatedCount = 0
    let updatedExercises: any[] = []

    if (!applyToFuture || !exercise.workout) {
      // Update only this exercise
      const updatedExercise = await prisma.$transaction(async (tx) => {
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
              weight: set.weight || null,
              rpe: set.rpe || null,
              rir: set.rir || null,
              exerciseId: ex.id,
              userId: user.id
            }))
          })
        }

        // Return exercise with all relations
        return await tx.exercise.findUnique({
          where: { id: ex.id },
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
      updatedExercises = [updatedExercise!]
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
                weight: set.weight || null,
                rpe: set.rpe || null,
                rir: set.rir || null,
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
    console.error('Error updating exercise:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Verify exercise exists and user owns it (through the program)
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
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Check ownership - either through workout or direct userId for one-offs
    if (exercise.workout) {
      if (exercise.workout.week.program.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else {
      if (exercise.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Delete exercise and all related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete prescribed sets first (due to foreign key constraints)
      await tx.prescribedSet.deleteMany({
        where: { exerciseId }
      })

      // Delete logged sets if any exist
      await tx.loggedSet.deleteMany({
        where: { exerciseId }
      })

      // Delete the exercise
      await tx.exercise.delete({
        where: { id: exerciseId }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Exercise deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting exercise:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}