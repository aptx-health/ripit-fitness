'use client'

import { useEffect, useRef, useState } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { clientLogger } from '@/lib/client-logger'
import { EFFORT_OPTIONS, shouldShowEffortPrompt } from '@/lib/effort-prompt'

interface EffortChipsProps {
  completionId: string
}

/**
 * One-tap session effort rating on the rollup's stats view. Shows a single
 * word-label scale for everyone (Easy → Maximal), stored as RPE-equivalent
 * 6–10 on `WorkoutCompletion.sessionRpe`.
 *
 * - Fire-and-forget PATCH; never blocks modal dismissal.
 * - Shown on ALL completions (including minimal "marked complete" sessions),
 *   always skippable.
 * - Throttled via the existing post-session prompt fields so it doesn't nag on
 *   back-to-back completions. Returns null when the cadence is exhausted.
 */
export function EffortChips({ completionId }: EffortChipsProps) {
  const { settings, updateSettings } = useUserSettings()
  const [visible, setVisible] = useState(false)
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null)
  const decidedRef = useRef(false)

  // Decide visibility once when settings load. When shown, start the throttle
  // cooldown (fire-and-forget) so it won't re-surface on the next completion
  // within the cooldown window.
  useEffect(() => {
    if (decidedRef.current) return
    if (!settings) return
    decidedRef.current = true
    if (!shouldShowEffortPrompt(settings)) return
    // Visibility is decided once when async settings load; the ref guard above
    // ensures this runs at most once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true)
    updateSettings({
      postSessionPromptCount: settings.postSessionPromptCount + 1,
      lastPostSessionPromptAt: new Date().toISOString(),
    }).catch(() => {
      // Non-critical — worst case the row re-shows next session.
    })
  }, [settings, updateSettings])

  if (!visible) return null

  const handleSelect = (rpe: number) => {
    setSelectedRpe(rpe)
    // Fire-and-forget: persistence never blocks dismissal.
    fetch(`/api/workouts/completions/${completionId}/effort`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionRpe: rpe }),
    }).catch((err) => {
      clientLogger.error('Failed to save session effort rating:', err)
    })
  }

  return (
    <div className="border-t-2 border-border/50 pt-4">
      <p className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
        {selectedRpe === null ? 'How was that?' : 'Effort logged'}
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {EFFORT_OPTIONS.map(({ label, rpe }) => (
          <button
            key={rpe}
            type="button"
            onClick={() => handleSelect(rpe)}
            aria-label={`${label} effort`}
            aria-pressed={selectedRpe === rpe}
            className={`relative min-h-[44px] flex items-center justify-center text-center px-1 py-2 border-2 text-[11px] font-semibold uppercase tracking-wide leading-tight transition-colors doom-focus-ring before:content-[''] before:absolute before:-inset-1 ${
              selectedRpe === rpe
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-foreground border-border hover:bg-secondary/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
