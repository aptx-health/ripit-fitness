/**
 * Coaching slice 2 (work 148): the pure converters in lib/coaching/send.ts that
 * turn a coach's own Program or SavedWorkout into proposal input. Spec:
 * features/coaching/send.feature; design: initiatives/coaching/docs/136-discovery.md.
 *
 *   programToInput(program) -> ProgramInput (lib/proposals/program.ts)
 *     program: { name, description, weeks: [{ weekNumber, name, workouts: [{ dayNumber,
 *       name, exercises: [{ order, exerciseDefinitionId, notes, exerciseGroup,
 *       prescribedSets: [{ setNumber, reps, weight, rpe, rir, isWarmup }] }] }] }] }
 *     (the Prisma rows; any order: the converter sorts by weekNumber, dayNumber,
 *     order and setNumber). Nulls become absent keys; exerciseGroup becomes `group`.
 *   savedWorkoutToInput(saved) -> WorkoutCreateInput (lib/proposals/saved-workout.ts)
 *     saved: { name, notes, workoutData } with workoutData as stored (SavedWorkoutData).
 * The output must parse unchanged with the proposal schemas.
 */

import { describe, expect, it } from 'vitest'
import { programInput } from '@/lib/proposals/program'
import { workoutCreateInput } from '@/lib/proposals/saved-workout'

type Json = Record<string, unknown>
const load = async () =>
  (await import(/* @vite-ignore */ '@/lib/coaching/send')) as {
    programToInput: (p: unknown) => Json
    savedWorkoutToInput: (s: unknown) => Json
  }

const set = (setNumber: number, over: Json = {}) => ({
  setNumber,
  reps: '8',
  weight: null,
  rpe: null,
  rir: null,
  isWarmup: false,
  ...over,
})
const exercise = (order: number, id: string, over: Json = {}) => ({
  order,
  exerciseDefinitionId: id,
  name: `ignored ${id}`,
  notes: null,
  exerciseGroup: null,
  prescribedSets: [set(1)],
  ...over,
})

// Stored out of order on purpose: week 2 first, day 2 first, exercise 4 first, set 2 first.
const PROGRAM = {
  id: 'prog-1',
  userId: 'dustin',
  name: 'Machine Starter',
  description: null,
  weeks: [
    {
      weekNumber: 2,
      name: null,
      workouts: [{ dayNumber: 1, name: 'W2 Full', exercises: [exercise(1, 'press', { prescribedSets: [set(1, { reps: '5' })] })] }],
    },
    {
      weekNumber: 1,
      name: 'Intro',
      workouts: [
        { dayNumber: 2, name: 'Lower', exercises: [exercise(1, 'squat', { notes: 'Slow down', prescribedSets: [set(1, { rir: 2 })] })] },
        {
          dayNumber: 1,
          name: 'Upper',
          exercises: [
            exercise(4, 'curl', { prescribedSets: [set(1, { reps: '12' })] }),
            exercise(1, 'bench', {
              prescribedSets: [
                set(2, { reps: '5', weight: '135lbs', rpe: 8 }),
                set(1, { reps: '10', weight: '45lbs', isWarmup: true }),
              ],
            }),
            exercise(2, 'row', { exerciseGroup: 'A', prescribedSets: [set(1, { reps: '10', rir: 1 })] }),
            exercise(3, 'fly', { exerciseGroup: 'A' }),
          ],
        },
      ],
    },
  ],
}

