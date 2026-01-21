import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

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
    const { targetWeekId } = body

    // Validate required fields
    if (!targetWeekId) {
      return NextResponse.json(
        { error: 'Target week ID is required' },
        { status: 400 }
      )
    }

    // Fetch the workout to be swapped
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
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

    // Check if already in the target week
    if (workout.weekId === targetWeekId) {
      return NextResponse.json(
        { error: 'Workout is already in the target week' },
        { status: 400 }
      )
    }

    // Verify target week exists and user owns it
    const targetWeek = await prisma.week.findUnique({
      where: { id: targetWeekId },
      include: {
        program: true,
        workouts: {
          orderBy: { dayNumber: 'desc' },
          take: 1,
          select: { dayNumber: true }
        }
      }
    })

    if (!targetWeek) {
      return NextResponse.json(
        { error: 'Target week not found' },
        { status: 404 }
      )
    }

    if (targetWeek.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify both weeks belong to the same program
    if (workout.week.programId !== targetWeek.programId) {
      return NextResponse.json(
        { error: 'Cannot swap workout between different programs' },
        { status: 400 }
      )
    }

    // Calculate the next dayNumber for the target week
    const maxDayNumber = targetWeek.workouts[0]?.dayNumber || 0
    const newDayNumber = maxDayNumber + 1

    // Move the workout to the target week
    const updatedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        weekId: targetWeekId,
        dayNumber: newDayNumber,
      },
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
        },
        week: {
          select: {
            id: true,
            weekNumber: true,
            programId: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      workout: updatedWorkout
    })
  } catch (error) {
    console.error('Error swapping workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
