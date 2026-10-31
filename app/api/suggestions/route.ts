import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { listPendingSuggestions } from '@/lib/suggestions/detail'
import { suggestionKindLabel } from '@/lib/suggestions/kinds'

/** GET /api/suggestions: the user's pending suggestions, newest first. */
export async function GET() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    const items = await listPendingSuggestions(user.id)
    return NextResponse.json({
      suggestions: items.map((item) => ({ ...item, kindLabel: suggestionKindLabel(item.kind) })),
    })
  } catch (error) {
    logger.error({ error, context: 'suggestions-list' }, 'Failed to list suggestions')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
