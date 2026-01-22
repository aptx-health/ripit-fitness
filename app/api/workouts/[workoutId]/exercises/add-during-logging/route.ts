import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type AddDuringLoggingRequest = {
  exerciseDefinitionId: string
  applyToFuture: boolean
  workoutCompletionId?: string
  prescribedSets: Array<{
    setNumber: number
    reps: string
    intensityType: 'RIR' | 'RPE' | 'NONE'
    intensityValue?: number
  }>
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
    const body = await request.json() as AddDuringLoggingRequest
    const {
      exerciseDefinitionId,
      applyToFuture,
      workoutCompletionId,
      prescribedSets
    } = body

    // Validate required fields
    if (!exerciseDefinitionId) {
      return NextResponse.json(
        { error: 'Exercise definition ID is required' },
        { status: 400 }
      )
    }

    if (!prescribedSets || prescribedSets.length === 0) {
      return NextResponse.json(
        { error: 'At least one prescribed set is required' },
        { status: 400 }
      )
    }

    // Verify workout exists and user owns it
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: true,
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

    // Verify exercise definition exists
    const exerciseDefinition = await prisma.exerciseDefinition.findUnique({
      where: { id: exerciseDefinitionId }
    })

    if (!exerciseDefinition) {
      return NextResponse.json(
        { error: 'Exercise definition not found' },
        { status: 404 }
      )
    }

    // Calculate next order number for current workout
    const maxOrder = Math.max(0, ...workout.exercises.map(e => e.order))
    const nextOrder = maxOrder + 1

    let addedExercise: any
    let addedToCount = 0

    if (!applyToFuture) {
      // One-off: Create exercise tied to workout completion only
      if (!workoutCompletionId) {
        return NextResponse.json(
          { error: 'Workout completion ID is required for one-off exercises' },
          { status: 400 }
        )
      }

      // Verify workout completion exists and belongs to user
      const completion = await prisma.workoutCompletion.findUnique({
        where: { id: workoutCompletionId }
      })

      if (!completion || completion.userId !== user.id) {
        return NextResponse.json(
          { error: 'Workout completion not found' },
          { status: 404 }
        )
      }

      addedExercise = await prisma.$transaction(async (tx) => {
        const exercise = await tx.exercise.create({
          data: {
            name: exerciseDefinition.name,
            exerciseDefinitionId,
            order: nextOrder,
            workoutId: null, // Not part of program structure
            isOneOff: true,
            workoutCompletionId,
            userId: user.id,
          }
        })

        // Create prescribed sets
        await tx.prescribedSet.createMany({
          data: prescribedSets.map(set => ({
            setNumber: set.setNumber,
            reps: set.reps,
            rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
            rir: set.intensityType === 'RIR' ? set.intensityValue : null,
            exerciseId: exercise.id,
            userId: user.id,
          }))
        })

        // Return exercise with all relations
        return await tx.exercise.findUnique({
          where: { id: exercise.id },
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
          }
        })
      })

      addedToCount = 1
    } else {
      // Apply to future: Add to current workout and all future matching workouts
      const currentWeek = workout.week
      const programId = currentWeek.programId
      const currentWeekNumber = currentWeek.weekNumber
      const dayNumber = workout.dayNumber

      await prisma.$transaction(async (tx) => {
        // Find all weeks with weekNumber >= currentWeekNumber in the same program
        const futureWeeks = await tx.week.findMany({
          where: {
            programId,
            weekNumber: {
              gte: currentWeekNumber
            }
          },
          include: {
            workouts: {
              where: {
                dayNumber
              }
            }
          }
        })

        const workoutsToUpdate = futureWeeks.flatMap(week => week.workouts)

        // Add exercise to each matching workout
        for (const targetWorkout of workoutsToUpdate) {
          // Calculate order for this specific workout
          const existingExercises = await tx.exercise.findMany({
            where: { workoutId: targetWorkout.id },
            select: { order: true }
          })

          const maxOrderInWorkout = Math.max(0, ...existingExercises.map(e => e.order))
          const nextOrderInWorkout = maxOrderInWorkout + 1

          const exercise = await tx.exercise.create({
            data: {
              name: exerciseDefinition.name,
              exerciseDefinitionId,
              order: nextOrderInWorkout,
              workoutId: targetWorkout.id,
              isOneOff: false,
              userId: user.id,
            }
          })

          // Create prescribed sets for this exercise
          await tx.prescribedSet.createMany({
            data: prescribedSets.map(set => ({
              setNumber: set.setNumber,
              reps: set.reps,
              rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
              rir: set.intensityType === 'RIR' ? set.intensityValue : null,
              exerciseId: exercise.id,
              userId: user.id,
            }))
          })

          // If this is the current workout, store reference for response
          if (targetWorkout.id === workoutId) {
            addedExercise = await tx.exercise.findUnique({
              where: { id: exercise.id },
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
              }
            })
          }
        }

        addedToCount = workoutsToUpdate.length
      })
    }

    return NextResponse.json({
      success: true,
      exercise: addedExercise,
      addedToCount
    })
  } catch (error) {
    console.error('Error adding exercise during logging:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
