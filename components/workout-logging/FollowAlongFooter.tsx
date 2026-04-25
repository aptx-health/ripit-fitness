'use client'

import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'

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
    <div className="flex-shrink-0 border-t border-border px-3 py-2 bg-card flex gap-2">
      <button
        type="button"
        disabled={isFirst}
        onClick={onPrevious}
        className="flex-1 min-h-[48px] flex items-center justify-center gap-1.5 px-4 py-2 bg-muted text-foreground font-bold uppercase tracking-wider border-2 border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary doom-focus-ring"
      >
        <ChevronLeft size={18} />
        Previous
      </button>

      {isLast ? (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onFinish}
          className="flex-1 min-h-[48px] flex items-center justify-center gap-1.5 px-4 py-2 bg-success text-success-foreground font-bold uppercase tracking-wider transition-colors disabled:opacity-50 doom-button-3d doom-focus-ring"
        >
          <CheckCircle size={18} />
          Finish Workout
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 min-h-[48px] flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider transition-colors hover:bg-primary/90 doom-button-3d doom-focus-ring"
        >
          Next Exercise
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}
