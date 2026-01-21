import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type ReorderItem = {
  exerciseId: string
  order: number
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
    const { exercises } = body as { exercises: ReorderItem[] }

    // Validate required fields
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Exercises array is required' },
        { status: 400 }
      )
    }

    // Validate each item has required fields
    for (const item of exercises) {
      if (!item.exerciseId || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'Each exercise must have exerciseId and order' },
          { status: 400 }
        )
      }
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: {
          select: { id: true }
        },
        week: {
          include: {
            program: true
          }
        }
      }
    })

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }

    if (workout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify all exercises belong to this workout
    const workoutExerciseIds = new Set(workout.exercises.map(e => e.id))
    const providedExerciseIds = exercises.map(e => e.exerciseId)

    for (const exerciseId of providedExerciseIds) {
      if (!workoutExerciseIds.has(exerciseId)) {
        return NextResponse.json(
          { error: `Exercise ${exerciseId} does not belong to this workout` },
          { status: 400 }
        )
      }
    }

    // Update all exercise orders in a transaction
    await prisma.$transaction(
      exercises.map(item =>
        prisma.exercise.update({
          where: { id: item.exerciseId },
          data: { order: item.order }
        })
      )
    )

    // Fetch the updated exercises
    const updatedExercises = await prisma.exercise.findMany({
      where: { workoutId },
      include: {
        prescribedSets: {
          orderBy: { setNumber: 'asc' }
        },
        exerciseDefinition: {
          select: {
            id: true,
            name: true,
            primaryFAUs: true,
            secondaryFAUs: true,
            equipment: true,
            instructions: true
          }
        }
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({
      success: true,
      exercises: updatedExercises
    })
  } catch (error) {
    console.error('Error reordering exercises:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
