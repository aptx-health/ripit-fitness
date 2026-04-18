'use client'

import { useRestTimer } from '@/hooks/useRestTimer'

interface RestStopwatchProps {
  loggedSetCount: number
  prescribedSetCount: number
  exerciseId: string
}

/**
 * Subtle watermark-style rest stopwatch displayed below the set list.
 * Resets on each logged set (including extra sets and re-logged sets after deletion).
 * Hides when no sets are logged.
 */
export default function RestStopwatch({
  loggedSetCount,
  prescribedSetCount,
  exerciseId,
}: RestStopwatchProps) {
  const { formatted, isRunning } = useRestTimer(
    loggedSetCount,
    prescribedSetCount,
    exerciseId
  )

  if (!isRunning) return null

  return (
    <div className="flex items-center justify-center py-4 select-none" aria-live="off">
      <span
        role="timer"
        className="text-5xl font-bold tracking-wider text-muted-foreground/15 tabular-nums"
        aria-label={`Rest timer: ${formatted}`}
      >
        {formatted}
      </span>
    </div>
  )
}
