'use client'

import { Check, X } from 'lucide-react'
import ActionsMenu, { type ActionItem } from '@/components/ActionsMenu'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'

interface ExerciseLoggingHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  failedSetCount?: number
  onCompleteWorkout: () => void
  onClose: () => void
  menuActions: ActionItem[]
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
  onCompleteWorkout,
  onClose,
  menuActions,
  modeToggle,
}: ExerciseLoggingHeaderProps) {
  const { formatted: elapsedTime } = useWorkoutTimer()

  return (
    <div
      className="bg-secondary text-secondary-foreground flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)' }}
    >
      <div className="px-4 py-3 grid items-center" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Left: progress indicator */}
        <div className="flex items-center">
          <ProgressIndicator current={currentExerciseIndex} total={totalExercises} />
          {failedSetCount > 0 && (
            <span className="ml-2 text-xs text-warning font-semibold">{failedSetCount} unsaved</span>
          )}
        </div>

        {/* Center: elapsed time */}
        <span className="text-lg font-medium text-foreground tabular-nums" style={{ minWidth: '5ch' }}>
          {elapsedTime}
        </span>

        {/* Right: action icons */}
        <div className="flex items-center justify-end gap-3.5">
          <ActionsMenu
            actions={menuActions}
            size="sm"
            variant="ghost"
            className="text-foreground/80 hover:text-foreground"
          />
          <button
            type="button"
            onClick={onCompleteWorkout}
            className="p-1 text-primary hover:text-primary/80 transition-colors doom-focus-ring"
            aria-label="Complete workout"
          >
            <Check size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-foreground/80 hover:text-foreground transition-colors doom-focus-ring"
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
