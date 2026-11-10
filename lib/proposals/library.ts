import { type ExerciseDefinition, Prisma, type PrismaClient, type Proposal } from '@prisma/client'
import { applyDefinitionUpdate } from '@/lib/exercises/update-definition'
import { pluralize } from '@/lib/format/pluralize'
import { logger } from '@/lib/logger'
import type { Notify } from '@/lib/notify'
import {
  type CreateExerciseDefinitionInput,
  normalizeExerciseName,
  type UpdateExerciseDefinitionInput,
  validateExerciseDefinition,
} from '@/lib/validators/exercise-definition'
import { createData, pickEditable, snapshot, updateData } from './exercise-definition'

/**
 * Admin agents managing the shared exercise library (work 159). Create and
 * update apply at once and are recorded as applied proposals (revertable);
 * delete and merge are pending proposals Dustin approves (not revertable).
 */

type Db = PrismaClient | Prisma.TransactionClient

export const LIBRARY_KINDS = {
  create: 'exercise_definition.library_create',
  update: 'exercise_definition.library_update',
  delete: 'exercise_definition.delete',
  merge: 'exercise_definition.merge',
} as const

/** Where a definition is used. Any non-zero count blocks a delete. */
export interface LibraryUsage {
  /** Distinct users with a logged set of it. */
  users: number
  loggedSets: number
  /** Exercise rows in a program workout. */
  programExercises: number
  /** Entries in SavedWorkout.workoutData. */
  savedWorkoutExercises: number
  /** Exercise rows outside a program (ad-hoc sessions). */
  oneOffExercises: number
  pins: number
  preferences: number
  /** Users whose anchors include it. */
  anchors: number
  communityPrograms: number
}

const USAGE_LABELS: Record<keyof LibraryUsage, [string, string?]> = {
  users: ['user'],
  loggedSets: ['logged set'],
  programExercises: ['program exercise'],
  savedWorkoutExercises: ['saved workout exercise'],
  oneOffExercises: ['one-off exercise'],
  pins: ['pin'],
  preferences: ['preference'],
  anchors: ['anchor'],
  communityPrograms: ['community program'],
}

const emptyUsage = (): LibraryUsage => ({
  users: 0,
  loggedSets: 0,
  programExercises: 0,
  savedWorkoutExercises: 0,
  oneOffExercises: 0,
  pins: 0,
  preferences: 0,
  anchors: 0,
  communityPrograms: 0,
})

export const inUse = (u: LibraryUsage) => Object.values(u).some((n) => n > 0)

export function usageText(u: LibraryUsage): string {
  const parts = (Object.keys(USAGE_LABELS) as Array<keyof LibraryUsage>)
    .filter((k) => u[k] > 0)
    .map((k) => pluralize(u[k], ...USAGE_LABELS[k]))
  return parts.length ? parts.join(', ') : 'no uses'
}

