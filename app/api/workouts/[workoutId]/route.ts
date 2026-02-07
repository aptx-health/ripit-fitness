import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getBatchExercisePerformance } from '@/lib/queries/exercise-history'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { workoutId } = await params
    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'

    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Single query for workout with all needed data
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        id: true,
        name: true,
        dayNumber: true,
        week: {
          select: {
            weekNumber: true,
            program: { select: { id: true, userId: true } },
          },
        },
        completions: {
          where: { userId: user.id },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            completedAt: true,
            status: true,
            loggedSets: {
              orderBy: { setNumber: 'asc' },
              select: {
                id: true,
                setNumber: true,
                reps: true,
                weight: true,
                weightUnit: true,
                rpe: true,
                rir: true,
                exerciseId: true,
              },
            },
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

    const completionId = workout.completions[0]?.id

    // Fetch exercises (program + one-offs) in single query
    const whereConditions: Array<{ workoutId?: string; workoutCompletionId?: string; isOneOff?: boolean }> = [
      { workoutId },
    ]
    if (completionId) {
      whereConditions.push({ workoutCompletionId: completionId, isOneOff: true })
    }

    const exercises = await prisma.exercise.findMany({
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

    // Fetch exercise history only if requested (for logging modal)
    let exerciseHistory: Record<string, unknown> | undefined
    if (includeHistory) {
      const definitionIds = exercises.map((ex) => ex.exerciseDefinitionId)
      const historyByDefinition = await getBatchExercisePerformance(
        definitionIds,
        user.id,
        new Date()
      )
      exerciseHistory = Object.fromEntries(
        exercises.map((ex) => [ex.id, historyByDefinition.get(ex.exerciseDefinitionId) || null])
      )
    }

    return NextResponse.json({
      workout: {
        ...workout,
        exercises,
        programId: workout.week.program.id,
      },
      exerciseHistory,
    })
  } catch (error) {
    console.error('Error fetching workout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const { name } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Workout name is required' },
        { status: 400 }
      )
    }

    // Verify workout exists and user owns it (through the program)
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        id: true,
        week: {
          select: {
            program: { select: { userId: true } }
          }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update workout
    const updatedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        name: name.trim(),
      }
    })

    return NextResponse.json({
      success: true,
      workout: updatedWorkout
    })
  } catch (error) {
    console.error('Error updating workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Verify workout exists and user owns it (through the program)
    // Only select fields needed: exercise IDs for bulk delete, userId for auth
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        id: true,
        exercises: {
          select: { id: true }
        },
        week: {
          select: {
            program: { select: { userId: true } }
          }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete workout and all related data in transaction
    await prisma.$transaction(async (tx) => {
      // Collect exercise IDs for bulk deletion
      const exerciseIds = workout.exercises.map(e => e.id)

      // Bulk delete all logged sets and prescribed sets (avoids N+1)
      if (exerciseIds.length > 0) {
        await tx.loggedSet.deleteMany({
          where: { exerciseId: { in: exerciseIds } }
        })

        await tx.prescribedSet.deleteMany({
          where: { exerciseId: { in: exerciseIds } }
        })
      }

      // Delete all exercises in this workout
      await tx.exercise.deleteMany({
        where: { workoutId }
      })

      // Delete any workout completions
      await tx.workoutCompletion.deleteMany({
        where: { workoutId }
      })

      // Delete the workout
      await tx.workout.delete({
        where: { id: workoutId }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Workout deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}