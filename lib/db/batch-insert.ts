import { Prisma } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

/**
 * Type for week data structure used in batch inserts.
 */
export type WeekData = {
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
      isOneOff?: boolean
      prescribedSets: Array<{
        setNumber: number
        reps: string
        weight: string | null
        rpe: number | null
        rir: number | null
      }>
    }>
  }>
}

/**
 * Batch inserts workouts, exercises, and prescribed sets into an existing week using raw SQL.
 * Much faster than nested Prisma creates - reduces 50+ operations to 3.
 */
export async function batchInsertWeekContent(
  tx: Prisma.TransactionClient,
  weekId: string,
  workouts: WeekData['workouts'],
  userId: string
): Promise<void> {
  if (!workouts || workouts.length === 0) {
    return
  }

  // Pre-generate all IDs to maintain foreign key relationships
  const workoutIds = workouts.map(() => createId())

  // Flatten exercises and generate IDs
  const exercisesFlat: Array<{
    workoutIndex: number
    exercise: WeekData['workouts'][0]['exercises'][0]
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
    set: WeekData['workouts'][0]['exercises'][0]['prescribedSets'][0]
  }> = []

  exercisesFlat.forEach(({ exerciseId, exercise }) => {
    exercise.prescribedSets.forEach((set) => {
      setsFlat.push({ exerciseId, set })
    })
  })

  // 1. Batch INSERT Workouts
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

  // 2. Batch INSERT Exercises
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
        ${exercise.isOneOff ?? false}
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

  // 3. Batch INSERT PrescribedSets
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

/**
 * Batch inserts a week with all workouts, exercises, and prescribed sets using raw SQL.
 * Creates the week first, then batch inserts all content.
 * Much faster than nested Prisma creates - reduces 50+ operations to 4.
 */
export async function batchInsertWeek(
  tx: Prisma.TransactionClient,
  week: WeekData,
  programId: string,
  userId: string
): Promise<string> {
  // Pre-generate week ID
  const weekId = createId()

  // 1. INSERT Week
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Week" (id, "weekNumber", "programId", "userId")
    VALUES (${weekId}, ${week.weekNumber}, ${programId}, ${userId})
  `)

  // 2. Insert all content
  await batchInsertWeekContent(tx, weekId, week.workouts || [], userId)

  return weekId
}
