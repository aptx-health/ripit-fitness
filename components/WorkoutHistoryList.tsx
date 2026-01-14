'use client'

import { useState } from 'react'
import Link from 'next/link'

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
  completions: WorkoutCompletion[]
}

export default function WorkoutHistoryList({ completions }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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

  if (completions.length === 0) {
    return (
      <div className="bg-card border border-border p-8 text-center doom-noise doom-card">
        <p className="text-muted-foreground">
          No workout history yet. Start logging to see your progress here!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {completions.map((completion) => {
        const isExpanded = expandedIds.has(completion.id)
        const isCompleted = completion.status === 'completed'

        // Group logged sets by exercise
        const exerciseGroups = new Map<string, LoggedSet[]>()
        completion.loggedSets.forEach(set => {
          const key = `${set.exercise.name}-${set.exercise.order}`
          if (!exerciseGroups.has(key)) {
            exerciseGroups.set(key, [])
          }
          exerciseGroups.get(key)!.push(set)
        })

        return (
          <div
            key={completion.id}
            className={`border doom-noise doom-card transition ${
              isCompleted
                ? 'border-success-border bg-success-muted/30'
                : 'border-warning-border bg-warning-muted/30'
            }`}
          >
            <button
              onClick={() => toggleExpanded(completion.id)}
              className="w-full p-4 text-left hover:bg-muted/50 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Link
                      href={`/programs/${completion.workout.week.program.name}/workouts/${completion.workout.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-lg font-bold text-foreground doom-heading hover:text-primary"
                    >
                      {completion.workout.name}
                    </Link>
                    {isCompleted && (
                      <span className="doom-badge doom-badge-completed text-xs">
                        COMPLETED
                      </span>
                    )}
                    {!isCompleted && (
                      <span className="doom-badge doom-badge-warning text-xs">
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {completion.workout.week.program.name}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>
                      {new Date(completion.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                    <span>•</span>
                    <span>{completion._count.loggedSets} sets logged</span>
                  </div>
                </div>

                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4">
                {Array.from(exerciseGroups.entries()).map(([key, sets]) => {
                  const exercise = sets[0].exercise
                  return (
                    <div key={key} className="bg-muted/50 p-3 rounded">
                      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        {exercise.exerciseGroup && (
                          <span className="doom-badge text-xs">
                            {exercise.exerciseGroup}
                          </span>
                        )}
                        {exercise.name}
                      </h4>
                      <div className="space-y-1 text-sm">
                        {sets.map(set => (
                          <div key={set.id} className="flex gap-4 text-muted-foreground">
                            <span className="w-12">Set {set.setNumber}:</span>
                            <span className="font-mono">
                              {set.reps} reps × {set.weight}{set.weightUnit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
