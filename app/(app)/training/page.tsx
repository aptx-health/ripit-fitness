import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StrengthCurrentWeek from '@/components/StrengthCurrentWeek'
import WorkoutHistoryList from '@/components/WorkoutHistoryList'

export default async function TrainingPage() {
  // Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch active program with weeks and workouts
  const activeProgram = await prisma.program.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      isArchived: false
    },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          workouts: {
            orderBy: { dayNumber: 'asc' },
            include: {
              completions: {
                where: { userId: user.id },
                orderBy: { completedAt: 'desc' },
                take: 1
              },
              _count: {
                select: { exercises: true }
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
      const completedCount = week.workouts.filter(w =>
        w.completions[0]?.status === 'completed'
      ).length
      return completedCount < week.workouts.length
    }) || activeProgram.weeks[activeProgram.weeks.length - 1]
  }

  // Fetch training stats
  const totalWorkouts = await prisma.workoutCompletion.count({
    where: {
      userId: user.id,
      status: 'completed'
    }
  })

  const totalSets = await prisma.loggedSet.count({
    where: {
      completion: {
        userId: user.id,
        status: 'completed'
      }
    }
  })

  // This week's workouts (start of week = Sunday)
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const thisWeekWorkouts = await prisma.workoutCompletion.count({
    where: {
      userId: user.id,
      status: 'completed',
      completedAt: { gte: startOfWeek }
    }
  })

  // Fetch recent completions
  const recentCompletions = await prisma.workoutCompletion.findMany({
    where: {
      userId: user.id,
      status: { in: ['completed', 'draft'] }
    },
    orderBy: { completedAt: 'desc' },
    take: 50,
    include: {
      workout: {
        include: {
          week: {
            include: {
              program: {
                select: { name: true }
              }
            }
          }
        }
      },
      loggedSets: {
        include: {
          exercise: {
            select: {
              name: true,
              exerciseGroup: true,
              order: true
            }
          }
        },
        orderBy: [
          { exercise: { order: 'asc' } },
          { setNumber: 'asc' }
        ]
      },
      _count: {
        select: { loggedSets: true }
      }
    }
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-foreground doom-title mb-2">
              STRENGTH TRAINING
            </h1>
            <p className="text-muted-foreground">
              Track your strength workouts and monitor progress
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/programs"
              className="px-6 py-3 border border-primary text-primary hover:bg-primary-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              PROGRAMS
            </Link>
          </div>
        </div>

        {/* Current Week from Active Program */}
        {activeProgram && currentWeek && (
          <StrengthCurrentWeek
            program={{
              id: activeProgram.id,
              name: activeProgram.name,
              weeks: activeProgram.weeks.map(w => ({ weekNumber: w.weekNumber }))
            }}
            week={currentWeek}
          />
        )}

        {/* Stats Summary */}
        {totalWorkouts > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Workouts"
              value={totalWorkouts.toString()}
              icon="💪"
            />
            <StatCard
              label="Total Sets"
              value={totalSets.toString()}
              icon="📊"
            />
            <StatCard
              label="This Week"
              value={thisWeekWorkouts.toString()}
              icon="📅"
            />
          </div>
        )}

        {/* Workout History */}
        <div>
          <h2 className="text-2xl font-bold text-foreground doom-heading mb-4">
            WORKOUT HISTORY
          </h2>
          <WorkoutHistoryList completions={recentCompletions} />
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
