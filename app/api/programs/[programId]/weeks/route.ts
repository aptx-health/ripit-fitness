import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

type CreateWeekRequest = {
  weekNumber: number
  sourceWeekId?: string // For duplication
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params

    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json() as CreateWeekRequest
    const { weekNumber, sourceWeekId } = body

    // Validate input
    if (!weekNumber || weekNumber < 1) {
      return NextResponse.json(
        { error: 'Valid week number is required' },
        { status: 400 }
      )
    }

    // Verify program exists and user owns it
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { weeks: true }
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if week number already exists
    const existingWeek = program.weeks.find(w => w.weekNumber === weekNumber)
    if (existingWeek) {
      return NextResponse.json(
        { error: `Week ${weekNumber} already exists` },
        { status: 400 }
      )
    }

    let newWeek

    if (sourceWeekId) {
      // Duplicate existing week
      const sourceWeek = await prisma.week.findUnique({
        where: { id: sourceWeekId },
        include: {
          workouts: {
            include: {
              exercises: {
                include: {
                  prescribedSets: true
                },
                orderBy: { order: 'asc' }
              }
            }
          }
        }
      })

      if (!sourceWeek) {
        return NextResponse.json(
          { error: 'Source week not found' },
          { status: 404 }
        )
      }

      // Verify source week belongs to same program
      if (sourceWeek.programId !== programId) {
        return NextResponse.json(
          { error: 'Cannot duplicate week from different program' },
          { status: 400 }
        )
      }

      // Create new week with duplicated structure
      newWeek = await prisma.$transaction(async (tx) => {
        const week = await tx.week.create({
          data: {
            weekNumber,
            programId,
            userId: user.id,
          }
        })

        // Prepare all data for batch creation
        const workoutsToCreate: Array<{
          id: string
          name: string
          dayNumber: number
          weekId: string
          userId: string
        }> = []
        const exercisesToCreate: Array<{
          id: string
          name: string
          exerciseDefinitionId: string
          order: number
          exerciseGroup: string | null
          workoutId: string
          notes: string | null
          userId: string
        }> = []
        const prescribedSetsToCreate: Array<{
          setNumber: number
          reps: string
          weight: string | null
          rpe: number | null
          rir: number | null
          exerciseId: string
          userId: string
        }> = []

        // Build data structures for batch creation
        for (const workout of sourceWeek.workouts) {
          const workoutId = `temp_workout_${workout.id}`
          workoutsToCreate.push({
            id: workoutId,
            name: workout.name,
            dayNumber: workout.dayNumber,
            weekId: week.id,
            userId: user.id,
          })

          for (const exercise of workout.exercises) {
            const exerciseId = `temp_exercise_${exercise.id}`
            exercisesToCreate.push({
              id: exerciseId,
              name: exercise.name,
              exerciseDefinitionId: exercise.exerciseDefinitionId,
              order: exercise.order,
              exerciseGroup: exercise.exerciseGroup,
              workoutId: workoutId,
              notes: exercise.notes,
              userId: user.id,
            })

            // Collect prescribed sets for this exercise
            for (const set of exercise.prescribedSets) {
              prescribedSetsToCreate.push({
                setNumber: set.setNumber,
                reps: set.reps,
                weight: set.weight,
                rpe: set.rpe,
                rir: set.rir,
                exerciseId: exerciseId,
                userId: user.id,
              })
            }
          }
        }

        // Create all workouts at once
        const workoutsData = workoutsToCreate.map(({ id, ...data }) => data)
        await tx.workout.createMany({ data: workoutsData })

        // Get created workouts to map IDs
        const createdWorkouts = await tx.workout.findMany({
          where: { weekId: week.id },
          select: { id: true, dayNumber: true }
        })

        // Create exercises with real workout IDs
        const exercisesData = exercisesToCreate.map(({ id: tempId, workoutId: tempWorkoutId, ...data }) => {
          const tempWorkout = workoutsToCreate.find(w => w.id === tempWorkoutId)
          const realWorkout = createdWorkouts.find(w => w.dayNumber === tempWorkout?.dayNumber)
          if (!realWorkout?.id) {
            throw new Error('Failed to map workout ID during week duplication')
          }
          return { ...data, workoutId: realWorkout.id }
        })

        await tx.exercise.createMany({ data: exercisesData })

        // Get created exercises to map IDs for prescribed sets
        const createdExercises = await tx.exercise.findMany({
          where: { 
            workout: { weekId: week.id }
          },
          select: { id: true, workoutId: true, order: true }
        })

        // Create prescribed sets with real exercise IDs
        if (prescribedSetsToCreate.length > 0) {
          const prescribedSetsWithRealIds: Array<{
            setNumber: number
            reps: string
            weight: string | null
            rpe: number | null
            rir: number | null
            exerciseId: string
            userId: string
          }> = []
          
          for (const setData of prescribedSetsToCreate) {
            const { exerciseId: tempExerciseId, ...data } = setData
            const tempExercise = exercisesToCreate.find(e => e.id === tempExerciseId)
            const tempWorkout = workoutsToCreate.find(w => w.id === tempExercise?.workoutId)
            const realWorkout = createdWorkouts.find(w => w.dayNumber === tempWorkout?.dayNumber)
            const realExercise = createdExercises.find(e => 
              e.workoutId === realWorkout?.id && e.order === tempExercise?.order
            )
            
            if (realExercise) {
              prescribedSetsWithRealIds.push({ ...data, exerciseId: realExercise.id, userId: user.id })
            }
          }

          await tx.prescribedSet.createMany({
            data: prescribedSetsWithRealIds
          })
        }

        return week
      })
    } else {
      // Create empty week
      newWeek = await prisma.week.create({
        data: {
          weekNumber,
          programId,
          userId: user.id,
        }
      })
    }

    // Fetch the complete week with all relations
    const completeWeek = await prisma.week.findUnique({
      where: { id: newWeek.id },
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                prescribedSets: true,
                exerciseDefinition: true
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      week: completeWeek
    })
  } catch (error) {
    console.error('Error creating week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}