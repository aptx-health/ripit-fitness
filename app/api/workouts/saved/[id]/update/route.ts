import type { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { SAVED_LIST_FIELDS } from '@/lib/saved-workouts/list-fields'
import { SNAPSHOT_INCLUDE, snapshotFromCompletion } from '@/lib/saved-workouts/snapshot'

/**
 * POST /api/workouts/saved/[id]/update  { completionId }
 *
 * "Update <name>" on the session summary (workout library slice 4): replaces
 * the saved workout's exercises and sets with the snapshot Save would build
 * from that session. Everything else stays: name, notes, tags, pin, origin,
 * archive state and sourceCompletionId (so Save as new from the same session
 * still makes a new workout).
 *
 * 400 when the body is bad, the session isn't completed, or it wasn't started
 * from this workout; 404 when either is unknown or another user's; 409 when the
 * workout is archived.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    let body: { completionId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const completionId = body?.completionId
    if (typeof completionId !== 'string' || !completionId) {
      return NextResponse.json({ error: 'completionId is required' }, { status: 400 })
    }

    const saved = await prisma.savedWorkout.findFirst({
      where: { id, userId: user.id },
      select: { id: true, archivedAt: true },
    })
    if (!saved) {
      return NextResponse.json({ error: 'Saved workout not found' }, { status: 404 })
    }

    const completion = await prisma.workoutCompletion.findFirst({
      where: { id: completionId, userId: user.id },
      include: SNAPSHOT_INCLUDE,
    })
    if (!completion) {
      return NextResponse.json({ error: 'Completion not found' }, { status: 404 })
    }
    if (completion.status !== 'completed') {
      return NextResponse.json({ error: 'Completion must be marked completed before updating' }, { status: 400 })
    }
    if (completion.savedWorkoutId !== id) {
      return NextResponse.json({ error: 'This session was not started from this saved workout' }, { status: 400 })
    }
    if (saved.archivedAt) {
      return NextResponse.json({ error: 'Saved workout is archived' }, { status: 409 })
    }

    const workoutData = snapshotFromCompletion(completion)
    const updated = await prisma.savedWorkout.update({
      where: { id },
      data: {
        workoutData: workoutData as unknown as Prisma.InputJsonValue,
        exerciseCount: workoutData.length,
      },
      select: SAVED_LIST_FIELDS,
    })

    logger.info(
      { userId: user.id, savedWorkoutId: id, completionId, exerciseCount: workoutData.length },
      'Saved workout updated from session'
    )

    return NextResponse.json({ saved: updated })
  } catch (error) {
    logger.error({ error, context: 'saved-workout-update' }, 'Failed to update saved workout from session')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
