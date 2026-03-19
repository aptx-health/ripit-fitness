import { PrismaClient } from '@prisma/client'

export type SetSpec = {
  setNumber: number
  reps: string
  rir?: number
  rpe?: number
}

export type ExerciseSpec = {
  name: string
  sets: SetSpec[]
}

export type WorkoutSpec = {
  name: string
  dayNumber: number
  exercises: ExerciseSpec[]
}

export type ProgramSpec = {
  name: string
  description: string
  programType?: string
  workouts: WorkoutSpec[]
}

/**
 * Look up an exercise definition by normalized name.
 * Falls back to a case-insensitive search if exact match fails.
 */
async function findExerciseDef(prisma: PrismaClient, name: string) {
  const normalized = name.toLowerCase()
  const def = await prisma.exerciseDefinition.findFirst({
    where: { normalizedName: normalized },
    select: { id: true },
  })
  if (!def) {
    console.warn(`  WARNING: No exercise definition found for "${name}"`)
  }
  return def
}

/**
 * Creates a full program (week 1 only) from a ProgramSpec.
 * Returns the created program ID.
 */
export async function createProgramFromSpec(
  prisma: PrismaClient,
  userId: string,
  spec: ProgramSpec
): Promise<string> {
  // Create program
  const program = await prisma.program.create({
    data: {
      name: spec.name,
      description: spec.description,
      userId,
      isActive: false,
      programType: spec.programType ?? 'strength',
    },
  })
  console.log(`  Created program: ${program.name}`)

  // Create week 1
  const week = await prisma.week.create({
    data: {
      weekNumber: 1,
      programId: program.id,
      userId,
    },
  })

  // Create workouts
  for (const workoutSpec of spec.workouts) {
    const workout = await prisma.workout.create({
      data: {
        name: workoutSpec.name,
        dayNumber: workoutSpec.dayNumber,
        weekId: week.id,
        userId,
      },
    })

    // Create exercises with prescribed sets
    for (let i = 0; i < workoutSpec.exercises.length; i++) {
      const exSpec = workoutSpec.exercises[i]
      const def = await findExerciseDef(prisma, exSpec.name)

      await prisma.exercise.create({
        data: {
          name: exSpec.name,
          exerciseDefinitionId: def?.id ?? null,
          order: i + 1,
          workoutId: workout.id,
          userId,
          prescribedSets: {
            create: exSpec.sets.map((s) => ({
              setNumber: s.setNumber,
              reps: s.reps,
              weight: '',
              rir: s.rir ?? null,
              rpe: s.rpe ?? null,
              userId,
            })),
          },
        },
      })
    }

    console.log(
      `    ${workout.name}: ${workoutSpec.exercises.length} exercises`
    )
  }

  return program.id
}

/**
 * Helper to generate N identical sets with RIR.
 * e.g. makeSets(3, '10', 2) => 3 sets of 10 reps at RIR 2
 */
export function makeSets(count: number, reps: string, rir?: number): SetSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps,
    rir,
  }))
}

/**
 * Helper to generate N identical sets with RPE.
 * e.g. makeSetsRpe(5, '5', 7) => 5 sets of 5 reps at RPE 7
 */
export function makeSetsRpe(count: number, reps: string, rpe?: number): SetSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps,
    rpe,
  }))
}
