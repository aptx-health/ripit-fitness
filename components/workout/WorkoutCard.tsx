'use client'

import { Check, ChevronDown, ChevronRight, Play, SkipForward } from 'lucide-react'

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

type Props = {
  workout: Workout
  expanded: boolean
  isSkipping: boolean
  isLoading: boolean
  isUnskipping: boolean
  onToggle: (workoutId: string) => void
  onSkip: (workoutId: string) => void
  onUnskip: (workoutId: string) => void
  onLog: (workoutId: string) => void
}

export default function WorkoutCard({
  workout,
  expanded,
  isSkipping,
  isLoading,
  isUnskipping,
  onToggle,
  onSkip,
  onUnskip,
  onLog,
}: Props) {
  const latestCompletion = workout.completions[0]
  const isCompleted = latestCompletion?.status === 'completed'
  const isDraft = latestCompletion?.status === 'draft'
  const isSkipped = latestCompletion?.status === 'skipped'
  const hasActions = !isCompleted && !isSkipped

  // Tap row to expand/collapse for actionable workouts, or unskip
  const handleCardTap = () => {
    if (isLoading || isSkipping || isUnskipping) return
    if (isSkipped) {
      onUnskip(workout.id)
    } else if (hasActions) {
      onToggle(workout.id)
    }
  }

  const isInteractive = hasActions || isSkipped

  // Status bar color (left border)
  const borderColor = isCompleted
    ? 'border-l-success'
    : isDraft
      ? 'border-l-primary'
      : isSkipped
        ? 'border-l-muted-foreground'
        : 'border-l-border'

  // Card state class (subtle backgrounds for status)
  const stateClass = isCompleted
    ? 'bg-success/5'
    : isDraft
      ? 'bg-primary/5'
      : isSkipped
        ? 'bg-muted/30 opacity-75'
        : 'bg-card'

  // Primary action label for screen readers
  const actionLabel = isCompleted
    ? 'Completed workout'
    : isDraft
      ? expanded ? 'Collapse actions' : 'Expand actions to continue workout'
      : isSkipped
        ? 'Unskip workout'
        : expanded ? 'Collapse actions' : 'Expand actions'

  return (
    <div>
      <button
        type="button"
        onClick={handleCardTap}
        disabled={isLoading || isSkipping || isUnskipping}
        aria-label={`${actionLabel}: Day ${workout.dayNumber} ${workout.name}`}
        aria-expanded={hasActions ? expanded : undefined}
        className={`w-full text-left border-l-4 ${borderColor} ${stateClass} px-4 py-3 transition-all ${isInteractive ? 'hover:bg-muted/50 active:bg-muted/70 cursor-pointer' : 'cursor-default'} disabled:opacity-60 doom-focus-ring`}
      >
        <div className="flex items-center gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={`text-lg font-bold text-foreground doom-heading truncate ${isSkipped ? 'line-through opacity-60' : ''}`}>
                DAY {workout.dayNumber}: {workout.name}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{workout._count.exercises} exercises</span>
              {latestCompletion && !isSkipped && (
                <span className="text-xs">
                  {new Date(latestCompletion.completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Status badge + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            {isCompleted && (
              <span className="doom-badge doom-badge-completed">
                <Check size={12} />
              </span>
            )}
            {isDraft && (
              <span className="doom-badge doom-badge-accent text-xs">
                CONTINUE
              </span>
            )}
            {isSkipped && (
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                SKIPPED
              </span>
            )}
            {(isLoading || isSkipping || isUnskipping) ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : hasActions ? (
              <span className="p-1 text-muted-foreground">
                {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </span>
            ) : (
              <ChevronRight size={18} className="text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded action row */}
      {expanded && hasActions && (
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={() => onLog(workout.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-wider text-sm transition-colors doom-focus-ring"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)' }}
          >
            <Play size={16} />
            {isDraft ? 'Continue Workout' : 'Start Workout'}
          </button>
          {!latestCompletion && (
            <button
              type="button"
              onClick={() => onSkip(workout.id)}
              disabled={isSkipping}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground hover:bg-secondary-hover font-semibold uppercase tracking-wider text-sm transition-colors doom-focus-ring disabled:opacity-50"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)' }}
            >
              <SkipForward size={14} />
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  )
}
