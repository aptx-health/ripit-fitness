'use client'

import { AlertCircle } from 'lucide-react'

interface ExerciseLoggingHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  failedSetCount?: number
}

export default function ExerciseLoggingHeader({
  currentExerciseIndex,
  totalExercises,
  failedSetCount = 0,
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

        {failedSetCount > 0 && (
          <div className="flex items-center gap-1 text-warning text-sm">
            <AlertCircle size={16} />
            <span>{failedSetCount} unsaved</span>
          </div>
        )}
      </div>
    </div>
  )
}
