import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { MAX_PINS, savePins } from '@/lib/insights/pinned-lifts'
import { logger } from '@/lib/logger'
import { checkRateLimitWithHeaders, progressPinsLimiter } from '@/lib/rate-limit'

/** The ids from the body, or the reason they can't be saved. */
function parseIds(body: unknown): { ids: string[] } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be an object' }
  const ids = (body as { exerciseDefinitionIds?: unknown }).exerciseDefinitionIds
  if (!Array.isArray(ids)) return { error: 'exerciseDefinitionIds must be an array' }
  if (!ids.every((id) => typeof id === 'string' && id.length > 0)) {
    return { error: 'exerciseDefinitionIds must be non-empty strings' }
  }
  if (new Set(ids).size !== ids.length) return { error: 'exerciseDefinitionIds must not repeat' }
  if (ids.length > MAX_PINS) return { error: `You can track up to ${MAX_PINS} lifts` }
  return { ids }
}

/**
 * PUT /api/progress/pins  { exerciseDefinitionIds: string[] }
 * Replaces the signed-in user's pinned lifts, in the order given. An empty
 * list unpins everything. Each id must be a system exercise or the user's own.
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimitWithHeaders(progressPinsLimiter, user.id, { endpoint: 'progress/pins' })
    if (limited.response) return limited.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body must be JSON' }, { status: 400, headers: limited.headers })
    }
    const parsed = parseIds(body)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400, headers: limited.headers })
    }

    const { ids } = parsed
    const known = await prisma.exerciseDefinition.count({
      where: { id: { in: ids }, OR: [{ isSystem: true }, { userId: user.id }] },
    })
    if (known !== ids.length) {
      return NextResponse.json({ error: 'Unknown exercise' }, { status: 400, headers: limited.headers })
    }

    await savePins(prisma, user.id, ids)
    return NextResponse.json({ success: true }, { headers: limited.headers })
  } catch (error) {
    logger.error({ error, context: 'progress-pins' }, 'Failed to save pinned lifts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
