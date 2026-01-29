import { Prisma, PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

interface WeekData {
  weekNumber: number
  workouts?: WorkoutData[]
  sessions?: CardioSessionData[]
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
}

interface CardioSessionData {
  dayNumber: number
  name: string
  description?: string
  targetDuration: number
  intensityZone?: string
  equipment?: string
  targetHRRange?: string
  targetPowerRange?: string
  intervalStructure?: string
  notes?: string
}

/**
 * Batch inserts a strength program week with all workouts, exercises, and prescribed sets.
 * Uses raw SQL batch INSERTs to dramatically improve performance over nested creates.
 */
export async function batchInsertStrengthWeek(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  weekData: WeekData,
  programId: string,
  userId: string
): Promise<void> {
  const startTime = Date.now()

  // Pre-generate all IDs to maintain foreign key relationships
  const weekId = createId()
  const workouts = weekData.workouts || []

  const workoutIds = workouts.map(() => createId())

  // Flatten exercises from all workouts and generate IDs
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

  // Flatten prescribed sets from all exercises and generate IDs
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

  // 1. INSERT Week (single row)
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Week" (id, "weekNumber", "programId", "userId")
    VALUES (${weekId}, ${weekData.weekNumber}, ${programId}, ${userId})
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

  const duration = Date.now() - startTime
  const exerciseCount = exercisesFlat.length
  const setCount = setsFlat.length

  console.log(
    `Batch insert week ${weekData.weekNumber}: ${duration}ms ` +
    `(${workouts.length} workouts, ${exerciseCount} exercises, ${setCount} sets)`
  )
}

/**
 * Batch inserts a cardio program week with all prescribed cardio sessions.
 * Uses raw SQL batch INSERTs to improve performance over nested creates.
 */
export async function batchInsertCardioWeek(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  weekData: WeekData,
  programId: string,
  userId: string
): Promise<void> {
  const startTime = Date.now()

  // Pre-generate all IDs
  const weekId = createId()
  const sessions = weekData.sessions || []

  // 1. INSERT CardioWeek (single row)
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "CardioWeek" (id, "weekNumber", "cardioProgramId", "userId")
    VALUES (${weekId}, ${weekData.weekNumber}, ${programId}, ${userId})
  `)

  // 2. Batch INSERT PrescribedCardioSessions
  if (sessions.length > 0) {
    const now = new Date()

    const sessionValues = sessions.map((session) => {
      return Prisma.sql`(
        ${createId()},
        ${weekId},
        ${session.dayNumber},
        ${session.name},
        ${session.description || null},
        ${session.targetDuration},
        ${session.intensityZone || null},
        ${session.equipment || null},
        ${session.targetHRRange || null},
        ${session.targetPowerRange || null},
        ${session.intervalStructure || null},
        ${session.notes || null},
        ${userId},
        ${now},
        ${now}
      )`
    })

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "PrescribedCardioSession" (
        id,
        "weekId",
        "dayNumber",
        name,
        description,
        "targetDuration",
        "intensityZone",
        equipment,
        "targetHRRange",
        "targetPowerRange",
        "intervalStructure",
        notes,
        "userId",
        "createdAt",
        "updatedAt"
      )
      VALUES ${Prisma.join(sessionValues, ',')}
    `)
  }

  const duration = Date.now() - startTime

  console.log(
    `Batch insert cardio week ${weekData.weekNumber}: ${duration}ms ` +
    `(${sessions.length} sessions)`
  )
}