/** Usage for each id, in a fixed number of grouped queries. */
export async function libraryUsage(db: Db, ids: string[]): Promise<Map<string, LibraryUsage>> {
  const out = new Map(ids.map((id) => [id, emptyUsage()]))
  if (ids.length === 0) return out
  const list = Prisma.join(ids)

  const [sets, exercises, saved, pins, prefs, anchors, community] = await Promise.all([
    db.$queryRaw<Array<{ id: string; sets: number; users: number }>>`
      SELECT e."exerciseDefinitionId" AS id, COUNT(*)::int AS sets, COUNT(DISTINCT ls."userId")::int AS users
      FROM "LoggedSet" ls JOIN "Exercise" e ON e.id = ls."exerciseId"
      WHERE e."exerciseDefinitionId" IN (${list})
      GROUP BY 1`,
    db.$queryRaw<Array<{ id: string; program: number; oneoff: number }>>`
      SELECT "exerciseDefinitionId" AS id,
        COUNT(*) FILTER (WHERE "workoutId" IS NOT NULL)::int AS program,
        COUNT(*) FILTER (WHERE "workoutId" IS NULL)::int AS oneoff
      FROM "Exercise" WHERE "exerciseDefinitionId" IN (${list})
      GROUP BY 1`,
    db.$queryRaw<Array<{ id: string; n: number }>>`
      SELECT el->>'exerciseDefinitionId' AS id, COUNT(*)::int AS n
      FROM "SavedWorkout" sw
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(sw."workoutData") = 'array' THEN sw."workoutData" ELSE '[]'::jsonb END) el
      WHERE el->>'exerciseDefinitionId' IN (${list})
      GROUP BY 1`,
    db.pinnedExercise.groupBy({ by: ['exerciseDefinitionId'], where: { exerciseDefinitionId: { in: ids } }, _count: true }),
    db.userExercisePreference.groupBy({
      by: ['exerciseDefinitionId'],
      where: { exerciseDefinitionId: { in: ids } },
      _count: true,
    }),
    db.$queryRaw<Array<{ id: string; n: number }>>`
      SELECT v AS id, COUNT(DISTINCT utp."userId")::int AS n
      FROM "UserTrainingProfile" utp
      CROSS JOIN LATERAL jsonb_each(
        CASE WHEN jsonb_typeof(utp."targetMovements") = 'object' THEN utp."targetMovements" ELSE '{}'::jsonb END) p
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(p.value) = 'array' THEN p.value ELSE '[]'::jsonb END) v
      WHERE v IN (${list})
      GROUP BY 1`,
    db.$queryRaw<Array<{ id: string; n: number }>>`
      SELECT i AS id, COUNT(cp.id)::int AS n
      FROM unnest(ARRAY[${list}]::text[]) i
      JOIN "CommunityProgram" cp ON cp."programData"::text LIKE '%' || i || '%'
      GROUP BY 1`,
  ])

  const at = (id: string) => out.get(id) as LibraryUsage
  for (const r of sets) Object.assign(at(r.id), { loggedSets: r.sets, users: r.users })
  for (const r of exercises) Object.assign(at(r.id), { programExercises: r.program, oneOffExercises: r.oneoff })
  for (const r of saved) if (out.has(r.id)) at(r.id).savedWorkoutExercises = r.n
  for (const r of pins) at(r.exerciseDefinitionId).pins = r._count
  for (const r of prefs) at(r.exerciseDefinitionId).preferences = r._count
  for (const r of anchors) if (out.has(r.id)) at(r.id).anchors = r.n
  for (const r of community) at(r.id).communityPrograms = r.n
  return out
}

async function usageOf(db: Db, id: string): Promise<LibraryUsage> {
  return (await libraryUsage(db, [id])).get(id) as LibraryUsage
}

// --- results -----------------------------------------------------------------

export type LibraryRefusalCode = 'invalid' | 'not_found' | 'in_use' | 'conflict'

export type LibraryFailure = {
  ok: false
  code: LibraryRefusalCode
  error: string
  field?: string
  existingId?: string
  usage?: LibraryUsage
}

/** Thrown inside approve/revert transactions; the service maps it to its own refusal. */
export class LibraryRefusal extends Error {
  constructor(
    readonly code: LibraryRefusalCode,
    message: string
  ) {
    super(message)
  }
}

interface Sender {
  userId: string
  agentTokenId: string
  rationale: string
}

function proposalUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/proposals/${id}`
}

async function send(notify: Notify, proposal: Proposal, title: string) {
  try {
    await notify({ proposalId: proposal.id, title, body: `${proposal.summary}. ${proposal.rationale}`, url: proposalUrl(proposal.id) })
  } catch (error) {
    logger.warn({ error, proposalId: proposal.id }, 'Proposal notification failed')
  }
}

const APPLIED_TITLE = 'Ripit: library change applied'
const PENDING_TITLE = 'Ripit: proposal waiting'

/** Validator rules plus a duplicate check across every definition (names are unique library-wide). */
async function checkDefinition(
  db: Db,
  input: CreateExerciseDefinitionInput | UpdateExerciseDefinitionInput,
  isUpdate: boolean,
  excludeId?: string
): Promise<LibraryFailure | null> {
  const errors = validateExerciseDefinition(input, isUpdate)
  if (errors.length > 0) return { ok: false, code: 'invalid', error: errors[0].message, field: errors[0].field }
  if (input.name === undefined) return null
  const dup = await db.exerciseDefinition.findFirst({
    where: { normalizedName: normalizeExerciseName(input.name), ...(excludeId && { NOT: { id: excludeId } }) },
    select: { id: true, name: true },
  })
  if (!dup) return null
  return {
    ok: false,
    code: 'invalid',
    error: `an exercise named "${dup.name}" already exists (id ${dup.id}); update it instead`,
    field: 'name',
    existingId: dup.id,
  }
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

// --- create and update (apply at once) ----------------------------------------

export async function createLibraryExercise(
  prisma: PrismaClient,
  input: Sender & { definition: CreateExerciseDefinitionInput; scope: 'shared' | 'mine' },
  notify: Notify
) {
  const definition = pickEditable(input.definition as unknown as Record<string, unknown>) as unknown as CreateExerciseDefinitionInput
  const refused = await checkDefinition(prisma, definition, false)
  if (refused) return refused
  const shared = input.scope === 'shared'

  try {
    const { exercise, proposal } = await prisma.$transaction(async (tx) => {
      const exercise = await tx.exerciseDefinition.create({
        data: { ...createData(definition, input.userId), isSystem: shared },
      })
      const proposal = await tx.proposal.create({
        data: {
          userId: input.userId,
          agentTokenId: input.agentTokenId,
          kind: LIBRARY_KINDS.create,
          status: 'applied',
          decidedAt: new Date(),
          summary: `Create ${shared ? 'library' : 'custom'} exercise "${exercise.name}"`,
          rationale: input.rationale,
          payload: { ...definition, scope: input.scope } as unknown as Prisma.InputJsonObject,
          targetId: exercise.id,
          inverse: { op: 'delete', id: exercise.id },
        },
      })
      return { exercise, proposal }
    })
    await send(notify, proposal, APPLIED_TITLE)
    return { ok: true as const, exercise, proposal }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return (await checkDefinition(prisma, definition, false)) ?? ({ ok: false, code: 'invalid', error: 'name already exists', field: 'name' } as LibraryFailure)
    }
    throw error
  }
}

export async function updateLibraryExercise(
  prisma: PrismaClient,
  input: Sender & { id: string; changes: UpdateExerciseDefinitionInput },
  notify: Notify
) {
  const current = await prisma.exerciseDefinition.findUnique({ where: { id: input.id } })
  if (!current) return { ok: false, code: 'not_found', error: 'exercise not found', field: 'id' } as LibraryFailure
  const changes = pickEditable(input.changes as Record<string, unknown>)
  if (Object.keys(changes).length === 0) {
    return { ok: false, code: 'invalid', error: 'no changes given', field: 'changes' } as LibraryFailure
  }
  const refused = await checkDefinition(prisma, changes, true, current.id)
  if (refused) return refused

  const before = snapshot(current) as Record<string, unknown>
  try {
    const { updated, renamedExercises, proposal } = await prisma.$transaction(async (tx) => {
      // Same as an admin edit: a rename also renames Exercise rows still carrying the old name.
      const { updated, renamedExercises } = await applyDefinitionUpdate(tx, {
        id: current.id,
        oldName: current.name,
        data: updateData(changes),
      })
      const restore: Record<string, unknown> = {}
      for (const key of Object.keys(changes)) restore[key] = before[key]
      const proposal = await tx.proposal.create({
        data: {
          userId: input.userId,
          agentTokenId: input.agentTokenId,
          kind: LIBRARY_KINDS.update,
          status: 'applied',
          decidedAt: new Date(),
          summary: `Update library exercise "${current.name}": ${Object.keys(changes).join(', ')}`,
          rationale: input.rationale,
          payload: { id: current.id, changes } as Prisma.InputJsonObject,
          targetId: current.id,
          before: before as Prisma.InputJsonObject,
          inverse: {
            op: 'update',
            id: current.id,
            data: restore,
            appliedUpdatedAt: updated.updatedAt.toISOString(),
          } as Prisma.InputJsonObject,
        },
      })
      return { updated, renamedExercises, proposal }
    })
    const usage = await usageOf(prisma, current.id)
    await send(notify, proposal, APPLIED_TITLE)
    return { ok: true as const, exercise: updated, renamedExercises, usage, proposal }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return (await checkDefinition(prisma, changes, true, current.id)) ?? ({ ok: false, code: 'invalid', error: 'name already exists', field: 'name' } as LibraryFailure)
    }
    throw error
  }
}

/** Revert a direct create: delete it unless something uses it. */
export async function revertLibraryCreate(tx: Prisma.TransactionClient, id: string) {
  const usage = await usageOf(tx, id)
  if (inUse(usage)) throw new LibraryRefusal('in_use', `exercise is in use (${usageText(usage)}), so it can't be removed`)
  await tx.exerciseDefinition.deleteMany({ where: { id } })
}

