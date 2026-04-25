'use client'

import { X } from 'lucide-react'
import { useRestTimer } from '@/hooks/useRestTimer'

interface RestStopwatchProps {
  loggedSetCount: number
  exerciseId: string
  dismissed?: boolean
  onDismiss?: () => void
}

/**
 * Prominent rest timer card displayed between logged and prescribed sets.
 * Large glanceable time readable from across the gym.
 * Resets on each logged set. Dismissible via X button.
 */
export default function RestStopwatch({
  loggedSetCount,
  exerciseId,
  dismissed = false,
  onDismiss,
}: RestStopwatchProps) {
  const { formatted, isRunning } = useRestTimer(
    loggedSetCount,
    exerciseId
  )

  if (!isRunning || dismissed) return null

  return (
    <div className="border-2 border-primary/40 bg-primary/5 p-3 my-1">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Resting
        </span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Dismiss rest timer"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <span
        role="timer"
        className="block text-4xl font-bold tracking-wider text-foreground tabular-nums select-none"
        aria-label={`Rest timer: ${formatted}`}
        aria-live="off"
      >
        {formatted}
      </span>
    </div>
  )
}
