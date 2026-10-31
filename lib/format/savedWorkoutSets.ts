import type { SavedWorkoutSet } from '@/types/saved-workout'

type SetLike = Pick<SavedWorkoutSet, 'reps'> & Partial<Pick<SavedWorkoutSet, 'rir' | 'rpe' | 'isWarmup'>>

function describeRun(set: SetLike, count: number): string {
  let text = `${count} × ${set.reps}`
  if (set.isWarmup) text += ' warm-up'
  if (set.rir !== null && set.rir !== undefined) text += `, RIR ${set.rir}`
  if (set.rpe !== null && set.rpe !== undefined) text += `, RPE ${set.rpe}`
  return text
}

const sameSet = (a: SetLike, b: SetLike) =>
  a.reps === b.reps && (a.rir ?? null) === (b.rir ?? null) && (a.rpe ?? null) === (b.rpe ?? null) && !!a.isWarmup === !!b.isWarmup

/**
 * A saved workout exercise's sets as one line: runs of identical sets are
 * grouped, e.g. `1 × 5 warm-up; 3 × 8, RIR 2`. Used by the saved-workout
 * dialog and the admin proposal page.
 */
export function describeSavedSets(sets: SetLike[]): string {
  const runs: Array<{ set: SetLike; count: number }> = []
  for (const set of sets) {
    const last = runs.at(-1)
    if (last && sameSet(last.set, set)) last.count++
    else runs.push({ set, count: 1 })
  }
  return runs.map((r) => describeRun(r.set, r.count)).join('; ')
}

export interface ExerciseLine {
  name: string
  notes?: string | null
  sets: SetLike[]
}

/** One numbered line per exercise (`1. Bench Press: 3 × 8, RIR 2`), with its notes indented below. */
export function describeSavedExercises(exercises: ExerciseLine[]): string {
  return exercises
    .map((e, i) => {
      const line = `${i + 1}. ${e.name}: ${describeSavedSets(e.sets)}`
      return e.notes ? `${line}\n   ${e.notes}` : line
    })
    .join('\n')
}
