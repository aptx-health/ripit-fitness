import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type CreateWorkoutRequest = {
  name?: string
  dayNumber?: number
  sourceWorkoutId?: string // For duplication
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
    const body = await request.json() as CreateWorkoutRequest
    const { name, dayNumber, sourceWorkoutId } = body

    // Verify week exists and user owns it
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        workouts: true,
        program: true
      }
    })

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }

    if (week.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Calculate day number if not provided
    let calculatedDayNumber = dayNumber
    if (!calculatedDayNumber) {
      const maxDayNumber = Math.max(0, ...week.workouts.map(w => w.dayNumber))
      calculatedDayNumber = maxDayNumber + 1
    }

    // Check if day number already exists
    const existingWorkout = week.workouts.find(w => w.dayNumber === calculatedDayNumber)
    if (existingWorkout) {
      return NextResponse.json(
        { error: `Day ${calculatedDayNumber} already exists` },
        { status: 400 }
      )
    }

    // Generate workout name if not provided
    const calculatedName = name || `Day ${calculatedDayNumber}`

    let newWorkout

    if (sourceWorkoutId) {
      // Duplicate existing workout
      const sourceWorkout = await prisma.workout.findUnique({
        where: { id: sourceWorkoutId },
        include: {
          exercises: {
            include: {
              prescribedSets: true
            }
          }
        }
      })

      if (!sourceWorkout) {
        return NextResponse.json(
          { error: 'Source workout not found' },
          { status: 404 }
        )
      }

      // Create new workout with duplicated structure
      newWorkout = await prisma.$transaction(async (tx) => {
        const workout = await tx.workout.create({
          data: {
            name: calculatedName,
            dayNumber: calculatedDayNumber,
            weekId,
            userId: user.id,
          }
        })

        // Duplicate all exercises
        for (const exercise of sourceWorkout.exercises) {
          const newExercise = await tx.exercise.create({
            data: {
              name: exercise.name,
              exerciseDefinitionId: exercise.exerciseDefinitionId,
              order: exercise.order,
              exerciseGroup: exercise.exerciseGroup,
              workoutId: workout.id,
              notes: exercise.notes,
              userId: user.id,
            }
          })

          // Duplicate all prescribed sets
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

        return workout
      })
    } else {
      // Create empty workout
      newWorkout = await prisma.workout.create({
        data: {
          name: calculatedName,
          dayNumber: calculatedDayNumber,
          weekId,
          userId: user.id,
        }
      })
    }

    // Fetch the complete workout with all relations
    const completeWorkout = await prisma.workout.findUnique({
      where: { id: newWorkout.id },
      include: {
        exercises: {
          include: {
            prescribedSets: true,
            exerciseDefinition: true
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      workout: completeWorkout
    })
  } catch (error) {
    console.error('Error creating workout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update workout (name editing)
export async function PATCH(
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
    const { workoutId, name } = body

    if (!workoutId || !name) {
      return NextResponse.json(
        { error: 'Workout ID and name are required' },
        { status: 400 }
      )
    }

    // Verify workout exists and user owns it
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

    if (workout.weekId !== weekId) {
      return NextResponse.json({ error: 'Workout does not belong to this week' }, { status: 400 })
    }

    // Update workout name
    const updatedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: { name: name.trim() },
      include: {
        exercises: {
          include: {
            prescribedSets: true,
            exerciseDefinition: true
          },
          orderBy: { order: 'asc' }
        }
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