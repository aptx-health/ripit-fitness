'use client'

import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const RAISED_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)'
const RECESSED_SHADOW = 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)'

interface FollowAlongFooterProps {
  currentIndex: number
  totalExercises: number
  isSubmitting: boolean
  onPrevious: () => void
  onNext: () => void
  onFinish: () => void
}

export default function FollowAlongFooter({
  currentIndex,
  totalExercises,
  isSubmitting,
  onPrevious,
  onNext,
  onFinish,
}: FollowAlongFooterProps) {
  const isFirst = currentIndex === 0
  const isLast = currentIndex >= totalExercises - 1

  return (
    <div
      className="flex-shrink-0 bg-secondary px-4 py-3 flex gap-2.5"
      style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.25)' }}
    >
      <button
        type="button"
        disabled={isFirst}
        onClick={onPrevious}
        className="w-10 h-11 flex items-center justify-center text-secondary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed doom-focus-ring"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)', boxShadow: RECESSED_SHADOW }}
        aria-label="Previous exercise"
      >
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>

      {isLast ? (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onFinish}
          className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-medium uppercase tracking-widest text-sm transition-colors disabled:opacity-50 doom-focus-ring"
          style={{ boxShadow: RAISED_SHADOW }}
        >
          <CheckCircle size={16} />
          Finish Workout
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-accent text-accent-foreground font-medium uppercase tracking-widest text-sm transition-colors doom-focus-ring"
          style={{ boxShadow: RAISED_SHADOW }}
        >
          Next Exercise
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
