import { prisma } from '@/lib/db'

/**
 * Result type for getCurrentStrengthWeek
 */
export type CurrentStrengthWeekData = {
  program: {
    id: string
    name: string
  }
  week: {
    id: string
    weekNumber: number
    workouts: Array<{
      id: string
      name: string
      dayNumber: number
      completions: Array<{
        id: string
        status: string
        completedAt: Date
      }>
      _count: {
        exercises: number
      }
    }>
  }
  totalWeeks: number
}

/**
 * Result type for getCurrentCardioWeek
 */
export type CurrentCardioWeekData = {
  program: {
    id: string
    name: string
  }
  week: {
    id: string
    weekNumber: number
    sessions: Array<{
      id: string
      name: string
      dayNumber: number
      description: string | null
      targetDuration: number
      intensityZone: string | null
      equipment: string | null
      targetHRRange: string | null
      targetPowerRange: string | null
      intervalStructure: string | null
      notes: string | null
      loggedSessions: Array<{
        id: string
        status: string
        completedAt: Date
      }>
    }>
  }
}

/**
 * Fetches the current week of the active strength program.
 * "Current" is defined as the first incomplete week (or last week if all complete).
 *
 * Uses a SQL subquery to efficiently find the first week where:
 * completed workouts < total workouts
 *
 * @param userId - The user's ID
 * @returns Current week data or null if no active program
 */
export async function getCurrentStrengthWeek(
  userId: string
): Promise<CurrentStrengthWeekData | null> {
  try {
    // Step 1: Find active program with minimal fields
    const activeProgram = await prisma.program.findFirst({
      where: {
        userId,
        isActive: true,
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { weeks: true }
        }
      }
    })

    if (!activeProgram) {
      return null
    }

    const totalWeeks = activeProgram._count.weeks

    if (totalWeeks === 0) {
      return null
    }

    // Step 2: Find first incomplete week using SQL subquery
    // This is more efficient than fetching all weeks and filtering in JS
    const incompleteWeek = await prisma.$queryRaw<Array<{ id: string; weekNumber: number }>>`
      SELECT w.id, w."weekNumber"
      FROM "Week" w
      WHERE w."programId" = ${activeProgram.id}
        AND w."userId" = ${userId}
        AND (
          SELECT COUNT(*)
          FROM "Workout" wo
          WHERE wo."weekId" = w.id
        ) > (
          SELECT COUNT(DISTINCT wc."workoutId")
          FROM "WorkoutCompletion" wc
          JOIN "Workout" wo2 ON wc."workoutId" = wo2.id
          WHERE wo2."weekId" = w.id
            AND wc."userId" = ${userId}
            AND wc.status = 'completed'
        )
      ORDER BY w."weekNumber" ASC
      LIMIT 1
    `

    let weekToFetch: { id: string; weekNumber: number } | null = null

    if (incompleteWeek.length > 0) {
      weekToFetch = incompleteWeek[0]
    } else {
      // All weeks complete - fetch last week
      const lastWeek = await prisma.week.findFirst({
        where: {
          programId: activeProgram.id,
          userId
        },
        select: {
          id: true,
          weekNumber: true
        },
        orderBy: {
          weekNumber: 'desc'
        }
      })

      if (!lastWeek) {
        return null
      }

      weekToFetch = lastWeek
    }

    // Step 3: Fetch the selected week with minimal workout data
    const week = await prisma.week.findUnique({
      where: {
        id: weekToFetch.id
      },
      select: {
        id: true,
        weekNumber: true,
        workouts: {
          select: {
            id: true,
            name: true,
            dayNumber: true,
            completions: {
              where: { userId, status: 'completed' },
              select: { id: true, status: true, completedAt: true },
              orderBy: { completedAt: 'desc' },
              take: 1
            },
            _count: {
              select: { exercises: true }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    if (!week) {
      return null
    }

    return {
      program: {
        id: activeProgram.id,
        name: activeProgram.name
      },
      week,
      totalWeeks
    }
  } catch (error) {
    console.error('[getCurrentStrengthWeek] Error fetching current week:', error)
    return null
  }
}

/**
 * Fetches the current week of the active cardio program.
 * "Current" is defined as the first incomplete week (or last week if all complete).
 *
 * Uses a SQL subquery to efficiently find the first week where:
 * completed sessions < total sessions
 *
 * @param userId - The user's ID
 * @returns Current week data or null if no active program
 */
export async function getCurrentCardioWeek(
  userId: string
): Promise<CurrentCardioWeekData | null> {
  try {
    // Step 1: Find active program with minimal fields
    const activeProgram = await prisma.cardioProgram.findFirst({
      where: {
        userId,
        isActive: true,
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { weeks: true }
        }
      }
    })

    if (!activeProgram) {
      return null
    }

    if (activeProgram._count.weeks === 0) {
      return null
    }

    // Step 2: Find first incomplete week using SQL subquery
    const incompleteWeek = await prisma.$queryRaw<Array<{ id: string; weekNumber: number }>>`
      SELECT cw.id, cw."weekNumber"
      FROM "CardioWeek" cw
      WHERE cw."cardioProgramId" = ${activeProgram.id}
        AND cw."userId" = ${userId}
        AND (
          SELECT COUNT(*)
          FROM "PrescribedCardioSession" pcs
          WHERE pcs."weekId" = cw.id
        ) > (
          SELECT COUNT(DISTINCT lcs."prescribedSessionId")
          FROM "LoggedCardioSession" lcs
          JOIN "PrescribedCardioSession" pcs2 ON lcs."prescribedSessionId" = pcs2.id
          WHERE pcs2."weekId" = cw.id
            AND lcs."userId" = ${userId}
            AND lcs.status = 'completed'
        )
      ORDER BY cw."weekNumber" ASC
      LIMIT 1
    `

    let weekToFetch: { id: string; weekNumber: number } | null = null

    if (incompleteWeek.length > 0) {
      weekToFetch = incompleteWeek[0]
    } else {
      // All weeks complete - fetch last week
      const lastWeek = await prisma.cardioWeek.findFirst({
        where: {
          cardioProgramId: activeProgram.id,
          userId
        },
        select: {
          id: true,
          weekNumber: true
        },
        orderBy: {
          weekNumber: 'desc'
        }
      })

      if (!lastWeek) {
        return null
      }

      weekToFetch = lastWeek
    }

    // Step 3: Fetch the selected week with session data
    const week = await prisma.cardioWeek.findUnique({
      where: {
        id: weekToFetch.id
      },
      select: {
        id: true,
        weekNumber: true,
        sessions: {
          select: {
            id: true,
            name: true,
            dayNumber: true,
            description: true,
            targetDuration: true,
            intensityZone: true,
            equipment: true,
            targetHRRange: true,
            targetPowerRange: true,
            intervalStructure: true,
            notes: true,
            loggedSessions: {
              where: { userId, status: 'completed' },
              select: { id: true, status: true, completedAt: true },
              orderBy: { completedAt: 'desc' },
              take: 1
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    if (!week) {
      return null
    }

    return {
      program: {
        id: activeProgram.id,
        name: activeProgram.name
      },
      week
    }
  } catch (error) {
    console.error('[getCurrentCardioWeek] Error fetching current week:', error)
    return null
  }
}
