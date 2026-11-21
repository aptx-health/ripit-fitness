import type { SavedWorkoutData, SavedWorkoutSet } from '@/types/saved-workout'

const byOrder = (data: SavedWorkoutData) => [...data].sort((a, b) => a.order - b.order)
const bySetNumber = (sets: SavedWorkoutSet[]) => [...sets].sort((a, b) => a.setNumber - b.setNumber)

/**
 * The "matches" rule for the session summary (workout library slice 4):
 * structure only. The same exercises in order, the same number of sets, and
 * each set the same warmup flag. Reps, RIR, RPE, names, notes, groups and
 * setNumber values are ignored. Update still writes the session's reps, RIR
 * and RPE, so a matching session can differ from the saved workout there.
 */
export function sameExercisesAndSets(a: SavedWorkoutData, b: SavedWorkoutData): boolean {
  if (a.length !== b.length) return false
  const [left, right] = [byOrder(a), byOrder(b)]
  return left.every((ex, i) => {
    const other = right[i]
    if (ex.exerciseDefinitionId !== other.exerciseDefinitionId || ex.sets.length !== other.sets.length) return false
    const [sa, sb] = [bySetNumber(ex.sets), bySetNumber(other.sets)]
    return sa.every((set, j) => Boolean(set.isWarmup) === Boolean(sb[j].isWarmup))
  })
}
