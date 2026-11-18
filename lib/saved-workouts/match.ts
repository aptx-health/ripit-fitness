import type { SavedWorkoutData, SavedWorkoutSet } from '@/types/saved-workout'

const byOrder = (data: SavedWorkoutData) => [...data].sort((a, b) => a.order - b.order)
const bySetNumber = (sets: SavedWorkoutSet[]) => [...sets].sort((a, b) => a.setNumber - b.setNumber)

const sameSet = (a: SavedWorkoutSet, b: SavedWorkoutSet) =>
  String(a.reps).trim() === String(b.reps).trim() &&
  (a.rir ?? null) === (b.rir ?? null) &&
  (a.rpe ?? null) === (b.rpe ?? null) &&
  Boolean(a.isWarmup) === Boolean(b.isWarmup)

/**
 * The "matches" rule for the session summary (workout library slice 4): the
 * same exercises in order, the same number of sets, and each set the same reps
 * (trimmed), RIR, RPE and warmup flag. That is what Update would write; names,
 * notes, groups and setNumber values are ignored.
 */
export function sameExercisesAndSets(a: SavedWorkoutData, b: SavedWorkoutData): boolean {
  if (a.length !== b.length) return false
  const [left, right] = [byOrder(a), byOrder(b)]
  return left.every((ex, i) => {
    const other = right[i]
    if (ex.exerciseDefinitionId !== other.exerciseDefinitionId || ex.sets.length !== other.sets.length) return false
    const [sa, sb] = [bySetNumber(ex.sets), bySetNumber(other.sets)]
    return sa.every((set, j) => sameSet(set, sb[j]))
  })
}
