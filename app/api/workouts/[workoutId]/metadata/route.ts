import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getLastExercisePerformance } from '@/lib/queries/exercise-history'

/**
 * GET /api/workouts/[workoutId]/metadata
 * Returns workout metadata + first exercise for fast modal opening
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Single query for workout metadata with exercise count
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        id: true,
        name: true,
        dayNumber: true,
        week: {
          select: {
            program: { select: { id: true, userId: true } },
          },
        },
        completions: {
          where: { userId: user.id, isArchived: false },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { id: true, status: true },
        },
        _count: {
          select: { exercises: true },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const completionId = workout.completions[0]?.id
    const completionStatus = workout.completions[0]?.status

    // Build where conditions for exercises (program + one-offs)
    const whereConditions: Array<{
      workoutId?: string
      workoutCompletionId?: string
      isOneOff?: boolean
    }> = [{ workoutId }]
    if (completionId) {
      whereConditions.push({ workoutCompletionId: completionId, isOneOff: true })
    }

    const exerciseSelect = {
      id: true,
      name: true,
      order: true,
      exerciseGroup: true,
      notes: true,
      isOneOff: true,
      exerciseDefinitionId: true,
      exerciseDefinition: {
        select: {
          id: true,
          name: true,
          primaryFAUs: true,
          secondaryFAUs: true,
          equipment: true,
          instructions: true,
          imageUrls: true,
          isSystem: true,
          createdBy: true,
        },
      },
      prescribedSets: {
        orderBy: { setNumber: 'asc' as const },
        select: {
          id: true,
          setNumber: true,
          reps: true,
          weight: true,
          rpe: true,
          rir: true,
        },
      },
    }

    // Count total exercises (including one-offs)
    const exerciseCount = await prisma.exercise.count({
      where: { OR: whereConditions, userId: user.id },
    })

    // When resuming a draft, find the first exercise with incomplete sets
    let resumeExerciseIndex = 0
    if (completionId && completionStatus === 'draft') {
      // Fetch all exercises (ordered) and logged set counts in parallel
      const [allExercises, loggedSetCounts] = await Promise.all([
        prisma.exercise.findMany({
          where: { OR: whereConditions, userId: user.id },
          orderBy: { order: 'asc' },
          select: { id: true, _count: { select: { prescribedSets: true } } },
        }),
        prisma.loggedSet.groupBy({
          by: ['exerciseId'],
          where: { completionId },
          _count: true,
        }),
      ])

      const loggedCountMap = new Map(
        loggedSetCounts.map((g) => [g.exerciseId, g._count])
      )

      for (let i = 0; i < allExercises.length; i++) {
        const ex = allExercises[i]
        const loggedCount = loggedCountMap.get(ex.id) ?? 0
        if (loggedCount < ex._count.prescribedSets) {
          resumeExerciseIndex = i
          break
        }
        // If all exercises are complete, stay at last exercise
        if (i === allExercises.length - 1) {
          resumeExerciseIndex = i
        }
      }
    }

    // Fetch the target exercise (first incomplete for drafts, first overall otherwise)
    const targetExercise = await prisma.exercise.findFirst({
      where: { OR: whereConditions, userId: user.id },
      orderBy: { order: 'asc' },
      skip: resumeExerciseIndex,
      select: exerciseSelect,
    })

    // Fetch history for the target exercise
    let targetExerciseHistory = null
    if (targetExercise) {
      targetExerciseHistory = await getLastExercisePerformance(
        targetExercise.exerciseDefinitionId,
        user.id,
        new Date()
      )
    }

    return NextResponse.json({
      workout: {
        id: workout.id,
        name: workout.name,
        dayNumber: workout.dayNumber,
        programId: workout.week.program.id,
      },
      exerciseCount,
      completionId,
      completionStatus,
      firstExercise: targetExercise,
      firstExerciseHistory: targetExerciseHistory,
      resumeExerciseIndex,
    })
  } catch (error) {
    logger.error({ error, context: 'workout-metadata' }, 'Error fetching workout metadata')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
