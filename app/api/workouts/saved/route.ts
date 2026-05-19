import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/workouts/saved
 * Lists the current user's saved workouts, sorted by
 * lastUsedAt DESC NULLS LAST, createdAt DESC.
 */
export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saved = await prisma.savedWorkout.findMany({
      where: { userId: user.id },
      orderBy: [
        { lastUsedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        notes: true,
        exerciseCount: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ saved })
  } catch (error) {
    logger.error({ error, context: 'saved-workouts-list' }, 'Failed to list saved workouts')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
