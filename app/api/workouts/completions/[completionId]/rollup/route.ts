import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { computeWorkoutRollup } from '@/lib/stats/workout-rollup'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  try {
    const { completionId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rollup = await computeWorkoutRollup(prisma, completionId, user.id)
    if (!rollup) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ rollup })
  } catch (err) {
    logger.error({ error: err, context: 'workout-rollup' }, 'Failed to compute rollup')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
