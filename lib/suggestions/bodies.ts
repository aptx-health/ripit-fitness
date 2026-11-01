import type { Proposal } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ANCHOR_PATTERN_DISPLAY_NAMES, type AnchorPattern } from '@/lib/exercises/anchor-patterns'
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume'
import { describeSavedExercises, type ExerciseLine } from '@/lib/format/savedWorkoutSets'
import { effectiveTargets, formatTarget } from '@/lib/insights/balance'
import type { ProgramInput } from '@/lib/proposals/program'
import type { WorkoutChanges, WorkoutCreateInput, WorkoutFields } from '@/lib/proposals/saved-workout'
import { normalizeTargetMovements } from '@/lib/user-training-profile'
import type { SavedWorkoutData } from '@/types/saved-workout'
import type { DiffRow, SuggestionBody } from './types'

/**
 * What the per-kind renderers show for a proposal, shared by the admin
 * proposal page and the user's suggestion review. Names are resolved from
 * exercise definitions and display names, never shown as keys or ids. A
 * pending proposal whose touched value has moved carries the live value as
 * `current`.
 */

export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export async function programDetail(payload: unknown, targetId: string | null, userId: string) {
  const program = payload as ProgramInput
  const ids = [
    ...new Set(program.weeks.flatMap((w) => w.workouts.flatMap((wo) => wo.exercises.map((e) => e.exerciseDefinitionId)))),
  ]
  const [definitions, created] = await Promise.all([
    prisma.exerciseDefinition.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    targetId
      ? prisma.program.findFirst({ where: { id: targetId, userId, deletedAt: null }, select: { id: true } })
      : null,
  ])
  return { program, definitionNames: Object.fromEntries(definitions.map((d) => [d.id, d.name])), created }
}

/**
 * One row per touched pattern or FAU. Anchor ids are shown as exercise names,
 * resolved in one query; a pending proposal whose key moved shows the live value.
 */
export async function balanceRows(
  kind: string,
  payload: unknown,
  beforeJson: unknown,
  pending: boolean,
  userId: string
): Promise<DiffRow[]> {
  const { changes } = payload as { changes: Record<string, unknown> }
  const before = (beforeJson ?? {}) as Record<string, unknown>

  if (kind === 'balance_targets.update') {
    const row = pending
      ? await prisma.userMuscleBalanceSettings.findUnique({ where: { userId }, select: { targets: true } })
      : null
    const live = pending ? (effectiveTargets(row?.targets) as Record<string, number>) : null
    return Object.entries(changes).map(([fau, after]) => ({
      field: FAU_DISPLAY_NAMES[fau] ?? fau,
      before: formatTarget(before[fau] as number),
      after: formatTarget(after as number),
      ...(live && live[fau] !== before[fau] && { current: formatTarget(live[fau]) }),
    }))
  }

  const profile = pending
    ? await prisma.userTrainingProfile.findUnique({ where: { userId }, select: { targetMovements: true } })
    : null
  const live = pending ? (normalizeTargetMovements(profile?.targetMovements) as Record<string, string[]>) : null
  const lists = Object.keys(changes).flatMap((p) => [changes[p], before[p], live?.[p]]) as Array<string[] | undefined>
  const ids = [...new Set(lists.flatMap((list) => list ?? []))]
  const definitions = await prisma.exerciseDefinition.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  const names = new Map(definitions.map((d) => [d.id, d.name]))
  const named = (list: unknown) => ((list as string[] | undefined) ?? []).map((id) => names.get(id) ?? id)
  return Object.entries(changes).map(([pattern, after]) => ({
    field: ANCHOR_PATTERN_DISPLAY_NAMES[pattern as AnchorPattern] ?? pattern,
    before: named(before[pattern]),
    after: named(after),
    ...(live && !same(live[pattern] ?? [], before[pattern]) && { current: named(live[pattern]) }),
  }))
}

type ExerciseInput = WorkoutCreateInput['exercises'][number]

/** Proposed exercises with names from their definitions (one query); a deleted one shows as missing. */
export async function namedExercises(exercises: ExerciseInput[]): Promise<ExerciseLine[]> {
  const ids = [...new Set(exercises.map((e) => e.exerciseDefinitionId))]
  const definitions = await prisma.exerciseDefinition.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  const names = new Map(definitions.map((d) => [d.id, d.name]))
  return exercises.map((e) => ({ name: names.get(e.exerciseDefinitionId) ?? 'Missing exercise', notes: e.notes, sets: e.sets }))
}

const storedLines = (data: SavedWorkoutData | undefined) => describeSavedExercises(Array.isArray(data) ? data : [])

/**
 * One row per touched field (Name, Notes, Exercises), exercises as one line
 * each. A pending proposal whose field moved shows the live value.
 */
export async function savedWorkoutRows(
  payload: unknown,
  beforeJson: unknown,
  pending: boolean,
  targetId: string | null,
  userId: string
): Promise<DiffRow[]> {
  const { changes } = payload as { changes: WorkoutChanges }
  const before = (beforeJson ?? {}) as WorkoutFields
  const live =
    pending && targetId
      ? await prisma.savedWorkout.findFirst({ where: { id: targetId, userId }, select: { name: true, notes: true, workoutData: true } })
      : null
  const rows: DiffRow[] = []
  if (changes.name !== undefined) {
    rows.push({ field: 'Name', before: before.name, after: changes.name, ...(live && live.name !== before.name && { current: live.name }) })
  }
  if (changes.notes !== undefined) {
    rows.push({
      field: 'Notes',
      before: before.notes,
      after: changes.notes,
      ...(live && (live.notes ?? null) !== (before.notes ?? null) && { current: live.notes }),
    })
  }
  if (changes.exercises !== undefined) {
    const liveText = live ? storedLines(live.workoutData as unknown as SavedWorkoutData) : null
    const beforeText = storedLines(before.exercises)
    rows.push({
      field: 'Exercises',
      before: beforeText,
      after: describeSavedExercises(await namedExercises(changes.exercises)),
      ...(liveText !== null && liveText !== beforeText && { current: liveText }),
    })
  }
  return rows
}

type BodySource = Pick<Proposal, 'kind' | 'payload' | 'before' | 'status' | 'targetId'>

/** The body for one of the suggestion kinds; null for a kind with no shared renderer. */
export async function suggestionBody(proposal: BodySource, userId: string): Promise<SuggestionBody | null> {
  const pending = proposal.status === 'pending'
  switch (proposal.kind) {
    case 'saved_workout.create': {
      const workout = proposal.payload as unknown as WorkoutCreateInput
      return {
        type: 'saved_workout_create',
        name: workout.name,
        notes: workout.notes ?? null,
        exercises: await namedExercises(workout.exercises),
      }
    }
    case 'saved_workout.update':
      return {
        type: 'saved_workout_update',
        rows: await savedWorkoutRows(proposal.payload, proposal.before, pending, proposal.targetId, userId),
      }
    case 'program.create': {
      const { program, definitionNames } = await programDetail(proposal.payload, proposal.targetId, userId)
      return { type: 'program', program, definitionNames }
    }
    case 'anchors.update':
    case 'balance_targets.update':
      return { type: 'diff', rows: await balanceRows(proposal.kind, proposal.payload, proposal.before, pending, userId) }
    default:
      return null
  }
}
