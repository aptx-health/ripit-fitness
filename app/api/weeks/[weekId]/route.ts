import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

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
              },
              orderBy: { order: 'asc' }
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

    // Delete week and renumber remaining weeks in transaction
    const renumberedWeeks = await prisma.$transaction(
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

        // Renumber remaining weeks sequentially to close gaps
        const remainingWeeks = await tx.week.findMany({
          where: { programId: week.programId },
          orderBy: { weekNumber: 'asc' },
          select: { id: true, weekNumber: true },
        })

        for (let i = 0; i < remainingWeeks.length; i++) {
          const expectedNumber = i + 1
          if (remainingWeeks[i].weekNumber !== expectedNumber) {
            await tx.week.update({
              where: { id: remainingWeeks[i].id },
              data: { weekNumber: expectedNumber },
            })
          }
        }

        // Return the renumbered weeks
        return remainingWeeks.map((w, i) => ({
          id: w.id,
          weekNumber: i + 1,
        }))
      },
      {
        timeout: 30000 // 30 second timeout for large weeks
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Week deleted successfully',
      renumberedWeeks,
    })
  } catch (error) {
    logger.error({ error, context: 'week-delete' }, 'Error deleting week')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
