import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

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
  // Get all workouts for the program with minimal data
  const program = await prisma.program.findFirst({
    where: {
      id: programId,
      userId,
    },
    select: {
      id: true,
      weeks: {
        select: {
          workouts: {
            select: {
              id: true,
              completions: {
                where: {
                  status: {
                    in: ['completed', 'skipped'],
                  },
                  isArchived: false,
                },
                take: 1,
                orderBy: {
                  completedAt: 'desc',
                },
                select: {
                  status: true,
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
    select: {
      id: true,
      name: true,
      weeks: {
        select: {
          workouts: {
            select: {
              id: true,
              completions: {
                where: {
                  status: {
                    in: ['completed', 'skipped'],
                  },
                  isArchived: false,
                },
                orderBy: {
                  completedAt: 'desc',
                },
                take: 1,
                select: {
                  status: true,
                  completedAt: true,
                },
              },
              exercises: {
                select: {
                  id: true,
                  loggedSets: {
                    select: {
                      weight: true,
                      reps: true,
                    },
                  },
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

/**
 * Check if a cardio program is fully completed (all sessions completed or skipped)
 */
export async function getCardioProgramCompletionStatus(
  prisma: PrismaClient,
  cardioProgramId: string,
  userId: string
): Promise<ProgramCompletionStatus> {
  // Get all sessions for the cardio program with minimal data
  const program = await prisma.cardioProgram.findFirst({
    where: {
      id: cardioProgramId,
      userId,
    },
    select: {
      id: true,
      name: true,
      weeks: {
        select: {
          sessions: {
            select: {
              id: true,
              name: true,
              loggedSessions: {
                where: {
                  status: {
                    in: ['completed', 'skipped'],
                  },
                },
                take: 1,
                orderBy: {
                  completedAt: 'desc',
                },
                select: {
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!program) {
    throw new Error('Cardio program not found')
  }

  // Flatten all sessions
  const allSessions = program.weeks.flatMap((week) => week.sessions)
  const totalWorkouts = allSessions.length

  // Count completed and skipped sessions
  const sessionsWithCompletion = allSessions.filter(
    (session) => session.loggedSessions.length > 0
  )
  const completedWorkouts = allSessions.filter(
    (session) =>
      session.loggedSessions.length > 0 &&
      session.loggedSessions[0].status === 'completed'
  ).length
  const skippedWorkouts = allSessions.filter(
    (session) =>
      session.loggedSessions.length > 0 &&
      session.loggedSessions[0].status === 'skipped'
  ).length

  const remainingWorkouts = totalWorkouts - sessionsWithCompletion.length
  const isComplete = remainingWorkouts === 0 && totalWorkouts > 0

  // Debug logging
  logger.debug({
    cardioProgramId,
    userId,
    programName: program.name,
    totalSessions: totalWorkouts,
    sessionsWithCompletion: sessionsWithCompletion.length,
    completedWorkouts,
    skippedWorkouts,
    remainingWorkouts,
    isComplete,
    sessionDetails: allSessions.map(s => ({
      id: s.id,
      name: s.name,
      hasLoggedSession: s.loggedSessions.length > 0,
      status: s.loggedSessions[0]?.status || 'none'
    }))
  }, 'Cardio program completion status check')

  return {
    isComplete,
    totalWorkouts,
    completedWorkouts,
    skippedWorkouts,
    remainingWorkouts,
    completionPercentage:
      totalWorkouts > 0
        ? Math.round((sessionsWithCompletion.length / totalWorkouts) * 100)
        : 0,
  }
}

/**
 * Get cardio program completion stats for display in celebration modal
 */
export async function getCardioProgramCompletionStats(
  prisma: PrismaClient,
  cardioProgramId: string,
  userId: string
) {
  const program = await prisma.cardioProgram.findFirst({
    where: {
      id: cardioProgramId,
      userId,
    },
    select: {
      id: true,
      name: true,
      weeks: {
        select: {
          sessions: {
            select: {
              id: true,
              loggedSessions: {
                where: {
                  status: {
                    in: ['completed', 'skipped'],
                  },
                },
                orderBy: {
                  completedAt: 'desc',
                },
                take: 1,
                select: {
                  status: true,
                  completedAt: true,
                  duration: true,
                  distance: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!program) {
    throw new Error('Cardio program not found')
  }

  const allSessions = program.weeks.flatMap((week) => week.sessions)
  const sessionsWithCompletion = allSessions.filter(
    (session) => session.loggedSessions.length > 0
  )

  // Calculate stats
  const completedSessions = sessionsWithCompletion.filter(
    (s) => s.loggedSessions[0]?.status === 'completed'
  )
  const completedWorkouts = completedSessions.length
  const skippedWorkouts = sessionsWithCompletion.filter(
    (s) => s.loggedSessions[0]?.status === 'skipped'
  ).length

  // Calculate duration (from first to last completion)
  const completionDates = sessionsWithCompletion
    .map((s) => s.loggedSessions[0]?.completedAt)
    .filter((date): date is Date => date !== undefined)
    .sort((a, b) => a.getTime() - b.getTime())

  const startDate = completionDates[0]
  const endDate = completionDates[completionDates.length - 1]
  const durationDays =
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

  // Calculate total duration in minutes (for completed sessions only)
  const totalDuration = completedSessions.reduce((total, session) => {
    const loggedDuration = session.loggedSessions[0]?.duration || 0
    return total + loggedDuration
  }, 0)

  // Calculate total distance (for completed sessions with distance)
  const totalDistance = completedSessions.reduce((total, session) => {
    const distance = session.loggedSessions[0]?.distance || 0
    return total + distance
  }, 0)

  // Count total sessions
  const totalSessions = completedSessions.length

  return {
    programName: program.name,
    programId: program.id,
    completedWorkouts,
    skippedWorkouts,
    totalWorkouts: allSessions.length,
    durationDays,
    startDate,
    endDate,
    totalDuration, // in minutes
    totalDistance, // in miles/km
    totalSessions,
  }
}
