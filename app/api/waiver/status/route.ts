import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { CURRENT_WAIVER_VERSION } from '@/lib/constants/waiver'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/waiver/status
 *
 * Returns the user's waiver acceptance status relative to
 * CURRENT_WAIVER_VERSION.
 */
export async function GET() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const latest = await prisma.waiverAcceptance.findFirst({
      where: { userId: user.id },
      orderBy: { acceptedAt: 'desc' },
    })

    const accepted = latest?.waiverVersion === CURRENT_WAIVER_VERSION

    return NextResponse.json({
      accepted,
      currentVersion: CURRENT_WAIVER_VERSION,
      acceptedVersion: latest?.waiverVersion ?? null,
      acceptedAt: latest?.acceptedAt?.toISOString() ?? null,
    })
  } catch (error) {
    logger.error({ error, context: 'GET /api/waiver/status' }, 'Failed to get waiver status')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
