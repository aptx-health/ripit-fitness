import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { recordEvent } from '@/lib/events'
import { logger } from '@/lib/logger'
import { checkRateLimit, workoutActionLimiter } from '@/lib/rate-limit'
import { draftExistsBody, startDraftFromPlan } from '@/lib/workouts/start-draft'
import type { SavedWorkoutData } from '@/types/saved-workout'

type LoggedRow = {
  setNumber: number
  reps: number
  rir: number | null
  rpe: number | null
  isWarmup: boolean
  createdAt: Date
  exercise: {
    id: string
    name: string
    exerciseDefinitionId: string
    order: number
    notes: string | null
    exerciseGroup: string | null
  }
}

/**
 * The session's logged sets as a plan: exercises in the order they were first
 * logged, each with one set per logged set (renumbered 1..n by setNumber).
 * Reps become text; weight is never copied.
 */
function planFromLoggedSets(sets: LoggedRow[]): SavedWorkoutData {
  const byExercise = new Map<string, { exercise: LoggedRow['exercise']; first: number; sets: LoggedRow[] }>()
  for (const set of sets) {
    const entry = byExercise.get(set.exercise.id)
    const at = set.createdAt.getTime()
    if (entry) {
      entry.sets.push(set)
      entry.first = Math.min(entry.first, at)
    } else {
      byExercise.set(set.exercise.id, { exercise: set.exercise, first: at, sets: [set] })
    }
  }

  return [...byExercise.values()]
    .sort((a, b) => a.first - b.first || a.exercise.order - b.exercise.order)
    .map(({ exercise, sets }, i) => ({
      name: exercise.name,
      exerciseDefinitionId: exercise.exerciseDefinitionId,
      order: i + 1,
      notes: exercise.notes,
      exerciseGroup: exercise.exerciseGroup,
      sets: [...sets]
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s, j) => ({
          setNumber: j + 1,
          reps: String(s.reps),
          rir: s.rir,
          rpe: s.rpe,
          isWarmup: s.isWarmup,
        })),
    }))
}

/**
 * POST /api/workouts/completions/[id]/repeat
 *
 * Starts a new freestyle draft from one of the user's completed sessions, using
 * its logged sets as the plan. The draft has no program workout and no saved
 * workout, so it never counts toward program progress. One open draft per user,
 * as for the other start routes (409 DRAFT_EXISTS).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(workoutActionLimiter, user.id)
    if (limited) return limited

    const source = await prisma.workoutCompletion.findFirst({
      where: { id, userId: user.id, status: 'completed', isArchived: false },
      select: {
        id: true,
        name: true,
        workout: { select: { name: true } },
        loggedSets: {
          select: {
            setNumber: true,
            reps: true,
            rir: true,
            rpe: true,
            isWarmup: true,
            createdAt: true,
            exercise: {
              select: {
                id: true,
                name: true,
                exerciseDefinitionId: true,
                order: true,
                notes: true,
                exerciseGroup: true,
              },
            },
          },
        },
      },
    })
    if (!source) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (source.loggedSets.length === 0) {
      return NextResponse.json(
        { error: 'NOTHING_TO_REPEAT', message: 'This session has no logged sets to repeat.' },
        { status: 422 }
      )
    }

    const result = await startDraftFromPlan({
      userId: user.id,
      name: source.workout?.name ?? source.name ?? 'Open Workout',
      plan: planFromLoggedSets(source.loggedSets),
    })
    if (!result.ok) {
      return NextResponse.json(draftExistsBody(result.draft), { status: 409 })
    }

    recordEvent(user.id, 'workout_repeated', { sourceCompletionId: source.id, completionId: result.completionId })
    logger.info({ userId: user.id, sourceCompletionId: source.id, completionId: result.completionId }, 'Session repeated')

    return NextResponse.json({ completionId: result.completionId })
  } catch (err) {
    logger.error({ error: err, context: 'completion-repeat', completionId: id }, 'Failed to repeat session')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
