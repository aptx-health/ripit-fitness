import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CardioWeekView from '@/components/CardioWeekView'

export default async function ViewCardioProgramPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Await params (Next.js 15 pattern)
  const { id } = await params

  // Fetch program with weeks, sessions, and completion data
  const program = await prisma.cardioProgram.findFirst({
    where: {
      id,
      userId: user.id
    },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            orderBy: { dayNumber: 'asc' },
            include: {
              loggedSessions: {
                where: { userId: user.id },
                orderBy: { completedAt: 'desc' },
                take: 1 // Most recent log per session
              }
            }
          }
        }
      }
    }
  })

  if (!program) {
    redirect('/cardio/programs')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground doom-title">
                {program.name}
              </h1>
              {program.isActive && (
                <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-semibold doom-label">
                  ACTIVE
                </span>
              )}
            </div>
            {program.description && (
              <p className="text-muted-foreground">{program.description}</p>
            )}
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span>{program.weeks.length} week{program.weeks.length !== 1 ? 's' : ''}</span>
              <span>{program.weeks.reduce((sum, w) => sum + w.sessions.length, 0)} total sessions</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/cardio/programs/${program.id}/edit`}
              className="px-4 py-2 border border-primary text-primary hover:bg-primary-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              EDIT
            </Link>
            <Link
              href="/cardio/programs"
              className="px-4 py-2 border-2 border-border text-foreground hover:bg-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              BACK
            </Link>
          </div>
        </div>

        {/* Weeks */}
        <div className="space-y-6">
          {program.weeks.map((week) => (
            <CardioWeekView
              key={week.id}
              week={week}
              programId={program.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
