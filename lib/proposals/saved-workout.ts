import type { Prisma, PrismaClient, SavedWorkout } from '@prisma/client'
import { z } from 'zod'
import { pluralize } from '@/lib/format/pluralize'
import type { SavedWorkoutData } from '@/types/saved-workout'
import { visibleTo } from './exercise-definition'
import { prescribedSet } from './program'

/**
 * `saved_workout.create` and `saved_workout.update` proposals: an agent
 * composes a saved workout (a standalone template Dustin starts from "My saved
 * workouts"). Order and set numbers come from array position, starting at 1.
 * Nothing here writes a WorkoutCompletion. Conflicts compare the touched
 * fields' values, never `updatedAt`, so an edit to an untouched field doesn't
 * block approval.
 */

type Db = PrismaClient | Prisma.TransactionClient

// No weight: load guidance goes in the exercise notes. RPE stays an integer, as
// starting a saved workout copies it into PrescribedSet.rpe (Int).
const workoutSet = prescribedSet.omit({ weight: true })

const workoutExercise = z
  .object({
    exerciseDefinitionId: z.string().min(1),
    notes: z.string().trim().max(500).optional(),
    sets: z.array(workoutSet).min(1).max(10),
  })
  .strict()

export const workoutExercises = z.array(workoutExercise).min(1).max(15)
export const workoutName = z.string().trim().min(1).max(100)
export const workoutNotes = z.string().trim().max(1000)

const nonEmpty = (o: object) => Object.keys(o).length > 0
export const WORKOUT_CHANGES_REQUIRED = 'give at least one of name, notes and exercises'

export const workoutCreateInput = z.object({ name: workoutName, notes: workoutNotes.optional(), exercises: workoutExercises }).strict()

export const workoutChanges = z
  .object({ name: workoutName.optional(), notes: workoutNotes.nullable().optional(), exercises: workoutExercises.optional() })
  .strict()
  .refine(nonEmpty, WORKOUT_CHANGES_REQUIRED)

export type WorkoutCreateInput = z.infer<typeof workoutCreateInput>
export type WorkoutChanges = z.infer<typeof workoutChanges>
type ExerciseInput = z.infer<typeof workoutExercise>

/** Touched fields in the stored shape: `exercises` is `workoutData`. Used for `before` and `inverse`. */
export interface WorkoutFields {
  name?: string
  notes?: string | null
  exercises?: SavedWorkoutData
}

const FIELD_ORDER = ['name', 'notes', 'exercises'] as const
type FieldKey = (typeof FIELD_ORDER)[number]

export type WorkoutCheck<T> =
  | { ok: true; value: T; definitionNames: Map<string, string> }
  | { ok: false; code: 'invalid'; error: string; field: string }

/** Thrown inside the approve or revert transaction; the message is the refusal shown to Dustin. */
export class SavedWorkoutConflict extends Error {}

/** The full argument path of a validation issue: `exercises[2].sets[0].rir`. */
export function fieldPath(path: readonly PropertyKey[]): string | undefined {
  let out = ''
  for (const key of path) {
    if (typeof key === 'number') out += `[${key}]`
    else if (typeof key === 'string') out += out ? `.${key}` : key
  }
  return out || undefined
}

function parseFailure(error: z.ZodError, fallback: string) {
  const issue = error.issues[0]
  return { ok: false as const, code: 'invalid' as const, error: issue.message, field: fieldPath(issue.path) ?? fallback }
}

/** Every id visible to the user; the first missing one is named by its position. */
async function checkExercises(db: Db, exercises: ExerciseInput[], userId: string) {
  const ids = [...new Set(exercises.map((e) => e.exerciseDefinitionId))]
  const found = await db.exerciseDefinition.findMany({
    where: { id: { in: ids }, ...visibleTo(userId) },
    select: { id: true, name: true },
  })
  const definitionNames = new Map(found.map((d) => [d.id, d.name]))
  const index = exercises.findIndex((e) => !definitionNames.has(e.exerciseDefinitionId))
  if (index === -1) return { ok: true as const, definitionNames }
  return {
    ok: false as const,
    code: 'invalid' as const,
    error: `exercise not found: ${exercises[index].exerciseDefinitionId}`,
    field: `exercises[${index}].exerciseDefinitionId`,
  }
}

