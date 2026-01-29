import { PrismaClient } from '@prisma/client'

export interface ProgramCloneJob {
  communityProgramId: string
  programId: string
  userId: string
  programType: 'strength' | 'cardio'
}

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
 * Clones a strength program's weeks/workouts/exercises into the shell program.
 * Processes one week per transaction for resilience.
 */
export async function cloneStrengthProgramData(
  prisma: PrismaClient,
  programId: string,
  programData: { weeks: WeekData[] },
  userId: string
): Promise<void> {
  const totalWeeks = programData.weeks.length

  // Idempotency check: if ALL weeks already exist, job already succeeded (retry scenario)
  const existingWeekCount = await prisma.week.count({
    where: { programId },
  })

  if (existingWeekCount > 0) {
    if (existingWeekCount === totalWeeks) {
      console.log(`Program ${programId} already has all ${totalWeeks} weeks - marking as ready (idempotent retry)`)
      await prisma.program.update({
        where: { id: programId },
        data: { copyStatus: 'ready' },
      })
      return
    } else {
      // Partial weeks exist - corrupted state from previous failed attempt
      console.error(`Program ${programId} has ${existingWeekCount}/${totalWeeks} weeks - partial clone detected, marking as failed`)
      await prisma.program.update({
        where: { id: programId },
        data: { copyStatus: 'failed' },
      })
      throw new Error(`Partial clone detected: ${existingWeekCount}/${totalWeeks} weeks`)
    }
  }

  for (let i = 0; i < programData.weeks.length; i++) {
    const week = programData.weeks[i]

    await prisma.program.update({
      where: { id: programId },
      data: { copyStatus: `cloning_week_${i + 1}_of_${totalWeeks}` },
    })

    await prisma.$transaction(async (tx) => {
      await tx.week.create({
        data: {
          weekNumber: week.weekNumber,
          programId,
          userId,
          workouts: {
            create: (week.workouts || []).map((workout) => ({
              name: workout.name,
              dayNumber: workout.dayNumber,
              userId,
              exercises: {
                create: workout.exercises.map((exercise) => ({
                  name: exercise.name,
                  exerciseDefinitionId: exercise.exerciseDefinitionId,
                  order: exercise.order,
                  exerciseGroup: exercise.exerciseGroup,
                  userId,
                  notes: exercise.notes,
                  prescribedSets: {
                    createMany: {
                      data: (exercise.prescribedSets || []).map((set) => ({
                        setNumber: set.setNumber,
                        reps: set.reps,
                        weight: set.weight,
                        rpe: set.rpe,
                        rir: set.rir,
                        userId,
                      })),
                    },
                  },
                })),
              },
            })),
          },
        },
      })
    }, { timeout: 30000 })
  }

  // Mark as ready - wrapped separately for better error visibility
  try {
    await prisma.program.update({
      where: { id: programId },
      data: { copyStatus: 'ready' },
    })
    console.log(`Successfully marked strength program ${programId} as ready`)
  } catch (error) {
    console.error(`Failed to mark program ${programId} as ready:`, error)
    throw error
  }
}

/**
 * Clones a cardio program's weeks/sessions into the shell program.
 * Processes one week per transaction for resilience.
 */
export async function cloneCardioProgramData(
  prisma: PrismaClient,
  programId: string,
  programData: { weeks: WeekData[] },
  userId: string
): Promise<void> {
  const totalWeeks = programData.weeks.length

  // Idempotency check: if ALL weeks already exist, job already succeeded (retry scenario)
  const existingWeekCount = await prisma.cardioWeek.count({
    where: { cardioProgramId: programId },
  })

  if (existingWeekCount > 0) {
    if (existingWeekCount === totalWeeks) {
      console.log(`Cardio program ${programId} already has all ${totalWeeks} weeks - marking as ready (idempotent retry)`)
      await prisma.cardioProgram.update({
        where: { id: programId },
        data: { copyStatus: 'ready' },
      })
      return
    } else {
      // Partial weeks exist - corrupted state from previous failed attempt
      console.error(`Cardio program ${programId} has ${existingWeekCount}/${totalWeeks} weeks - partial clone detected, marking as failed`)
      await prisma.cardioProgram.update({
        where: { id: programId },
        data: { copyStatus: 'failed' },
      })
      throw new Error(`Partial clone detected: ${existingWeekCount}/${totalWeeks} weeks`)
    }
  }

  for (let i = 0; i < programData.weeks.length; i++) {
    const week = programData.weeks[i]

    await prisma.cardioProgram.update({
      where: { id: programId },
      data: { copyStatus: `cloning_week_${i + 1}_of_${totalWeeks}` },
    })

    await prisma.$transaction(async (tx) => {
      await tx.cardioWeek.create({
        data: {
          weekNumber: week.weekNumber,
          cardioProgramId: programId,
          userId,
          sessions: {
            create: (week.sessions || []).map((session) => ({
              dayNumber: session.dayNumber,
              name: session.name,
              description: session.description,
              targetDuration: session.targetDuration,
              intensityZone: session.intensityZone,
              equipment: session.equipment,
              targetHRRange: session.targetHRRange,
              targetPowerRange: session.targetPowerRange,
              intervalStructure: session.intervalStructure,
              notes: session.notes,
              userId,
            })),
          },
        },
      })
    }, { timeout: 30000 })
  }

  // Mark as ready - wrapped separately for better error visibility
  try {
    await prisma.cardioProgram.update({
      where: { id: programId },
      data: { copyStatus: 'ready' },
    })
    console.log(`Successfully marked cardio program ${programId} as ready`)
  } catch (error) {
    console.error(`Failed to mark cardio program ${programId} as ready:`, error)
    throw error
  }
}
