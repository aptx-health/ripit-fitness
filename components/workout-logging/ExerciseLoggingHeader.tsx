'use client'

import { ListChecks, X } from 'lucide-react'
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer'

interface ExerciseLoggingHeaderProps {
  currentExerciseIndex: number
  totalExercises: number
  failedSetCount?: number
  startedAt?: string | null
  onCompleteWorkout: () => void
  onClose: () => void
  onOpenPlanEditor?: () => void
  modeToggle?: React.ReactNode
  /** Off while the bottom bar offers Finish, so only one Finish is on screen. */
  showFinish?: boolean
}

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const useDoubleRow = total > 5
  const topCount = useDoubleRow ? Math.ceil(total / 2) : total
  const bottomCount = useDoubleRow ? total - topCount : 0
  const barHeight = useDoubleRow ? 5 : 12

  const renderRow = (count: number, startIndex: number) => (
    <div className="flex gap-[3px]" style={{ width: '110px' }}>
      {Array.from({ length: count }, (_, i) => {
        const exerciseIndex = startIndex + i
        const lit = exerciseIndex <= current
        return (
          <div
            key={exerciseIndex}
            className={`flex-1 transition-colors ${lit ? 'bg-primary' : 'bg-primary/20'}`}
            style={{ height: barHeight }}
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
  onOpenPlanEditor,
  modeToggle,
  showFinish = true,
}: ExerciseLoggingHeaderProps) {
  const { formatted: elapsedTime } = useWorkoutTimer(startedAt)

  // Header buttons are outlined in the header's own darker shade (--secondary-active),
  // not --border: that is a page token and reads as a light stroke on the coloured bar.
  return (
    <div
      className="bg-secondary text-secondary-foreground flex-shrink-0 border-b-2 border-secondary-active"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* 48px buttons with 4px above and below: the bar stays 56px, as with the old 36px buttons and 10px padding. */}
      <div className="px-3 py-1 grid items-center gap-3" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Left: progress indicator (button when editor wired) */}
        <div className="flex items-center">
          {onOpenPlanEditor ? (
            // Says what it opens and where you are, at every width: "PLAN 2/6".
            <button
              type="button"
              onClick={onOpenPlanEditor}
              className="inline-flex min-h-12 items-center gap-1.5 px-2.5 border-2 border-secondary-active hover:bg-secondary-hover text-sm font-bold uppercase tracking-wider text-secondary-foreground doom-focus-ring"
            >
              <ListChecks size={16} strokeWidth={2.5} aria-hidden="true" />
              <span className="tabular-nums">
                Plan {currentExerciseIndex + 1}/{totalExercises}
              </span>
            </button>
          ) : (
            <ProgressIndicator current={currentExerciseIndex} total={totalExercises} />
          )}
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
          {showFinish && (
          <button
            type="button"
            onClick={onCompleteWorkout}
            className="h-12 px-3 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-widest hover:bg-primary-hover shadow-[0_3px_0_var(--primary-active)] transition-colors doom-focus-ring"
          >
            FINISH
          </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-12 flex items-center justify-center border-2 border-secondary-active text-secondary-foreground/80 hover:text-secondary-foreground hover:bg-secondary-hover transition-colors doom-focus-ring"
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
