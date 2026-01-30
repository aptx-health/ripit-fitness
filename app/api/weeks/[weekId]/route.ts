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

    // Collect IDs for batch deletion
    const workoutIds = week.workouts.map(w => w.id)
    const exerciseIds = week.workouts.flatMap(w => w.exercises.map(e => e.id))

    // Delete week and all related data in transaction with extended timeout
    await prisma.$transaction(
      async (tx) => {
        // Batch delete all logged sets for exercises in this week
        if (exerciseIds.length > 0) {
          await tx.loggedSet.deleteMany({
            where: { exerciseId: { in: exerciseIds } }
          })

          await tx.prescribedSet.deleteMany({
            where: { exerciseId: { in: exerciseIds } }
          })
        }

        // Batch delete all exercises in this week's workouts
        if (workoutIds.length > 0) {
          await tx.exercise.deleteMany({
            where: { workoutId: { in: workoutIds } }
          })

          await tx.workoutCompletion.deleteMany({
            where: { workoutId: { in: workoutIds } }
          })

          await tx.workout.deleteMany({
            where: { id: { in: workoutIds } }
          })
        }

        // Delete the week itself
        await tx.week.delete({
          where: { id: weekId }
        })
      },
      {
        timeout: 30000 // 30 second timeout for large weeks
      }
    )

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
