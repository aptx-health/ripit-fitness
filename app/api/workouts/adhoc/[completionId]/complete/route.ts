import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { findAdHocCompletion } from '@/lib/db/adhoc-completion'
import { recordEvent } from '@/lib/events'
import { logger } from '@/lib/logger'
import { enqueueAggregatesRecompute } from '@/lib/queue/aggregates-jobs'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { computeWorkoutRollup } from '@/lib/stats/workout-rollup'

export async function POST(
  _request: NextRequest,
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

    const lookup = await findAdHocCompletion(completionId, user.id)
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status })
    }

    if (lookup.completion.status === 'completed') {
      return NextResponse.json(
        { error: 'Workout already completed' },
        { status: 400 }
      )
    }

    // Require at least one logged set so we don't persist empty ad-hoc sessions.
    const setCount = await prisma.loggedSet.count({ where: { completionId } })
    if (setCount === 0) {
      return NextResponse.json(
        { error: 'Log at least one set before completing.' },
        { status: 400 }
      )
    }

    const completedAt = new Date()
    const durationSeconds = lookup.completion.startedAt
      ? Math.max(
          0,
          Math.round(
            (completedAt.getTime() - lookup.completion.startedAt.getTime()) / 1000
          )
        )
      : null

    const completion = await prisma.workoutCompletion.update({
      where: { id: completionId },
      data: { status: 'completed', completedAt, durationSeconds },
      select: { id: true, completedAt: true, status: true },
    })

    recordEvent(user.id, 'adhoc_workout_completed', { completionId })
    // Refresh the Suggest training-state layer off the request path (#919).
    void enqueueAggregatesRecompute(user.id)

    logger.info(
      { userId: user.id, completionId, setCount },
      'Ad-hoc workout completed'
    )

    let rollup = null
    try {
      rollup = await computeWorkoutRollup(prisma, completion.id, user.id)
    } catch (rollupErr) {
      logger.error(
        { error: rollupErr, completionId: completion.id, context: 'adhoc-complete' },
        'Failed to compute rollup; returning completion without it'
      )
    }

    return NextResponse.json({ success: true, completion, rollup })
  } catch (err) {
    logger.error(
      { error: err, context: 'adhoc-complete' },
      'Error completing ad-hoc workout'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
