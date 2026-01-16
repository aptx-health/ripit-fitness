'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'

type WorkoutCompletion = {
  id: string
  status: string
  completedAt: Date
}

type Workout = {
  id: string
  name: string
  dayNumber: number
  completions: WorkoutCompletion[]
}

type Props = {
  programId: string
  weekId: string
  weekNumber: number
  totalWeeks: number
  programName: string
  workouts: Workout[]
}

export default function WeekView({
  programId,
  weekId,
  weekNumber,
  totalWeeks,
  programName,
  workouts,
}: Props) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const hasPrevWeek = weekNumber > 1
  const hasNextWeek = weekNumber < totalWeeks

  const handleCompleteWeek = async () => {
    if (
      !confirm(
        'Complete this week? Any workouts without logs will be marked as skipped.'
      )
    ) {
      return
    }

    setIsCompleting(true)
    try {
      const response = await fetch(`/api/weeks/${weekId}/complete`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to complete week')
      }

      const data = await response.json()
      alert(data.message)
      router.refresh()
    } catch (error) {
      console.error('Error completing week:', error)
      alert('Failed to complete week. Please try again.')
    } finally {
      setIsCompleting(false)
      setShowMenu(false)
    }
  }

  const handleSkipWorkout = async (workoutId: string) => {
    if (!confirm('Mark this workout as skipped?')) {
      return
    }

    try {
      const response = await fetch(`/api/workouts/${workoutId}/skip`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to skip workout')
      }

      router.refresh()
    } catch (error) {
      console.error('Error skipping workout:', error)
      alert(
        error instanceof Error ? error.message : 'Failed to skip workout. Please try again.'
      )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Fixed at top for mobile */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/programs"
              className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d font-semibold uppercase tracking-wider text-xs transition-colors"
            >
              ← PROGRAMS
            </Link>
            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-2 z-20">
                    <button
                      onClick={handleCompleteWeek}
                      disabled={isCompleting}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <div className="font-semibold text-foreground">
                        {isCompleting ? 'Completing...' : 'Complete Week'}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Mark unlogged workouts as skipped
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground doom-heading">{programName}</h1>
        </div>
      </div>

      {/* Week Navigation - Mobile optimized with large touch targets */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Previous Week Button */}
            {hasPrevWeek ? (
              <Link
                href={`/programs/${programId}/weeks/${weekNumber - 1}`}
                className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-muted hover:bg-primary active:bg-primary-hover transition-colors"
              >
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
            ) : (
              <div className="w-12 h-12" />
            )}

            {/* Week Indicator */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-muted-foreground font-medium doom-label">WEEK</span>
              <span className="text-3xl font-bold text-foreground doom-stat">{weekNumber}</span>
              <span className="text-xs text-muted-foreground doom-label">OF {totalWeeks}</span>
            </div>

            {/* Next Week Button */}
            {hasNextWeek ? (
              <Link
                href={`/programs/${programId}/weeks/${weekNumber + 1}`}
                className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-muted hover:bg-primary active:bg-primary-hover transition-colors"
              >
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ) : (
              <div className="w-12 h-12" />
            )}
          </div>
        </div>
      </div>

      {/* Workouts List - Mobile optimized */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No workouts scheduled for this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => {
              const completion = workout.completions[0]
              const isCompleted = completion?.status === 'completed'
              const isDraft = completion?.status === 'draft'
              const isSkipped = completion?.status === 'skipped'
              const hasStatus = !!completion

              return (
                <div key={workout.id} className="relative">
                  <Link
                    href={`/programs/${programId}/workouts/${workout.id}`}
                    className="block"
                  >
                    <div
                      className={`
                      relative p-5 active:scale-[0.98] transition-all
                      doom-noise doom-corners
                      ${
                        isCompleted
                          ? 'doom-workout-completed border-2'
                          : isDraft
                          ? 'doom-workout-progress border-2'
                          : isSkipped
                          ? 'border-border bg-muted border-2 opacity-70'
                          : 'doom-workout-pending border-2 hover:border-primary'
                      }
                    `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground">
                              Day {workout.dayNumber}
                            </span>
                            {isCompleted && (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success">
                                <svg
                                  className="w-4 h-4 text-success-foreground"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                            {isDraft && (
                              <>
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-warning">
                                  <Clock className="w-4 h-4 text-warning-foreground" />
                                </div>
                                <span className="doom-badge doom-badge-progress">
                                  IN PROGRESS
                                </span>
                              </>
                            )}
                            {isSkipped && (
                              <span className="doom-badge doom-badge-skipped">
                                SKIPPED
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-foreground doom-heading">
                            {workout.name}
                          </h3>
                          {completion && (
                            <p
                              className={`text-sm mt-1 ${
                                isCompleted
                                  ? 'text-success-text'
                                  : isDraft
                                  ? 'text-warning-text'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {isCompleted
                                ? `Completed on ${new Date(
                                    completion.completedAt
                                  ).toLocaleDateString()}`
                                : isDraft
                                ? `Started on ${new Date(
                                    completion.completedAt
                                  ).toLocaleDateString()}`
                                : `Skipped on ${new Date(
                                    completion.completedAt
                                  ).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>

                        {/* Arrow indicator */}
                        <svg
                          className="w-6 h-6 text-muted-foreground flex-shrink-0 ml-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                  {/* Skip button for incomplete workouts (not draft) */}
                  {!hasStatus && !isDraft && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleSkipWorkout(workout.id)
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-muted hover:bg-secondary-hover text-foreground text-xs font-semibold rounded transition-colors"
                    >
                      Skip
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