export async function checkWorkoutCreate(db: Db, input: unknown, userId: string): Promise<WorkoutCheck<WorkoutCreateInput>> {
  const parsed = workoutCreateInput.safeParse(input)
  if (!parsed.success) return parseFailure(parsed.error, 'workout')
  const check = await checkExercises(db, parsed.data.exercises, userId)
  if (!check.ok) return check
  return { ok: true, value: parsed.data, definitionNames: check.definitionNames }
}

export async function checkWorkoutChanges(db: Db, input: unknown, userId: string): Promise<WorkoutCheck<WorkoutChanges>> {
  const parsed = workoutChanges.safeParse(input)
  if (!parsed.success) return parseFailure(parsed.error, 'changes')
  const check = parsed.data.exercises ? await checkExercises(db, parsed.data.exercises, userId) : null
  if (check && !check.ok) return check
  return { ok: true, value: parsed.data, definitionNames: check?.definitionNames ?? new Map() }
}

/** The stored shape; each exercise's name is the definition's name now. */
export function buildWorkoutData(exercises: ExerciseInput[], definitionNames: Map<string, string>): SavedWorkoutData {
  return exercises.map((e, i) => ({
    name: definitionNames.get(e.exerciseDefinitionId) ?? '',
    exerciseDefinitionId: e.exerciseDefinitionId,
    order: i + 1,
    notes: e.notes ? e.notes : null,
    exerciseGroup: null,
    sets: e.sets.map((s, j) => ({
      setNumber: j + 1,
      reps: s.reps,
      rir: s.rir ?? null,
      rpe: s.rpe ?? null,
      isWarmup: s.isWarmup ?? false,
    })),
  }))
}

export function createSummary(input: WorkoutCreateInput): string {
  return `New saved workout: ${input.name} (${pluralize(input.exercises.length, 'exercise')})`
}

export function updateSummary(currentName: string, changes: WorkoutChanges): string {
  return `Update saved workout ${currentName}: ${touched(changes).join(', ')}`
}

const touched = (changes: object): FieldKey[] => FIELD_ORDER.filter((key) => key in changes)

/** The touched fields' live values, in the stored shape. */
export function fieldsBefore(row: Pick<SavedWorkout, 'name' | 'notes' | 'workoutData'>, changes: object): WorkoutFields {
  const before: WorkoutFields = {}
  for (const key of touched(changes)) {
    if (key === 'name') before.name = row.name
    else if (key === 'notes') before.notes = row.notes
    else before.exercises = row.workoutData as unknown as SavedWorkoutData
  }
  return before
}

/**
 * Exercises as one comparable string, independent of JSON key order. Without
 * names it compares the plan only: names are copied from the definitions at
 * approve, and the payload doesn't carry them.
 */
function plan(data: unknown, withNames: boolean): string {
  const list = (Array.isArray(data) ? data : []) as SavedWorkoutData
  return JSON.stringify(
    list.map((e) => [
      withNames ? e.name : null,
      e.exerciseDefinitionId,
      e.order,
      e.notes ?? null,
      e.exerciseGroup ?? null,
      (e.sets ?? []).map((s) => [s.setNumber, s.reps, s.rir ?? null, s.rpe ?? null, !!s.isWarmup]),
    ])
  )
}

/** The touched fields whose live value differs from `expected`. */
function moved(row: SavedWorkout, expected: WorkoutFields, withNames: boolean): FieldKey[] {
  return touched(expected).filter((key) => {
    if (key === 'name') return row.name !== expected.name
    if (key === 'notes') return (row.notes ?? null) !== (expected.notes ?? null)
    return plan(row.workoutData, withNames) !== plan(expected.exercises, withNames)
  })
}

async function findRow(tx: Prisma.TransactionClient, userId: string, id: string) {
  return tx.savedWorkout.findFirst({ where: { id, userId } })
}

