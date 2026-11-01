import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { getSuggestionDetail } from '@/lib/suggestions/detail'

/** GET /api/suggestions/[id]: one suggestion, any status, with its review body. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    const suggestion = await getSuggestionDetail(user.id, id)
    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found.', code: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ suggestion })
  } catch (error) {
    logger.error({ error, context: 'suggestion-get' }, 'Failed to load suggestion')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
