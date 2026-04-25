'use client'

import { AlertCircle, Check, Circle, Trash2 } from 'lucide-react'
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
  onDeleteSet: (setNumber: number) => void
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

export default function SetList({
  prescribedSets,
  loggedSets,
  exerciseHistory,
  onDeleteSet,
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

  // Track which set was just logged for the flash animation
  const prevExerciseRef = useRef(exerciseId)
  const prevCountRef = useRef(loggedSets.length)
  const [flashSetNumber, setFlashSetNumber] = useState<number | null>(null)

  useEffect(() => {
    const count = loggedSets.length

    if (exerciseId !== prevExerciseRef.current) {
      prevExerciseRef.current = exerciseId
      prevCountRef.current = count
      const frame = requestAnimationFrame(() => setFlashSetNumber(null))
      return () => cancelAnimationFrame(frame)
    }

    if (count > prevCountRef.current) {
      const newest = loggedSets[count - 1]
      const frame = requestAnimationFrame(() => setFlashSetNumber(newest.setNumber))
      const flashOffTimer = setTimeout(() => setFlashSetNumber(null), 650)
      prevCountRef.current = count
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(flashOffTimer)
      }
    }
    prevCountRef.current = count
  }, [loggedSets, exerciseId])

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

      {/* Per-row view: logged + rest timer + prescribed */}
      {!showCollapsedSummary && (
        <div className="divide-y divide-border/30">
          {/* Logged sets */}
          {loggedSets.map((set) => {
            const isFailed = set._syncStatus === 'error'
            const isPending = set._syncStatus === 'pending'
            return (
              <div
                key={`logged-${set.exerciseId}-${set.setNumber}`}
                className={`px-2 py-2 ${flashSetNumber === set.setNumber ? 'doom-set-logged' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* State indicator */}
                    <span className="flex-shrink-0 mt-0.5">
                      {isFailed ? (
                        <AlertCircle size={16} className="text-warning" />
                      ) : (
                        <Check size={16} className="text-success" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Set {set.setNumber}
                      </span>
                      <span className={`block text-base font-bold ${isFailed ? 'text-warning' : 'text-foreground'}`}>
                        {formatWeight(set.weight, set.weightUnit)} × {set.reps}
                        {showIntensity && formatIntensity(set) ? ` · ${formatIntensity(set)}` : ''}
                      </span>
                      {isPending && <span className="text-xs text-muted-foreground">saving...</span>}
                    </div>
                  </div>
                  {/* Delete — subtle, only visible on hover/focus */}
                  <button
                    type="button"
                    onClick={() => onDeleteSet(set.setNumber)}
                    className="text-muted-foreground/30 hover:text-error p-1 transition-colors doom-focus-ring"
                    aria-label={`Delete set ${set.setNumber}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}

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
              className="px-2 py-2"
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">
                  <Circle size={16} className="text-muted-foreground/40" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                    Set {set.setNumber}
                  </span>
                  <span className="block text-sm text-muted-foreground/70">
                    {set.reps} reps @ {set.weight || '—'}
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