// Guards the read before it against a concurrent write in this window.
async function writeFields(tx: Prisma.TransactionClient, row: SavedWorkout, fields: WorkoutFields, when: string) {
  const written = await tx.savedWorkout.updateMany({
    where: { id: row.id, userId: row.userId, updatedAt: row.updatedAt },
    data: {
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.notes !== undefined && { notes: fields.notes }),
      ...(fields.exercises !== undefined && {
        workoutData: fields.exercises as unknown as Prisma.InputJsonValue,
        exerciseCount: fields.exercises.length,
      }),
    },
  })
  if (written.count === 0) throw new SavedWorkoutConflict(`saved workout changed ${when}`)
}

/** Approve a create: the new saved workout, never started. */
export async function createSavedWorkout(
  tx: Prisma.TransactionClient,
  userId: string,
  input: WorkoutCreateInput,
  definitionNames: Map<string, string>
) {
  const workoutData = buildWorkoutData(input.exercises, definitionNames)
  return tx.savedWorkout.create({
    data: {
      userId,
      name: input.name,
      notes: input.notes ? input.notes : null,
      workoutData: workoutData as unknown as Prisma.InputJsonValue,
      exerciseCount: workoutData.length,
      lastUsedAt: null,
    },
    select: { id: true },
  })
}

/** Approve an update: write the touched fields if each still holds `before`. */
export async function applySavedWorkoutUpdate(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
  before: WorkoutFields,
  changes: WorkoutChanges,
  definitionNames: Map<string, string>
): Promise<void> {
  const row = await findRow(tx, userId, id)
  if (!row) throw new SavedWorkoutConflict('saved workout was deleted')
  const changed = moved(row, before, true)
  if (changed.length) throw new SavedWorkoutConflict(`saved workout ${changed.join(', ')} changed after the proposal was made`)
  await writeFields(
    tx,
    row,
    {
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.notes !== undefined && { notes: changes.notes ? changes.notes : null }),
      ...(changes.exercises !== undefined && { exercises: buildWorkoutData(changes.exercises, definitionNames) }),
    },
    'while approving'
  )
}

/** The fields approve wrote, from the payload; exercise names aren't compared (see `plan`). */
function applied(changes: { name?: string; notes?: string | null; exercises?: ExerciseInput[] }): WorkoutFields {
  return {
    ...(changes.name !== undefined && { name: changes.name }),
    ...(changes.notes !== undefined && { notes: changes.notes ? changes.notes : null }),
    ...(changes.exercises !== undefined && { exercises: buildWorkoutData(changes.exercises, new Map()) }),
  }
}

/**
 * Revert a create: delete the saved workout, unless Dustin started it (any
 * session carries its id) or edited it since approve.
 */
export async function deleteSavedWorkout(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
  input: WorkoutCreateInput
): Promise<void> {
  const row = await findRow(tx, userId, id)
  if (!row) throw new SavedWorkoutConflict('saved workout was deleted')
  const sessions = await tx.workoutCompletion.count({ where: { userId, savedWorkoutId: id } })
  if (sessions > 0) {
    throw new SavedWorkoutConflict(`saved workout was started (${pluralize(sessions, 'session')}); delete it from My saved workouts instead`)
  }
  const changed = moved(row, applied({ notes: null, ...input }), false)
  if (changed.length) throw new SavedWorkoutConflict(`saved workout ${changed.join(', ')} changed after the proposal was applied`)
  const deleted = await tx.savedWorkout.deleteMany({ where: { id, userId, updatedAt: row.updatedAt } })
  if (deleted.count === 0) throw new SavedWorkoutConflict('saved workout changed while reverting')
}

/** Revert an update: restore `inverse` if each touched field still holds what approve wrote. */
export async function restoreSavedWorkout(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
  changes: WorkoutChanges,
  inverse: WorkoutFields
): Promise<void> {
  const row = await findRow(tx, userId, id)
  if (!row) throw new SavedWorkoutConflict('saved workout was deleted')
  const changed = moved(row, applied(changes), false)
  if (changed.length) throw new SavedWorkoutConflict(`saved workout ${changed.join(', ')} changed after the proposal was applied`)
  await writeFields(tx, row, inverse, 'while reverting')
}