/** Revert a direct update: restore the changed fields unless it was edited since (renames Exercise rows back too). */
export async function revertLibraryUpdate(
  tx: Prisma.TransactionClient,
  inverse: { id: string; data: Record<string, unknown>; appliedUpdatedAt: string }
) {
  const current = await tx.exerciseDefinition.findUnique({ where: { id: inverse.id } })
  if (!current || current.updatedAt.toISOString() !== inverse.appliedUpdatedAt) {
    throw new LibraryRefusal('conflict', 'exercise was changed after the change was applied')
  }
  await applyDefinitionUpdate(tx, { id: current.id, oldName: current.name, data: updateData(inverse.data) })
}

// --- delete and merge (pending until approved) --------------------------------

const MERGE_HINT = 'Propose a merge into the exercise that replaces it instead (propose_exercise_merge).'

export async function proposeExerciseDelete(prisma: PrismaClient, input: Sender & { id: string }, notify: Notify) {
  const current = await prisma.exerciseDefinition.findUnique({ where: { id: input.id } })
  if (!current) return { ok: false, code: 'not_found', error: 'exercise not found', field: 'id' } as LibraryFailure
  const usage = await usageOf(prisma, current.id)
  if (inUse(usage)) {
    return {
      ok: false,
      code: 'in_use',
      error: `"${current.name}" is in use (${usageText(usage)}), so it can't be deleted. ${MERGE_HINT}`,
      field: 'id',
      usage,
    } as LibraryFailure
  }
  const proposal = await prisma.proposal.create({
    data: {
      userId: input.userId,
      agentTokenId: input.agentTokenId,
      kind: LIBRARY_KINDS.delete,
      summary: `Delete exercise "${current.name}"`,
      rationale: input.rationale,
      payload: { id: current.id, name: current.name, usage } as unknown as Prisma.InputJsonObject,
      targetId: current.id,
      before: snapshot(current),
    },
  })
  await send(notify, proposal, PENDING_TITLE)
  return { ok: true as const, proposal, usage }
}

type MergeCheck = { ok: true; from: ExerciseDefinition; into: ExerciseDefinition } | LibraryFailure

async function checkMerge(db: Db, fromId: string, intoId: string): Promise<MergeCheck> {
  if (fromId === intoId) return { ok: false, code: 'invalid', error: 'an exercise cannot be merged into itself', field: 'intoId' }
  const [from, into] = await Promise.all([
    db.exerciseDefinition.findUnique({ where: { id: fromId } }),
    db.exerciseDefinition.findUnique({ where: { id: intoId } }),
  ])
  if (!from) return { ok: false, code: 'not_found', error: 'exercise to merge from not found', field: 'fromId' }
  if (!into) return { ok: false, code: 'not_found', error: 'exercise to merge into not found', field: 'intoId' }
  // Everyone using `from` must still be able to see `into`.
  if (!into.isSystem && (from.isSystem || from.userId !== into.userId)) {
    return {
      ok: false,
      code: 'invalid',
      error: `"${into.name}" is a custom exercise; only its owner's custom exercises can be merged into it`,
      field: 'intoId',
    }
  }
  return { ok: true, from, into }
}

export async function proposeExerciseMerge(
  prisma: PrismaClient,
  input: Sender & { fromId: string; intoId: string },
  notify: Notify
) {
  const check = await checkMerge(prisma, input.fromId, input.intoId)
  if (!check.ok) return check
  const { from, into } = check
  const usage = await usageOf(prisma, from.id)
  const proposal = await prisma.proposal.create({
    data: {
      userId: input.userId,
      agentTokenId: input.agentTokenId,
      kind: LIBRARY_KINDS.merge,
      summary: `Merge "${from.name}" into "${into.name}"`,
      rationale: input.rationale,
      payload: { fromId: from.id, fromName: from.name, intoId: into.id, intoName: into.name, usage } as unknown as Prisma.InputJsonObject,
      targetId: into.id,
      before: snapshot(from),
    },
  })
  await send(notify, proposal, PENDING_TITLE)
  return { ok: true as const, proposal, usage }
}

/** Approve a delete: re-checks usage, since someone may have used it while pending. */
export async function applyDelete(tx: Prisma.TransactionClient, payload: { id: string }) {
  const current = await tx.exerciseDefinition.findUnique({ where: { id: payload.id }, select: { id: true, name: true } })
  if (!current) throw new LibraryRefusal('invalid', 'exercise no longer exists')
  const usage = await usageOf(tx, current.id)
  if (inUse(usage)) {
    throw new LibraryRefusal(
      'in_use',
      `"${current.name}" is now in use (${usageText(usage)}); nothing was deleted. Merge it instead.`
    )
  }
  await tx.exerciseDefinition.delete({ where: { id: current.id } })
}

