import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { createInvite } from '@/lib/coaching/invites'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, coachInviteLimiter } from '@/lib/rate-limit'

/**
 * POST /api/coaching/invites: makes an invite link for the signed-in coach.
 * The plain token is in this response only; it expires in 7 days.
 */
export async function POST() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited = await checkRateLimit(coachInviteLimiter, user.id)
    if (limited) return limited

    const invite = await createInvite(prisma, user.id)
    logger.info({ userId: user.id, inviteId: invite.id }, 'Coach invite created')
    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    logger.error({ error, context: 'coaching-invite-create' }, 'Failed to create coach invite')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
