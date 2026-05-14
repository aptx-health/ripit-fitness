'use client'

import { AlertCircle, Trash2 } from 'lucide-react'
import type { LoggedSet } from '@/types/workout'

interface LoggedSetListProps {
  loggedSets: LoggedSet[]
  onDeleteSet: (setNumber: number) => void
  showIntensity?: boolean
}

/**
 * Format the intensity cell for a logged set.
 *
 * Returns `null` when intensity is hidden or untracked so the caller can
 * render an empty placeholder span (keeps the row layout stable across sets
 * with and without intensity values).
 */
function formatIntensity(
  set: { rpe: number | null; rir: number | null },
  showIntensity: boolean,
): string | null {
  if (!showIntensity) return null
  if (set.rir !== null) return `RIR ${set.rir}`
  if (set.rpe !== null) return `RPE ${set.rpe}`
  return null
}

/**
 * Format the weight cell. Bodyweight (`weight === 0`) renders without a unit
 * so it reads as a noun rather than a measurement. Otherwise the numeric
 * value is paired with the stored unit (e.g. `135 lb`).
 */
function formatWeight(weight: number, weightUnit: string): string {
  if (weight === 0) return 'Bodyweight'
  return `${weight} ${weightUnit}`
}

/**
 * Tabular list of previously logged sets for the current exercise. Sits above
 * the input area on the LOG SETS tab so "what I've done" stays distinct from
 * "what I'm doing right now."
 *
 * Returns `null` when there are no logged sets — an empty section header
 * reads worse than no header at all.
 */
export default function LoggedSetList({
  loggedSets,
  onDeleteSet,
  showIntensity = true,
}: LoggedSetListProps) {
  if (loggedSets.length === 0) return null

  return (
    <div className="px-4 pb-3">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        Logged
      </div>
      <div className="border border-border bg-card divide-y divide-border/60">
        {loggedSets.map((set) => {
          const isFailed = set._syncStatus === 'error'
          const isPending = set._syncStatus === 'pending'
          const intensity = formatIntensity(set, showIntensity)

          return (
            <div
              key={`logged-${set.exerciseId}-${set.setNumber}`}
              className="flex items-center gap-3 px-3 py-2 text-sm tabular-nums"
            >
              <span className="w-6 text-muted-foreground font-bold">
                {set.setNumber}
              </span>
              <span
                className={`flex-1 font-semibold ${isFailed ? 'text-warning' : 'text-foreground'}`}
              >
                {set.reps} reps{' '}
                <span className="text-muted-foreground">×</span>{' '}
                {formatWeight(set.weight, set.weightUnit)}
                {isPending && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground normal-case tracking-normal">
                    saving...
                  </span>
                )}
                {isFailed && (
                  <AlertCircle
                    aria-hidden="true"
                    size={12}
                    className="inline-block ml-2 -mt-0.5 text-warning"
                  />
                )}
              </span>
              {intensity ? (
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  {intensity}
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={() => onDeleteSet(set.setNumber)}
                className="p-1 text-muted-foreground/60 hover:text-error doom-focus-ring"
                aria-label={`Delete set ${set.setNumber}`}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
