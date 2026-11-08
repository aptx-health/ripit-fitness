import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { endLink } from '@/lib/coaching/links'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, coachLinkLimiter } from '@/lib/rate-limit'

/**
 * DELETE /api/coaching/links/[id]: ends a coach link from either side.
 * Proposals already sent stay with the trainee. A link the user isn't part
 * of, or an unknown id, is a 404.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited = await checkRateLimit(coachLinkLimiter, user.id)
    if (limited) return limited

    if (!(await endLink(prisma, user.id, id))) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    logger.info({ userId: user.id, linkId: id }, 'Coach link ended')
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error, context: 'coaching-link-end' }, 'Failed to end coach link')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
