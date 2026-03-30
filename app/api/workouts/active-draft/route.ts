import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draft = await prisma.workoutCompletion.findFirst({
      where: {
        userId: user.id,
        status: 'draft',
        isArchived: false,
      },
      orderBy: { completedAt: 'desc' },
      include: {
        workout: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!draft) {
      return NextResponse.json({ draft: null })
    }

    return NextResponse.json({
      draft: {
        completionId: draft.id,
        workoutId: draft.workoutId,
        workoutName: draft.workout.name,
      },
    })
  } catch (err) {
    logger.error({ error: err }, 'Failed to fetch active draft')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
