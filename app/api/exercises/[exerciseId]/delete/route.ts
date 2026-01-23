import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type DeleteExerciseRequest = {
  applyToFuture: boolean
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
    const body = await request.json() as DeleteExerciseRequest
    const { applyToFuture } = body

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
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Verify ownership
    if (exercise.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify program ownership if exercise is part of a workout
    if (exercise.workout && exercise.workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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

    return NextResponse.json({
      success: true,
      deletedCount
    })
  } catch (error) {
    console.error('Error deleting exercise:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
