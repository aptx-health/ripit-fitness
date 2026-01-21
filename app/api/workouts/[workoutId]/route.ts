import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

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
      include: {
        week: {
          include: {
            program: true
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
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: {
          include: {
            prescribedSets: true,
            loggedSets: true
          }
        },
        week: {
          include: {
            program: true
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
      // Delete all logged sets for exercises in this workout
      for (const exercise of workout.exercises) {
        await tx.loggedSet.deleteMany({
          where: { exerciseId: exercise.id }
        })

        await tx.prescribedSet.deleteMany({
          where: { exerciseId: exercise.id }
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