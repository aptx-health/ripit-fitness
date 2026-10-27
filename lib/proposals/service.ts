import { Prisma, type PrismaClient, type Proposal } from '@prisma/client'
import { pluralize } from '@/lib/format/pluralize'
import { logger } from '@/lib/logger'
import { notify as defaultNotify, type Notify } from '@/lib/notify'
import type {
  CreateExerciseDefinitionInput,
  UpdateExerciseDefinitionInput,
} from '@/lib/validators/exercise-definition'
import {
  checkCreate,
  checkUpdate,
  createData,
  pickEditable,
  snapshot,
  updateData,
  visibleTo,
} from './exercise-definition'
import { checkProgram, createProgram, programSummary } from './program'

export const PROPOSAL_KINDS = ['exercise_definition.create', 'exercise_definition.update', 'program.create'] as const
export type ProposalKind = (typeof PROPOSAL_KINDS)[number]

export const PROPOSAL_KIND_LABELS: Record<ProposalKind, string> = {
  'exercise_definition.create': 'New exercise',
  'exercise_definition.update': 'Exercise edit',
  'program.create': 'New program',
}

export const PROPOSAL_STATUSES = ['pending', 'applied', 'rejected', 'reverted', 'conflict'] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

export type DecisionCode = 'not_found' | 'not_pending' | 'not_applied' | 'conflict' | 'in_use' | 'invalid'

export type DecisionResult =
  | { ok: true; proposal: Proposal }
  | { ok: false; code: DecisionCode; error: string }

export type CreateProposalInput =
  | {
      userId: string
      agentTokenId: string
      kind: 'exercise_definition.create'
      rationale: string
      definition: CreateExerciseDefinitionInput
      feedbackId?: string
    }
  | {
      userId: string
      agentTokenId: string
      kind: 'exercise_definition.update'
      rationale: string
      id: string
      changes: UpdateExerciseDefinitionInput
      feedbackId?: string
    }
  | {
      userId: string
      agentTokenId: string
      kind: 'program.create'
      rationale: string
      program: unknown
      feedbackId?: string
    }

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

// Thrown inside a transaction to roll it back; carries the result to return.
class Refusal extends Error {
  constructor(
    readonly code: DecisionCode,
    message: string
  ) {
    super(message)
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

function proposalUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/proposals/${id}`
}

/**
 * Record an agent's proposal. Validates it now (and again on approve), then
 * notifies. A notification failure never blocks the proposal.
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
      agentTokenId: input.agentTokenId,
      kind: input.kind,
      summary: `Create exercise "${input.definition.name}"`,
      rationale: input.rationale,
      payload: definition as Prisma.InputJsonObject,
    }
  } else if (input.kind === 'program.create') {
    const check = await checkProgram(prisma, input.program, input.userId)
    if (!check.ok) return check
    data = {
      userId: input.userId,
      agentTokenId: input.agentTokenId,
      kind: input.kind,
      summary: programSummary(check.program),
      rationale: input.rationale,
      payload: check.program as unknown as Prisma.InputJsonObject,
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
      agentTokenId: input.agentTokenId,
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

/** Apply a pending proposal in one transaction. A stale update is marked `conflict`. */
export async function approveProposal(
  prisma: PrismaClient,
  proposalId: string,
  userId: string
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

      if (existing.kind === 'program.create') {
        const check = await checkProgram(tx, existing.payload, userId)
        if (!check.ok) throw new Refusal('invalid', check.error)
        const created = await createProgram(tx, check.program, check.definitionNames, userId)
        await resolveLinkedFeedback(tx, existing, userId)
        // No inverse: an approved program is an ordinary program and can't be reverted.
        return tx.proposal.update({
          where: { id: proposalId },
          data: { targetId: created.id, error: null },
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
// terminal, a validation failure leaves it pending.
async function refuseApproval(
  prisma: PrismaClient,
  proposalId: string,
  code: DecisionCode,
  error: string
): Promise<DecisionResult> {
  if (code === 'conflict') {
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
 * deletes the definition unless a workout already uses it. A program create
 * can't be reverted; the program is deleted from Programs like any other.
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
  if (!existing.inverse) return { ok: false, code: 'not_applied', error: 'proposal is not applied' }

  try {
    const proposal = await prisma.$transaction(async (tx) => {
      const claimed = await tx.proposal.updateMany({
        where: { id: proposalId, userId, status: 'applied' },
        data: { status: 'reverted', decidedAt: new Date() },
      })
      if (claimed.count === 0) throw new Refusal('not_applied', 'proposal is not applied')

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
