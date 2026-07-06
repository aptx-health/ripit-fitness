import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { isValidSessionRpe } from '@/lib/effort-prompt'
import { logger } from '@/lib/logger'
import { checkRateLimitWithHeaders, workoutActionLimiter } from '@/lib/rate-limit'

/**
 * PATCH /api/workouts/completions/[completionId]/effort
 *
 * Persists a session-level effort rating (RPE-equivalent 6–10) captured via
 * the word-label chips on the rollup. Fire-and-forget from the client; never
 * blocks dismissal. Update is scoped to `{ id, userId }` so a user can only
 * rate their own completions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  try {
    const { completionId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimitWithHeaders(
      workoutActionLimiter,
      user.id,
      { endpoint: 'completions/effort' }
    )
    if (limited.response) return limited.response

    let body: { sessionRpe?: unknown }
    try {
      body = (await request.json()) as { sessionRpe?: unknown }
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: limited.headers }
      )
    }

    if (!isValidSessionRpe(body.sessionRpe)) {
      return NextResponse.json(
        { error: 'sessionRpe must be an integer between 6 and 10' },
        { status: 400, headers: limited.headers }
      )
    }

    const result = await prisma.workoutCompletion.updateMany({
      where: { id: completionId, userId: user.id },
      data: { sessionRpe: body.sessionRpe },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: limited.headers }
      )
    }

    return NextResponse.json(
      { success: true, sessionRpe: body.sessionRpe },
      { headers: limited.headers }
    )
  } catch (err) {
    logger.error(
      { error: err, context: 'completions-effort' },
      'Failed to persist session effort rating'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
