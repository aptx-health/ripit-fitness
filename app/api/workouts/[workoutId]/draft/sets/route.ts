import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

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
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const set = body as SetInput

    // Validate set data
    if (!set.exerciseId || typeof set.setNumber !== 'number' || typeof set.reps !== 'number') {
      return NextResponse.json({ error: 'Invalid set data' }, { status: 422 })
    }

    // Verify workout exists, user owns it, and exercise belongs to workout
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        week: { include: { program: { select: { userId: true } } } },
        exercises: { select: { id: true } },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }
    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const validExerciseIds = new Set(workout.exercises.map(e => e.id))
    if (!validExerciseIds.has(set.exerciseId)) {
      return NextResponse.json(
        { error: 'Exercise not found in this workout' },
        { status: 422 }
      )
    }

    // Find or create draft, then upsert the set
    const result = await prisma.$transaction(async (tx) => {
      // Block if already completed
      const completed = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId: user.id, status: 'completed', isArchived: false },
      })
      if (completed) {
        throw new Error('WORKOUT_ALREADY_COMPLETED')
      }

      // Find or create draft completion
      let draft = await tx.workoutCompletion.findFirst({
        where: { workoutId, userId: user.id, status: 'draft', isArchived: false },
      })
      if (!draft) {
        draft = await tx.workoutCompletion.create({
          data: { workoutId, userId: user.id, status: 'draft', completedAt: new Date() },
        })
      }

      // Upsert the set using the unique constraint (completionId, exerciseId, setNumber)
      const loggedSet = await tx.loggedSet.upsert({
        where: {
          completionId_exerciseId_setNumber: {
            completionId: draft.id,
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
          completionId: draft.id,
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

      return { set: loggedSet, completionId: draft.id }
    })

    return NextResponse.json({
      success: true,
      set: {
        id: result.set.id,
        exerciseId: result.set.exerciseId,
        setNumber: result.set.setNumber,
        reps: result.set.reps,
        weight: result.set.weight,
        weightUnit: result.set.weightUnit,
        rpe: result.set.rpe,
        rir: result.set.rir,
        isWarmup: result.set.isWarmup,
      },
      completionId: result.completionId,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'WORKOUT_ALREADY_COMPLETED') {
      return NextResponse.json(
        { error: 'Workout already completed' },
        { status: 400 }
      )
    }

    logger.error({ error, context: 'draft-sets-create' }, 'Error creating draft set')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
