/**
 * Shape of the JSON snapshot stored in `SavedWorkout.workoutData`.
 *
 * A saved workout captures the *template* of a completed freestyle
 * session: which exercises were done, in what order, and what set
 * structure (reps / RIR / RPE / warmup flag). Weight, timestamps, and
 * the source completion id are intentionally dropped — those are
 * per-session and shouldn't bias the next attempt.
 */
export interface SavedWorkoutSet {
  setNumber: number
  /**
   * Stored as a string to mirror `PrescribedSet.reps`, which supports
   * range/cluster notations like "3-5" even though LoggedSet.reps is
   * a single integer.
   */
  reps: string
  rir: number | null
  rpe: number | null
  isWarmup: boolean
}

export interface SavedWorkoutExercise {
  name: string
  exerciseDefinitionId: string
  order: number
  notes: string | null
  exerciseGroup: string | null
  sets: SavedWorkoutSet[]
}

export type SavedWorkoutData = SavedWorkoutExercise[]
