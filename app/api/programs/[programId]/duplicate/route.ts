import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * Generates a unique program name by appending " (Copy)" or " (Copy N)"
 */
function generateCopyName(originalName: string, existingNames: string[]): string {
  const baseName = originalName.replace(/\s*\(Copy\s*\d*\)$/, '').trim()

  // Try "Program Name (Copy)" first
  let candidateName = `${baseName} (Copy)`
  if (!existingNames.includes(candidateName)) {
    return candidateName
  }

  // Find the highest copy number
  let copyNumber = 2
  while (existingNames.includes(`${baseName} (Copy ${copyNumber})`)) {
    copyNumber++
  }

  return `${baseName} (Copy ${copyNumber})`
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

    // Fetch the complete program with all nested relations
    const originalProgram = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        weeks: {
          include: {
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
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })

    if (!originalProgram) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      )
    }

    if (originalProgram.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all existing program names for this user to avoid conflicts
    const existingPrograms = await prisma.program.findMany({
      where: { userId: user.id },
      select: { name: true }
    })
    const existingNames = existingPrograms.map(p => p.name)

    // Generate unique copy name
    const newProgramName = generateCopyName(originalProgram.name, existingNames)

    // Deep copy the entire program structure in a transaction
    const duplicatedProgram = await prisma.$transaction(async (tx) => {
      // Create the new program
      const newProgram = await tx.program.create({
        data: {
          name: newProgramName,
          description: originalProgram.description,
          userId: user.id,
          isActive: false, // Duplicated programs start as inactive
          isArchived: false,
          programType: originalProgram.programType,
          isUserCreated: true, // Mark as user-created since it's a duplicate
        }
      })

      // Duplicate all weeks and their nested content
      for (const week of originalProgram.weeks) {
        const newWeek = await tx.week.create({
          data: {
            weekNumber: week.weekNumber,
            programId: newProgram.id,
            userId: user.id,
          }
        })

        // Duplicate all workouts in this week
        for (const workout of week.workouts) {
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
      }

      // Return the new program with basic info
      return newProgram
    })

    // Fetch the complete duplicated program to return
    const completeDuplicatedProgram = await prisma.program.findUnique({
      where: { id: duplicatedProgram.id },
      include: {
        weeks: {
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
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      program: completeDuplicatedProgram
    })
  } catch (error) {
    console.error('Error duplicating program:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
