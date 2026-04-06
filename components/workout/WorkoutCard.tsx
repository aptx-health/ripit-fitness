'use client'

import { Check, ChevronDown, ChevronRight, Eye, SkipForward } from 'lucide-react'
import { useState } from 'react'
import SwipeableCard from '@/components/ui/SwipeableCard'

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
  isSkipping: boolean
  isLoading: boolean
  isUnskipping: boolean
  onSkip: (workoutId: string) => void
  onUnskip: (workoutId: string) => void
  onView: (workoutId: string) => void
  onLog: (workoutId: string) => void
}

export default function WorkoutCard({
  workout,
  isSkipping,
  isLoading,
  isUnskipping,
  onSkip,
  onUnskip,
  onView,
  onLog,
}: Props) {
  const latestCompletion = workout.completions[0]
  const isCompleted = latestCompletion?.status === 'completed'
  const isDraft = latestCompletion?.status === 'draft'
  const isSkipped = latestCompletion?.status === 'skipped'
  const hasActions = !isCompleted && !isSkipped
  const [expanded, setExpanded] = useState(false)

  // Primary tap action based on state
  const handleCardTap = () => {
    if (isLoading || isSkipping || isUnskipping) return
    if (isSkipped) {
      onUnskip(workout.id)
    } else if (isCompleted) {
      onView(workout.id)
    } else {
      onLog(workout.id)
    }
  }

  // Desktop: click chevron to expand action row instead of navigating
  const handleDesktopChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

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
    ? 'Review workout'
    : isDraft
      ? 'Continue workout'
      : isSkipped
        ? 'Unskip workout'
        : 'Log workout'

  // Swipe actions (mobile) - only for non-completed, non-skipped workouts
  const swipeActions = []
  if (!isCompleted && !isSkipped) {
    swipeActions.push({
      label: 'Preview',
      icon: <Eye size={18} />,
      onClick: () => onView(workout.id),
      className: 'bg-accent/20 text-accent hover:bg-accent/30',
    })
    if (!latestCompletion) {
      swipeActions.push({
        label: 'Skip',
        icon: <SkipForward size={18} />,
        onClick: () => onSkip(workout.id),
        className: 'bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30',
      })
    }
  }
  // Completed workouts don't need swipe - tap goes to review
  // Skipped workouts don't need swipe - tap unskips

  return (
    <SwipeableCard actions={swipeActions}>
      <button
        type="button"
        data-tour="workout-card"
        onClick={handleCardTap}
        disabled={isLoading || isSkipping || isUnskipping}
        aria-label={`${actionLabel}: Day ${workout.dayNumber} ${workout.name}`}
        className={`w-full text-left border-l-4 ${borderColor} ${stateClass} px-4 py-3 transition-all hover:bg-muted/50 active:bg-muted/70 disabled:opacity-60 doom-focus-ring`}
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
              <>
                {/* Mobile: static chevron (swipe reveals actions) */}
                <ChevronRight size={18} className="text-muted-foreground md:hidden" />
                {/* Desktop: clickable chevron toggles action row */}
                <button
                  type="button"
                  onClick={handleDesktopChevronClick}
                  className="hidden md:block p-1 text-muted-foreground hover:text-foreground transition-colors doom-focus-ring"
                  aria-label={expanded ? 'Collapse actions' : 'Expand actions'}
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              </>
            ) : (
              <ChevronRight size={18} className="text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Desktop expanded action row */}
      {expanded && hasActions && (
        <div className="hidden md:flex items-center gap-3 px-4 py-2 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={() => { onView(workout.id); setExpanded(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <Eye size={14} />
            Preview
          </button>
          {!latestCompletion && (
            <button
              type="button"
              onClick={() => { onSkip(workout.id); setExpanded(false) }}
              disabled={isSkipping}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors disabled:opacity-50"
            >
              <SkipForward size={14} />
              Skip
            </button>
          )}
        </div>
      )}
    </SwipeableCard>
  )
}
