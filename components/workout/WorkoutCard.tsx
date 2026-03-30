'use client'

import { Check, ChevronRight, Eye, MoreVertical, SkipForward } from 'lucide-react'
import { useRef, useState } from 'react'
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

  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Card state class (DOOM gradient backgrounds)
  const stateClass = isCompleted
    ? 'doom-workout-completed'
    : isDraft
      ? 'doom-workout-progress'
      : isSkipped
        ? 'bg-muted/30 opacity-75'
        : 'bg-card doom-card'

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
        onClick={handleCardTap}
        disabled={isLoading || isSkipping || isUnskipping}
        aria-label={`${actionLabel}: Day ${workout.dayNumber} ${workout.name}`}
        className={`w-full text-left border border-border border-l-4 ${borderColor} ${stateClass} doom-noise p-4 transition-all active:bg-muted/70 disabled:opacity-60 doom-focus-ring`}
      >
        <div className="flex items-center gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={`text-base font-bold text-foreground doom-heading truncate ${isSkipped ? 'line-through opacity-60' : ''}`}>
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

      {/* Desktop kebab menu fallback (hidden on mobile where swipe works) */}
      {swipeActions.length > 0 && (
        <div className="hidden md:block absolute top-2 right-2 z-20" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors doom-focus-ring"
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border shadow-lg z-30 min-w-[140px] doom-noise">
              <button
                type="button"
                onClick={() => {
                  onView(workout.id)
                  setShowMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Eye size={14} />
                Preview
              </button>
              {!latestCompletion && (
                <button
                  type="button"
                  onClick={() => {
                    onSkip(workout.id)
                    setShowMenu(false)
                  }}
                  disabled={isSkipping}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <SkipForward size={14} />
                  Skip
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </SwipeableCard>
  )
}
