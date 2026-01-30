import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getCurrentCardioWeek } from '@/lib/db/current-week'
import { getCardioWeekByNumber } from '@/lib/db/week-navigation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CardioHistoryList from '@/components/CardioHistoryList'
import CardioWeekView from '@/components/CardioWeekView'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

type Props = {
  searchParams: Promise<{ week?: string }>
}

export default async function CardioPage({ searchParams }: Props) {
  const { week: weekParam } = await searchParams
  // Get authenticated user
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  // Parse week param
  const requestedWeek = weekParam ? parseInt(weekParam, 10) : null
  const validWeekParam = requestedWeek && !isNaN(requestedWeek) && requestedWeek > 0

  // Fetch week data and session count in parallel
  // If week param provided, fetch specific week; otherwise fetch current week
  const [weekData, sessionCount] = await Promise.all([
    validWeekParam
      ? getCardioWeekByNumber(user.id, requestedWeek)
      : getCurrentCardioWeek(user.id),
    prisma.loggedCardioSession.count({
      where: {
        userId: user.id
      }
    })
  ])

  return (
    <div className="min-h-screen bg-background sm:px-6 py-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Week from Active Program */}
        {weekData ? (
          <CardioWeekView
            programId={weekData.program.id}
            programName={weekData.program.name}
            week={weekData.week}
            totalWeeks={weekData.totalWeeks}
          />
        ) : (
          <div className="bg-card border border-border doom-noise doom-card p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground doom-heading mb-2">
              NO ACTIVE PROGRAM
            </h2>
            <p className="text-muted-foreground mb-4">
              Activate a cardio program to start tracking sessions
            </p>
            <Link
              href="/cardio/programs"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              VIEW PROGRAMS
            </Link>
          </div>
        )}

        {/* Session History */}
        <div>
          <h2 className="text-2xl font-bold text-foreground doom-heading mb-4">
            SESSION HISTORY
          </h2>
          <CardioHistoryList count={sessionCount} />
        </div>
      </div>
    </div>
  )
}
