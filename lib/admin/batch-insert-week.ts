import { createId } from '@paralleldrive/cuid2'
import { Prisma, type PrismaClient } from '@prisma/client'

export interface WeekData {
  weekNumber: number
  description?: string | null
  workouts?: WorkoutData[]
}

interface WorkoutData {
  name: string
  dayNumber: number
  exercises: ExerciseData[]
}

interface ExerciseData {
  name: string
  exerciseDefinitionId: string
  order: number
  exerciseGroup?: string
  notes?: string
  prescribedSets?: PrescribedSetData[]
}

interface PrescribedSetData {
  setNumber: number
  reps: string
  weight?: string
  rpe?: number
  rir?: number
  isWarmup?: boolean
}

/**
 * Batch inserts a strength program week with all workouts, exercises, and prescribed sets.
 * Uses raw SQL batch INSERTs for performance.
 * Ported from cloud-functions/clone-program/src/batch-insert.ts
 */
export async function batchInsertStrengthWeek(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  weekData: WeekData,
  programId: string,
  userId: string
): Promise<void> {
  const weekId = createId()
  const workouts = weekData.workouts || []

  const workoutIds = workouts.map(() => createId())

  const exercisesFlat: Array<{
    workoutIndex: number
    exercise: ExerciseData
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

  const setsFlat: Array<{
    exerciseId: string
    set: PrescribedSetData
  }> = []

  exercisesFlat.forEach(({ exerciseId, exercise }) => {
    const sets = exercise.prescribedSets || []
    sets.forEach((set) => {
      setsFlat.push({
        exerciseId,
        set,
      })
    })
  })

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Week" (id, "weekNumber", description, "programId", "userId")
    VALUES (${weekId}, ${weekData.weekNumber}, ${weekData.description || null}, ${programId}, ${userId})
  `)

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

  if (setsFlat.length > 0) {
    const setValues = setsFlat.map(({ exerciseId, set }) => {
      return Prisma.sql`(
        ${createId()},
        ${set.setNumber},
        ${set.reps},
        ${set.weight || null},
        ${set.rpe || null},
        ${set.rir || null},
        ${set.isWarmup ?? false},
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
        "isWarmup",
        "exerciseId",
        "userId"
      )
      VALUES ${Prisma.join(setValues, ',')}
    `)
  }
}
