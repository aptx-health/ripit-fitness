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

    // Fetch the complete workout with all nested relations
    const originalWorkout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        week: {
          include: {
            program: true
          }
        },
        exercises: {
          include: {
            prescribedSets: {
              orderBy: { setNumber: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!originalWorkout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }

    if (originalWorkout.week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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

    // Calculate the next dayNumber for the target week
    const maxDayNumber = targetWeek.workouts[0]?.dayNumber || 0
    const newDayNumber = maxDayNumber + 1

    // Deep copy the workout and all nested content in a transaction
    const duplicatedWorkout = await prisma.$transaction(async (tx) => {
      // Create the new workout
      const newWorkout = await tx.workout.create({
        data: {
          name: originalWorkout.name,
          dayNumber: newDayNumber,
          weekId: targetWeekId,
          userId: user.id,
        }
      })

      // Duplicate all exercises in this workout
      for (const exercise of originalWorkout.exercises) {
        const newExercise = await tx.exercise.create({
          data: {
            name: exercise.name,
            exerciseDefinitionId: exercise.exerciseDefinitionId,
            order: exercise.order,
            exerciseGroup: exercise.exerciseGroup,
            workoutId: newWorkout.id,
            userId: user.id,
            notes: exercise.notes,
          }
        })

        // Duplicate all prescribed sets for this exercise
        if (exercise.prescribedSets.length > 0) {
          await tx.prescribedSet.createMany({
            data: exercise.prescribedSets.map(set => ({
              setNumber: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              rpe: set.rpe,
              rir: set.rir,
              exerciseId: newExercise.id,
              userId: user.id,
            }))
          })
        }
      }

      // Return the new workout with basic info
      return newWorkout
    })

    // Fetch the complete duplicated workout to return
    const completeDuplicatedWorkout = await prisma.workout.findUnique({
      where: { id: duplicatedWorkout.id },
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
      }
    })

    return NextResponse.json({
      success: true,
      workout: completeDuplicatedWorkout
    })
  } catch (error) {
    console.error('Error duplicating workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
