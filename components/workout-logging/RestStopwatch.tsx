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
    <div className="rest-stopwatch px-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Resting</span>
          <span
            role="timer"
            className="text-2xl font-medium text-foreground tabular-nums select-none leading-none"
            aria-label={`Rest timer: ${formatted}`}
            aria-live="off"
          >
            {formatted}
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-12 w-12 items-center justify-center text-muted-foreground/70 hover:text-muted-foreground transition-colors doom-focus-ring"
            aria-label="Dismiss rest timer"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
