import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getLastExercisePerformance } from '@/lib/queries/exercise-history'
import { logger } from '@/lib/logger'

/**
 * GET /api/exercises/[exerciseId]/history
 * Returns the last performance history for an exercise
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify exercise exists and belongs to user
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        exerciseDefinitionId: true,
        userId: true,
      },
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    if (exercise.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch history using existing utility
    const history = await getLastExercisePerformance(
      exercise.exerciseDefinitionId,
      user.id,
      new Date()
    )

    return NextResponse.json({ history })
  } catch (error) {
    logger.error({ error, context: 'exercise-history' }, 'Error fetching exercise history')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
