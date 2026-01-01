import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
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
                }
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
          }
        })

        // Duplicate all workouts
        for (const workout of sourceWeek.workouts) {
          const newWorkout = await tx.workout.create({
            data: {
              name: workout.name,
              dayNumber: workout.dayNumber,
              weekId: week.id,
            }
          })

          // Duplicate all exercises
          for (const exercise of workout.exercises) {
            const newExercise = await tx.exercise.create({
              data: {
                name: exercise.name,
                exerciseDefinitionId: exercise.exerciseDefinitionId,
                order: exercise.order,
                exerciseGroup: exercise.exerciseGroup,
                workoutId: newWorkout.id,
                notes: exercise.notes,
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
                }))
              })
            }
          }
        }

        return week
      })
    } else {
      // Create empty week
      newWeek = await prisma.week.create({
        data: {
          weekNumber,
          programId,
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
              }
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