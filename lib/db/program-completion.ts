import { PrismaClient } from '@prisma/client'

export interface ProgramCompletionStatus {
  isComplete: boolean
  totalWorkouts: number
  completedWorkouts: number
  skippedWorkouts: number
  remainingWorkouts: number
  completionPercentage: number
}

/**
 * Check if a program is fully completed (all workouts completed or skipped)
 */
export async function getProgramCompletionStatus(
  prisma: PrismaClient,
  programId: string,
  userId: string
): Promise<ProgramCompletionStatus> {
  // Get all workouts for the program
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      userId,
    },
    include: {
      weeks: {
        include: {
          workouts: {
            include: {
              completions: {
                where: {
                  status: {
                    in: ['completed', 'skipped'],
                  },
                },
                take: 1,
                orderBy: {
                  completedAt: 'desc',
                },
              },
            },
          },
        },
      },
    },
  })

  if (!program) {
    throw new Error('Program not found')
  }

  // Flatten all workouts
  const allWorkouts = program.weeks.flatMap((week) => week.workouts)
  const totalWorkouts = allWorkouts.length

  // Count completed and skipped workouts
  const workoutsWithCompletion = allWorkouts.filter(
    (workout) => workout.completions.length > 0
  )
  const completedWorkouts = allWorkouts.filter(
    (workout) =>
      workout.completions.length > 0 &&
      workout.completions[0].status === 'completed'
  ).length
  const skippedWorkouts = allWorkouts.filter(
    (workout) =>
      workout.completions.length > 0 &&
      workout.completions[0].status === 'skipped'
  ).length

  const remainingWorkouts = totalWorkouts - workoutsWithCompletion.length
  const isComplete = remainingWorkouts === 0 && totalWorkouts > 0

  return {
    isComplete,
    totalWorkouts,
    completedWorkouts,
    skippedWorkouts,
    remainingWorkouts,
    completionPercentage:
      totalWorkouts > 0
        ? Math.round((workoutsWithCompletion.length / totalWorkouts) * 100)
        : 0,
  }
}

/**
 * Get program completion stats for display in celebration modal
 */
export async function getProgramCompletionStats(
  prisma: PrismaClient,
  programId: string,
  userId: string
) {
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      userId,
    },
    include: {
      weeks: {
        include: {
          workouts: {
            include: {
              completions: {
                where: {
                  status: {
                    in: ['completed', 'skipped'],
                  },
                },
                orderBy: {
                  completedAt: 'desc',
                },
                take: 1,
              },
              exercises: {
                include: {
                  loggedSets: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!program) {
    throw new Error('Program not found')
  }

  const allWorkouts = program.weeks.flatMap((week) => week.workouts)
  const workoutsWithCompletion = allWorkouts.filter(
    (workout) => workout.completions.length > 0
  )

  // Calculate stats
  const completedWorkouts = workoutsWithCompletion.filter(
    (w) => w.completions[0]?.status === 'completed'
  ).length
  const skippedWorkouts = workoutsWithCompletion.filter(
    (w) => w.completions[0]?.status === 'skipped'
  ).length

  // Calculate duration (from first to last completion)
  const completionDates = workoutsWithCompletion
    .map((w) => w.completions[0]?.completedAt)
    .filter((date): date is Date => date !== undefined)
    .sort((a, b) => a.getTime() - b.getTime())

  const startDate = completionDates[0]
  const endDate = completionDates[completionDates.length - 1]
  const durationDays =
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

  // Calculate total volume (for completed workouts only)
  const totalVolume = allWorkouts.reduce((total, workout) => {
    if (workout.completions[0]?.status !== 'completed') return total

    const workoutVolume = workout.exercises.reduce((exerciseTotal, exercise) => {
      const exerciseVolume = exercise.loggedSets.reduce(
        (setTotal, set) => setTotal + set.weight * set.reps,
        0
      )
      return exerciseTotal + exerciseVolume
    }, 0)

    return total + workoutVolume
  }, 0)

  // Total exercises completed
  const totalExercises = allWorkouts.reduce((total, workout) => {
    if (workout.completions[0]?.status !== 'completed') return total
    return total + workout.exercises.length
  }, 0)

  return {
    programName: program.name,
    programId: program.id,
    completedWorkouts,
    skippedWorkouts,
    totalWorkouts: allWorkouts.length,
    durationDays,
    startDate,
    endDate,
    totalVolumeLbs: Math.round(totalVolume),
    totalExercises,
  }
}
