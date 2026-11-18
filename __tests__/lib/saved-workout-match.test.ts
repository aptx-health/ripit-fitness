/**
 * The "matches" rule for "Nothing changed" (work 229, slice 4): contract in
 * __tests__/features/workout-library/tidy-update.support.ts.
 */
import { describe, expect, it } from 'vitest'
import type { SavedWorkoutData, SavedWorkoutSet } from '@/types/saved-workout'

// A variable path, so this file type-checks before the module exists.
const MODULE = '@/lib/saved-workouts/match'
const load = async () =>
  (await import(/* @vite-ignore */ MODULE)) as {
    sameExercisesAndSets: (a: SavedWorkoutData, b: SavedWorkoutData) => boolean
  }

const set = (setNumber: number, reps: string, o: Partial<SavedWorkoutSet> = {}): SavedWorkoutSet => ({
  setNumber,
  reps,
  rir: null,
  rpe: null,
  isWarmup: false,
  ...o,
})
const plan = (): SavedWorkoutData => [
  { name: 'Bench', exerciseDefinitionId: 'def-bench', order: 1, notes: 'Pause', exerciseGroup: null, sets: [set(1, '5', { isWarmup: true }), set(2, '8'), set(3, '8')] },
  { name: 'Fly', exerciseDefinitionId: 'def-fly', order: 2, notes: null, exerciseGroup: 'A', sets: [set(1, '12'), set(2, '12')] },
]
const edit = (fn: (d: SavedWorkoutData) => void) => {
  const d = structuredClone(plan())
  fn(d)
  return d
}

describe('sameExercisesAndSets', () => {
  it('is true for the same plan', async () => {
    const { sameExercisesAndSets } = await load()
    expect(sameExercisesAndSets(plan(), plan())).toBe(true)
  })

  it('ignores names, notes, groups, rir, rpe and the setNumber values', async () => {
    const { sameExercisesAndSets } = await load()
    const other = edit((d) => {
      d[0].name = 'Barbell bench'
      d[0].notes = null
      d[1].exerciseGroup = null
      d[0].sets[1].rpe = 9
      d[1].sets[0].rir = 2
      d[1].sets = d[1].sets.map((x, i) => ({ ...x, setNumber: i + 10 }))
    })
    expect(sameExercisesAndSets(plan(), other)).toBe(true)
  })

  it('compares reps as trimmed text', async () => {
    const { sameExercisesAndSets } = await load()
    expect(sameExercisesAndSets(plan(), edit((d) => { d[0].sets[1].reps = ' 8 ' }))).toBe(true)
    expect(sameExercisesAndSets(plan(), edit((d) => { d[0].sets[1].reps = '9' }))).toBe(false)
    expect(sameExercisesAndSets(plan(), edit((d) => { d[0].sets[1].reps = '8-10' }))).toBe(false)
  })

  it('is false when a set is added or removed', async () => {
    const { sameExercisesAndSets } = await load()
    expect(sameExercisesAndSets(plan(), edit((d) => { d[1].sets.push(set(3, '12')) }))).toBe(false)
    expect(sameExercisesAndSets(plan(), edit((d) => { d[0].sets.pop() }))).toBe(false)
  })

  it('is false when an exercise is added, removed or swapped for another', async () => {
    const { sameExercisesAndSets } = await load()
    const extra = { name: 'Dips', exerciseDefinitionId: 'def-dips', order: 3, notes: null, exerciseGroup: null, sets: [set(1, '10')] }
    expect(sameExercisesAndSets(plan(), edit((d) => { d.push(extra) }))).toBe(false)
    expect(sameExercisesAndSets(plan(), edit((d) => { d.pop() }))).toBe(false)
    expect(sameExercisesAndSets(plan(), edit((d) => { d[1].exerciseDefinitionId = 'def-dips' }))).toBe(false)
  })

  it('takes exercises by order and sets by setNumber, not by array position', async () => {
    const { sameExercisesAndSets } = await load()
    const shuffled = edit((d) => {
      d.reverse()
      d[1].sets.reverse()
    })
    expect(sameExercisesAndSets(plan(), shuffled)).toBe(true)
  })

  it('is false when a warmup set becomes a working set', async () => {
    const { sameExercisesAndSets } = await load()
    expect(sameExercisesAndSets(plan(), edit((d) => { d[0].sets[0].isWarmup = false }))).toBe(false)
  })
})
