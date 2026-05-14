import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { findAdHocCompletion } from '@/lib/db/adhoc-completion'
import { logger } from '@/lib/logger'
import { checkRateLimit, setLoggingLimiter } from '@/lib/rate-limit'

type SetInput = {
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
  { params }: { params: Promise<{ completionId: string }> }
) {
  try {
    const { completionId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(setLoggingLimiter, user.id)
    if (limited) return limited

    const set = (await request.json()) as SetInput

    if (
      !set.exerciseId ||
      typeof set.setNumber !== 'number' ||
      typeof set.reps !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid set data' }, { status: 422 })
    }

    const lookup = await findAdHocCompletion(completionId, user.id)
    if (!lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status })
    }
    if (lookup.completion.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot log sets on a completed workout' },
        { status: 400 }
      )
    }

    // Verify the exercise belongs to this ad-hoc completion.
    const exercise = await prisma.exercise.findUnique({
      where: { id: set.exerciseId },
      select: { workoutCompletionId: true },
    })
    if (!exercise || exercise.workoutCompletionId !== completionId) {
      return NextResponse.json(
        { error: 'Exercise not found in this workout' },
        { status: 422 }
      )
    }

    const loggedSet = await prisma.loggedSet.upsert({
      where: {
        completionId_exerciseId_setNumber: {
          completionId,
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
        },
      },
      update: {
        reps: set.reps,
        weight: set.weight,
        weightUnit: set.weightUnit,
        rpe: set.rpe,
        rir: set.rir,
        isWarmup: set.isWarmup ?? false,
      },
      create: {
        completionId,
        exerciseId: set.exerciseId,
        userId: user.id,
        setNumber: set.setNumber,
        reps: set.reps,
        weight: set.weight,
        weightUnit: set.weightUnit,
        rpe: set.rpe,
        rir: set.rir,
        isWarmup: set.isWarmup ?? false,
      },
    })

    return NextResponse.json({
      success: true,
      set: {
        id: loggedSet.id,
        exerciseId: loggedSet.exerciseId,
        setNumber: loggedSet.setNumber,
        reps: loggedSet.reps,
        weight: loggedSet.weight,
        weightUnit: loggedSet.weightUnit,
        rpe: loggedSet.rpe,
        rir: loggedSet.rir,
        isWarmup: loggedSet.isWarmup,
      },
      completionId,
    })
  } catch (err) {
    logger.error(
      { error: err, context: 'adhoc-sets-create' },
      'Error logging set on ad-hoc workout'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
