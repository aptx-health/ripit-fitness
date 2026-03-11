'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Exercise = {
  name: string
  exerciseGroup: string | null
  order: number
}

type LoggedSet = {
  id: string
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  exercise: Exercise
}

type WorkoutCompletion = {
  id: string
  completedAt: Date
  status: string
  workout: {
    id: string
    name: string
    week: {
      program: {
        name: string
      }
    }
  }
  loggedSets: LoggedSet[]
  _count: {
    loggedSets: number
  }
}

type Props = {
  count: number
}

export default function WorkoutHistoryList({ count }: Props) {
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Fetch workout history on mount
  useEffect(() => {
    if (count > 0) {
      fetchWorkoutHistory()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  const fetchWorkoutHistory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/workouts/history?limit=5')
      if (!response.ok) {
        throw new Error('Failed to fetch workout history')
      }
      const data = await response.json()
      setCompletions(data.completions)
    } catch (error) {
      console.error('Error fetching workout history:', error)
      alert('Failed to load workout history. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (count === 0) {
    return (
      <div className="bg-card border border-border p-8 text-center doom-noise doom-card">
        <p className="text-muted-foreground">
          No workout history yet. Start logging to see your progress here!
        </p>
      </div>
    )
  }

  if (isLoading) {
    // Loading skeleton
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted animate-pulse rounded w-32" />
                <div className="h-6 bg-muted animate-pulse rounded w-48" />
              </div>
              <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
              <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
              <div className="h-4 bg-muted animate-pulse rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {completions.map((completion) => {
        const isExpanded = expandedIds.has(completion.id)
        const isCompleted = completion.status === 'completed'

        // Group logged sets by exercise and sort
        const exerciseGroups = new Map<string, LoggedSet[]>()
        completion.loggedSets.forEach(set => {
          const key = `${set.exercise.name}-${set.exercise.order}`
          if (!exerciseGroups.has(key)) {
            exerciseGroups.set(key, [])
          }
          exerciseGroups.get(key)!.push(set)
        })

        // Sort groups by exercise order
        const sortedGroups = Array.from(exerciseGroups.entries()).sort((a, b) => {
          const orderA = a[1][0].exercise.order
          const orderB = b[1][0].exercise.order
          return orderA - orderB
        })

        return (
          <div
            key={completion.id}
            className={`bg-card border doom-noise doom-card transition ${
              isCompleted
                ? 'border-success-border doom-workout-completed'
                : 'border-warning-border'
            }`}
          >
            {/* Workout Header */}
            <button
              onClick={() => toggleExpanded(completion.id)}
              className="w-full p-4 text-left hover:bg-muted/50 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {new Date(completion.completedAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <h3 className="text-lg font-bold text-foreground doom-heading mb-1">
                    {completion.workout.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {completion.workout.week.program.name}
                  </p>
                </div>
                <div className="ml-4">
                  {isCompleted && (
                    <span className="doom-badge doom-badge-completed">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      COMPLETED
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {completion._count.loggedSets} {completion._count.loggedSets === 1 ? 'set' : 'sets'} logged
              </div>
            </button>

            {/* Expanded Exercise Details */}
            {isExpanded && (
              <div className="border-t border-border p-4 bg-muted/30 space-y-4">
                {sortedGroups.map(([key, sets]) => {
                  const exercise = sets[0].exercise
                  return (
                    <div key={key} className="space-y-2">
                      <h4 className="font-semibold text-foreground doom-label">
                        {exercise.name}
                        {exercise.exerciseGroup && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {exercise.exerciseGroup}
                          </span>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {sets.map((set) => (
                          <div
                            key={set.id}
                            className="bg-card border border-border p-2 text-sm"
                          >
                            <span className="text-muted-foreground">Set {set.setNumber}:</span>{' '}
                            <span className="font-semibold text-foreground doom-stat">
                              {set.reps} × {set.weight}{set.weightUnit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2">
                  <Link
                    href={`/programs/${completion.workout.id}`}
                    className="text-sm text-primary hover:text-primary-hover font-medium"
                  >
                    View Full Workout →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
