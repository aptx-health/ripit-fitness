import { prisma } from '@/lib/db'
import type { CurrentStrengthWeekData } from './current-week'

/**
 * One week of a program for its detail page, with what the viewer may do.
 */
export type ProgramWeekData = Omit<CurrentStrengthWeekData, 'program' | 'week'> & {
  program: { id: string; name: string; isActive: boolean; isArchived: boolean }
  /** Null only for a program with no weeks yet (totalWeeks 0). */
  week: CurrentStrengthWeekData['week'] | null
  /** Active and not archived: the week can be logged. */
  canTrain: boolean
  /** Not active and not archived: offer "Make active to train". */
  canActivate: boolean
}

const DONE_STATUSES = ['completed', 'skipped']

/**
 * Fetches one week of a program the user owns, active or not. Returns null when
 * the program is unknown, someone else's or deleted (the page is a 404). A
 * program with no weeks yet is found, with `week: null`.
 *
 * Without `weekNumber`, or when that week doesn't exist, returns the current
 * week: the first week with a workout that is neither completed nor skipped,
 * else the last week. Only this user's non-archived completions count.
 */
export async function getProgramWeek(
  programId: string,
  userId: string,
  weekNumber?: number
): Promise<ProgramWeekData | null> {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      isActive: true,
      isArchived: true,
      weeks: {
        orderBy: { weekNumber: 'asc' },
        select: {
          id: true,
          weekNumber: true,
          workouts: {
            select: {
              completions: {
                where: { userId, isArchived: false, status: { in: DONE_STATUSES } },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })
  if (!program) return null

  const { weeks, ...summary } = program
  const access = {
    canTrain: program.isActive && !program.isArchived,
    canActivate: !program.isActive && !program.isArchived,
  }
  if (weeks.length === 0) return { program: summary, week: null, totalWeeks: 0, ...access }

  const chosen =
    (weekNumber !== undefined && weeks.find((w) => w.weekNumber === weekNumber)) ||
    weeks.find((w) => w.workouts.some((wo) => wo.completions.length === 0)) ||
    weeks[weeks.length - 1]

  const week = await prisma.week.findUnique({
    where: { id: chosen.id },
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
            take: 1,
          },
          _count: { select: { exercises: true } },
        },
        orderBy: { dayNumber: 'asc' },
      },
    },
  })
  if (!week) return null

  return { program: summary, week, totalWeeks: weeks.length, ...access }
}
