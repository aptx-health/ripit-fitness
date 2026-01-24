import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify week exists and user owns it (through the program)
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                prescribedSets: true,
                loggedSets: true
              }
            }
          }
        },
        program: true
      }
    })

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }

    if (week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete week and all related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all data for each workout in the week
      for (const workout of week.workouts) {
        // Delete logged sets for all exercises in this workout
        for (const exercise of workout.exercises) {
          await tx.loggedSet.deleteMany({
            where: { exerciseId: exercise.id }
          })

          await tx.prescribedSet.deleteMany({
            where: { exerciseId: exercise.id }
          })
        }

        // Delete all exercises in this workout
        await tx.exercise.deleteMany({
          where: { workoutId: workout.id }
        })

        // Delete any workout completions
        await tx.workoutCompletion.deleteMany({
          where: { workoutId: workout.id }
        })

        // Delete the workout
        await tx.workout.delete({
          where: { id: workout.id }
        })
      }

      // Delete the week itself
      await tx.week.delete({
        where: { id: weekId }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Week deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
