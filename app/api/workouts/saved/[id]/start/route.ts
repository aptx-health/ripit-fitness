import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { recordEvent } from '@/lib/events'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { draftExistsBody, startDraftFromPlan } from '@/lib/workouts/start-draft'
import type { SavedWorkoutData } from '@/types/saved-workout'

/**
 * POST /api/workouts/saved/[id]/start
 *
 * Hydrates a SavedWorkout snapshot into a new draft WorkoutCompletion so the
 * user can log against it like a freestyle session that's pre-populated with
 * exercises and prescribed sets.
 *
 * Conflict semantics mirror /api/workouts/adhoc: only one open draft per user
 * — if one exists we return 409 with the existing draft so the client can
 * show the resume-vs-abandon prompt. The draft itself is built by
 * startDraftFromPlan, shared with "repeat a session".
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: savedWorkoutId } = await params

  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    const saved = await prisma.savedWorkout.findFirst({
      where: { id: savedWorkoutId, userId: user.id },
    })
    if (!saved) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
    }

    const workoutData = saved.workoutData as unknown as SavedWorkoutData
    if (!Array.isArray(workoutData)) {
      logger.error(
        { savedWorkoutId, userId: user.id },
        'SavedWorkout.workoutData is not an array'
      )
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const result = await startDraftFromPlan({
      userId: user.id,
      name: saved.name,
      plan: workoutData,
      savedWorkoutId: saved.id,
      afterCreate: async (tx) => {
        await tx.savedWorkout.update({ where: { id: saved.id }, data: { lastUsedAt: new Date() } })
      },
    })
    if (!result.ok) {
      return NextResponse.json(draftExistsBody(result.draft), { status: 409 })
    }
    const { completionId } = result

    recordEvent(user.id, 'workout_started_from_saved', {
      savedWorkoutId: saved.id,
      completionId,
    })

    logger.info(
      { userId: user.id, savedWorkoutId: saved.id, completionId },
      'Workout started from saved'
    )

    return NextResponse.json({ completionId })
  } catch (err) {
    logger.error(
      { error: err, context: 'saved-workout-start', savedWorkoutId },
      'Failed to start workout from saved'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
