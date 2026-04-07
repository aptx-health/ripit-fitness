import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

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

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { loggedSets } = body as { loggedSets: LoggedSetInput[] }

    // Enhanced input validation
    if (!loggedSets || !Array.isArray(loggedSets)) {
      logger.error({ workoutId }, 'Draft API: Invalid input - loggedSets must be an array')
      return NextResponse.json(
        { error: 'loggedSets array is required' },
        { status: 400 }
      )
    }

    // Log the operation type for safety monitoring
    if (loggedSets.length === 0) {
      logger.warn({ workoutId }, 'Draft API: Deletion-only sync - will remove all existing sets')
    } else {
      logger.debug({ workoutId, setCount: loggedSets.length }, 'Draft API: Syncing sets')
    }

    // Validate set data structure
    for (const set of loggedSets) {
      if (!set.exerciseId || typeof set.setNumber !== 'number' || typeof set.reps !== 'number') {
        logger.error({ workoutId, set }, 'Draft API: Invalid set data structure')
        return NextResponse.json(
          { error: 'Invalid set data structure' },
          { status: 422 }
        )
      }
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        week: {
          include: {
            program: true,
          },
        },
        exercises: true,
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Validate that all exerciseIds exist in this workout
    const validExerciseIds = new Set(workout.exercises.map(e => e.id))
    const invalidSets = loggedSets.filter(set => !validExerciseIds.has(set.exerciseId))

    if (invalidSets.length > 0) {
      logger.error({ workoutId, invalidExerciseIds: invalidSets.map(s => s.exerciseId) }, 'Draft API: Invalid exercise IDs detected')
      return NextResponse.json(
        {
          error: 'Some exercises no longer exist in this workout. Please refresh and try again.',
          invalidExerciseIds: invalidSets.map(s => s.exerciseId)
        },
        { status: 422 }
      )
    }

    // Find or create draft completion (all checks inside transaction for consistency)
    const result = await prisma.$transaction(async (tx) => {
      // Check if workout is already completed (non-archived) - INSIDE transaction for consistency
      const existingCompletion = await tx.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId: user.id,
          status: 'completed',
          isArchived: false,
        },
      })

      if (existingCompletion) {
        logger.error({ workoutId }, 'Draft API: Attempted to save draft for already-completed workout')
        throw new Error('WORKOUT_ALREADY_COMPLETED')
      }

      // Look for existing non-archived draft and get current set count for safety logging
      const existingDraft = await tx.workoutCompletion.findFirst({
        where: {
          workoutId,
          userId: user.id,
          status: 'draft',
          isArchived: false,
        },
        include: {
          loggedSets: true
        }
      })

      const currentSetCount = existingDraft?.loggedSets?.length || 0
      
      // Create or update draft completion
      const draftCompletion = existingDraft 
        ? await tx.workoutCompletion.update({
            where: { id: existingDraft.id },
            data: { completedAt: new Date() }
          })
        : await tx.workoutCompletion.create({
            data: {
              workoutId,
              userId: user.id,
              status: 'draft',
              completedAt: new Date(),
            },
          })

      // Remove existing logged sets for this draft (we'll replace them)
      const deletedSets = await tx.loggedSet.deleteMany({
        where: {
          completionId: draftCompletion.id,
        },
      })
      
      // Enhanced safety logging with data transformation details
      logger.debug({ workoutId, deletedCount: deletedSets.count, newCount: loggedSets.length }, 'Draft sync: replacing sets')

      if (loggedSets.length === 0 && deletedSets.count > 0) {
        logger.info({ workoutId, deletedCount: deletedSets.count }, 'Deletion-only sync: all sets deleted')
      } else if (currentSetCount > loggedSets.length) {
        logger.warn({ workoutId, previousCount: currentSetCount, newCount: loggedSets.length }, 'Partial deletion: sets removed')
      } else if (currentSetCount < loggedSets.length) {
        logger.debug({ workoutId, previousCount: currentSetCount, newCount: loggedSets.length }, 'Sets added')
      } else {
        logger.debug({ workoutId, count: loggedSets.length }, 'Sets updated (same count)')
      }

      // Create all logged sets for the draft
      if (loggedSets.length > 0) {
        await tx.loggedSet.createMany({
          data: loggedSets.map((set) => ({
            exerciseId: set.exerciseId,
            completionId: draftCompletion.id,
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

      return draftCompletion
    })

    return NextResponse.json({
      success: true,
      draft: {
        id: result.id,
        lastUpdated: result.completedAt,
        status: result.status,
        setsCount: loggedSets.length,
      },
    })
  } catch (error) {
    // Handle specific error for already-completed workout
    if (error instanceof Error && error.message === 'WORKOUT_ALREADY_COMPLETED') {
      return NextResponse.json(
        { error: 'Workout already completed. Cannot save draft.' },
        { status: 400 }
      )
    }

    logger.error({ error, context: 'draft-save' }, 'Error saving workout draft')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        week: {
          include: {
            program: true,
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Find non-archived draft completion with logged sets
    const draftCompletion = await prisma.workoutCompletion.findFirst({
      where: {
        workoutId,
        userId: user.id,
        status: 'draft',
        isArchived: false,
      },
      include: {
        loggedSets: {
          orderBy: [
            { exerciseId: 'asc' },
            { setNumber: 'asc' }
          ]
        }
      }
    })

    if (!draftCompletion) {
      return NextResponse.json({
        success: true,
        draft: null,
        message: 'No draft found'
      })
    }

    // Transform logged sets — include id for per-set operations
    const loggedSets = draftCompletion.loggedSets.map(set => ({
      id: set.id,
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
      weightUnit: set.weightUnit,
      rpe: set.rpe,
      rir: set.rir,
      isWarmup: set.isWarmup,
    }))

    return NextResponse.json({
      success: true,
      draft: {
        id: draftCompletion.id,
        lastUpdated: draftCompletion.completedAt,
        status: draftCompletion.status,
        loggedSets,
        setsCount: loggedSets.length,
      },
    })
  } catch (error) {
    logger.error({ error, context: 'draft-get' }, 'Error retrieving workout draft')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}