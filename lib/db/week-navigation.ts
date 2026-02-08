import { prisma } from '@/lib/db'
import type { CurrentStrengthWeekData, CurrentCardioWeekData } from './current-week'

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
    console.error('[getStrengthWeekByNumber] Error:', error)
    return null
  }
}

/**
 * Fetches a specific week of the active cardio program by week number.
 * Used for navigating to non-current weeks via URL params.
 *
 * Leverages existing index: CardioWeek_program_user_weekNum_idx
 *
 * @param userId - The user's ID
 * @param weekNumber - The week number to fetch
 * @returns Week data or null if no active program or week not found
 */
export async function getCardioWeekByNumber(
  userId: string,
  weekNumber: number
): Promise<CurrentCardioWeekData | null> {
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
        SELECT cp.id, cp.name,
          (SELECT COUNT(*) FROM "CardioWeek" WHERE "cardioProgramId" = cp.id) as total_weeks
        FROM "CardioProgram" cp
        WHERE cp."userId" = (SELECT ${userId})
          AND cp."isActive" = true
          AND cp."isArchived" = false
        LIMIT 1
      )
      SELECT
        ap.id as "programId",
        ap.name as "programName",
        ap.total_weeks as "totalWeeks",
        cw.id as "weekId",
        cw."weekNumber" as "weekNumber"
      FROM active_program ap
      JOIN "CardioWeek" cw ON cw."cardioProgramId" = ap.id
        AND cw."userId" = (SELECT ${userId})
        AND cw."weekNumber" = ${weekNumber}
      WHERE ap.id IS NOT NULL
    `

    if (result.length === 0 || !result[0].weekId) {
      return null
    }

    const { programId, programName, totalWeeks, weekId } = result[0]

    // Fetch the week with session details using Prisma
    const week = await prisma.cardioWeek.findUnique({
      where: { id: weekId },
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
              where: { userId },
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
      program: { id: programId, name: programName },
      week,
      totalWeeks: Number(totalWeeks)
    }
  } catch (error) {
    console.error('[getCardioWeekByNumber] Error:', error)
    return null
  }
}
