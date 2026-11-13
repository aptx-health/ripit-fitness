import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { adminLimiter, checkRateLimit } from '@/lib/rate-limit'

/**
 * Read-only status probe for the caller's UserTrainingAggregates row (issue
 * #940). Exists to give the post-deploy staging smoke test a stable surface to
 * poll after completing a workout: it should observe `computedAt` advance once
 * the BullMQ aggregates worker (cloud-functions/clone-program) picks up the
 * recompute job the completion route enqueues.
 *
 * Scoped strictly to the authenticated caller's own row — it returns only
 * recompute metadata (no training data blobs), so it's safe to leave enabled in
 * every environment. Callers that have never completed a qualifying session get
 * `{ exists: false }`.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(adminLimiter, user.id)
    if (limited) return limited

    const row = await prisma.userTrainingAggregates.findUnique({
      where: { userId: user.id },
      select: {
        computedAt: true,
        dataMaturity: true,
        qualifyingSessionsTotal: true,
        sessionsLast7d: true,
        lastSessionAt: true,
      },
    })

    if (!row) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      computedAt: row.computedAt.toISOString(),
      dataMaturity: row.dataMaturity,
      qualifyingSessionsTotal: row.qualifyingSessionsTotal,
      sessionsLast7d: row.sessionsLast7d,
      lastSessionAt: row.lastSessionAt ? row.lastSessionAt.toISOString() : null,
    })
  } catch (error) {
    logger.error({ error, context: 'debug-aggregates-status' }, 'Failed to read aggregates status')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
