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
}

export default function ExerciseNavigation({
  currentExercise,
  currentExerciseIndex,
  totalExercises,
  onPrevious,
  onNext,
}: ExerciseNavigationProps) {
  // Determine if this is part of a superset
  const isSuperset = currentExercise.exerciseGroup !== null
  const supersetLabel = currentExercise.exerciseGroup

  return (
    <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between bg-muted flex-shrink-0">
      <button
        onClick={onPrevious}
        disabled={currentExerciseIndex === 0}
        className={`p-3 transition-all doom-focus-ring ${
          currentExerciseIndex === 0
            ? 'bg-muted opacity-30 cursor-not-allowed'
            : 'bg-primary-muted hover:bg-primary hover:text-white border-2 border-transparent hover:border-primary'
        }`}
        aria-label="Previous exercise"
      >
        <ChevronLeft size={24} strokeWidth={2.5} />
      </button>

      <div className="text-center flex-1 px-2">
        <div className="flex items-center justify-center gap-2">
          {isSuperset && (
            <span className="px-3 py-1 bg-accent-muted text-accent-text text-sm font-bold uppercase tracking-wider border border-accent">
              Superset {supersetLabel}
            </span>
          )}
          <h3 className="text-xl sm:text-2xl font-bold text-foreground uppercase tracking-wide">{currentExercise.name}</h3>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={currentExerciseIndex === totalExercises - 1}
        className={`p-3 transition-all doom-focus-ring ${
          currentExerciseIndex === totalExercises - 1
            ? 'bg-muted opacity-30 cursor-not-allowed'
            : 'bg-primary-muted hover:bg-primary hover:text-white border-2 border-transparent hover:border-primary'
        }`}
        aria-label="Next exercise"
      >
        <ChevronRight size={24} strokeWidth={2.5} />
      </button>
    </div>
  )
}
