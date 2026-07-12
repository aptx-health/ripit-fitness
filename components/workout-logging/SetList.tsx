'use client'

import { AlertCircle, ListChecks, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { LoggedSet } from '@/types/workout'
import RestStopwatch from './RestStopwatch'

interface PrescribedSet {
  id: string
  setNumber: number
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

interface ExerciseHistorySet {
  setNumber: number
  reps: number
  weight: number
  weightUnit: string
  rpe: number | null
  rir: number | null
  isWarmup: boolean
}

interface ExerciseHistory {
  completedAt: Date
  workoutName: string
  sets: ExerciseHistorySet[]
}

interface SetListProps {
  prescribedSets: PrescribedSet[]
  loggedSets: LoggedSet[]
  exerciseHistory: ExerciseHistory | null
  onDeleteSet: (setNumber: number) => void
  /** Tap a logged set to copy its numbers into the form (prefill this set). */
  onApplySet?: (set: LoggedSet) => void
  exerciseId?: string
  showIntensity?: boolean
}

function formatIntensity(set: { rpe: number | null; rir: number | null }, showIntensity = true) {
  if (!showIntensity) return null
  if (set.rir !== null) return `RIR ${set.rir}`
  if (set.rpe !== null) return `RPE ${set.rpe}`
  return null
}

function formatWeight(weight: number, weightUnit: string): string {
  if (weight === 0) return 'Bodyweight'
  return `${weight} ${weightUnit}`
}

/**
 * "Beat this" reference for set N: last session's working set N, muted.
 * Rendered under the set row so the user sees the target inline while logging.
 * Absent when there's no prior (non-warmup) set at that number.
 */
function BeatThisReference({
  set,
  showIntensity,
}: {
  set: ExerciseHistorySet
  showIntensity: boolean
}) {
  const intensity = formatIntensity(set, showIntensity)
  return (
    <span className="block pl-9 text-xs text-muted-foreground tabular-nums">
      last: {set.reps} × {formatWeight(set.weight, set.weightUnit)}
      {intensity ? ` · ${intensity}` : ''}
    </span>
  )
}

/**
 * Unified sets view for the LOG SETS tab. Renders one row per set slot:
 * logged sets occupy their slot in full "completed" styling (with delete),
 * and any remaining prescribed slots render below in a faded "upcoming" state.
 * A rest timer slides in between the latest logged row and the next prescribed
 * row.
 *
 * Ad-hoc mode (no prescribedSets) drops the SETS header entirely and renders
 * just the logged rows; the timer trails the most recent entry.
 */
export default function SetList({
  prescribedSets,
  loggedSets,
  exerciseHistory,
  onDeleteSet,
  onApplySet,
  exerciseId,
  showIntensity = true,
}: SetListProps) {
  const isAdhoc = prescribedSets.length === 0
  const loggedBySetNumber = new Map(loggedSets.map(s => [s.setNumber, s]))
  const prescribedBySetNumber = new Map(prescribedSets.map(s => [s.setNumber, s]))
  const remainingSets = prescribedSets.filter(s => !loggedBySetNumber.has(s.setNumber))

  // "Beat this" reference: last session's working (non-warmup) sets keyed by
  // set number. Warmups are excluded — there's nothing to beat about a warmup.
  const priorBySetNumber = new Map(
    (exerciseHistory?.sets ?? [])
      .filter(s => !s.isWarmup)
      .map(s => [s.setNumber, s] as const),
  )

  const maxSetNumber = Math.max(
    prescribedSets.length,
    ...loggedSets.map(s => s.setNumber),
  )

  const [restDismissed, setRestDismissed] = useState(false)
  const prevLogCountRef = useRef(loggedSets.length)

  useEffect(() => {
    if (loggedSets.length > prevLogCountRef.current) {
      const frame = requestAnimationFrame(() => setRestDismissed(false))
      prevLogCountRef.current = loggedSets.length
      return () => cancelAnimationFrame(frame)
    }
    prevLogCountRef.current = loggedSets.length
  }, [loggedSets.length])

  const restTimer = loggedSets.length > 0 && (
    <RestStopwatch
      loggedSetCount={loggedSets.length}
      exerciseId={exerciseId || ''}
      dismissed={restDismissed}
      onDismiss={() => setRestDismissed(true)}
    />
  )

  // Decide where to slot the rest timer:
  //   - After the last logged row and before the first remaining prescribed.
  //   - Or, if all prescribed sets are logged (or ad-hoc), at the bottom.
  const restAfterSetNumber = (() => {
    if (loggedSets.length === 0) return null
    if (remainingSets.length === 0) return maxSetNumber // bottom
    const lastLogged = Math.max(...loggedSets.map(s => s.setNumber))
    return lastLogged
  })()

  // Build the row list (logged + prescribed merged by setNumber).
  const rows: React.ReactNode[] = []
  for (let setNumber = 1; setNumber <= maxSetNumber; setNumber++) {
    const logged = loggedBySetNumber.get(setNumber)
    const prescribed = prescribedBySetNumber.get(setNumber)

    const priorSet = priorBySetNumber.get(setNumber)

    if (logged) {
      const isFailed = logged._syncStatus === 'error'
      const isPending = logged._syncStatus === 'pending'
      const intensity = formatIntensity(logged, showIntensity)
      const rowInner = (
        <>
          <span className="w-6 text-muted-foreground font-bold">{logged.setNumber}</span>
          <span
            className={`flex-1 font-semibold ${isFailed ? 'text-warning' : 'text-foreground'}`}
          >
            {logged.reps} reps <span className="text-muted-foreground">×</span>{' '}
            {formatWeight(logged.weight, logged.weightUnit)}
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
        </>
      )
      rows.push(
        <div key={`logged-${logged.exerciseId}-${logged.setNumber}`} className="py-1">
          <div className="flex items-center gap-3 px-3 text-sm tabular-nums">
            {onApplySet ? (
              <button
                type="button"
                onClick={() => onApplySet(logged)}
                className="flex flex-1 items-center gap-3 text-left transition-colors hover:text-accent active:opacity-70 doom-focus-ring"
                aria-label={`Use set ${logged.setNumber}: ${logged.reps} reps × ${formatWeight(logged.weight, logged.weightUnit)}`}
              >
                {rowInner}
              </button>
            ) : (
              <div className="flex flex-1 items-center gap-3">{rowInner}</div>
            )}
            <button
              type="button"
              onClick={() => onDeleteSet(logged.setNumber)}
              className="p-1 text-muted-foreground/60 hover:text-error doom-focus-ring"
              aria-label={`Delete set ${logged.setNumber}`}
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
          {priorSet && <BeatThisReference set={priorSet} showIntensity={showIntensity} />}
        </div>,
      )
    } else if (prescribed) {
      rows.push(
        <div key={`prescribed-${prescribed.id}`} className="px-3 py-2">
          <div className="flex items-center gap-3 text-sm tabular-nums opacity-55">
            <span className="w-6 text-muted-foreground font-bold">{prescribed.setNumber}</span>
            <span className="flex-1 text-muted-foreground">
              {prescribed.reps} reps{prescribed.weight ? ` @ ${prescribed.weight}` : ''}
              {showIntensity && formatIntensity(prescribed)
                ? ` · ${formatIntensity(prescribed)}`
                : ''}
            </span>
          </div>
          {priorSet && <BeatThisReference set={priorSet} showIntensity={showIntensity} />}
        </div>,
      )
    }

    if (restAfterSetNumber === setNumber && restTimer) {
      rows.push(<div key={`rest-after-${setNumber}`}>{restTimer}</div>)
    }
  }

  // Ad-hoc with zero logged sets: show nothing.
  if (isAdhoc && loggedSets.length === 0) return null

  return (
    <div className="space-y-1">
      {/* Sets header — hidden in ad-hoc mode (no prescription to anchor against) */}
      {!isAdhoc && (
        <span className="flex items-center gap-1.5 text-base font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">
          <ListChecks size={14} strokeWidth={3} aria-hidden="true" />
          Sets
        </span>
      )}

      <div className="border border-border bg-card divide-y divide-border/60">{rows}</div>
    </div>
  )
}
