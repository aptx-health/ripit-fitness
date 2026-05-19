import { createId } from '@paralleldrive/cuid2'
import { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { recordEvent } from '@/lib/events'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import type { SavedWorkoutData, SavedWorkoutExercise } from '@/types/saved-workout'

/**
 * POST /api/workouts/saved/[id]/start
 *
 * Hydrates a SavedWorkout snapshot into a new draft WorkoutCompletion so the
 * user can log against it like a freestyle session that's pre-populated with
 * exercises and prescribed sets.
 *
 * Conflict semantics mirror /api/workouts/adhoc: only one open draft per user
 * — if one exists we return 409 with the existing draft so the client can
 * show the resume-vs-abandon prompt.
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

    const now = new Date()
    let completionId: string | null = null
    let existingDraft:
      | {
          id: string
          isAdHoc: boolean
          name: string | null
          workout: { name: string } | null
        }
      | null = null

    try {
      completionId = await prisma.$transaction(
        async (tx) => {
          const found = await tx.workoutCompletion.findFirst({
            where: { userId: user.id, status: 'draft', isArchived: false },
            select: {
              id: true,
              isAdHoc: true,
              name: true,
              workout: { select: { name: true } },
            },
          })
          if (found) {
            existingDraft = found
            return null
          }

          const completion = await tx.workoutCompletion.create({
            data: {
              workoutId: null,
              savedWorkoutId: saved.id,
              userId: user.id,
              status: 'draft',
              isAdHoc: true,
              name: saved.name,
              startedAt: now,
              completedAt: now,
            },
            select: { id: true },
          })

          // Pre-generate exercise ids so we can link prescribed sets in a
          // single createMany without a per-exercise round-trip.
          const exerciseRows = workoutData.map((ex: SavedWorkoutExercise) => ({
            id: createId(),
            name: ex.name,
            exerciseDefinitionId: ex.exerciseDefinitionId,
            order: ex.order,
            notes: ex.notes ?? null,
            exerciseGroup: ex.exerciseGroup ?? null,
            workoutId: null,
            workoutCompletionId: completion.id,
            userId: user.id,
            isOneOff: true,
          }))

          if (exerciseRows.length > 0) {
            await tx.exercise.createMany({ data: exerciseRows })
          }

          const prescribedRows = workoutData.flatMap(
            (ex: SavedWorkoutExercise, idx: number) =>
              (ex.sets ?? []).map((s) => ({
                exerciseId: exerciseRows[idx].id,
                userId: user.id,
                setNumber: s.setNumber,
                reps: s.reps,
                rir: s.rir ?? null,
                rpe: s.rpe ?? null,
                isWarmup: Boolean(s.isWarmup),
              }))
          )

          if (prescribedRows.length > 0) {
            await tx.prescribedSet.createMany({ data: prescribedRows })
          }

          await tx.savedWorkout.update({
            where: { id: saved.id },
            data: { lastUsedAt: now },
          })

          return completion.id
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (txErr) {
      if (
        txErr instanceof Prisma.PrismaClientKnownRequestError &&
        (txErr.code === 'P2034' || txErr.code === 'P2002')
      ) {
        existingDraft = await prisma.workoutCompletion.findFirst({
          where: { userId: user.id, status: 'draft', isArchived: false },
          select: {
            id: true,
            isAdHoc: true,
            name: true,
            workout: { select: { name: true } },
          },
        })
      } else {
        throw txErr
      }
    }

    if (existingDraft) {
      const draft = existingDraft as {
        id: string
        isAdHoc: boolean
        name: string | null
        workout: { name: string } | null
      }
      return NextResponse.json(
        {
          error: 'DRAFT_EXISTS',
          message: 'Finish your current workout before starting a new one.',
          draft: {
            completionId: draft.id,
            isAdHoc: draft.isAdHoc,
            name: draft.name ?? draft.workout?.name ?? null,
          },
        },
        { status: 409 }
      )
    }

    if (!completionId) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

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
