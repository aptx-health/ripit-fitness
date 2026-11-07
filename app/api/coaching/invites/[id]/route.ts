import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { revokeInvite } from '@/lib/coaching/invites'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, coachLinkLimiter } from '@/lib/rate-limit'

/**
 * DELETE /api/coaching/invites/[id]: revokes one of the coach's invites; the
 * link then reads "no longer valid". Another user's or an unknown id is a 404.
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

    if (!(await revokeInvite(prisma, user.id, id))) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    logger.info({ userId: user.id, inviteId: id }, 'Coach invite revoked')
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error, context: 'coaching-invite-revoke' }, 'Failed to revoke coach invite')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
