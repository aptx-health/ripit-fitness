import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/workouts/[workoutId]/metadata
 * Returns minimal workout data for fast modal opening
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Single query for workout metadata with exercise count
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        id: true,
        name: true,
        dayNumber: true,
        week: {
          select: {
            program: { select: { id: true, userId: true } },
          },
        },
        completions: {
          where: { userId: user.id },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { id: true },
        },
        _count: {
          select: { exercises: true },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const completionId = workout.completions[0]?.id

    // Get total exercise count including one-offs if there's a completion
    let exerciseCount = workout._count.exercises
    if (completionId) {
      const oneOffCount = await prisma.exercise.count({
        where: {
          workoutCompletionId: completionId,
          isOneOff: true,
          userId: user.id,
        },
      })
      exerciseCount += oneOffCount
    }

    return NextResponse.json({
      workout: {
        id: workout.id,
        name: workout.name,
        dayNumber: workout.dayNumber,
        programId: workout.week.program.id,
      },
      exerciseCount,
      completionId,
    })
  } catch (error) {
    logger.error({ error, context: 'workout-metadata' }, 'Error fetching workout metadata')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
