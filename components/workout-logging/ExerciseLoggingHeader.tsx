'use client'

import { AlertCircle, ChevronDown, X } from 'lucide-react'

interface ExerciseLoggingHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  failedSetCount?: number
  onMinimize: () => void
  onClose: () => void
}

export default function ExerciseLoggingHeader({
  currentExerciseIndex,
  totalExercises,
  failedSetCount = 0,
  onMinimize,
  onClose,
}: ExerciseLoggingHeaderProps) {
  return (
    <div
      className="bg-primary text-white px-4 py-2 border-b border-primary-muted-dark flex-shrink-0"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-primary-foreground/80 uppercase tracking-wider font-bold">
          EXERCISE {currentExerciseIndex + 1} OF {totalExercises}
        </div>

        <div className="flex items-center gap-1.5">
          {failedSetCount > 0 && (
            <div className="flex items-center gap-1 text-warning text-xs font-semibold">
              <AlertCircle size={14} />
              <span>{failedSetCount} unsaved</span>
            </div>
          )}
          <button
            type="button"
            onClick={onMinimize}
            className="min-h-12 min-w-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors doom-focus-ring"
            aria-label="Minimize workout"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 min-w-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors doom-focus-ring"
            aria-label="Close workout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
