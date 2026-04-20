import { redirect } from 'next/navigation'
import ConsolidatedProgramsView from '@/components/programs/ConsolidatedProgramsView'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

export default async function ProgramsPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const [strengthPrograms, communityPrograms, activeWeekInfo, customProgramCount, userSettings] = await Promise.all([
    prisma.program.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        isUserCreated: true,
        createdAt: true,
        copyStatus: true,
        targetDaysPerWeek: true,
        _count: {
          select: { weeks: true },
        },
      },
    }),
    prisma.communityProgram.findMany({
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        programType: true,
        authorUserId: true,
        displayName: true,
        publishedAt: true,
        weekCount: true,
        workoutCount: true,
        exerciseCount: true,
        goals: true,
        level: true,
        durationDisplay: true,
        targetDaysPerWeek: true,
        equipmentNeeded: true,
        focusAreas: true,
      },
    }),
    // Get current week info for the active program strip
    prisma.$queryRaw<Array<{
      weekNumber: number
      totalWeeks: bigint
    }>>`
      WITH active_program AS (
        SELECT p.id
        FROM "Program" p
        WHERE p."userId" = ${user.id}
          AND p."isActive" = true
          AND p."deletedAt" IS NULL
        LIMIT 1
      ),
      incomplete_week AS (
        SELECT w."weekNumber"
        FROM "Week" w, active_program ap
        WHERE w."programId" = ap.id
          AND w."userId" = ${user.id}
          AND (
            SELECT COUNT(*) FROM "Workout" WHERE "weekId" = w.id
          ) > (
            SELECT COUNT(DISTINCT wc."workoutId")
            FROM "WorkoutCompletion" wc
            JOIN "Workout" wo ON wc."workoutId" = wo.id
            WHERE wo."weekId" = w.id
              AND wc."userId" = ${user.id}
              AND wc.status IN ('completed', 'skipped')
              AND wc."isArchived" = false
          )
        ORDER BY w."weekNumber" ASC
        LIMIT 1
      ),
      last_week AS (
        SELECT w."weekNumber"
        FROM "Week" w, active_program ap
        WHERE w."programId" = ap.id
          AND w."userId" = ${user.id}
        ORDER BY w."weekNumber" DESC
        LIMIT 1
      )
      SELECT
        COALESCE(iw."weekNumber", lw."weekNumber") as "weekNumber",
        (SELECT COUNT(*) FROM "Week" w, active_program ap WHERE w."programId" = ap.id) as "totalWeeks"
      FROM active_program ap
      LEFT JOIN incomplete_week iw ON true
      LEFT JOIN last_week lw ON true
      WHERE ap.id IS NOT NULL
    `.catch(() => []),
    // Count custom (user-created, non-deleted) programs for limit display
    prisma.program.count({
      where: {
        userId: user.id,
        isUserCreated: true,
        deletedAt: null,
      },
    }),
    prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: { customProgramLimitBypass: true },
    }),
  ])

  const currentWeek = activeWeekInfo.length > 0
    ? { weekNumber: activeWeekInfo[0].weekNumber, totalWeeks: Number(activeWeekInfo[0].totalWeeks) }
    : null

  return (
    <ConsolidatedProgramsView
      strengthPrograms={strengthPrograms}
      communityPrograms={communityPrograms}
      currentUserId={user.id}
      activeWeekInfo={currentWeek}
      customProgramCount={customProgramCount}
      isAdmin={user.role === 'admin'}
      customProgramLimitBypass={userSettings?.customProgramLimitBypass ?? false}
    />
  )
}
