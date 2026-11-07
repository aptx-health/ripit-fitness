import type { z } from 'zod'
import type { ProgramInput } from '@/lib/proposals/program'
import type { WorkoutCreateInput } from '@/lib/proposals/saved-workout'

/**
 * A coach's own program or saved workout is shaped by the app, not by the
 * proposal schema, so a send first tidies what the schema would refuse for no
 * good reason (work/152): rest days and exercises with no sets are left out,
 * numbered superset labels (A1, A2) become their letter, and a label left on
 * one exercise, repeated further down the day, or unreadable is dropped (the
 * exercise stays, as a straight set). RPE 0 means "no RPE". What is left over
 * the limits is refused with a reason that names where (reasonFor).
 */

type Grouped = { group?: string }

/** "A", "a2", "B 1" -> "A", "A", "B"; anything else (e.g. "Superset 1") -> undefined. */
function letterOf(label: string | undefined): string | undefined {
  const match = label?.trim().match(/^([A-Za-z]{1,3})\s*\d*$/)
  return match ? match[1].toUpperCase() : undefined
}

/** One workout's labels: each kept label is one run of two or more adjacent exercises. */
export function normaliseGroups<T extends Grouped>(exercises: T[]): T[] {
  const labels = exercises.map((e) => letterOf(e.group))
  const kept: Array<string | undefined> = []
  const used = new Set<string>()
  for (let start = 0; start < labels.length; ) {
    const label = labels[start]
    let end = start
    while (label && labels[end + 1] === label) end++
    const keep = label !== undefined && end > start && !used.has(label)
    if (keep) used.add(label)
    for (let i = start; i <= end; i++) kept.push(keep ? label : undefined)
    start = end + 1
  }
  return exercises.map((exercise, i) => {
    const { group: _group, ...rest } = exercise
    return (kept[i] ? { ...rest, group: kept[i] } : rest) as T
  })
}

const realRpe = <S extends { rpe?: number }>(set: S): S => {
  if (set.rpe !== 0) return set
  const { rpe: _rpe, ...rest } = set
  return rest as S
}

export function normaliseProgram(program: ProgramInput): ProgramInput {
  const weeks = program.weeks
    .map((week) => ({
      ...week,
      workouts: week.workouts
        .map((workout) => {
          const exercises = workout.exercises
            .filter((e) => e.prescribedSets.length > 0)
            .map((e) => ({ ...e, prescribedSets: e.prescribedSets.map(realRpe) }))
          return { ...workout, exercises: normaliseGroups(exercises) }
        })
        .filter((workout) => workout.exercises.length > 0),
    }))
    .filter((week) => week.workouts.length > 0)
  return { ...program, weeks }
}

export function normaliseWorkout(workout: WorkoutCreateInput): WorkoutCreateInput {
  const exercises = workout.exercises
    .filter((e) => e.sets.length > 0)
    .map((e) => ({ ...e, sets: e.sets.map(realRpe) }))
  return { ...workout, exercises: normaliseGroups(exercises) }
}

// --- Reasons ---------------------------------------------------------------------

const FIELD: Record<string, string> = { rpe: 'RPE', rir: 'RIR', group: 'superset label', description: 'description' }
const LIST: Record<string, string> = { weeks: 'weeks', workouts: 'days', exercises: 'exercises', prescribedSets: 'sets', sets: 'sets' }

type Issue = z.core.$ZodIssue

/** Walk the issue path through the input: where it is, and the value or list it names. */
function locate(path: readonly PropertyKey[], input: unknown, names: Map<string, string>) {
  const where: string[] = []
  let node: unknown = input
  let key: string | undefined
  for (let i = 0; i < path.length; i++) {
    const step = path[i]
    if (typeof step === 'number') {
      const item = (node as unknown[] | undefined)?.[step] as Record<string, unknown> | undefined
      if (key === 'weeks') where.push(`Week ${step + 1}`)
      else if (key === 'workouts') where.push(`Day ${step + 1}`)
      else if (key === 'exercises') where.push(names.get(String(item?.exerciseDefinitionId)) ?? `exercise ${step + 1}`)
      else if (key === 'prescribedSets' || key === 'sets') where.push(`set ${step + 1}`)
      node = item
    } else if (typeof step === 'string') {
      key = step
      node = (node as Record<string, unknown> | undefined)?.[step]
    }
  }
  return { where, key, node }
}

/**
 * The proposal schema's first complaint, in words the coach can act on, e.g.
 * "Week 1, Day 2, Squat, set 1: reps is too long (max 20)".
 */
export function reasonFor(issue: Issue, input: unknown, names: Map<string, string>, whole: 'program' | 'workout'): string {
  const { where, key, node } = locate(issue.path, input, names)
  const subject = where.length ? where.join(', ') : `The ${whole}`
  const field = key ? (FIELD[key] ?? key) : whole
  const list = key ? LIST[key] : undefined
  const limit = issue.code === 'too_big' ? Number(issue.maximum) : issue.code === 'too_small' ? Number(issue.minimum) : NaN

  let text: string
  if (list && Array.isArray(node) && (issue.code === 'too_big' || issue.code === 'too_small')) {
    text = node.length === 0 ? `has no ${list}` : `has ${node.length} ${list} (${issue.code === 'too_big' ? 'max' : 'min'} ${limit})`
    return `${subject} ${text}`
  }
  if (issue.code === 'too_big') text = issue.origin === 'string' ? `${field} is too long (max ${limit})` : `${field} must be at most ${limit}`
  else if (issue.code === 'too_small') text = issue.origin === 'string' ? `${field} is empty` : `${field} must be at least ${limit}`
  else text = issue.message
  return `${subject}: ${text}`
}
