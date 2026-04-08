import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { CurrentStrengthWeekData } from './current-week'

/**
 * Fetches a specific week of the active strength program by week number.
 * Used for navigating to non-current weeks via URL params.
 *
 * Leverages existing index: Week_program_user_weekNum_idx
 *
 * @param userId - The user's ID
 * @param weekNumber - The week number to fetch
 * @returns Week data or null if no active program or week not found
 */
export async function getStrengthWeekByNumber(
  userId: string,
  weekNumber: number
): Promise<CurrentStrengthWeekData | null> {
  try {
    // Single query to find active program + specific week + total weeks
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
        WHERE p."userId" = (SELECT ${userId})
          AND p."isActive" = true
          AND p."isArchived" = false
        LIMIT 1
      )
      SELECT
        ap.id as "programId",
        ap.name as "programName",
        ap.total_weeks as "totalWeeks",
        w.id as "weekId",
        w."weekNumber" as "weekNumber"
      FROM active_program ap
      JOIN "Week" w ON w."programId" = ap.id
        AND w."userId" = (SELECT ${userId})
        AND w."weekNumber" = ${weekNumber}
      WHERE ap.id IS NOT NULL
    `

    if (result.length === 0 || !result[0].weekId) {
      return null
    }

    const { programId, programName, totalWeeks, weekId } = result[0]

    // Fetch the week with workout details using Prisma
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      select: {
        id: true,
        weekNumber: true,
        description: true,
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
    logger.error({ error, context: 'week-navigation' }, 'Error fetching week by number')
    return null
  }
}