/** Replace `from` with `into` in a JSON tree (exerciseDefinitionId keys and nested exerciseDefinition.id). */
function replaceIds(node: unknown, from: string, into: string): unknown {
  if (Array.isArray(node)) return node.map((v) => replaceIds(v, from, into))
  if (!node || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node)) {
    if (k === 'exerciseDefinitionId' && v === from) out[k] = into
    else if (k === 'exerciseDefinition' && v && typeof v === 'object' && (v as { id?: unknown }).id === from) {
      out[k] = { ...(replaceIds(v, from, into) as object), id: into }
    } else out[k] = replaceIds(v, from, into)
  }
  return out
}

/**
 * Approve a merge, inside the approve transaction: move every use of `from`
 * to `into`, add from's name to into's aliases, delete `from`. Where a user
 * already pins or rates both, into's row is kept.
 */
export async function applyMerge(tx: Prisma.TransactionClient, payload: { fromId: string; intoId: string }) {
  const check = await checkMerge(tx, payload.fromId, payload.intoId)
  if (!check.ok) throw new LibraryRefusal(check.code, check.error)
  const { from, into } = check
  const moved = await usageOf(tx, from.id)
  const like = `%${from.id}%`

  // Exercises (program, one-off) carry the logged sets; rename rows still showing the old name.
  await tx.exercise.updateMany({ where: { exerciseDefinitionId: from.id, name: from.name }, data: { name: into.name } })
  await tx.exercise.updateMany({ where: { exerciseDefinitionId: from.id }, data: { exerciseDefinitionId: into.id } })

  for (const model of ['pinnedExercise', 'userExercisePreference'] as const) {
    const delegate = tx[model] as unknown as {
      findMany: (a: object) => Promise<Array<{ userId: string }>>
      deleteMany: (a: object) => Promise<unknown>
      updateMany: (a: object) => Promise<unknown>
    }
    const both = await delegate.findMany({ where: { exerciseDefinitionId: into.id }, select: { userId: true } })
    const users = both.map((r) => r.userId)
    if (users.length) await delegate.deleteMany({ where: { exerciseDefinitionId: from.id, userId: { in: users } } })
    await delegate.updateMany({ where: { exerciseDefinitionId: from.id }, data: { exerciseDefinitionId: into.id } })
  }

  const saved = await tx.$queryRaw<Array<{ id: string; workoutData: unknown }>>`
    SELECT id, "workoutData" FROM "SavedWorkout" WHERE "workoutData"::text LIKE ${like}`
  for (const row of saved) {
    const list = Array.isArray(row.workoutData) ? row.workoutData : []
    const workoutData = list.map((e: Record<string, unknown>) =>
      e?.exerciseDefinitionId === from.id
        ? { ...e, exerciseDefinitionId: into.id, ...(e.name === from.name && { name: into.name }) }
        : e
    )
    await tx.savedWorkout.update({ where: { id: row.id }, data: { workoutData: workoutData as Prisma.InputJsonArray } })
  }

  const profiles = await tx.$queryRaw<Array<{ id: string; targetMovements: unknown }>>`
    SELECT id, "targetMovements" FROM "UserTrainingProfile" WHERE "targetMovements"::text LIKE ${like}`
  for (const row of profiles) {
    const anchors = (row.targetMovements ?? {}) as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [pattern, ids] of Object.entries(anchors)) {
      next[pattern] = Array.isArray(ids) ? [...new Set(ids.map((id) => (id === from.id ? into.id : id)))] : ids
    }
    await tx.userTrainingProfile.update({ where: { id: row.id }, data: { targetMovements: next as Prisma.InputJsonObject } })
  }

  const community = await tx.$queryRaw<Array<{ id: string; programData: unknown }>>`
    SELECT id, "programData" FROM "CommunityProgram" WHERE "programData"::text LIKE ${like}`
  for (const row of community) {
    await tx.communityProgram.update({
      where: { id: row.id },
      data: { programData: replaceIds(row.programData, from.id, into.id) as Prisma.InputJsonValue },
    })
  }

  const alias = from.name.toLowerCase()
  if (!into.aliases.some((a) => a.toLowerCase() === alias)) {
    await tx.exerciseDefinition.update({ where: { id: into.id }, data: { aliases: [...into.aliases, alias] } })
  }
  await tx.exerciseDefinition.delete({ where: { id: from.id } })
  return moved
}
