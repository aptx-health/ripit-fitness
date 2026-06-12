import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { findAdHocCompletion } from '@/lib/db/adhoc-completion'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'

type ReorderItem = {
  exerciseId: string
  order: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  try {
    const { completionId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    const body = (await request.json()) as { exercises?: ReorderItem[] }
    const exercises = body.exercises
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Exercises array is required' },
        { status: 400 },
      )
    }
    for (const item of exercises) {
      if (!item.exerciseId || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'Each exercise must have exerciseId and order' },
          { status: 400 },
        )
      }
    }

    const lookup = await findAdHocCompletion(completionId, user.id)
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status })
    }

    // Verify all exercises belong to this ad-hoc completion and to this user.
    const existing = await prisma.exercise.findMany({
      where: { workoutCompletionId: completionId },
      select: { id: true, userId: true },
    })
    const ownedIds = new Set(existing.filter((e) => e.userId === user.id).map((e) => e.id))
    for (const item of exercises) {
      if (!ownedIds.has(item.exerciseId)) {
        return NextResponse.json(
          { error: `Exercise ${item.exerciseId} does not belong to this workout` },
          { status: 400 },
        )
      }
    }

    await prisma.$transaction(
      exercises.map((item) =>
        prisma.exercise.update({
          where: { id: item.exerciseId },
          data: { order: item.order },
        }),
      ),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error, context: 'adhoc-exercises-reorder' }, 'Failed to reorder ad-hoc exercises')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
