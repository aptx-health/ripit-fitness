'use client'

import { AlertCircle, Trash2 } from 'lucide-react'
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
}: SetListProps) {
  const loggedSetNumbers = new Set(loggedSets.map(s => s.setNumber))
  const remainingSets = prescribedSets.filter(s => !loggedSetNumbers.has(s.setNumber))

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

      {/* Logged sets — compact inline rows */}
      {loggedSets.map((set) => {
        const isFailed = set._syncStatus === 'error'
        const isPending = set._syncStatus === 'pending'
        return (
          <div
            key={`${set.exerciseId}-${set.setNumber}`}
            className={`flex items-center justify-between px-2 py-1.5 text-sm ${
              isFailed
                ? 'text-warning'
                : 'text-success-text opacity-70'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {isFailed && <AlertCircle size={14} className="flex-shrink-0" />}
              <span className="font-semibold">{set.setNumber}.</span>
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

      {/* Remaining prescribed sets — muted, compact */}
      {remainingSets.map((set) => (
        <div
          key={set.id}
          className="flex items-center px-2 py-1.5 text-sm text-muted-foreground"
        >
          <span className="font-semibold">{set.setNumber}.</span>
          <span className="ml-1.5">
            {set.reps} reps @ {set.weight || '—'}
            {formatIntensity(set) ? ` · ${formatIntensity(set)}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
