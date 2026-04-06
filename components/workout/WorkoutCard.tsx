'use client'

import { Check, ChevronRight, Eye, SkipForward } from 'lucide-react'
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
            ) : (
              <ChevronRight size={18} className="text-muted-foreground" />
            )}
          </div>
        </div>
      </button>
    </SwipeableCard>
  )
}
