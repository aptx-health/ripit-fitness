'use client'

import type { LoggedSet } from '@/hooks/useWorkoutStorage'

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

export default function SetList({
  prescribedSets,
  loggedSets,
  exerciseHistory,
  onDeleteSet,
}: SetListProps) {
  return (
    <>
      {/* Last Performance (if available) */}
      {exerciseHistory && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">
            Last Time ({new Date(exerciseHistory.completedAt).toLocaleDateString()})
          </h4>
          <div className="bg-primary-muted  p-3 space-y-1 border border-primary-muted-dark">
            {exerciseHistory.sets.map((set) => (
              <div key={set.setNumber} className="text-sm text-primary">
                Set {set.setNumber}: {set.reps} reps @ {set.weight}{set.weightUnit}
                {set.rir !== null && ` • RIR ${set.rir}`}
                {set.rpe !== null && ` • RPE ${set.rpe}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescribed Sets Reference */}
      <div>
        <h4 className="text-base sm:text-lg font-bold text-foreground mb-2 uppercase tracking-wider">Target</h4>
        <div className="bg-muted p-3 sm:p-4 space-y-2 border-2 border-border">
          {prescribedSets.map((set) => (
            <div key={set.id} className="text-base sm:text-lg text-foreground">
              Set {set.setNumber}: {set.reps} reps @ {set.weight || '—'}
              {set.rir !== null && ` • RIR ${set.rir}`}
              {set.rpe !== null && ` • RPE ${set.rpe}`}
            </div>
          ))}
        </div>
      </div>

      {/* Logged Sets */}
      {loggedSets.length > 0 && (
        <div className="mt-4">
          <h4 className="text-base sm:text-lg font-bold text-foreground mb-2 uppercase tracking-wider">Logged Sets</h4>
          <div className="space-y-2">
            {loggedSets.map((set) => (
              <div
                key={`${set.exerciseId}-${set.setNumber}`}
                className="bg-success-muted border-2 border-success-border p-3 sm:p-4 flex items-center justify-between"
              >
                <div className="text-base sm:text-lg">
                  <span className="font-bold text-foreground">Set {set.setNumber}:</span>{' '}
                  <span className="text-success-text font-medium">
                    {set.reps} reps @ {set.weight}
                    {set.weightUnit}
                    {set.rir !== null && ` • RIR ${set.rir}`}
                    {set.rpe !== null && ` • RPE ${set.rpe}`}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteSet(set.setNumber)}
                  className="text-error hover:text-error-hover p-1 ml-2 doom-focus-ring"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
