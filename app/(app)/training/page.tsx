import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { getCurrentStrengthWeek } from '@/lib/db/current-week'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StrengthCurrentWeek from '@/components/StrengthCurrentWeek'
import WorkoutHistoryList from '@/components/WorkoutHistoryList'

// Cache page for 30 seconds to improve navigation performance
export const revalidate = 30

export default async function TrainingPage() {
  // Get authenticated user
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch current week and workout history count in parallel for faster load times
  // getCurrentStrengthWeek only fetches the current week (80-85% data reduction)
  const [currentWeekData, workoutHistoryCount] = await Promise.all([
    getCurrentStrengthWeek(user.id),
    prisma.workoutCompletion.count({
      where: {
        userId: user.id,
        status: { in: ['completed', 'draft'] }
      }
    })
  ])

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
        {currentWeekData ? (
          <StrengthCurrentWeek
            program={{
              id: currentWeekData.program.id,
              name: currentWeekData.program.name,
              weeks: Array.from({ length: currentWeekData.totalWeeks }, (_, i) => ({
                weekNumber: i + 1
              }))
            }}
            week={currentWeekData.week}
          />
        ) : (
          <div className="bg-card border border-border doom-noise doom-card p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground doom-heading mb-2">
              NO ACTIVE PROGRAM
            </h2>
            <p className="text-muted-foreground mb-4">
              Activate a strength training program to start tracking workouts
            </p>
            <Link
              href="/programs"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              VIEW PROGRAMS
            </Link>
          </div>
        )}

        {/* Workout History */}
        <div>
          <h2 className="text-2xl font-bold text-foreground doom-heading mb-4">
            WORKOUT HISTORY
          </h2>
          <WorkoutHistoryList count={workoutHistoryCount} />
        </div>
      </div>
    </div>
  )
}
