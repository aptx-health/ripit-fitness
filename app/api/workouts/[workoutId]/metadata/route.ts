import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getLastExercisePerformance } from '@/lib/queries/exercise-history'
import { logger } from '@/lib/logger'

/**
 * GET /api/workouts/[workoutId]/metadata
 * Returns workout metadata + first exercise for fast modal opening
 */
export async function GET(
  request: NextRequest,
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
          where: { userId: user.id },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { id: true },
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

    // Build where conditions for exercises (program + one-offs)
    const whereConditions: Array<{
      workoutId?: string
      workoutCompletionId?: string
      isOneOff?: boolean
    }> = [{ workoutId }]
    if (completionId) {
      whereConditions.push({ workoutCompletionId: completionId, isOneOff: true })
    }

    // Fetch first exercise with full data (same query we'd make separately)
    const firstExercise = await prisma.exercise.findFirst({
      where: { OR: whereConditions, userId: user.id },
      orderBy: { order: 'asc' },
      select: {
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
            isSystem: true,
            createdBy: true,
          },
        },
        prescribedSets: {
          orderBy: { setNumber: 'asc' },
          select: {
            id: true,
            setNumber: true,
            reps: true,
            weight: true,
            rpe: true,
            rir: true,
          },
        },
      },
    })

    // Count total exercises (including one-offs)
    const exerciseCount = await prisma.exercise.count({
      where: { OR: whereConditions, userId: user.id },
    })

    // Fetch history for first exercise in parallel with nothing (already done above)
    let firstExerciseHistory = null
    if (firstExercise) {
      firstExerciseHistory = await getLastExercisePerformance(
        firstExercise.exerciseDefinitionId,
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
      firstExercise,
      firstExerciseHistory,
    })
  } catch (error) {
    logger.error({ error, context: 'workout-metadata' }, 'Error fetching workout metadata')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
