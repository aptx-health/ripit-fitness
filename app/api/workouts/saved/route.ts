import type { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { recordEvent } from '@/lib/events'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import type { SavedWorkoutData, SavedWorkoutExercise } from '@/types/saved-workout'

const MAX_NAME_LENGTH = 100
const MAX_NOTES_LENGTH = 2000

interface SavePayload {
  sourceCompletionId?: string
  name?: string
  notes?: string
}

/**
 * GET /api/workouts/saved
 *
 * Lightweight listing for the QuickActionSheet entrypoint and the future
 * `/workouts/saved` index. v1 only needs `count` for the sheet visibility
 * check, but we also return a slim listing so the index page can reuse it.
 */
export async function GET() {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const savedWorkouts = await prisma.savedWorkout.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        exerciseCount: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      count: savedWorkouts.length,
      savedWorkouts,
    })
  } catch (err) {
    logger.error(
      { error: err, context: 'saved-workout-list' },
      'Failed to list saved workouts'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workouts/saved
 *
 * Snapshot a completed freestyle WorkoutCompletion into a SavedWorkout the user
 * can re-run later. Preserves exercise structure (name, def id, set count,
 * reps, RIR/RPE, warmup flag) but drops weight, timestamps, and completion id.
 *
 * Idempotent: if a SavedWorkout already exists for `sourceCompletionId` for
 * this user, returns that row instead of creating a duplicate.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    let body: SavePayload
    try {
      body = (await request.json()) as SavePayload
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const sourceCompletionId = body.sourceCompletionId
    if (!sourceCompletionId || typeof sourceCompletionId !== 'string') {
      return NextResponse.json(
        { error: 'sourceCompletionId is required' },
        { status: 400 }
      )
    }

    const rawName = typeof body.name === 'string' ? body.name.trim() : ''
    if (!rawName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (rawName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `name must be ${MAX_NAME_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }
    const rawNotes = typeof body.notes === 'string' ? body.notes.trim() : ''
    if (rawNotes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { error: `notes must be ${MAX_NOTES_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    // Idempotency check: an existing SavedWorkout for this completion wins.
    const existing = await prisma.savedWorkout.findFirst({
      where: { sourceCompletionId, userId: user.id },
    })
    if (existing) {
      return NextResponse.json({ savedWorkout: existing })
    }

    // Single query: pull completion + ordered exercises + ordered logged sets.
    const completion = await prisma.workoutCompletion.findUnique({
      where: { id: sourceCompletionId },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: {
            loggedSets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    })

    if (!completion || completion.userId !== user.id) {
      return NextResponse.json(
        { error: 'Completion not found' },
        { status: 404 }
      )
    }

    if (completion.status !== 'completed') {
      return NextResponse.json(
        { error: 'Completion must be marked completed before saving' },
        { status: 400 }
      )
    }

    if (!completion.isAdHoc) {
      return NextResponse.json(
        {
          error:
            'Only freestyle workouts can be saved in v1; saving from program workouts is not yet supported.',
        },
        { status: 400 }
      )
    }

    // Build snapshot in memory — no further DB calls.
    const workoutData: SavedWorkoutData = completion.exercises.map(
      (ex): SavedWorkoutExercise => ({
        name: ex.name,
        exerciseDefinitionId: ex.exerciseDefinitionId,
        order: ex.order,
        notes: ex.notes ?? null,
        exerciseGroup: ex.exerciseGroup ?? null,
        sets: ex.loggedSets.map((s) => ({
          setNumber: s.setNumber,
          reps: String(s.reps),
          rir: s.rir ?? null,
          rpe: s.rpe ?? null,
          isWarmup: Boolean(s.isWarmup),
        })),
      })
    )

    const exerciseCount = workoutData.length

    const saved = await prisma.savedWorkout.create({
      data: {
        userId: user.id,
        name: rawName,
        notes: rawNotes ? rawNotes : null,
        sourceCompletionId,
        workoutData: workoutData as unknown as Prisma.InputJsonValue,
        exerciseCount,
        lastUsedAt: completion.completedAt,
      },
    })

    recordEvent(user.id, 'workout_saved', {
      savedWorkoutId: saved.id,
      exerciseCount,
      sourceCompletionId,
    })

    logger.info(
      {
        userId: user.id,
        savedWorkoutId: saved.id,
        sourceCompletionId,
        exerciseCount,
      },
      'Workout saved from completion'
    )

    return NextResponse.json({ savedWorkout: saved })
  } catch (err) {
    logger.error(
      { error: err, context: 'saved-workout-create' },
      'Failed to save workout from completion'
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

