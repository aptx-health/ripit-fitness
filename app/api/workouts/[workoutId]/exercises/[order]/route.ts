import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/workouts/[workoutId]/exercises/[order]
 * Returns a single exercise at the specified order position (1-based)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string; order: string }> }
) {
  try {
    const { workoutId, order: orderStr } = await params
    const orderNum = parseInt(orderStr, 10)

    if (isNaN(orderNum) || orderNum < 1) {
      return NextResponse.json({ error: 'Invalid order parameter' }, { status: 400 })
    }

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional completionId for one-off exercises
    const { searchParams } = new URL(request.url)
    const completionId = searchParams.get('completionId')

    // First verify workout ownership
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        week: {
          select: {
            program: { select: { userId: true } },
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build where conditions for both program exercises and one-offs
    const whereConditions: Array<{
      workoutId?: string
      workoutCompletionId?: string
      isOneOff?: boolean
    }> = [{ workoutId }]
    if (completionId) {
      whereConditions.push({ workoutCompletionId: completionId, isOneOff: true })
    }

    // Get total count for navigation info
    const totalExercises = await prisma.exercise.count({
      where: { OR: whereConditions, userId: user.id },
    })

    // Get all exercise IDs in order to find the one at the target position
    const allExercises = await prisma.exercise.findMany({
      where: { OR: whereConditions, userId: user.id },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    })

    // orderNum is 1-based, array is 0-indexed
    const targetIndex = orderNum - 1
    if (targetIndex >= allExercises.length) {
      return NextResponse.json({
        exercise: null,
        hasNext: false,
        hasPrevious: orderNum > 1,
        totalExercises,
      })
    }

    const targetExerciseId = allExercises[targetIndex].id

    // Fetch the full exercise data
    const exercise = await prisma.exercise.findUnique({
      where: { id: targetExerciseId },
      select: {
        id: true,
        name: true,
        order: true,
        exerciseGroup: true,
        notes: true,
        isOneOff: true,
        exerciseDefinitionId: true,
        exerciseDefinition: {
          select: {
            id: true,
            name: true,
            primaryFAUs: true,
            secondaryFAUs: true,
            equipment: true,
            instructions: true,
            isSystem: true,
            createdBy: true,
          },
        },
        prescribedSets: {
          orderBy: { setNumber: 'asc' },
          select: {
            id: true,
            setNumber: true,
            reps: true,
            weight: true,
            rpe: true,
            rir: true,
          },
        },
      },
    })

    return NextResponse.json({
      exercise,
      hasNext: orderNum < totalExercises,
      hasPrevious: orderNum > 1,
      totalExercises,
    })
  } catch (error) {
    logger.error({ error, context: 'exercise-by-order' }, 'Error fetching exercise by order')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
