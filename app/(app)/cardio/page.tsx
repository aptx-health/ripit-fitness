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

  // Fetch recent cardio sessions
  const sessions = await prisma.loggedCardioSession.findMany({
    where: {
      userId: user.id
    },
    orderBy: {
      completedAt: 'desc'
    },
    take: 50
  })

  // Fetch cardio stats
  const stats = await prisma.loggedCardioSession.aggregate({
    where: {
      userId: user.id,
      status: 'completed'
    },
    _count: true,
    _sum: {
      duration: true,
      distance: true,
      calories: true
    }
  })

  // Fetch active cardio program with weeks and sessions
  const activeProgram = await prisma.cardioProgram.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      isArchived: false
    },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            orderBy: { dayNumber: 'asc' },
            include: {
              loggedSessions: {
                where: { userId: user.id, status: 'completed' },
                orderBy: { completedAt: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    }
  })

  // Determine current week (first incomplete week)
  let currentWeek = null
  if (activeProgram && activeProgram.weeks.length > 0) {
    currentWeek = activeProgram.weeks.find(week => {
      const completedCount = week.sessions.filter(s =>
        s.loggedSessions.length > 0 && s.loggedSessions[0].status === 'completed'
      ).length
      return completedCount < week.sessions.length
    }) || activeProgram.weeks[activeProgram.weeks.length - 1] // Default to last week if all complete
  }

  return (
    <div className="min-h-screen bg-background p-6">
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
          <div className="flex gap-3">
            <Link
              href="/cardio/programs"
              className="px-6 py-3 border border-primary text-primary hover:bg-primary-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
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

        {/* Stats Summary */}
        {stats._count > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Sessions"
              value={stats._count.toString()}
              icon="🏃"
            />
            <StatCard
              label="Total Duration"
              value={`${stats._sum.duration || 0} min`}
              icon="⏱️"
            />
            <StatCard
              label="Total Distance"
              value={`${(stats._sum.distance || 0).toFixed(1)} mi`}
              icon="📍"
            />
            <StatCard
              label="Total Calories"
              value={`${stats._sum.calories || 0}`}
              icon="🔥"
            />
          </div>
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

// Stat Card Component
function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-card border border-border p-6 doom-noise doom-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs font-semibold text-muted-foreground doom-label">
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold text-foreground doom-stat">
        {value}
      </p>
    </div>
  )
}
