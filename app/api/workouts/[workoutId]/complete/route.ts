import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { recordEvent } from '@/lib/events'
import { logger } from '@/lib/logger'
import { enqueueAggregatesRecompute } from '@/lib/queue/aggregates-jobs'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { computeWorkoutRollup } from '@/lib/stats/workout-rollup'

type LoggedSetInput = {
  exerciseId: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    // Parse optional fallback sets (used when some per-set writes failed)
    const body = await request.json()
    const { fallbackSets, guidedCompletion } = body as { fallbackSets?: LoggedSetInput[]; guidedCompletion?: boolean }

    // Verify workout exists
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        id: true,
        week: { select: { program: { select: { userId: true } } } },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }
    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const completion = await prisma.$transaction(async (tx) => {
      // Check for existing completed record INSIDE the transaction to prevent
      // TOCTOU race conditions with concurrent requests (e.g. fetchWithRetry)
      const existingCompleted = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId: user.id, status: 'completed', isArchived: false },
      })

      if (existingCompleted) {
        throw new Error('ALREADY_COMPLETED')
      }

      // Find existing draft
      const draft = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId: user.id, status: 'draft', isArchived: false },
        include: { loggedSets: true },
      })

      const draftSetCount = draft?.loggedSets?.length ?? 0

      // Persist elapsed session time when the draft recorded a start (#933).
      // Create branches have no draft, so duration is null there.
      const completedAt = new Date()
      const durationSeconds = draft?.startedAt
        ? Math.max(
            0,
            Math.round((completedAt.getTime() - draft.startedAt.getTime()) / 1000)
          )
        : null

      // If we have a draft with sets, just flip the status
      if (draft && draftSetCount > 0) {
        // Safety fallback: if client reports more sets than DB has, use fallback
        if (fallbackSets && fallbackSets.length > draftSetCount) {
          logger.warn(
            { workoutId, draftSets: draftSetCount, fallbackSets: fallbackSets.length },
            'Using fallback sets — client has more sets than draft'
          )
          await tx.loggedSet.deleteMany({ where: { completionId: draft.id } })
          await tx.loggedSet.createMany({
            data: fallbackSets.map((set) => ({
              exerciseId: set.exerciseId,
              completionId: draft.id,
              userId: user.id,
              setNumber: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              weightUnit: set.weightUnit,
              rpe: set.rpe,
              rir: set.rir,
              isWarmup: set.isWarmup ?? false,
            })),
          })
        }

        return tx.workoutCompletion.update({
          where: { id: draft.id },
          data: { status: 'completed', completedAt, durationSeconds },
        })
      }

      // Guided completion (Follow Along mode) — allow zero-set completion
      if (guidedCompletion) {
        logger.info({ workoutId, guided: true }, 'Guided workout completed')
        const completionRecord = draft
          ? await tx.workoutCompletion.update({
              where: { id: draft.id },
              data: { status: 'completed', completedAt, durationSeconds },
            })
          : await tx.workoutCompletion.create({
              data: { workoutId, userId: user.id, status: 'completed', completedAt, durationSeconds },
            })
        return completionRecord
      }

      // No draft with sets — need fallback sets to complete
      if (!fallbackSets || fallbackSets.length === 0) {
        throw new Error('NO_SETS_TO_COMPLETE')
      }

      // Create completion from fallback (handles case where all per-set writes failed)
      const completionRecord = draft
        ? await tx.workoutCompletion.update({
            where: { id: draft.id },
            data: { status: 'completed', completedAt, durationSeconds },
          })
        : await tx.workoutCompletion.create({
            data: { workoutId, userId: user.id, status: 'completed', completedAt, durationSeconds },
          })

      await tx.loggedSet.createMany({
        data: fallbackSets.map((set) => ({
          exerciseId: set.exerciseId,
          completionId: completionRecord.id,
          userId: user.id,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          weightUnit: set.weightUnit,
          rpe: set.rpe,
          rir: set.rir,
          isWarmup: set.isWarmup ?? false,
        })),
      })

      // Clean up any remaining draft records for this workout+user to prevent
      // orphaned drafts from blocking future workouts (fixes #568)
      await tx.workoutCompletion.deleteMany({
        where: {
          workoutId,
          userId: user.id,
          status: 'draft',
          isArchived: false,
          id: { not: completionRecord.id },
        },
      })

      return completionRecord
    })

    recordEvent(user.id, 'workout_completed', { workoutId })
    // Refresh the Suggest training-state layer off the request path (#919).
    void enqueueAggregatesRecompute(user.id)

    let rollup = null
    try {
      rollup = await computeWorkoutRollup(prisma, completion.id, user.id)
    } catch (rollupErr) {
      logger.error(
        { error: rollupErr, completionId: completion.id, context: 'workout-complete' },
        'Failed to compute rollup; returning completion without it'
      )
    }

    return NextResponse.json({
      success: true,
      completion: {
        id: completion.id,
        completedAt: completion.completedAt,
        status: completion.status,
      },
      rollup,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_COMPLETED') {
      return NextResponse.json(
        { error: 'Workout already completed. Clear it first to re-log.' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'NO_SETS_TO_COMPLETE') {
      return NextResponse.json(
        { error: 'No sets to complete. Log at least one set first.' },
        { status: 400 }
      )
    }

    logger.error({ error, context: 'workout-complete' }, 'Error completing workout')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
