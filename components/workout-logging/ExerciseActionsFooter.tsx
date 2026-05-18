'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

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
  /** When provided, renders an Add Exercise button side-by-side with LOG SET. */
  onAddExercise?: () => void
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
  onAddExercise,
}: ExerciseActionsFooterProps) {
  const isFirst = currentExerciseIndex === 0
  const isLast = currentExerciseIndex >= totalExercises - 1
  const showLogSet = !(hasLoggedAllPrescribed && !extraSetsMode)

  if (!showLogSet) return null

  return (
    <div
      className="bg-secondary px-4 py-3 flex-shrink-0"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.25)',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirst}
          className="w-16 h-12 flex items-center justify-center text-secondary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed doom-focus-ring"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', boxShadow: RECESSED_SHADOW }}
          aria-label="Previous exercise"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        <div className="flex-1 flex items-stretch gap-2 px-1">
          <button
            type="button"
            onClick={onLogSet}
            disabled={!canLogSet}
            className={`${onAddExercise ? 'flex-[1.4]' : 'flex-1'} h-12 bg-accent text-accent-foreground text-base font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed doom-focus-ring`}
            style={{ boxShadow: RAISED_SHADOW }}
          >
            LOG SET {nextSetNumber}
          </button>

          {onAddExercise && (
            <button
              type="button"
              onClick={onAddExercise}
              className="flex-1 h-12 bg-primary text-primary-foreground text-base font-bold uppercase tracking-widest transition-all doom-focus-ring inline-flex items-center justify-center gap-1"
              style={{ boxShadow: RAISED_SHADOW }}
              aria-label="Add another exercise"
            >
              <Plus size={18} strokeWidth={2.5} />
              ADD
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={isLast}
          className="w-16 h-12 flex items-center justify-center text-secondary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed doom-focus-ring"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', boxShadow: RECESSED_SHADOW }}
          aria-label="Next exercise"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