describe('programToInput', () => {
  it('keeps weeks, days, exercise order and sets in position order', async () => {
    const out = (await load()).programToInput(PROGRAM) as {
      weeks: Array<{ workouts: Array<{ name: string; exercises: Array<{ exerciseDefinitionId: string; prescribedSets: Json[] }> }> }>
    }
    expect(out.weeks.map((w) => w.workouts.map((d) => d.name))).toEqual([['Upper', 'Lower'], ['W2 Full']])
    expect(out.weeks[0].workouts[0].exercises.map((e) => e.exerciseDefinitionId)).toEqual(['bench', 'row', 'fly', 'curl'])
    expect(out.weeks[0].workouts[0].exercises[0].prescribedSets.map((s) => s.reps)).toEqual(['10', '5'])
  })

  it('keeps weight, RPE, RIR, warm-ups, notes, week names and supersets; drops nulls', async () => {
    const out = (await load()).programToInput(PROGRAM) as Json & {
      weeks: Array<Json & { workouts: Array<{ exercises: Array<Json & { prescribedSets: Json[] }> }> }>
    }
    expect(out.name).toBe('Machine Starter')
    expect(out).not.toHaveProperty('description')
    expect(out.weeks[0].name).toBe('Intro')
    expect(out.weeks[1]).not.toHaveProperty('name')
    const [bench, row, fly, curl] = out.weeks[0].workouts[0].exercises
    expect(bench.prescribedSets[0]).toMatchObject({ reps: '10', weight: '45lbs', isWarmup: true })
    expect(bench.prescribedSets[1]).toMatchObject({ reps: '5', weight: '135lbs', rpe: 8 })
    expect(bench.prescribedSets[1].isWarmup ?? false).toBe(false)
    expect(bench.prescribedSets[1]).not.toHaveProperty('rir')
    expect(row).toMatchObject({ group: 'A' })
    expect(fly).toMatchObject({ group: 'A' })
    expect(row.prescribedSets[0]).toMatchObject({ rir: 1 })
    expect(curl).not.toHaveProperty('group')
    expect(curl).not.toHaveProperty('notes')
    expect(out.weeks[0].workouts[1].exercises[0]).toMatchObject({ notes: 'Slow down' })
    for (const e of out.weeks[0].workouts[0].exercises) {
      expect(e).not.toHaveProperty('name')
      expect(e).not.toHaveProperty('order')
    }
  })

  it('is valid program proposal input, unchanged by the schema', async () => {
    const out = (await load()).programToInput({ ...PROGRAM, description: 'Three days a week' })
    expect(programInput.parse(out)).toEqual(out)
    expect(out.description).toBe('Three days a week')
  })
})

const SAVED = {
  id: 'sw-1',
  name: 'Push Day',
  notes: 'Rest 2 min',
  workoutData: [
    {
      name: 'Cable Fly',
      exerciseDefinitionId: 'fly',
      order: 3,
      notes: null,
      exerciseGroup: 'B',
      sets: [{ setNumber: 1, reps: '15', rir: null, rpe: null, isWarmup: false }],
    },
    {
      name: 'Bench',
      exerciseDefinitionId: 'bench',
      order: 1,
      notes: 'Pause on chest',
      exerciseGroup: null,
      sets: [
        { setNumber: 2, reps: '5', rir: 2, rpe: null, isWarmup: false },
        { setNumber: 1, reps: '10', rir: null, rpe: null, isWarmup: true },
      ],
    },
    {
      name: 'Dips',
      exerciseDefinitionId: 'dips',
      order: 2,
      notes: null,
      exerciseGroup: 'B',
      sets: [{ setNumber: 1, reps: '8-10', rir: null, rpe: 9, isWarmup: false }],
    },
  ],
}

describe('savedWorkoutToInput', () => {
  it('keeps exercises in order with their sets, notes and supersets', async () => {
    const out = (await load()).savedWorkoutToInput(SAVED) as Json & {
      exercises: Array<Json & { sets: Json[] }>
    }
    expect(out).toMatchObject({ name: 'Push Day', notes: 'Rest 2 min' })
    expect(out.exercises.map((e) => e.exerciseDefinitionId)).toEqual(['bench', 'dips', 'fly'])
    const [bench, dips, fly] = out.exercises
    expect(bench).toMatchObject({ notes: 'Pause on chest' })
    expect(bench).not.toHaveProperty('group')
    expect(bench.sets).toEqual([
      expect.objectContaining({ reps: '10', isWarmup: true }),
      expect.objectContaining({ reps: '5', rir: 2 }),
    ])
    expect(dips).toMatchObject({ group: 'B' })
    expect(dips.sets[0]).toMatchObject({ reps: '8-10', rpe: 9 })
    expect(fly).toMatchObject({ group: 'B' })
    for (const e of out.exercises) {
      expect(e).not.toHaveProperty('name')
      for (const s of e.sets) expect(s).not.toHaveProperty('weight')
    }
  })

  it('is valid saved-workout proposal input; no notes means no notes key', async () => {
    const { savedWorkoutToInput } = await load()
    const out = savedWorkoutToInput(SAVED)
    expect(workoutCreateInput.parse(out)).toEqual(out)
    expect(savedWorkoutToInput({ ...SAVED, notes: null })).not.toHaveProperty('notes')
  })
})
