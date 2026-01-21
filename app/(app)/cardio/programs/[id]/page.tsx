import { getCurrentUser } from '@/lib/auth/server'
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
  const { user, error: authError } = await getCurrentUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Await params (Next.js 15 pattern)
  const { id } = await params

  // Fetch only required program data for display (optimized for performance)
  const program = await prisma.cardioProgram.findFirst({
    where: {
      id,
      userId: user.id
    },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      weeks: {
        orderBy: { weekNumber: 'asc' },
        select: {
          id: true,
          weekNumber: true,
          sessions: {
            orderBy: { dayNumber: 'asc' },
            select: {
              id: true,
              dayNumber: true,
              name: true,
              description: true,
              targetDuration: true,
              intensityZone: true,
              equipment: true,
              targetHRRange: true,
              targetPowerRange: true,
              intervalStructure: true,
              notes: true,
              loggedSessions: {
                where: { userId: user.id, status: 'completed' },
                orderBy: { completedAt: 'desc' },
                take: 1, // Most recent completed log per session
                select: {
                  id: true,
                  status: true,
                  completedAt: true,
                }
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
