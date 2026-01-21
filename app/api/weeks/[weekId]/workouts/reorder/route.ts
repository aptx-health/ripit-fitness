import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type ReorderItem = {
  workoutId: string
  dayNumber: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { workouts } = body as { workouts: ReorderItem[] }

    // Validate required fields
    if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
      return NextResponse.json(
        { error: 'Workouts array is required' },
        { status: 400 }
      )
    }

    // Validate each item has required fields
    for (const item of workouts) {
      if (!item.workoutId || typeof item.dayNumber !== 'number') {
        return NextResponse.json(
          { error: 'Each workout must have workoutId and dayNumber' },
          { status: 400 }
        )
      }
    }

    // Verify week exists and user owns it
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        workouts: {
          select: { id: true }
        },
        program: true
      }
    })

    if (!week) {
      return NextResponse.json(
        { error: 'Week not found' },
        { status: 404 }
      )
    }

    if (week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify all workouts belong to this week
    const weekWorkoutIds = new Set(week.workouts.map(w => w.id))
    const providedWorkoutIds = workouts.map(w => w.workoutId)

    for (const workoutId of providedWorkoutIds) {
      if (!weekWorkoutIds.has(workoutId)) {
        return NextResponse.json(
          { error: `Workout ${workoutId} does not belong to this week` },
          { status: 400 }
        )
      }
    }

    // Update all workout dayNumbers in a transaction
    await prisma.$transaction(
      workouts.map(item =>
        prisma.workout.update({
          where: { id: item.workoutId },
          data: { dayNumber: item.dayNumber }
        })
      )
    )

    // Fetch the updated workouts
    const updatedWorkouts = await prisma.workout.findMany({
      where: { weekId },
      include: {
        exercises: {
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
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { dayNumber: 'asc' }
    })

    return NextResponse.json({
      success: true,
      workouts: updatedWorkouts
    })
  } catch (error) {
    console.error('Error reordering workouts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
