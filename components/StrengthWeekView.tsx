'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import WeekNavigator from '@/components/ui/WeekNavigator'
import ActionsMenu from '@/components/ActionsMenu'

type Workout = {
  id: string
  dayNumber: number
  name: string
  completions: Array<{
    id: string
    status: string
    completedAt: Date
  }>
  _count: {
    exercises: number
  }
}

type Week = {
  id: string
  weekNumber: number
  workouts: Workout[]
}

type Props = {
  programId: string
  programName: string
  week: Week
  totalWeeks: number
}

export default function StrengthWeekView({
  programId,
  programName,
  week,
  totalWeeks
}: Props) {
  const router = useRouter()
  const [skippingWorkout, setSkippingWorkout] = useState<string | null>(null)
  const [completingWeek, setCompletingWeek] = useState(false)

  const handleSkipWorkout = async (workoutId: string) => {
    setSkippingWorkout(workoutId)
    try {
      const response = await fetch(`/api/workouts/${workoutId}/skip`, {
        method: 'POST'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Failed to skip workout:', data.error)
      }
    } catch (error) {
      console.error('Error skipping workout:', error)
    } finally {
      setSkippingWorkout(null)
    }
  }

  const handleCompleteWeek = async () => {
    setCompletingWeek(true)
    try {
      const response = await fetch(`/api/weeks/${week.id}/complete`, {
        method: 'POST'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Failed to complete week:', data.error)
      }
    } catch (error) {
      console.error('Error completing week:', error)
    } finally {
      setCompletingWeek(false)
    }
  }

  // Check if there are any incomplete workouts
  const hasIncompleteWorkouts = week.workouts.some(
    workout => workout.completions.length === 0
  )

  const weekActions = hasIncompleteWorkouts
    ? [
        {
          label: 'Complete Week',
          icon: CheckCircle,
          onClick: handleCompleteWeek,
          requiresConfirmation: true,
          confirmationMessage:
            'This will mark all remaining workouts as skipped. Are you sure?',
          variant: 'warning' as const,
          disabled: completingWeek
        }
      ]
    : []

  return (
    <div className="bg-card border border-border doom-noise doom-card p-6">
      <div className="flex justify-between items-start mb-6">
        <WeekNavigator
          currentWeek={week.weekNumber}
          totalWeeks={totalWeeks}
          baseUrl="/training"
          programName={programName}
        />
        {weekActions.length > 0 && (
          <ActionsMenu actions={weekActions} size="md" />
        )}
      </div>

      <div className="space-y-3">
        {week.workouts.map(workout => {
          const latestCompletion = workout.completions[0]
          const isCompleted =
            latestCompletion && latestCompletion.status === 'completed'
          const isDraft =
            latestCompletion && latestCompletion.status === 'draft'
          const isSkipped =
            latestCompletion && latestCompletion.status === 'skipped'
          const isSkipping = skippingWorkout === workout.id

          return (
            <div
              key={workout.id}
              className={`border p-4 transition ${
                isCompleted
                  ? 'border-success-border bg-success-muted/50 doom-workout-completed'
                  : isDraft
                    ? 'border-warning-border bg-warning-muted/50'
                    : isSkipped
                      ? 'border-muted-foreground bg-muted opacity-60'
                      : 'border-border bg-muted'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-foreground doom-heading">
                      DAY {workout.dayNumber}: {workout.name}
                    </h3>
                    {isCompleted && (
                      <span className="doom-badge doom-badge-completed">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                    {isDraft && (
                      <span className="doom-badge doom-badge-accent">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        IN PROGRESS
                      </span>
                    )}
                    {isSkipped && (
                      <span className="doom-badge bg-muted-foreground/20 text-muted-foreground">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 5l7 7-7 7M5 5l7 7-7 7"
                          />
                        </svg>
                        SKIPPED
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground doom-label">
                        EXERCISES
                      </span>
                      <p className="text-foreground doom-stat">
                        {workout._count.exercises}
                      </p>
                    </div>
                  </div>

                  {latestCompletion && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last logged:{' '}
                      {new Date(latestCompletion.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Skip button - only show if no completion status */}
                  {!latestCompletion && (
                    <button
                      onClick={() => handleSkipWorkout(workout.id)}
                      disabled={isSkipping}
                      className="px-3 py-2 border border-muted-foreground text-muted-foreground hover:bg-muted doom-focus-ring text-sm font-medium disabled:opacity-50"
                    >
                      {isSkipping ? 'SKIPPING...' : 'SKIP'}
                    </button>
                  )}

                  <Link
                    href={`/programs/${programId}/workouts/${workout.id}`}
                    className={`px-4 py-2 ${
                      isDraft
                        ? 'bg-accent text-accent-foreground hover:bg-accent-hover doom-button-3d-accent'
                        : isSkipped
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary-hover doom-button-3d'
                          : 'bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d'
                    } doom-focus-ring font-semibold uppercase tracking-wider text-sm`}
                  >
                    {isCompleted
                      ? 'REVIEW'
                      : isDraft
                        ? 'CONTINUE'
                        : isSkipped
                          ? 'RETRY'
                          : 'LOG WORKOUT'}
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
