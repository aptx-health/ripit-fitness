'use client'

import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
      <Button
        variant="secondary"
        size="sm"
        doom
        disabled={isFirst}
        onClick={onPrevious}
        aria-label="Previous exercise"
        className="w-10 h-11 px-0 py-0"
      >
        <ChevronLeft size={18} strokeWidth={2.5} />
      </Button>

      {isLast ? (
        <Button
          variant="primary"
          doom
          disabled={isSubmitting}
          onClick={onFinish}
          className="flex-1 h-11 gap-1.5 uppercase tracking-widest text-sm font-medium"
        >
          <CheckCircle size={16} />
          Finish Workout
        </Button>
      ) : (
        <Button
          variant="rare-rounded"
          doom
          onClick={onNext}
          className="flex-1 h-11 gap-1.5 uppercase tracking-widest text-sm font-medium"
        >
          Next Exercise
          <ChevronRight size={16} />
        </Button>
      )}
    </div>
  )
}
