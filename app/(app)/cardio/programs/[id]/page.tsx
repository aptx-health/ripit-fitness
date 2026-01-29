import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import CardioWeekView from '@/components/CardioWeekView'
import { ProgramHeader } from '@/components/ProgramHeader'

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
        <ProgramHeader
          title={program.name}
          description={program.description}
          isActive={program.isActive}
          editHref={`/cardio/programs/${program.id}/edit`}
          stats={[
            { label: program.weeks.length === 1 ? 'week' : 'weeks', value: program.weeks.length },
            { label: 'total sessions', value: program.weeks.reduce((sum, w) => sum + w.sessions.length, 0) },
          ]}
        />

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
