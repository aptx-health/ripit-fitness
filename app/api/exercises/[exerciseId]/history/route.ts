import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getRecentExercisePerformances } from '@/lib/queries/exercise-history'

/** Number of recent sessions surfaced in the logger history panel. */
const HISTORY_SESSION_LIMIT = 4

/**
 * GET /api/exercises/[exerciseId]/history
 * Returns recent performance history for an exercise.
 *
 * Response is a superset of the legacy single-session shape:
 *   - `history`  — the most recent session (or null) — drives prefill + the
 *     last-session reference; unchanged for existing callers.
 *   - `sessions` — up to 4 recent sessions, newest first — drives the panel.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify exercise exists and belongs to user
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        exerciseDefinitionId: true,
        userId: true,
      },
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    if (exercise.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch recent sessions in a single query. The most recent doubles as the
    // legacy `history` payload so prefill/reference callers keep working.
    const sessions = await getRecentExercisePerformances(
      exercise.exerciseDefinitionId,
      user.id,
      HISTORY_SESSION_LIMIT,
      new Date()
    )

    return NextResponse.json({ history: sessions[0] ?? null, sessions })
  } catch (error) {
    logger.error({ error, context: 'exercise-history' }, 'Error fetching exercise history')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
