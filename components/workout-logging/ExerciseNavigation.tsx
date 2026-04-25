'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  exerciseGroup: string | null
  notes: string | null
}

interface ExerciseNavigationProps {
  currentExercise: Exercise
  currentExerciseIndex: number
  totalExercises: number
  onPrevious: () => void
  onNext: () => void
  hideChevrons?: boolean
}

export default function ExerciseNavigation({
  currentExercise,
  currentExerciseIndex,
  totalExercises,
  onPrevious,
  onNext,
  hideChevrons = false,
}: ExerciseNavigationProps) {
  // Determine if this is part of a superset
  const isSuperset = currentExercise.exerciseGroup !== null
  const supersetLabel = currentExercise.exerciseGroup

  return (
    <div className="border-b border-border px-3 py-2 flex items-center justify-between bg-card flex-shrink-0">
      {!hideChevrons && (
        <button type="button"
          onClick={onPrevious}
          disabled={currentExerciseIndex === 0}
          className={`p-2 transition-all doom-focus-ring ${
            currentExerciseIndex === 0
              ? 'opacity-20 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Previous exercise"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
      )}

      <div className="text-center flex-1 min-w-0 px-2">
        {isSuperset && (
          <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-accent border border-accent mb-0.5">
            Superset {supersetLabel}
          </span>
        )}
        <h3 className="text-lg font-bold text-foreground uppercase tracking-wide truncate doom-heading">{currentExercise.name}</h3>
      </div>

      {!hideChevrons && (
        <button type="button"
          onClick={onNext}
          disabled={currentExerciseIndex === totalExercises - 1}
          className={`p-2 transition-all doom-focus-ring ${
            currentExerciseIndex === totalExercises - 1
              ? 'opacity-20 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Next exercise"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
