'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { clientLogger } from '@/lib/client-logger'

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
  /** Compact mode shows fewer items and a section header, for inline use */
  compact?: boolean
}

export default function WorkoutHistoryList({ count, compact = false }: Props) {
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [sectionExpanded, setSectionExpanded] = useState(false)

  const fetchWorkoutHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const limit = compact ? 3 : 5
      const response = await fetch(`/api/workouts/history?limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch workout history')
      }
      const data = await response.json()
      setCompletions(data.completions)
    } catch (error) {
      clientLogger.error('Error fetching workout history:', error)
      alert('Failed to load workout history. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [compact])

  // Fetch workout history on mount (full mode) or on expand (compact mode)
  useEffect(() => {
    if (count === 0) {
      setIsLoading(false)
      return
    }
    // In compact mode, only fetch when section is expanded
    if (compact && !sectionExpanded) {
      setIsLoading(false)
      return
    }
    fetchWorkoutHistory()
  }, [count, compact, sectionExpanded, fetchWorkoutHistory])

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
    if (compact) return null
    return (
      <div className="bg-card border border-border p-8 text-center doom-noise doom-card">
        <p className="text-muted-foreground">
          No workout history yet. Start logging to see your progress here!
        </p>
      </div>
    )
  }

  const skeletonCount = compact ? 3 : 5

  // Loading skeleton for list items
  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: skeletonCount }, (_, i) => (
        <div
          key={i}
          className="bg-card border border-border p-4 space-y-3"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted animate-pulse w-32" />
              <div className="h-6 bg-muted animate-pulse w-48" />
            </div>
            <div className="h-6 w-24 bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )

  // Shared history item renderer
  const renderHistoryItem = (completion: WorkoutCompletion) => {
    const isExpanded = expandedIds.has(completion.id)
    const isItemCompleted = completion.status === 'completed'

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
        className={`bg-card transition ${
          isItemCompleted
            ? 'border-success-border'
            : 'border-warning-border'
        }`}
      >
        {/* Workout Header */}
        <button type="button"
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
              {isItemCompleted && (
                <span className="doom-badge doom-badge-completed">
                  <svg aria-hidden="true" className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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
  }

  // Compact mode uses a collapsible section (like Archived Programs)
  if (compact) {
    return (
      <div className="bg-card border border-border doom-corners">
        <button
          type="button"
          onClick={() => setSectionExpanded(!sectionExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            {sectionExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
            <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">
              Recent History
            </h3>
            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-semibold">
              {count}
            </span>
          </div>
        </button>
        {sectionExpanded && (
          <div className="border-t border-border">
            {isLoading ? (
              <div className="p-4">{renderSkeleton()}</div>
            ) : (
              <div className="divide-y divide-border">
                {completions.map((completion) => renderHistoryItem(completion))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <div>{renderSkeleton()}</div>
  }

  return (
    <div>
      <div className="space-y-3">
      {completions.map((completion) => renderHistoryItem(completion))}
      </div>
    </div>
  )
}
