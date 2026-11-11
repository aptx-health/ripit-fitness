import { Prisma, type PrismaClient, type Proposal } from '@prisma/client'
import {
  type AcceptChoices,
  BUNDLE_KEY,
  ChoiceRefusal,
  type CustomExercise,
  remapExercises,
  resolveBundle,
  splitBundle,
} from '@/lib/coaching/custom-exercises'
import { pluralize } from '@/lib/format/pluralize'
import { logger } from '@/lib/logger'
import { notify as defaultNotify, type Notify } from '@/lib/notify'
import type {
  CreateExerciseDefinitionInput,
  UpdateExerciseDefinitionInput,
} from '@/lib/validators/exercise-definition'
import {
  type AnchorChanges,
  anchorSummary,
  anchorsBefore,
  BalanceConflict,
  checkAnchorChanges,
  checkTargetChanges,
  swapAnchors,
  swapTargets,
  type TargetChanges,
  targetSummary,
  targetsBefore,
} from './balance'
import {
  checkCreate,
  checkUpdate,
  createData,
  pickEditable,
  snapshot,
  updateData,
  visibleTo,
} from './exercise-definition'
import { applyDelete, applyMerge, LIBRARY_KINDS, LibraryRefusal, revertLibraryCreate, revertLibraryUpdate } from './library'
import { checkProgram, createProgram, programSummary } from './program'
import {
  applySavedWorkoutUpdate,
  checkWorkoutChanges,
  checkWorkoutCreate,
  createSavedWorkout,
  createSummary,
  deleteSavedWorkout,
  fieldsBefore,
  restoreSavedWorkout,
  SavedWorkoutConflict,
  updateSummary,
  type WorkoutChanges,
  type WorkoutCreateInput,
  type WorkoutFields,
} from './saved-workout'

export const PROPOSAL_KINDS = [
  'exercise_definition.create',
  'exercise_definition.update',
  'program.create',
  'anchors.update',
  'balance_targets.update',
  'saved_workout.create',
  'saved_workout.update',
  LIBRARY_KINDS.create,
  LIBRARY_KINDS.update,
  LIBRARY_KINDS.delete,
  LIBRARY_KINDS.merge,
] as const
export type ProposalKind = (typeof PROPOSAL_KINDS)[number]

export const PROPOSAL_KIND_LABELS: Record<ProposalKind, string> = {
  'exercise_definition.create': 'New exercise',
  'exercise_definition.update': 'Exercise edit',
  'program.create': 'New program',
  'anchors.update': 'Anchor change',
  'balance_targets.update': 'Target change',
  'saved_workout.create': 'New saved workout',
  'saved_workout.update': 'Saved workout change',
  [LIBRARY_KINDS.create]: 'New library exercise',
  [LIBRARY_KINDS.update]: 'Library exercise edit',
  [LIBRARY_KINDS.delete]: 'Delete exercise',
  [LIBRARY_KINDS.merge]: 'Merge exercises',
}

/** Applied deletes and merges can't be undone (Admin hides Revert and warns before approve). */
export const IRREVERSIBLE_KINDS: ReadonlySet<string> = new Set(['program.create', LIBRARY_KINDS.delete, LIBRARY_KINDS.merge])

export const PROPOSAL_STATUSES = ['pending', 'applied', 'rejected', 'reverted', 'conflict'] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

export type DecisionCode = 'not_found' | 'not_pending' | 'not_applied' | 'conflict' | 'in_use' | 'invalid'

export type DecisionResult =
  | { ok: true; proposal: Proposal }
  /** `userError` is written for the user (a refused accept choice); callers show it as is. */
  | { ok: false; code: DecisionCode; error: string; userError?: string }

/** Who sent a proposal: an agent token, or a coach link (coaching slice 2). Exactly one. */
export type ProposalSender = { agentTokenId: string; coachLinkId?: null } | { agentTokenId: null; coachLinkId: string }

