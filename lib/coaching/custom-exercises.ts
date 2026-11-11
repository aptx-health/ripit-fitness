import { Prisma, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { visibleTo } from '@/lib/proposals/exercise-definition'
import { normalizeExerciseName } from '@/lib/validators/exercise-definition'
import { coachingNames } from './names'

/**
 * Coach sends carry their custom exercises (features/coaching/custom-exercises.feature).
 * A send snapshots each exercise the coach made that the trainee can't see
 * into the proposal payload as `customExercises`. On accept the trainee picks,
 * per exercise, a copy (named "<name> (from <coach first name>)", since names
 * are unique app-wide) or one of their own. The applied proposal records the
 * copy's id, which is how a later send of the same exercise finds and reuses it.
 */

type Db = PrismaClient | Prisma.TransactionClient

export const BUNDLE_KEY = 'customExercises'
const MAX_NAME_LENGTH = 100
const MAX_NUMBERED = 50

export interface CustomExercise {
  sourceId: string
  name: string
  equipment: string[]
  primaryFAUs: string[]
  secondaryFAUs: string[]
  category: string | null
  aliases: string[]
  instructions: string | null
  notes: string | null
  /** Set on accept when the trainee took a copy (new or reused). */
  copyId?: string
}

export const snapshotSelect = {
  id: true,
  name: true,
  equipment: true,
  primaryFAUs: true,
  secondaryFAUs: true,
  category: true,
  aliases: true,
  instructions: true,
  notes: true,
} satisfies Prisma.ExerciseDefinitionSelect

type SnapshotRow = Prisma.ExerciseDefinitionGetPayload<{ select: typeof snapshotSelect }>

export function toSnapshot(def: SnapshotRow): CustomExercise {
  return {
    sourceId: def.id,
    name: def.name,
    equipment: def.equipment,
    primaryFAUs: def.primaryFAUs,
    secondaryFAUs: def.secondaryFAUs,
    category: def.category,
    aliases: def.aliases,
    instructions: def.instructions,
    notes: def.notes,
  }
}

const exerciseChoice = z.discriminatedUnion('use', [
  z.object({ use: z.literal('copy') }).strict(),
  z.object({ use: z.literal('mine'), exerciseDefinitionId: z.string().min(1) }).strict(),
])

/** The accept body: a choice per bundled exercise, keyed by its sourceId. */
export const acceptChoices = z.object({ exercises: z.record(z.string(), exerciseChoice).optional() }).strict()

export type ExerciseChoice = z.infer<typeof exerciseChoice>
export type AcceptChoices = z.infer<typeof acceptChoices>

/** The payload without its bundle, and the bundle ([] when there is none). */
export function splitBundle(payload: unknown): { content: Record<string, unknown>; bundle: CustomExercise[] } {
  const { [BUNDLE_KEY]: bundle, ...content } = (payload ?? {}) as Record<string, unknown>
  return { content, bundle: Array.isArray(bundle) ? (bundle as CustomExercise[]) : [] }
}

/** The choice keys that name no exercise in the bundle. */
export function unknownChoices(bundle: CustomExercise[], choices: AcceptChoices | undefined): string[] {
  const known = new Set(bundle.map((b) => b.sourceId))
  return Object.keys(choices?.exercises ?? {}).filter((id) => !known.has(id))
}

/** "<name> (from <first>)", plus " <n>" from 2 up; the name is trimmed with "…" so the whole fits 100 characters. */
export function copyName(name: string, coachFirstName: string, n = 1): string {
  const suffix = ` (from ${coachFirstName})${n > 1 ? ` ${n}` : ''}`
  const room = MAX_NAME_LENGTH - suffix.length
  const base = name.length <= room ? name : `${name.slice(0, Math.max(room - 1, 1)).trimEnd()}…`
  return `${base}${suffix}`
}

/** First word of the coach's coaching name. */
export async function coachFirstName(db: Db, coachUserId: string): Promise<string> {
  const names = await coachingNames(db as PrismaClient, [coachUserId])
  return (names.get(coachUserId) ?? '').split(/\s+/)[0] || 'coach'
}

/**
 * The trainee's earlier copy of each source exercise that still exists and is
 * still theirs, from the copy ids recorded on their earlier accepted sends.
 * Newest record wins. Two queries.
 */
export async function earlierCopies(
  db: Db,
  userId: string,
  sourceIds: string[],
  excludeProposalId?: string
): Promise<Map<string, { id: string; name: string }>> {
  const found = new Map<string, { id: string; name: string }>()
  if (sourceIds.length === 0) return found
  const rows = await db.proposal.findMany({
    where: {
      userId,
      coachLinkId: { not: null },
      ...(excludeProposalId && { id: { not: excludeProposalId } }),
      OR: sourceIds.map((sourceId) => ({ payload: { path: [BUNDLE_KEY], array_contains: [{ sourceId }] } })),
    },
    orderBy: [{ decidedAt: 'desc' }, { createdAt: 'desc' }],
    select: { payload: true },
  })
  const candidates = new Map<string, string[]>()
  for (const row of rows) {
    for (const entry of splitBundle(row.payload).bundle) {
      if (!entry.copyId || !sourceIds.includes(entry.sourceId)) continue
      candidates.set(entry.sourceId, [...(candidates.get(entry.sourceId) ?? []), entry.copyId])
    }
  }
  const ids = [...new Set([...candidates.values()].flat())]
  if (ids.length === 0) return found
  const live = await db.exerciseDefinition.findMany({
    where: { id: { in: ids }, userId, isSystem: false },
    select: { id: true, name: true },
  })
  const byId = new Map(live.map((d) => [d.id, d]))
  for (const [sourceId, copyIds] of candidates) {
    const hit = copyIds.map((id) => byId.get(id)).find(Boolean)
    if (hit) found.set(sourceId, hit)
  }
  return found
}

/** Thrown when a choice can't be honoured; the message names the exercise and is shown to the trainee. */
export class ChoiceRefusal extends Error {}

/** The first free copy name for each bundled exercise, in one query. */
async function freeNames(db: Db, wanted: Array<{ sourceId: string; name: string }>, first: string) {
  const options = wanted.map((w) =>
    Array.from({ length: MAX_NUMBERED }, (_, i) => copyName(w.name, first, i + 1))
  )
  const taken = new Set(
    (
      await db.exerciseDefinition.findMany({
        where: { normalizedName: { in: options.flat().map(normalizeExerciseName) } },
        select: { normalizedName: true },
      })
    ).map((d) => d.normalizedName)
  )
  const names = new Map<string, string>()
  wanted.forEach((w, i) => {
    const name = options[i].find((o) => !taken.has(normalizeExerciseName(o)))
    if (!name) throw new ChoiceRefusal(`Couldn't name a copy of "${w.name}"; rename yours and try again.`)
    taken.add(normalizeExerciseName(name))
    names.set(w.sourceId, name)
  })
  return names
}

/**
 * What "Add a copy" would name each exercise right now (the review screen's
 * hint); null when no name is free. Accept picks again, so a name taken in
 * between moves on to the next number.
 */
export async function previewCopyNames(
  db: Db,
  wanted: Array<{ sourceId: string; name: string }>,
  first: string
): Promise<Map<string, string>> {
  if (wanted.length === 0) return new Map()
  try {
    return await freeNames(db, wanted, first)
  } catch (error) {
    if (error instanceof ChoiceRefusal) return new Map()
    throw error
  }
}

const COPY_NAME_TAKEN = "Couldn't name the copy because that name was just taken. Try again."

/** Create the copies; a unique-name race with another insert becomes a refusal the trainee can retry. */
async function createCopies(tx: Prisma.TransactionClient, data: Prisma.ExerciseDefinitionCreateManyInput[]) {
  try {
    return await tx.exerciseDefinition.createManyAndReturn({ data, select: { id: true, normalizedName: true } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ChoiceRefusal(COPY_NAME_TAKEN)
    }
    throw error
  }
}

/**
 * Apply the trainee's choices inside the accept transaction: check each
 * "mine" pick, reuse or create the copies, and return the source -> chosen
 * definition map plus the bundle with copy ids recorded.
 */
export async function resolveBundle(
  tx: Prisma.TransactionClient,
  args: {
    proposalId: string
    bundle: CustomExercise[]
    choices: AcceptChoices | undefined
    userId: string
    coachUserId: string
  }
): Promise<{ chosen: Map<string, string>; recorded: CustomExercise[] }> {
  const { proposalId, bundle, choices, userId, coachUserId } = args
  const unknown = unknownChoices(bundle, choices)
  if (unknown.length) throw new ChoiceRefusal('A choice names an exercise that is not in this suggestion.')

  const choiceFor = (sourceId: string): ExerciseChoice => choices?.exercises?.[sourceId] ?? { use: 'copy' }
  const picks = bundle.flatMap((b) => {
    const c = choiceFor(b.sourceId)
    return c.use === 'mine' ? [{ entry: b, id: c.exerciseDefinitionId }] : []
  })
  const visible = picks.length
    ? new Set(
        (
          await tx.exerciseDefinition.findMany({
            where: { id: { in: picks.map((p) => p.id) }, ...visibleTo(userId) },
            select: { id: true },
          })
        ).map((d) => d.id)
      )
    : new Set<string>()
  const refused = picks.find((p) => !visible.has(p.id))
  if (refused) {
    throw new ChoiceRefusal(`The exercise picked for "${refused.entry.name}" isn't available any more. Pick another.`)
  }

  const copies = bundle.filter((b) => choiceFor(b.sourceId).use === 'copy')
  const reused = await earlierCopies(tx, userId, copies.map((c) => c.sourceId), proposalId)
  const toCreate = copies.filter((c) => !reused.has(c.sourceId))
  const names = toCreate.length ? await freeNames(tx, toCreate, await coachFirstName(tx, coachUserId)) : new Map()

  const chosen = new Map<string, string>()
  for (const p of picks) chosen.set(p.entry.sourceId, p.id)
  for (const [sourceId, copy] of reused) chosen.set(sourceId, copy.id)
  const created = toCreate.length
    ? await createCopies(
        tx,
        toCreate.map((c) => {
          const name = names.get(c.sourceId) as string
          return {
            name,
            normalizedName: normalizeExerciseName(name),
            equipment: c.equipment,
            primaryFAUs: c.primaryFAUs,
            secondaryFAUs: c.secondaryFAUs,
            category: c.category,
            aliases: c.aliases,
            instructions: c.instructions,
            notes: c.notes,
            isBodyweight: c.equipment.includes('bodyweight'),
            isSystem: false,
            createdBy: coachUserId,
            userId,
          }
        })
      )
    : []
  const createdIds = new Map(created.map((d) => [d.normalizedName, d.id]))
  for (const c of toCreate) {
    chosen.set(c.sourceId, createdIds.get(normalizeExerciseName(names.get(c.sourceId) as string)) as string)
  }

  const recorded = bundle.map((b) => {
    const { copyId: _old, ...entry } = b
    return choiceFor(b.sourceId).use === 'copy' ? { ...entry, copyId: chosen.get(b.sourceId) as string } : entry
  })
  return { chosen, recorded }
}

/** The content with every bundled exercise id swapped for the chosen one (programs and saved workouts). */
export function remapExercises(content: Record<string, unknown>, chosen: Map<string, string>): Record<string, unknown> {
  const swap = <T extends { exerciseDefinitionId: string }>(e: T): T => ({
    ...e,
    exerciseDefinitionId: chosen.get(e.exerciseDefinitionId) ?? e.exerciseDefinitionId,
  })
  if (Array.isArray(content.weeks)) {
    type Week = { workouts: Array<{ exercises: Array<{ exerciseDefinitionId: string }> }> }
    return {
      ...content,
      weeks: (content.weeks as Week[]).map((w) => ({
        ...w,
        workouts: w.workouts.map((d) => ({ ...d, exercises: d.exercises.map(swap) })),
      })),
    }
  }
  if (Array.isArray(content.exercises)) {
    return { ...content, exercises: (content.exercises as Array<{ exerciseDefinitionId: string }>).map(swap) }
  }
  return content
}
