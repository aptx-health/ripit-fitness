import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the complete week with all nested relations
    const originalWeek = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        program: true,
        workouts: {
          include: {
            exercises: {
              include: {
                prescribedSets: {
                  orderBy: { setNumber: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    if (!originalWeek) {
      return NextResponse.json(
        { error: 'Week not found' },
        { status: 404 }
      )
    }

    if (originalWeek.program.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Find the maximum week number in the program to append the duplicate
    const maxWeekNumber = await prisma.week.findFirst({
      where: { programId: originalWeek.programId },
      orderBy: { weekNumber: 'desc' },
      select: { weekNumber: true }
    })

    const newWeekNumber = (maxWeekNumber?.weekNumber || 0) + 1

    // Deep copy the week and all nested content in a transaction
    const duplicatedWeek = await prisma.$transaction(async (tx) => {
      // Create the new week
      const newWeek = await tx.week.create({
        data: {
          weekNumber: newWeekNumber,
          programId: originalWeek.programId,
          userId: user.id,
        }
      })

      // Duplicate all workouts in this week
      for (const workout of originalWeek.workouts) {
        const newWorkout = await tx.workout.create({
          data: {
            name: workout.name,
            dayNumber: workout.dayNumber,
            weekId: newWeek.id,
            userId: user.id,
          }
        })

        // Duplicate all exercises in this workout
        for (const exercise of workout.exercises) {
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
      }

      // Return the new week with basic info
      return newWeek
    })

    // Fetch the complete duplicated week to return
    const completeDuplicatedWeek = await prisma.week.findUnique({
      where: { id: duplicatedWeek.id },
      include: {
        workouts: {
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
        }
      }
    })

    return NextResponse.json({
      success: true,
      week: completeDuplicatedWeek
    })
  } catch (error) {
    console.error('Error duplicating week:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
