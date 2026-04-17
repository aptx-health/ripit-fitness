import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { CURRENT_WAIVER_VERSION } from '@/lib/constants/waiver'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  checkRateLimitWithHeaders,
  getClientIp,
  authSensitiveLimiter,
  withRateLimitHeaders,
} from '@/lib/rate-limit'

/** Maximum length for the waiverVersion field. */
const MAX_VERSION_LENGTH = 20

/**
 * POST /api/waiver/accept
 *
 * Records the user's acceptance of a waiver version.
 * Idempotent: if the user already accepted this version, returns success
 * without creating a duplicate row.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimitWithHeaders(authSensitiveLimiter, getClientIp(request), {
      endpoint: 'POST /api/waiver/accept',
    })
    if (rl.response) return rl.response

    const body = await request.json().catch(() => null)
    if (!body || typeof body.waiverVersion !== 'string') {
      return withRateLimitHeaders(
        NextResponse.json({ error: 'waiverVersion is required' }, { status: 400 }),
        rl
      )
    }

    const waiverVersion = body.waiverVersion.trim()
    if (!waiverVersion || waiverVersion.length > MAX_VERSION_LENGTH) {
      return withRateLimitHeaders(
        NextResponse.json({ error: 'Invalid waiverVersion' }, { status: 400 }),
        rl
      )
    }

    // Idempotency: check if already accepted this version
    const existing = await prisma.waiverAcceptance.findFirst({
      where: { userId: user.id, waiverVersion },
    })

    if (existing) {
      logger.debug(
        { userId: user.id, waiverVersion },
        'Waiver already accepted, returning success'
      )
      return withRateLimitHeaders(
        NextResponse.json({ accepted: true, version: waiverVersion }),
        rl
      )
    }

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || undefined

    await prisma.waiverAcceptance.create({
      data: {
        userId: user.id,
        waiverVersion,
        ipAddress: ipAddress !== 'unknown' ? ipAddress : null,
        userAgent: userAgent || null,
      },
    })

    logger.info(
      { userId: user.id, waiverVersion, currentVersion: CURRENT_WAIVER_VERSION },
      'Waiver accepted'
    )

    return withRateLimitHeaders(
      NextResponse.json({ accepted: true, version: waiverVersion }),
      rl
    )
  } catch (error) {
    logger.error({ error, context: 'POST /api/waiver/accept' }, 'Failed to accept waiver')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
