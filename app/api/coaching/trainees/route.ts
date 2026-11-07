import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { listTrainees } from '@/lib/coaching/links'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, coachTraineesLimiter } from '@/lib/rate-limit'

/** GET /api/coaching/trainees: { trainees: [{ linkId, name }] }, the user's active links as coach. */
export async function GET() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limited = await checkRateLimit(coachTraineesLimiter, user.id)
    if (limited) return limited

    const trainees = await listTrainees(prisma, user.id)
    return NextResponse.json({ trainees })
  } catch (error) {
    logger.error({ error, context: 'coaching-trainees' }, 'Failed to list trainees')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
