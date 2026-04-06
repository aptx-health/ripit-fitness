import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/programs/[programId]/workout-history
 * Check if a program has non-archived workout completion records
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    const { user, error: authError } = await getCurrentUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        userId: user.id,
      },
      select: { id: true },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const completionCount = await prisma.workoutCompletion.count({
      where: {
        workout: {
          week: {
            programId,
          },
        },
        userId: user.id,
        isArchived: false,
      },
    })

    logger.debug({ programId, completionCount }, 'Workout history check')

    return NextResponse.json({
      hasHistory: completionCount > 0,
      completionCount,
    })
  } catch (error) {
    logger.error({ error }, 'Error checking workout history')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
