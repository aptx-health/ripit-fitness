import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { loadEffortScale } from '@/lib/insights/effort-scale'
import { getLiftHistory } from '@/lib/insights/lift-history'
import { resolvePins } from '@/lib/insights/pinned-lifts'
import { isValidTimeZone } from '@/lib/insights/progress'
import { logger } from '@/lib/logger'
import { checkRateLimitWithHeaders, progressLiftLimiter } from '@/lib/rate-limit'

/** The user's pinned lifts in order, with names, for the page's chips; pins whose definition is gone are dropped. */
async function pinnedLifts(userId: string): Promise<Array<{ exerciseDefinitionId: string; name: string }>> {
  const ids = await resolvePins(prisma, userId)
  if (ids.length === 0) return []
  const definitions = await prisma.exerciseDefinition.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  const names = new Map(definitions.map((d) => [d.id, d.name]))
  return ids.flatMap((id) => {
    const name = names.get(id)
    return name == null ? [] : [{ exerciseDefinitionId: id, name }]
  })
}

/**
 * GET /api/progress/lift/[id]?tz=<IANA zone>
 * One lift's history for the signed-in user: its sessions, rep records and
 * weekly working sets as raw numbers, plus the pinned lifts for the chips and
 * the user's effort scale for the session averages.
 * 404 for an exercise that doesn't exist or is another user's private one.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimitWithHeaders(progressLiftLimiter, user.id, { endpoint: 'progress/lift' })
    if (limited.response) return limited.response

    const timeZone = request.nextUrl.searchParams.get('tz') ?? ''
    if (!isValidTimeZone(timeZone)) {
      return NextResponse.json({ error: 'tz must be an IANA time zone' }, { status: 400, headers: limited.headers })
    }

    const { id } = await params
    const [history, pinned, effortScale] = await Promise.all([
      getLiftHistory(prisma, user.id, id, { timeZone }),
      pinnedLifts(user.id),
      loadEffortScale(prisma, user.id),
    ])
    if (!history) {
      return NextResponse.json({ error: 'Lift not found' }, { status: 404, headers: limited.headers })
    }
    return NextResponse.json({ success: true, lift: { ...history, pinned, effortScale } }, { headers: limited.headers })
  } catch (error) {
    logger.error({ error, context: 'progress-lift' }, 'Failed to load the lift history')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
