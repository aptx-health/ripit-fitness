import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { findAdHocCompletion } from '@/lib/db/adhoc-completion'
import { logger } from '@/lib/logger'
import { checkRateLimit, destructiveOpLimiter } from '@/lib/rate-limit'

/**
 * DELETE /api/workouts/adhoc/[completionId]
 *
 * Discards an ad-hoc workout draft. Cascades to Exercise + LoggedSet rows
 * via the schema's onDelete: Cascade. Equivalent to /clear for programmed
 * workouts but completion-keyed instead of workout-keyed.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  try {
    const { completionId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(destructiveOpLimiter, user.id)
    if (limited) return limited

    const lookup = await findAdHocCompletion(completionId, user.id)
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status })
    }

    if (lookup.completion.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft workouts can be discarded' },
        { status: 400 }
      )
    }

    await prisma.workoutCompletion.delete({ where: { id: completionId } })

    logger.info(
      { userId: user.id, completionId },
      'Ad-hoc workout discarded'
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ error: err, context: 'adhoc-discard' }, 'Failed to discard ad-hoc workout')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
