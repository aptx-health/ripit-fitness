import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { acceptInvite } from '@/lib/coaching/invites'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, coachAcceptLimiter, getClientIp } from '@/lib/rate-limit'

const REFUSED_STATUS = { invalid: 410, self: 400, already_linked: 409 } as const

/**
 * POST /api/coaching/invites/accept { token }: links the signed-in user as the
 * invite's trainee. Refusals are 4xx { code: invalid | self | already_linked }
 * and change nothing. The trainee is always the signed-in user.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited =
      (await checkRateLimit(coachAcceptLimiter, user.id)) ??
      (await checkRateLimit(coachAcceptLimiter, `ip:${getClientIp(request)}`))
    if (limited) return limited

    const body = await request.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token : ''
    if (!token) {
      return NextResponse.json({ error: 'Token is required', code: 'invalid' }, { status: 400 })
    }

    const result = await acceptInvite(prisma, token, user.id)
    if (!result.ok) {
      return NextResponse.json({ error: 'Invite refused', code: result.code }, { status: REFUSED_STATUS[result.code] })
    }
    logger.info({ userId: user.id, linkId: result.linkId }, 'Coach invite accepted')
    return NextResponse.json({ linkId: result.linkId })
  } catch (error) {
    logger.error({ error, context: 'coaching-invite-accept' }, 'Failed to accept coach invite')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
