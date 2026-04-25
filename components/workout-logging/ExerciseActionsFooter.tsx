'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

const RAISED_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.40)'
const RECESSED_SHADOW = 'inset 0 1px 2px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(254,243,199,0.06)'

interface ExerciseActionsFooterProps {
  currentExerciseIndex: number
  totalExercises: number
  nextSetNumber: number
  canLogSet: boolean
  hasLoggedAllPrescribed: boolean
  extraSetsMode: boolean
  onLogSet: () => void
  onPrevious: () => void
  onNext: () => void
}

export default function ExerciseActionsFooter({
  currentExerciseIndex,
  totalExercises,
  nextSetNumber,
  canLogSet,
  hasLoggedAllPrescribed,
  extraSetsMode,
  onLogSet,
  onPrevious,
  onNext,
}: ExerciseActionsFooterProps) {
  const isFirst = currentExerciseIndex === 0
  const isLast = currentExerciseIndex >= totalExercises - 1
  const showLogSet = !(hasLoggedAllPrescribed && !extraSetsMode)

  if (!showLogSet) return null

  return (
    <div
      className="bg-secondary px-4 py-3 flex-shrink-0"
      style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.25)' }}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirst}
          className="w-10 h-11 flex items-center justify-center text-secondary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed doom-focus-ring"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', boxShadow: RECESSED_SHADOW }}
          aria-label="Previous exercise"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={onLogSet}
          disabled={!canLogSet}
          className="flex-1 h-11 bg-accent text-accent-foreground text-sm font-medium uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed doom-focus-ring"
          style={{ boxShadow: RAISED_SHADOW }}
        >
          LOG SET {nextSetNumber}
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={isLast}
          className="w-10 h-11 flex items-center justify-center text-secondary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed doom-focus-ring"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', boxShadow: RECESSED_SHADOW }}
          aria-label="Next exercise"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
