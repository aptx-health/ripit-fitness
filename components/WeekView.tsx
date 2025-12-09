'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header - Fixed at top for mobile */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/programs"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Programs
            </Link>
            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-700"
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
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <button
                      onClick={handleCompleteWeek}
                      disabled={isCompleting}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <div className="font-semibold text-gray-900">
                        {isCompleting ? 'Completing...' : 'Complete Week'}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        Mark unlogged workouts as skipped
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{programName}</h1>
        </div>
      </div>

      {/* Week Navigation - Mobile optimized with large touch targets */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Previous Week Button */}
            {hasPrevWeek ? (
              <Link
                href={`/programs/${programId}/weeks/${weekNumber - 1}`}
                className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-blue-600"
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
              <span className="text-sm text-gray-500 font-medium">Week</span>
              <span className="text-3xl font-bold text-gray-900">{weekNumber}</span>
              <span className="text-xs text-gray-400">of {totalWeeks}</span>
            </div>

            {/* Next Week Button */}
            {hasNextWeek ? (
              <Link
                href={`/programs/${programId}/weeks/${weekNumber + 1}`}
                className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-blue-600"
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
            <p className="text-gray-500">No workouts scheduled for this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => {
              const completion = workout.completions[0]
              const isCompleted = completion?.status === 'completed'
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
                      relative bg-white rounded-lg border-2 p-5
                      active:scale-[0.98] transition-all
                      ${
                        isCompleted
                          ? 'border-green-500 bg-green-50'
                          : isSkipped
                          ? 'border-gray-400 bg-gray-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }
                    `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-500">
                              Day {workout.dayNumber}
                            </span>
                            {isCompleted && (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
                                <svg
                                  className="w-4 h-4 text-white"
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
                            {isSkipped && (
                              <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-semibold rounded">
                                SKIPPED
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {workout.name}
                          </h3>
                          {completion && (
                            <p
                              className={`text-sm mt-1 ${
                                isCompleted ? 'text-green-700' : 'text-gray-600'
                              }`}
                            >
                              {isCompleted
                                ? `Completed on ${new Date(
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
                          className="w-6 h-6 text-gray-400 flex-shrink-0 ml-4"
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
                  {/* Skip button for incomplete workouts */}
                  {!hasStatus && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleSkipWorkout(workout.id)
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded transition-colors"
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
