'use client'

import { Menu, X } from 'lucide-react'
import { useMemo } from 'react'
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
            className="flex-1 transition-colors"
            style={{
              height: barHeight,
              backgroundColor: lit
                ? 'var(--primary)'
                : 'rgba(16, 185, 129, 0.14)',
              boxShadow: lit
                ? 'inset 0 1px 0 rgba(255,255,255,0.28), 0 0 4px rgba(16,185,129,0.45)'
                : 'inset 0 1px 1px rgba(0,0,0,0.40)',
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
  onOpenPlanEditor,
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
        {/* Left: progress indicator (button when editor wired) */}
        <div className="flex items-center">
          {onOpenPlanEditor ? (
            <button
              type="button"
              onClick={onOpenPlanEditor}
              aria-label="Edit workout plan"
              className="group inline-flex items-center gap-2 p-1.5 doom-focus-ring transition-transform active:translate-y-[2px]"
              style={{
                backgroundColor: 'rgba(254, 243, 199, 0.06)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 rgba(0,0,0,0.40)',
              }}
            >
              <Menu
                size={18}
                strokeWidth={2.5}
                className="text-secondary-foreground/85 ml-0.5 sm:hidden"
                aria-hidden="true"
              />
              <span
                className="inline-flex items-center px-1.5 py-1 max-[359px]:hidden"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.25)',
                }}
              >
                <ProgressIndicator current={currentExerciseIndex} total={totalExercises} />
              </span>
              <span
                className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.15em] text-secondary-foreground/85 pr-1"
                aria-hidden="true"
              >
                Plan
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
