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
 * Fetches the current week of the active strength program.
 * "Current" is defined as the first incomplete week (or last week if all complete).
 *
 * Optimized to use 2 queries instead of 3-4:
 * 1. Single query to find active program + current week ID
 * 2. Prisma query to fetch week details with nested data
 *
 * @param userId - The user's ID
 * @returns Current week data or null if no active program
 */
export async function getCurrentStrengthWeek(
  userId: string
): Promise<CurrentStrengthWeekData | null> {
  try {
    // Step 1: Single query to find active program AND current week
    // Combines: find program + find incomplete week + fallback to last week
    const result = await prisma.$queryRaw<Array<{
      programId: string
      programName: string
      totalWeeks: bigint
      weekId: string
      weekNumber: number
    }>>`
      WITH active_program AS (
        SELECT p.id, p.name,
          (SELECT COUNT(*) FROM "Week" WHERE "programId" = p.id) as total_weeks
        FROM "Program" p
        WHERE p."userId" = ${userId}
          AND p."isActive" = true
          AND p."isArchived" = false
        LIMIT 1
      ),
      incomplete_week AS (
        SELECT w.id, w."weekNumber"
        FROM "Week" w, active_program ap
        WHERE w."programId" = ap.id
          AND w."userId" = ${userId}
          AND (
            SELECT COUNT(*) FROM "Workout" WHERE "weekId" = w.id
          ) > (
            SELECT COUNT(DISTINCT wc."workoutId")
            FROM "WorkoutCompletion" wc
            JOIN "Workout" wo ON wc."workoutId" = wo.id
            WHERE wo."weekId" = w.id
              AND wc."userId" = ${userId}
              AND wc.status IN ('completed', 'skipped')
              AND wc."isArchived" = false
          )
        ORDER BY w."weekNumber" ASC
        LIMIT 1
      ),
      last_week AS (
        SELECT w.id, w."weekNumber"
        FROM "Week" w, active_program ap
        WHERE w."programId" = ap.id
          AND w."userId" = ${userId}
        ORDER BY w."weekNumber" DESC
        LIMIT 1
      )
      SELECT
        ap.id as "programId",
        ap.name as "programName",
        ap.total_weeks as "totalWeeks",
        COALESCE(iw.id, lw.id) as "weekId",
        COALESCE(iw."weekNumber", lw."weekNumber") as "weekNumber"
      FROM active_program ap
      LEFT JOIN incomplete_week iw ON true
      LEFT JOIN last_week lw ON true
      WHERE ap.id IS NOT NULL
    `

    if (result.length === 0 || !result[0].weekId) {
      return null
    }

    const { programId, programName, totalWeeks, weekId } = result[0]

    // Step 2: Fetch the week with workout details using Prisma
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      select: {
        id: true,
        weekNumber: true,
        workouts: {
          select: {
            id: true,
            name: true,
            dayNumber: true,
            completions: {
              where: { userId, isArchived: false },
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
      program: { id: programId, name: programName },
      week,
      totalWeeks: Number(totalWeeks)
    }
  } catch (error) {
    console.error('[getCurrentStrengthWeek] Error fetching current week:', error)
    return null
  }
}

