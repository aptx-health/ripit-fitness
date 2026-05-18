'use client'

import { X } from 'lucide-react'
import { useMemo } from 'react'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'

interface ExerciseLoggingHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  failedSetCount?: number
  startedAt?: string | null
  onCompleteWorkout: () => void
  onClose: () => void
  modeToggle?: React.ReactNode
}

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const useDoubleRow = total > 5
  const topCount = useDoubleRow ? Math.ceil(total / 2) : total
  const bottomCount = useDoubleRow ? total - topCount : 0

  const renderRow = (count: number, startIndex: number) => (
    <div className="flex gap-[3px]" style={{ width: '110px' }}>
      {Array.from({ length: count }, (_, i) => {
        const exerciseIndex = startIndex + i
        return (
          <div
            key={exerciseIndex}
            className="h-[5px] flex-1 transition-colors"
            style={{
              backgroundColor: exerciseIndex <= current
                ? 'var(--primary)'
                : 'rgba(0,0,0,0.25)',
              boxShadow: exerciseIndex <= current
                ? undefined
                : 'inset 0 1px 0 rgba(0,0,0,0.20)',
            }}
          />
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-[3px]" style={{ width: '110px' }}>
      {renderRow(topCount, 0)}
      {useDoubleRow && renderRow(bottomCount, topCount)}
    </div>
  )
}

export default function ExerciseLoggingHeader({
  currentExerciseIndex,
  totalExercises,
  failedSetCount = 0,
  startedAt,
  onCompleteWorkout,
  onClose,
  modeToggle,
}: ExerciseLoggingHeaderProps) {
  const initialElapsed = useMemo(() => {
    if (!startedAt) return 0
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  }, [startedAt])

  const { formatted: elapsedTime } = useWorkoutTimer(initialElapsed)

  return (
    <div
      className="bg-secondary text-secondary-foreground flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)' }}
    >
      <div className="px-3 py-2.5 grid items-center gap-3" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Left: progress indicator */}
        <div className="flex items-center">
          <ProgressIndicator current={currentExerciseIndex} total={totalExercises} />
          {failedSetCount > 0 && (
            <span className="ml-2 text-xs text-warning font-semibold">{failedSetCount} unsaved</span>
          )}
        </div>

        {/* Center: elapsed time */}
        <span className="text-lg font-medium text-secondary-foreground tabular-nums" style={{ minWidth: '5ch' }}>
          {elapsedTime}
        </span>

        {/* Right: FINISH pill (primary CTA) + boxed X escape hatch */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCompleteWorkout}
            className="h-9 px-3 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors doom-focus-ring"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.30), 0 1px 0 rgba(0,0,0,0.30)',
            }}
          >
            FINISH
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center text-secondary-foreground/80 hover:text-secondary-foreground transition-colors doom-focus-ring"
            style={{
              backgroundColor: 'rgba(0,0,0,0.30)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.05)',
            }}
            aria-label="Exit workout"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {modeToggle && (
        <div className="text-center pb-1">
          {modeToggle}
        </div>
      )}
    </div>
  )
}
