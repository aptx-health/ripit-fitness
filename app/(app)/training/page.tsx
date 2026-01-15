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

  // Fetch active program with ALL weeks (but lightweight) - single query
  const activeProgram = await prisma.program.findFirst({
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
          workouts: {
            select: {
              id: true,
              name: true,
              dayNumber: true,
              completions: {
                where: { userId: user.id, status: 'completed' },
                select: { id: true, status: true, completedAt: true },
                orderBy: { completedAt: 'desc' },
                take: 1
              },
              _count: {
                select: { exercises: true }
              }
            },
            orderBy: { dayNumber: 'asc' }
          }
        },
        orderBy: { weekNumber: 'asc' }
      }
    }
  })

  // Find current week (first incomplete week) - in JS, very fast
  let currentWeek = null
  if (activeProgram && activeProgram.weeks.length > 0) {
    currentWeek = activeProgram.weeks.find(week => {
      const totalWorkouts = week.workouts.length
      const completedWorkouts = week.workouts.filter(w => w.completions.length > 0).length
      return completedWorkouts < totalWorkouts
    }) || activeProgram.weeks[activeProgram.weeks.length - 1]
  }

  // Fetch recent workout history
  const recentCompletions = await prisma.workoutCompletion.findMany({
    where: {
      userId: user.id,
      status: { in: ['completed', 'draft'] }
    },
    orderBy: { completedAt: 'desc' },
    take: 5, // Reduced from 10 to 5 for faster load
    select: {
      id: true,
      status: true,
      completedAt: true,
      workout: {
        select: {
          id: true,
          name: true,
          week: {
            select: {
              program: {
                select: { name: true }
              }
            }
          }
        }
      },
      loggedSets: {
        select: {
          id: true,
          setNumber: true,
          reps: true,
          weight: true,
          weightUnit: true,
          exercise: {
            select: {
              name: true,
              exerciseGroup: true,
              order: true
            }
          }
        }
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
