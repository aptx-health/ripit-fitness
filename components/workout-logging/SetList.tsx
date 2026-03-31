'use client'

import { AlertCircle, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { LoggedSet } from '@/types/workout'

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
}

function formatIntensity(set: { rpe: number | null; rir: number | null }) {
  if (set.rir !== null) return `RIR ${set.rir}`
  if (set.rpe !== null) return `RPE ${set.rpe}`
  return null
}

export default function SetList({
  prescribedSets,
  loggedSets,
  exerciseHistory,
  onDeleteSet,
  exerciseId,
}: SetListProps) {
  const loggedSetNumbers = new Set(loggedSets.map(s => s.setNumber))
  const remainingSets = prescribedSets.filter(s => !loggedSetNumbers.has(s.setNumber))

  // Track which set was just logged for the power-up flash animation
  const prevExerciseRef = useRef(exerciseId)
  const prevCountRef = useRef(loggedSets.length)
  const [flashSetNumber, setFlashSetNumber] = useState<number | null>(null)

  useEffect(() => {
    const count = loggedSets.length

    // Exercise changed — reset tracking, no animation
    if (exerciseId !== prevExerciseRef.current) {
      prevExerciseRef.current = exerciseId
      prevCountRef.current = count
      setFlashSetNumber(null)
      return
    }

    if (count > prevCountRef.current) {
      const newest = loggedSets[count - 1]
      setFlashSetNumber(newest.setNumber)
      const timer = setTimeout(() => setFlashSetNumber(null), 650)
      prevCountRef.current = count
      return () => clearTimeout(timer)
    }
    prevCountRef.current = count
  }, [loggedSets.length, exerciseId])

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
              {set.reps}×{set.weight}{set.weightUnit}
              {formatIntensity(set) ? ` ${formatIntensity(set)}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Logged sets */}
      {loggedSets.length > 0 && (
        <div>
          <span className="block text-xs font-bold text-success-text/60 uppercase tracking-wider px-1 mb-0.5">
            LOGGED
          </span>
          {loggedSets.map((set) => {
            const isFailed = set._syncStatus === 'error'
            const isPending = set._syncStatus === 'pending'
            return (
              <div
                key={`${set.exerciseId}-${set.setNumber}`}
                className={`flex items-center justify-between px-2 py-1.5 text-base ${
                  isFailed
                    ? 'text-warning'
                    : 'text-success-text opacity-70'
                } ${flashSetNumber === set.setNumber ? 'doom-set-logged' : ''}`}
              >
                <span className="flex items-center gap-1.5">
                  {isFailed && <AlertCircle size={14} className="flex-shrink-0" />}
                  <span className="font-bold">{set.setNumber}.</span>
                  {set.reps}×{set.weight}{set.weightUnit}
                  {formatIntensity(set) ? ` · ${formatIntensity(set)}` : ''}
                  {isPending && <span className="text-xs text-muted-foreground">saving...</span>}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteSet(set.setNumber)}
                  className="text-error/50 hover:text-error p-0.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Remaining prescribed sets */}
      {remainingSets.length > 0 && (
        <div className="mt-1">
          <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-0.5">
            PRESCRIBED
          </span>
          <div className="border border-border/50 divide-y divide-border/30">
            {remainingSets.map((set) => (
              <div
                key={set.id}
                className="flex items-center px-2 py-1.5 text-base text-muted-foreground/70"
              >
                <span className="font-bold w-6">{set.setNumber}.</span>
                <span>
                  {set.reps} reps @ {set.weight || '—'}
                  {formatIntensity(set) ? ` · ${formatIntensity(set)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
