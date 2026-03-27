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
      className="bg-primary text-white px-4 py-3 border-b-2 border-primary-muted-dark flex-shrink-0"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-base text-primary-foreground opacity-90 uppercase tracking-wider font-medium">
          Exercise {currentExerciseIndex + 1} of {totalExercises}
        </div>

        <div className="flex items-center gap-2">
          {failedSetCount > 0 && (
            <div className="flex items-center gap-1 text-warning text-sm">
              <AlertCircle size={16} />
              <span>{failedSetCount} unsaved</span>
            </div>
          )}
          <button
            onClick={onMinimize}
            className="min-h-9 min-w-9 flex items-center justify-center border-2 border-white/30 bg-white/15 hover:bg-white/25 transition-colors doom-focus-ring"
            aria-label="Minimize workout"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="min-h-9 min-w-9 flex items-center justify-center border-2 border-white/30 bg-white/15 hover:bg-white/25 transition-colors doom-focus-ring"
            aria-label="Close workout"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
