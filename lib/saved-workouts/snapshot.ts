import type { SavedWorkoutData, SavedWorkoutExercise } from '@/types/saved-workout'

/** The completion fields a snapshot is built from (exercises by order, sets by setNumber). */
export const SNAPSHOT_INCLUDE = {
  exercises: {
    orderBy: { order: 'asc' },
    include: { loggedSets: { orderBy: { setNumber: 'asc' } } },
  },
} as const

type SnapshotSource = {
  exercises: Array<{
    name: string
    exerciseDefinitionId: string
    order: number
    notes: string | null
    exerciseGroup: string | null
    loggedSets: Array<{ setNumber: number; reps: number; rir: number | null; rpe: number | null; isWarmup: boolean | null }>
  }>
}

/**
 * The saved-workout snapshot of a completed session: exercise structure (name,
 * def id, set count, reps, RIR/RPE, warmup flag), without weight or timestamps.
 * Save (POST /api/workouts/saved) and Update both write this.
 */
export function snapshotFromCompletion(completion: SnapshotSource): SavedWorkoutData {
  return completion.exercises.map(
    (ex): SavedWorkoutExercise => ({
      name: ex.name,
      exerciseDefinitionId: ex.exerciseDefinitionId,
      order: ex.order,
      notes: ex.notes ?? null,
      exerciseGroup: ex.exerciseGroup ?? null,
      sets: ex.loggedSets.map((s) => ({
        setNumber: s.setNumber,
        reps: String(s.reps),
        rir: s.rir ?? null,
        rpe: s.rpe ?? null,
        isWarmup: Boolean(s.isWarmup),
      })),
    })
  )
}
