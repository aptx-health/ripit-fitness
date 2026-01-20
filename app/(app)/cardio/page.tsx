import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CardioHistoryList from '@/components/CardioHistoryList'
import LogCardioButton from '@/components/LogCardioButton'
import CardioCurrentWeek from '@/components/CardioCurrentWeek'

export default async function CardioPage() {
  // Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch active program and recent sessions in parallel for faster load times
  const [activeProgram, sessions] = await Promise.all([
    prisma.cardioProgram.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        weeks: {
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
                  where: { userId: user.id, status: 'completed' },
                  select: { id: true, status: true, completedAt: true },
                  orderBy: { completedAt: 'desc' },
                  take: 1
                }
              },
              orderBy: { dayNumber: 'asc' }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    }),
    prisma.loggedCardioSession.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 10 // Reduced from 50 to 10
    })
  ])

  // Determine current week (first incomplete week) - fast in JS
  let currentWeek = null
  if (activeProgram && activeProgram.weeks.length > 0) {
    currentWeek = activeProgram.weeks.find(week => {
      const totalSessions = week.sessions.length
      const completedSessions = week.sessions.filter(s => s.loggedSessions.length > 0).length
      return completedSessions < totalSessions
    }) || activeProgram.weeks[activeProgram.weeks.length - 1]
  }

  return (
    <div className="min-h-screen bg-background px-6 py-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-foreground doom-title mb-2">
              CARDIO TRAINING
            </h1>
            <p className="text-muted-foreground">
              Track your cardio sessions and monitor progress
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/cardio/programs"
              className="px-4 py-2 border border-primary text-primary hover:bg-primary-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm"
            >
              PROGRAMS
            </Link>
            <LogCardioButton />
          </div>
        </div>

        {/* Current Week from Active Program */}
        {activeProgram && currentWeek && (
          <CardioCurrentWeek
            program={{ id: activeProgram.id, name: activeProgram.name }}
            week={currentWeek}
          />
        )}

        {/* Session History */}
        <div>
          <h2 className="text-2xl font-bold text-foreground doom-heading mb-4">
            SESSION HISTORY
          </h2>
          <CardioHistoryList sessions={sessions} />
        </div>
      </div>
    </div>
  )
}
