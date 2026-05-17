import { Star } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import StrengthWeekView from '@/components/StrengthWeekView'
import { RestoringWorkoutSpinner } from '@/components/ui/RestoringWorkoutSpinner'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getCurrentStrengthWeek } from '@/lib/db/current-week'
import { getStrengthWeekByNumber } from '@/lib/db/week-navigation'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

type Props = {
  searchParams: Promise<{ week?: string; debugHistoryCount?: string; resume?: string }>
}

/**
 * Outer page returns synchronously so the HTML shell + spinner stream to
 * the browser immediately on cold load. The data fetch happens inside a
 * Suspense boundary so React streams the content in once Prisma returns.
 * When `?resume=` is present we swap the skeleton-style fallback for the
 * full "Restoring workout…" overlay, matching the StrengthWeekView spinner
 * that takes over once the metadata round-trip starts.
 */
export default async function TrainingPage({ searchParams }: Props) {
  const params = await searchParams
  const isResuming = Boolean(params.resume)

  return (
    <Suspense
      fallback={
        isResuming ? (
          <RestoringWorkoutSpinner />
        ) : (
          // Page-level loading.tsx covers route transitions with the full
          // skeleton; on cold loads we render a lightweight shell so the
          // header lands instantly rather than waiting on the data fetch.
          <TrainingShell />
        )
      }
    >
      <TrainingPageContent params={params} />
    </Suspense>
  )
}

async function TrainingPageContent({
  params,
}: {
  params: { week?: string; debugHistoryCount?: string; resume?: string }
}) {
  const { week: weekParam, debugHistoryCount } = params
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  const requestedWeek = weekParam ? parseInt(weekParam, 10) : null
  const validWeekParam = requestedWeek && !Number.isNaN(requestedWeek) && requestedWeek > 0

  const [weekData, rawHistoryCount] = await Promise.all([
    validWeekParam
      ? getStrengthWeekByNumber(user.id, requestedWeek)
      : getCurrentStrengthWeek(user.id),
    prisma.workoutCompletion.count({
      where: {
        userId: user.id,
        status: { in: ['completed', 'draft'] },
      },
    }),
  ])

  // Dev-only override for testing contextual content triggers
  const debugOverride = process.env.NODE_ENV !== 'production' && debugHistoryCount
    ? parseInt(debugHistoryCount, 10)
    : undefined
  const workoutHistoryCount = debugOverride !== undefined && !Number.isNaN(debugOverride)
    ? debugOverride
    : rawHistoryCount

  return (
    <TrainingShell>
      {weekData ? (
        <StrengthWeekView
          programId={weekData.program.id}
          programName={weekData.program.name}
          week={weekData.week}
          totalWeeks={weekData.totalWeeks}
          historyCount={workoutHistoryCount}
        />
      ) : (
        <NoActiveProgram />
      )}
    </TrainingShell>
  )
}

function TrainingShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">
            TRAINING
          </h1>
        </div>
        <div className="px-4 sm:px-0">{children}</div>
      </div>
    </div>
  )
}

function NoActiveProgram() {
  return (
    <div className="bg-card border-y sm:border border-border doom-noise doom-card p-8 text-center">
      <h2 className="text-2xl font-bold text-foreground doom-heading mb-2">
        NO ACTIVE PROGRAM
      </h2>
      <p className="text-muted-foreground mb-6">
        Go to Programs and activate one <Star size={14} className="inline text-accent" /> to see it here.
      </p>
      <Link
        href="/programs"
        className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
      >
        VIEW PROGRAMS
      </Link>
    </div>
  )
}