export type CreateProposalInput = ProposalSender &
  (
  | {
      userId: string
      kind: 'exercise_definition.create'
      rationale: string
      definition: CreateExerciseDefinitionInput
      feedbackId?: string
    }
  | {
      userId: string
      kind: 'exercise_definition.update'
      rationale: string
      id: string
      changes: UpdateExerciseDefinitionInput
      feedbackId?: string
    }
  | {
      userId: string
      kind: 'program.create'
      rationale: string
      program: unknown
      /** A coach send's custom exercises (coach senders only). */
      customExercises?: CustomExercise[]
      feedbackId?: string
    }
  | {
      userId: string
      kind: 'anchors.update'
      rationale: string
      /** Pattern -> exercise ids; only the named patterns change. */
      changes: Record<string, unknown>
      feedbackId?: string
    }
  | {
      userId: string
      kind: 'balance_targets.update'
      rationale: string
      /** FAU -> target; only the named FAUs change. */
      changes: Record<string, unknown>
      feedbackId?: string
    }
  | {
      userId: string
      kind: 'saved_workout.create'
      rationale: string
      workout: unknown
      /** A coach send's custom exercises (coach senders only). */
      customExercises?: CustomExercise[]
      feedbackId?: string
    }
  | {
      userId: string
      kind: 'saved_workout.update'
      rationale: string
      savedWorkoutId: string
      /** name, notes and exercises; only the given fields change. */
      changes: unknown
      feedbackId?: string
    }
  )

export type CreateProposalResult =
  | { ok: true; proposal: Proposal }
  | { ok: false; code: 'invalid' | 'not_found'; error: string; field?: string; existingId?: string }

interface UpdatePayload {
  id: string
  changes: Record<string, unknown>
}

interface UpdateInverse {
  op: 'update'
  id: string
  data: Record<string, unknown>
  /** The definition's updatedAt right after approve; revert refuses if it moved. */
  appliedUpdatedAt: string
}

interface CreateInverse {
  op: 'delete'
  id: string
}

interface SavedWorkoutUpdatePayload {
  savedWorkoutId: string
  changes: WorkoutChanges
}

// Thrown inside a transaction to roll it back; carries the result to return.
class Refusal extends Error {
  constructor(
    readonly code: DecisionCode,
    message: string
  ) {
    super(message)
  }
}

/** Run a saved-workout write, turning its conflict into a refusal. */
async function asConflict(write: () => Promise<void>): Promise<void> {
  try {
    await write()
  } catch (error) {
    if (error instanceof SavedWorkoutConflict) throw new Refusal('conflict', error.message)
    throw error
  }
}

/** Run a library write, turning its refusal into the service's. */
async function asLibraryRefusal<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write()
  } catch (error) {
    if (error instanceof LibraryRefusal) throw new Refusal(error.code, error.message)
    throw error
  }
}

/** Appended to the feedback's admin note when a linked proposal is applied. */
export function resolvedNote(existingNote: string | null, proposalId: string): string {
  const line = `Resolved by agent proposal ${proposalId}`
  return existingNote?.trim() ? `${existingNote}\n\n${line}` : line
}

// Approving a proposal linked to feedback resolves that feedback, inside the
// approve transaction. A deleted feedback row (feedbackId set to null) is skipped.
async function resolveLinkedFeedback(tx: Prisma.TransactionClient, proposal: Proposal, userId: string) {
  if (!proposal.feedbackId) return
  const feedback = await tx.feedback.findFirst({
    where: { id: proposal.feedbackId, userId },
    select: { id: true, adminNote: true },
  })
  if (!feedback) return
  await tx.feedback.update({
    where: { id: feedback.id },
    data: { status: 'resolved', adminNote: resolvedNote(feedback.adminNote, proposal.id) },
  })
}

/** A coach send's bundle as id -> name, or a refusal when anyone else tries to bundle. */
function bundledNames(input: { coachLinkId?: string | null; customExercises?: CustomExercise[] }) {
  if (!input.customExercises?.length) return { ok: true as const, names: new Map<string, string>() }
  if (!input.coachLinkId) {
    return { ok: false as const, code: 'invalid' as const, error: 'only a coach send can carry exercises', field: BUNDLE_KEY }
  }
  return { ok: true as const, names: new Map(input.customExercises.map((c) => [c.sourceId, c.name])) }
}

/** The payload with a coach send's bundle beside the content. */
function withBundle(content: object, customExercises: CustomExercise[] | undefined): Prisma.InputJsonObject {
  return (customExercises?.length ? { ...content, [BUNDLE_KEY]: customExercises } : content) as unknown as Prisma.InputJsonObject
}

function senderOf(input: ProposalSender) {
  return { agentTokenId: input.agentTokenId, coachLinkId: input.coachLinkId ?? null }
}

function proposalUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/proposals/${id}`
}

/**
 * Record an agent's proposal. Validates it now (and again on approve), then
 * notifies. A notification failure never blocks the proposal.
 *
 * `notify` posts to Dustin's channels as given: callers must gate it by the
 * owner's role and pass a no-op for non-admins (the MCP tools do this through
 * notifyFor in lib/mcp/tools.ts), so other users' content never reaches them.
 */
export async function createProposal(
  prisma: PrismaClient,
  input: CreateProposalInput,
  notify: Notify = defaultNotify
): Promise<CreateProposalResult> {
  let data: Prisma.ProposalUncheckedCreateInput

  if (input.feedbackId !== undefined) {
    const feedback = await prisma.feedback.findFirst({
      where: { id: input.feedbackId, userId: input.userId },
      select: { id: true },
    })
    if (!feedback) return { ok: false, code: 'not_found', error: 'feedback not found', field: 'feedbackId' }
  }

  if (input.kind === 'exercise_definition.create') {
    const definition = pickEditable(input.definition as unknown as Record<string, unknown>)
    const check = await checkCreate(prisma, definition as unknown as CreateExerciseDefinitionInput, input.userId)
    if (!check.ok) return check
    data = {
      userId: input.userId,
      ...senderOf(input),
      kind: input.kind,
      summary: `Create exercise "${input.definition.name}"`,
      rationale: input.rationale,
      payload: definition as Prisma.InputJsonObject,
    }
  } else if (input.kind === 'program.create') {
    const bundled = bundledNames(input)
    if (!bundled.ok) return bundled
    const check = await checkProgram(prisma, input.program, input.userId, bundled.names)
    if (!check.ok) return check
    data = {
      userId: input.userId,
      ...senderOf(input),
      kind: input.kind,
      summary: programSummary(check.program),
      rationale: input.rationale,
      payload: withBundle(check.program, input.customExercises),
    }
  } else if (input.kind === 'anchors.update') {
    const check = await checkAnchorChanges(prisma, input.changes, input.userId)
    if (!check.ok) return check
    const before = await anchorsBefore(prisma, input.userId, check.changes)
    data = {
      userId: input.userId,
      ...senderOf(input),
      kind: input.kind,
      summary: anchorSummary(check.changes),
      rationale: input.rationale,
      payload: { changes: check.changes } as Prisma.InputJsonObject,
      before: before as Prisma.InputJsonObject,
    }
  } else if (input.kind === 'balance_targets.update') {
    const check = checkTargetChanges(input.changes)
    if (!check.ok) return check
    const before = await targetsBefore(prisma, input.userId, check.changes)
    data = {
      userId: input.userId,
      ...senderOf(input),
      kind: input.kind,
      summary: targetSummary(check.changes, before),
      rationale: input.rationale,
      payload: { changes: check.changes } as Prisma.InputJsonObject,
      before: before as Prisma.InputJsonObject,
    }
  } else if (input.kind === 'saved_workout.create') {
    const bundled = bundledNames(input)
    if (!bundled.ok) return bundled
    const check = await checkWorkoutCreate(prisma, input.workout, input.userId, bundled.names)
    if (!check.ok) return check
    data = {
      userId: input.userId,
      ...senderOf(input),
      kind: input.kind,
      summary: createSummary(check.value),
      rationale: input.rationale,
      payload: withBundle(check.value, input.customExercises),
    }
  } else if (input.kind === 'saved_workout.update') {
    const current = await prisma.savedWorkout.findFirst({
      where: { id: input.savedWorkoutId, userId: input.userId },
      select: { id: true, name: true, notes: true, workoutData: true },
    })
    if (!current) return { ok: false, code: 'not_found', error: 'saved workout not found', field: 'savedWorkoutId' }
    const check = await checkWorkoutChanges(prisma, input.changes, input.userId)
    if (!check.ok) return check
    data = {
      userId: input.userId,
      ...senderOf(input),
      kind: input.kind,
      summary: updateSummary(current.name, check.value),
      rationale: input.rationale,
      payload: { savedWorkoutId: current.id, changes: check.value } as unknown as Prisma.InputJsonObject,
      targetId: current.id,
      before: fieldsBefore(current, check.value) as unknown as Prisma.InputJsonObject,
    }
  } else {
    const current = await prisma.exerciseDefinition.findFirst({
      where: { id: input.id, ...visibleTo(input.userId) },
    })
    if (!current) return { ok: false, code: 'not_found', error: 'exercise not found', field: 'id' }

    const changes = pickEditable(input.changes as Record<string, unknown>)
    const check = await checkUpdate(prisma, current.id, changes, input.userId)
    if (!check.ok) return check
    data = {
      userId: input.userId,
      ...senderOf(input),
      kind: input.kind,
      summary: `Update exercise "${current.name}": ${Object.keys(changes).join(', ')}`,
      rationale: input.rationale,
      payload: { id: current.id, changes } as Prisma.InputJsonObject,
      targetId: current.id,
      before: snapshot(current),
    }
  }

  const proposal = await prisma.proposal.create({
    data: { ...data, ...(input.feedbackId && { feedbackId: input.feedbackId }) },
  })
  logger.info({ proposalId: proposal.id, kind: proposal.kind, userId: input.userId }, 'Proposal created')

  try {
    await notify({
      proposalId: proposal.id,
      title: 'Ripit: proposal waiting',
      body: `${proposal.summary}. ${proposal.rationale}`,
      url: proposalUrl(proposal.id),
    })
  } catch (error) {
    logger.warn({ error, proposalId: proposal.id }, 'Proposal notification failed')
  }

  return { ok: true, proposal }
}

async function findOwned(prisma: PrismaClient, proposalId: string, userId: string) {
  return prisma.proposal.findFirst({ where: { id: proposalId, userId } })
}

/**
 * A coach send's content with its custom exercises resolved by the trainee's
 * choices (copies made or reused), and the payload recording the copies.
 * Without a bundle, the payload unchanged.
 */
async function resolveSend(tx: Prisma.TransactionClient, proposal: Proposal, userId: string, choices?: AcceptChoices) {
  const { content, bundle } = splitBundle(proposal.payload)
  if (bundle.length === 0) {
    if (Object.keys(choices?.exercises ?? {}).length) {
      throw new ChoiceRefusal('A choice names an exercise that is not in this suggestion.')
    }
    return { content: proposal.payload, payload: null }
  }
  const link = proposal.coachLinkId
    ? await tx.coachLink.findUnique({ where: { id: proposal.coachLinkId }, select: { coachUserId: true } })
    : null
  if (!link) throw new Refusal('invalid', 'only a coach send can carry exercises')
  const { chosen, recorded } = await resolveBundle(tx, {
    proposalId: proposal.id,
    bundle,
    choices,
    userId,
    coachUserId: link.coachUserId,
  })
  return { content: remapExercises(content, chosen), payload: withBundle(content, recorded) }
}

/**
 * Apply a pending proposal in one transaction. A stale update is marked
 * `conflict`. `choices` are the trainee's picks for a coach send's custom
 * exercises (default: a copy of each).
 */
export async function approveProposal(
  prisma: PrismaClient,
  proposalId: string,
  userId: string,
  choices?: AcceptChoices
): Promise<DecisionResult> {
  const existing = await findOwned(prisma, proposalId, userId)
  if (!existing) return { ok: false, code: 'not_found', error: 'proposal not found' }
  if (existing.status !== 'pending') {
    return { ok: false, code: 'not_pending', error: 'proposal is not pending' }
  }

  try {
    // A large program is many nested inserts; the 5 s default timeout is too short.
    const proposal = await prisma.$transaction(async (tx) => {
      const decidedAt = new Date()
      // Claim the proposal; a concurrent approve/reject loses here.
      const claimed = await tx.proposal.updateMany({
        where: { id: proposalId, userId, status: 'pending' },
        data: { status: 'applied', decidedAt },
      })
      if (claimed.count === 0) throw new Refusal('not_pending', 'proposal is not pending')

      if (existing.kind === 'exercise_definition.create') {
        const input = existing.payload as unknown as CreateExerciseDefinitionInput
        const check = await checkCreate(tx, input, userId)
        if (!check.ok) throw new Refusal('invalid', check.error)
        const created = await tx.exerciseDefinition.create({ data: createData(input, userId) })
        const inverse: CreateInverse = { op: 'delete', id: created.id }
        await resolveLinkedFeedback(tx, existing, userId)
        return tx.proposal.update({
          where: { id: proposalId },
          data: { targetId: created.id, inverse: inverse as unknown as Prisma.InputJsonObject, error: null },
        })
      }

      if (existing.kind === LIBRARY_KINDS.delete || existing.kind === LIBRARY_KINDS.merge) {
        // Both re-check usage and visibility now; one transaction, so a failure changes nothing.
        const payload = existing.payload as { id: string; fromId: string; intoId: string }
        await asLibraryRefusal(async () => {
          if (existing.kind === LIBRARY_KINDS.delete) await applyDelete(tx, payload)
          else await applyMerge(tx, payload)
        })
        await resolveLinkedFeedback(tx, existing, userId)
        return tx.proposal.update({ where: { id: proposalId }, data: { error: null } })
      }

      if (existing.kind === 'program.create') {
        const send = await resolveSend(tx, existing, userId, choices)
        const check = await checkProgram(tx, send.content, userId)
        if (!check.ok) throw new Refusal('invalid', check.error)
        const created = await createProgram(tx, check.program, check.definitionNames, userId)
        await resolveLinkedFeedback(tx, existing, userId)
        // No inverse: an approved program is an ordinary program and can't be reverted.
        return tx.proposal.update({
          where: { id: proposalId },
          data: { targetId: created.id, error: null, ...(send.payload && { payload: send.payload }) },
        })
      }

      if (existing.kind === 'anchors.update' || existing.kind === 'balance_targets.update') {
        const { changes } = existing.payload as { changes: Record<string, unknown> }
        const before = existing.before as Record<string, unknown>
        try {
          if (existing.kind === 'anchors.update') {
            const check = await checkAnchorChanges(tx, changes, userId)
            if (!check.ok) throw new Refusal('invalid', check.error)
            await swapAnchors(tx, userId, before as AnchorChanges, check.changes)
          } else {
            const check = checkTargetChanges(changes)
            if (!check.ok) throw new Refusal('invalid', check.error)
            await swapTargets(tx, userId, before as TargetChanges, check.changes)
          }
        } catch (error) {
          if (error instanceof BalanceConflict) {
            throw new Refusal('conflict', `${error.message} changed after the proposal was made`)
          }
          throw error
        }
        // Revert restores the touched keys' values from before approve.
        await resolveLinkedFeedback(tx, existing, userId)
        return tx.proposal.update({
          where: { id: proposalId },
          data: { inverse: before as Prisma.InputJsonObject, error: null },
        })
      }

      if (existing.kind === 'saved_workout.create') {
        const send = await resolveSend(tx, existing, userId, choices)
        const check = await checkWorkoutCreate(tx, send.content, userId)
        if (!check.ok) throw new Refusal('invalid', check.error)
        // A coach's send makes a "coach" workout; an agent's an "agent" one (the New group says who).
        const origin = existing.coachLinkId ? 'coach' : 'agent'
        const created = await createSavedWorkout(tx, userId, check.value, check.definitionNames, origin)
        const inverse: CreateInverse = { op: 'delete', id: created.id }
        await resolveLinkedFeedback(tx, existing, userId)
        return tx.proposal.update({
          where: { id: proposalId },
          data: {
            targetId: created.id,
            inverse: inverse as unknown as Prisma.InputJsonObject,
            error: null,
            ...(send.payload && { payload: send.payload }),
          },
        })
      }

      if (existing.kind === 'saved_workout.update') {
        const { savedWorkoutId, changes } = existing.payload as unknown as SavedWorkoutUpdatePayload
        const check = await checkWorkoutChanges(tx, changes, userId)
        if (!check.ok) throw new Refusal('invalid', check.error)
        const before = existing.before as WorkoutFields
        await asConflict(() =>
          applySavedWorkoutUpdate(tx, userId, savedWorkoutId, before, check.value, check.definitionNames)
        )
        // Revert restores the touched fields' values from before approve.
        await resolveLinkedFeedback(tx, existing, userId)
        return tx.proposal.update({
          where: { id: proposalId },
          data: { inverse: before as unknown as Prisma.InputJsonObject, error: null },
        })
      }

      const { id, changes } = existing.payload as unknown as UpdatePayload
      const before = existing.before as Record<string, unknown>
      const check = await checkUpdate(tx, id, changes, userId)
      if (!check.ok) throw new Refusal('invalid', check.error)

      // Optimistic concurrency: only apply if the definition is unchanged
      // since the proposal was made.
      const applied = await tx.exerciseDefinition.updateMany({
        where: { id, updatedAt: new Date(before.updatedAt as string) },
        data: updateData(changes),
      })
      if (applied.count === 0) {
        throw new Refusal('conflict', 'exercise was changed after the proposal was made')
      }

      const { updatedAt } = await tx.exerciseDefinition.findUniqueOrThrow({
        where: { id },
        select: { updatedAt: true },
      })
      const restore: Record<string, unknown> = {}
      for (const key of Object.keys(changes)) restore[key] = before[key]
      const inverse: UpdateInverse = {
        op: 'update',
        id,
        data: restore,
        appliedUpdatedAt: updatedAt.toISOString(),
      }
      await resolveLinkedFeedback(tx, existing, userId)
      return tx.proposal.update({
        where: { id: proposalId },
        data: { inverse: inverse as unknown as Prisma.InputJsonObject, error: null },
      })
    }, { timeout: 30000 })

    logger.info({ proposalId, userId, kind: proposal.kind }, 'Proposal applied')
    return { ok: true, proposal }
  } catch (error) {
    if (error instanceof Refusal) return refuseApproval(prisma, proposalId, error.code, error.message)
    if (error instanceof ChoiceRefusal) {
      await refuseApproval(prisma, proposalId, 'invalid', error.message)
      return { ok: false, code: 'invalid', error: error.message, userError: error.message }
    }
    // A delete or merge that failed part-way (e.g. a constraint): the transaction rolled back.
    if (
      (existing.kind === LIBRARY_KINDS.delete || existing.kind === LIBRARY_KINDS.merge) &&
      (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError)
    ) {
      logger.error({ error, proposalId, kind: existing.kind }, 'Library proposal failed to apply')
      return refuseApproval(prisma, proposalId, 'invalid', 'applying it failed, so nothing was changed; see the server log')
    }
    // Settings or the profile row was created by someone else while approving.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      (existing.kind === 'anchors.update' || existing.kind === 'balance_targets.update')
    ) {
      return refuseApproval(prisma, proposalId, 'conflict', 'settings changed while approving')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return refuseApproval(prisma, proposalId, 'invalid', 'an exercise with this name already exists')
    }
    // A referenced exercise definition was deleted between the check and the create.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return refuseApproval(prisma, proposalId, 'invalid', 'a referenced exercise no longer exists')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') {
      return refuseApproval(prisma, proposalId, 'invalid', 'approve timed out before it finished; nothing was applied')
    }
    throw error
  }
}

// The transaction rolled back. Record why on the proposal; a conflict is
// terminal (so is a delete whose exercise came into use), a validation failure leaves it pending.
async function refuseApproval(
  prisma: PrismaClient,
  proposalId: string,
  code: DecisionCode,
  error: string
): Promise<DecisionResult> {
  if (code === 'conflict' || code === 'in_use') {
    await prisma.proposal.updateMany({
      where: { id: proposalId, status: 'pending' },
      data: { status: 'conflict', decidedAt: new Date(), error },
    })
  } else if (code === 'invalid') {
    await prisma.proposal.updateMany({ where: { id: proposalId, status: 'pending' }, data: { error } })
  }
  logger.info({ proposalId, code, error }, 'Proposal approval refused')
  return { ok: false, code, error }
}

export async function rejectProposal(
  prisma: PrismaClient,
  proposalId: string,
  userId: string
): Promise<DecisionResult> {
  const updated = await prisma.proposal.updateMany({
    where: { id: proposalId, userId, status: 'pending' },
    data: { status: 'rejected', decidedAt: new Date() },
  })
  const proposal = await findOwned(prisma, proposalId, userId)
  if (!proposal) return { ok: false, code: 'not_found', error: 'proposal not found' }
  if (updated.count === 0) return { ok: false, code: 'not_pending', error: 'proposal is not pending' }

  logger.info({ proposalId, userId }, 'Proposal rejected')
  return { ok: true, proposal }
}

/**
 * Undo an applied proposal. An update restores the fields it changed, unless the
 * definition was edited since approve (conflict); a create
 * deletes the definition unless a workout already uses it. An anchor or target
 * change restores the touched keys unless one moved since approve (conflict).
 * A saved workout create deletes it unless Dustin started or edited it; a
 * saved workout change restores the touched fields unless one moved since
 * approve. A program create can't be reverted; the program is deleted from
 * Programs like any other. A direct library create or update reverts like an
 * exercise proposal (an update also renames Exercise rows back); an approved
 * delete or merge can't be reverted.
 */
export async function revertProposal(
  prisma: PrismaClient,
  proposalId: string,
  userId: string
): Promise<DecisionResult> {
  const existing = await findOwned(prisma, proposalId, userId)
  if (!existing) return { ok: false, code: 'not_found', error: 'proposal not found' }
  if (existing.status !== 'applied') {
    return { ok: false, code: 'not_applied', error: 'proposal is not applied' }
  }
  if (existing.kind === 'program.create') {
    return {
      ok: false,
      code: 'invalid',
      error: "program proposals can't be reverted; delete the program from Programs instead",
    }
  }
  if (existing.kind === LIBRARY_KINDS.delete || existing.kind === LIBRARY_KINDS.merge) {
    return { ok: false, code: 'invalid', error: "approved deletes and merges can't be reverted" }
  }
  if (!existing.inverse) return { ok: false, code: 'not_applied', error: 'proposal is not applied' }

  try {
    const proposal = await prisma.$transaction(async (tx) => {
      const claimed = await tx.proposal.updateMany({
        where: { id: proposalId, userId, status: 'applied' },
        data: { status: 'reverted', decidedAt: new Date() },
      })
      if (claimed.count === 0) throw new Refusal('not_applied', 'proposal is not applied')

      if (existing.kind === 'anchors.update' || existing.kind === 'balance_targets.update') {
        // Only restore if every touched key still holds what approve wrote.
        const { changes } = existing.payload as { changes: Record<string, unknown> }
        try {
          if (existing.kind === 'anchors.update') {
            await swapAnchors(tx, userId, changes as AnchorChanges, existing.inverse as AnchorChanges)
          } else {
            await swapTargets(tx, userId, changes as TargetChanges, existing.inverse as TargetChanges)
          }
        } catch (error) {
          if (error instanceof BalanceConflict) {
            throw new Refusal('conflict', `${error.message} changed after the proposal was applied`)
          }
          throw error
        }
        return tx.proposal.findUniqueOrThrow({ where: { id: proposalId } })
      }

      if (existing.kind === 'saved_workout.create') {
        const { id } = existing.inverse as unknown as CreateInverse
        await asConflict(() => deleteSavedWorkout(tx, userId, id, existing.payload as unknown as WorkoutCreateInput))
        return tx.proposal.findUniqueOrThrow({ where: { id: proposalId } })
      }

      if (existing.kind === 'saved_workout.update') {
        const { savedWorkoutId, changes } = existing.payload as unknown as SavedWorkoutUpdatePayload
        await asConflict(() =>
          restoreSavedWorkout(tx, userId, savedWorkoutId, changes, existing.inverse as unknown as WorkoutFields)
        )
        return tx.proposal.findUniqueOrThrow({ where: { id: proposalId } })
      }

      if (existing.kind === LIBRARY_KINDS.create || existing.kind === LIBRARY_KINDS.update) {
        const inverse = existing.inverse as unknown as CreateInverse | UpdateInverse
        await asLibraryRefusal(() =>
          inverse.op === 'delete' ? revertLibraryCreate(tx, inverse.id) : revertLibraryUpdate(tx, inverse)
        )
        return tx.proposal.findUniqueOrThrow({ where: { id: proposalId } })
      }

      const inverse = existing.inverse as unknown as CreateInverse | UpdateInverse
      if (inverse.op === 'delete') {
        const uses = await tx.exercise.count({ where: { exerciseDefinitionId: inverse.id } })
        if (uses > 0) {
          throw new Refusal('in_use', `exercise is in use by ${pluralize(uses, 'workout')}`)
        }
        await tx.exerciseDefinition.deleteMany({ where: { id: inverse.id } })
      } else {
        // Only restore if nobody edited the definition since approve.
        const restored = await tx.exerciseDefinition.updateMany({
          where: { id: inverse.id, updatedAt: new Date(inverse.appliedUpdatedAt) },
          data: updateData(inverse.data),
        })
        if (restored.count === 0) {
          throw new Refusal('conflict', 'exercise was changed after the proposal was applied')
        }
      }
      return tx.proposal.findUniqueOrThrow({ where: { id: proposalId } })
    })

    logger.info({ proposalId, userId }, 'Proposal reverted')
    return { ok: true, proposal }
  } catch (error) {
    if (error instanceof Refusal) {
      logger.info({ proposalId, code: error.code }, 'Proposal revert refused')
      return { ok: false, code: error.code, error: error.message }
    }
    throw error
  }
}
