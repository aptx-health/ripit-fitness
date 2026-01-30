import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

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
    const { user, error } = await getCurrentUser()

    if (error || !user) {
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

    // Create the new program shell first (outside transaction)
    const newProgram = await prisma.program.create({
      data: {
        name: newProgramName,
        description: originalProgram.description,
        userId: user.id,
        isActive: false,
        isArchived: false,
        programType: originalProgram.programType,
        isUserCreated: true,
      }
    })

    try {
      // Process each week in its own transaction with 30s timeout
      for (const week of originalProgram.weeks) {
        await prisma.$transaction(async (tx) => {
          await batchInsertWeek(tx, week, newProgram.id, user.id)
        }, { timeout: 30000 })
      }

      // Fetch the complete duplicated program to return
      const completeDuplicatedProgram = await prisma.program.findUnique({
        where: { id: newProgram.id },
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
      // Cleanup: delete the partially created program on failure
      console.error('Error during duplication, cleaning up:', error)
      await prisma.program.delete({
        where: { id: newProgram.id }
      }).catch(cleanupError => {
        console.error('Failed to cleanup program:', cleanupError)
      })
      throw error
    }
  } catch (error) {
    console.error('Error duplicating program:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Batch inserts a week with all workouts, exercises, and prescribed sets using raw SQL.
 * Much faster than nested Prisma creates.
 */
async function batchInsertWeek(
  tx: Prisma.TransactionClient,
  week: {
    weekNumber: number
    workouts: Array<{
      name: string
      dayNumber: number
      exercises: Array<{
        name: string
        exerciseDefinitionId: string
        order: number
        exerciseGroup: string | null
        notes: string | null
        prescribedSets: Array<{
          setNumber: number
          reps: string
          weight: string | null
          rpe: number | null
          rir: number | null
        }>
      }>
    }>
  },
  programId: string,
  userId: string
): Promise<void> {
  // Pre-generate all IDs to maintain foreign key relationships
  const weekId = createId()
  const workouts = week.workouts || []
  const workoutIds = workouts.map(() => createId())

  // Flatten exercises and generate IDs
  const exercisesFlat: Array<{
    workoutIndex: number
    exercise: typeof workouts[0]['exercises'][0]
    exerciseId: string
  }> = []

  workouts.forEach((workout, workoutIndex) => {
    workout.exercises.forEach((exercise) => {
      exercisesFlat.push({
        workoutIndex,
        exercise,
        exerciseId: createId(),
      })
    })
  })

  // Flatten prescribed sets
  const setsFlat: Array<{
    exerciseId: string
    set: typeof workouts[0]['exercises'][0]['prescribedSets'][0]
  }> = []

  exercisesFlat.forEach(({ exerciseId, exercise }) => {
    exercise.prescribedSets.forEach((set) => {
      setsFlat.push({ exerciseId, set })
    })
  })

  // 1. INSERT Week
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Week" (id, "weekNumber", "programId", "userId")
    VALUES (${weekId}, ${week.weekNumber}, ${programId}, ${userId})
  `)

  // 2. Batch INSERT Workouts
  if (workouts.length > 0) {
    const workoutValues = workouts.map((workout, idx) => {
      return Prisma.sql`(
        ${workoutIds[idx]},
        ${workout.name},
        ${workout.dayNumber},
        ${weekId},
        ${userId}
      )`
    })

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "Workout" (id, name, "dayNumber", "weekId", "userId")
      VALUES ${Prisma.join(workoutValues, ',')}
    `)
  }

  // 3. Batch INSERT Exercises
  if (exercisesFlat.length > 0) {
    const exerciseValues = exercisesFlat.map(({ workoutIndex, exercise, exerciseId }) => {
      return Prisma.sql`(
        ${exerciseId},
        ${exercise.name},
        ${exercise.exerciseDefinitionId},
        ${exercise.order},
        ${exercise.exerciseGroup || null},
        ${workoutIds[workoutIndex]},
        ${exercise.notes || null},
        ${userId},
        ${false}
      )`
    })

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "Exercise" (
        id,
        name,
        "exerciseDefinitionId",
        "order",
        "exerciseGroup",
        "workoutId",
        notes,
        "userId",
        "isOneOff"
      )
      VALUES ${Prisma.join(exerciseValues, ',')}
    `)
  }

  // 4. Batch INSERT PrescribedSets
  if (setsFlat.length > 0) {
    const setValues = setsFlat.map(({ exerciseId, set }) => {
      return Prisma.sql`(
        ${createId()},
        ${set.setNumber},
        ${set.reps},
        ${set.weight || null},
        ${set.rpe || null},
        ${set.rir || null},
        ${exerciseId},
        ${userId}
      )`
    })

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "PrescribedSet" (
        id,
        "setNumber",
        reps,
        weight,
        rpe,
        rir,
        "exerciseId",
        "userId"
      )
      VALUES ${Prisma.join(setValues, ',')}
    `)
  }
}
