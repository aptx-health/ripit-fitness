import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import StrengthWeekView from '@/components/StrengthWeekView'
import { RestoringWorkoutSpinner } from '@/components/ui/RestoringWorkoutSpinner'
import { isEditorRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getProgramWeek } from '@/lib/db/program-week'

type SearchParams = { week?: string; debugHistoryCount?: string; resume?: string }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}

/**
 * One program's detail: its weeks, and logging when it is the active program.
 * Ownership is checked before streaming starts so a missing program is a real
 * 404; then the shell (or the "Restoring workout…" overlay for ?resume=)
 * renders while the week loads, as the old /training page did.
 */
export default async function ProgramDetailPage({ params, searchParams }: Props) {
  const [{ id }, query, { user, error }] = await Promise.all([params, searchParams, getCurrentUser()])
  if (error || !user) {
    redirect('/login')
  }

  const owned = await prisma.program.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { id: true },
  })
  if (!owned) notFound()

  return (
    <Suspense fallback={query.resume ? <RestoringWorkoutSpinner /> : <ProgramDetailShell />}>
      <ProgramDetailContent programId={id} query={query} />
    </Suspense>
  )
}

async function ProgramDetailContent({ programId, query }: { programId: string; query: SearchParams }) {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    redirect('/login')
  }

  // A week that isn't a positive number, or doesn't exist, shows the current week.
  const requestedWeek = query.week ? parseInt(query.week, 10) : NaN
  const weekNumber = Number.isInteger(requestedWeek) && requestedWeek > 0 ? requestedWeek : undefined

  const [data, rawHistoryCount] = await Promise.all([
    getProgramWeek(programId, user.id, weekNumber),
    prisma.workoutCompletion.count({
      where: { userId: user.id, status: { in: ['completed', 'draft'] } },
    }),
  ])
  if (!data) notFound()

  // Dev-only override for testing contextual content triggers
  const debugOverride =
    process.env.NODE_ENV !== 'production' && query.debugHistoryCount
      ? parseInt(query.debugHistoryCount, 10)
      : undefined
  const historyCount =
    debugOverride !== undefined && !Number.isNaN(debugOverride) ? debugOverride : rawHistoryCount

  if (!data.week) {
    return (
      <ProgramDetailShell>
        <NoWeeks programId={data.program.id} programName={data.program.name} canEdit={!data.program.isArchived} />
      </ProgramDetailShell>
    )
  }

  return (
    <ProgramDetailShell>
      <StrengthWeekView
        programId={data.program.id}
        programName={data.program.name}
        week={data.week}
        totalWeeks={data.totalWeeks}
        historyCount={historyCount}
        isEditorRole={isEditorRole(user.role)}
        readOnly={!data.canTrain}
        canActivate={data.canActivate}
      />
    </ProgramDetailShell>
  )
}

function NoWeeks({ programId, programName, canEdit }: { programId: string; programName: string; canEdit: boolean }) {
  return (
    <div className="bg-card border-y sm:border border-border doom-noise doom-card p-8 text-center">
      <h2 className="text-2xl font-bold text-foreground doom-heading mb-2">{programName}</h2>
      <p className="text-muted-foreground mb-6">This program has no weeks yet.</p>
      {canEdit && (
        <Link
          href={`/programs/${programId}/edit`}
          className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
        >
          EDIT PROGRAM
        </Link>
      )}
    </div>
  )
}

function ProgramDetailShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        {/* pt-4 on top of the shell's py-4 puts the link where the settings subpages' sits (32px). */}
        <div className="px-4 sm:px-0 pt-4 mb-4">
          {/* Same back link as the settings subpages. TL3 points it at the Library. */}
          <Link
            href="/training"
            className="relative inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground doom-focus-ring before:content-[''] before:absolute before:-inset-3"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Training
          </Link>
        </div>
        <div className="px-4 sm:px-0">{children}</div>
      </div>
    </div>
  )
}
