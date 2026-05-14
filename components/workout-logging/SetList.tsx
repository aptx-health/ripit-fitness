'use client'

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
  /**
   * @deprecated Logged-set deletion now lives on `<LoggedSetList>`. Kept for
   * backwards compatibility with callers that still wire it through; this
   * component no longer renders the delete affordance.
   */
  onDeleteSet?: (setNumber: number) => void
  exerciseId?: string
  showIntensity?: boolean
}

function formatIntensity(set: { rpe: number | null; rir: number | null }) {
  if (set.rir !== null) return `RIR ${set.rir}`
  if (set.rpe !== null) return `RPE ${set.rpe}`
  return null
}

function formatWeight(weight: number, weightUnit: string): string {
  if (weight === 0) return 'Bodyweight'
  return `${weight} ${weightUnit}`
}

/**
 * Check if all prescribed sets are uniform (same reps and intensity).
 */
function isUniformPrescription(sets: PrescribedSet[]): boolean {
  if (sets.length <= 1) return true
  const first = sets[0]
  return sets.every(s =>
    s.reps === first.reps &&
    s.rpe === first.rpe &&
    s.rir === first.rir
  )
}

/**
 * Prescribed-set rendering for the LOG SETS tab. Logged sets now render in a
 * dedicated `<LoggedSetList>` above the input area (#727). This component
 * keeps the prescribed-set view + rest timer + history strip in their
 * existing slot below the input.
 */
export default function SetList({
  prescribedSets,
  loggedSets,
  exerciseHistory,
  exerciseId,
  showIntensity = true,
}: SetListProps) {
  const loggedSetNumbers = new Set(loggedSets.map(s => s.setNumber))
  const remainingSets = prescribedSets.filter(s => !loggedSetNumbers.has(s.setNumber))

  // Rest timer dismiss state — resets when a new set is logged
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

  // Collapsed summary: show when no sets logged and prescription is uniform
  const showCollapsedSummary = loggedSets.length === 0 && isUniformPrescription(prescribedSets) && prescribedSets.length > 1
  const firstPrescribed = prescribedSets[0]

  return (
    <div className="space-y-1">
      {/* Last Performance — compact inline */}
      {exerciseHistory && (
        <div className="text-xs text-muted-foreground px-1 pb-1">
          Last ({new Date(exerciseHistory.completedAt).toLocaleDateString()}):
          {' '}
          {exerciseHistory.sets.map((set, i) => (
            <span key={set.setNumber}>
              {i > 0 && ' · '}
              {formatWeight(set.weight, set.weightUnit)} × {set.reps}
              {showIntensity && formatIntensity(set) ? ` ${formatIntensity(set)}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Sets header */}
      <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-0.5">
        Sets
      </span>

      {/* Collapsed prescription summary */}
      {showCollapsedSummary && firstPrescribed && (
        <div className="px-2 py-2 text-base text-muted-foreground">
          Prescribed: {prescribedSets.length} × {firstPrescribed.reps} reps
          {showIntensity && formatIntensity(firstPrescribed) ? ` @ ${formatIntensity(firstPrescribed)}` : ''}
        </div>
      )}

      {/* Rest timer + prescribed rows */}
      {!showCollapsedSummary && (
        <div>
          {/* Rest timer card — between logged and prescribed */}
          {loggedSets.length > 0 && remainingSets.length > 0 && (
            <RestStopwatch
              loggedSetCount={loggedSets.length}
              exerciseId={exerciseId || ''}
              dismissed={restDismissed}
              onDismiss={() => setRestDismissed(true)}
            />
          )}

          {/* Prescribed sets */}
          {remainingSets.map((set) => (
            <div
              key={`prescribed-${set.id}`}
              className="px-2.5 py-3 opacity-55"
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5 w-[22px] h-[22px] flex items-center justify-center text-xs font-bold text-muted-foreground" style={{ backgroundColor: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.30)' }}>
                  {set.setNumber}
                </span>
                <div>
                  <span className="block text-[13px] text-muted-foreground">
                    {set.reps} reps{set.weight ? ` @ ${set.weight}` : ''}
                    {showIntensity && formatIntensity(set) ? ` · ${formatIntensity(set)}` : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Rest timer when all sets logged (no more prescribed) */}
          {loggedSets.length > 0 && remainingSets.length === 0 && (
            <RestStopwatch
              loggedSetCount={loggedSets.length}
              exerciseId={exerciseId || ''}
              dismissed={restDismissed}
              onDismiss={() => setRestDismissed(true)}
            />
          )}
        </div>
      )}
    </div>
  )
}
