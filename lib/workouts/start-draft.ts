import { createId } from '@paralleldrive/cuid2'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { SavedWorkoutData } from '@/types/saved-workout'

/**
 * Start a freestyle draft pre-filled with a plan: one-off exercises plus their
 * prescribed sets. Used by "start a saved workout" and "repeat a session".
 *
 * Only one open draft per user. The check-then-create runs in a Serializable
 * transaction so two concurrent requests can't both insert; the loser gets the
 * winner back as the existing draft.
 */

export interface ExistingDraft {
  completionId: string
  isAdHoc: boolean
  name: string | null
}

export type StartDraftResult = { ok: true; completionId: string } | { ok: false; draft: ExistingDraft }

const DRAFT_SELECT = {
  id: true,
  isAdHoc: true,
  name: true,
  workout: { select: { name: true } },
} as const

type DraftRow = { id: string; isAdHoc: boolean; name: string | null; workout: { name: string } | null }

const toExisting = (d: DraftRow): ExistingDraft => ({
  completionId: d.id,
  isAdHoc: d.isAdHoc,
  name: d.name ?? d.workout?.name ?? null,
})

/** The 409 body the start routes return when a draft already exists. */
export function draftExistsBody(draft: ExistingDraft) {
  return {
    error: 'DRAFT_EXISTS',
    message: 'Finish your current workout before starting a new one.',
    draft,
  }
}

export async function startDraftFromPlan(opts: {
  userId: string
  name: string
  plan: SavedWorkoutData
  savedWorkoutId?: string | null
  /** Extra writes in the same transaction, after the draft is created. */
  afterCreate?: (tx: Prisma.TransactionClient, completionId: string) => Promise<void>
}): Promise<StartDraftResult> {
  const { userId, name, plan } = opts
  const now = new Date()

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<StartDraftResult> => {
        const found = await tx.workoutCompletion.findFirst({
          where: { userId, status: 'draft', isArchived: false },
          select: DRAFT_SELECT,
        })
        if (found) return { ok: false, draft: toExisting(found) }

        const completion = await tx.workoutCompletion.create({
          data: {
            workoutId: null,
            savedWorkoutId: opts.savedWorkoutId ?? null,
            userId,
            status: 'draft',
            isAdHoc: true,
            name,
            startedAt: now,
            completedAt: now,
          },
          select: { id: true },
        })

        // Pre-generate exercise ids so we can link prescribed sets in a
        // single createMany without a per-exercise round-trip.
        const exerciseRows = plan.map((ex) => ({
          id: createId(),
          name: ex.name,
          exerciseDefinitionId: ex.exerciseDefinitionId,
          order: ex.order,
          notes: ex.notes ?? null,
          exerciseGroup: ex.exerciseGroup ?? null,
          workoutId: null,
          workoutCompletionId: completion.id,
          userId,
          isOneOff: true,
        }))
        if (exerciseRows.length > 0) {
          await tx.exercise.createMany({ data: exerciseRows })
        }

        const prescribedRows = plan.flatMap((ex, idx) =>
          (ex.sets ?? []).map((s) => ({
            exerciseId: exerciseRows[idx].id,
            userId,
            setNumber: s.setNumber,
            reps: s.reps,
            rir: s.rir ?? null,
            rpe: s.rpe ?? null,
            isWarmup: Boolean(s.isWarmup),
          }))
        )
        if (prescribedRows.length > 0) {
          await tx.prescribedSet.createMany({ data: prescribedRows })
        }

        if (opts.afterCreate) await opts.afterCreate(tx, completion.id)
        return { ok: true, completionId: completion.id }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
    return result
  } catch (txErr) {
    // Serialization failure on concurrent inserts: report the winner.
    if (
      txErr instanceof Prisma.PrismaClientKnownRequestError &&
      (txErr.code === 'P2034' || txErr.code === 'P2002')
    ) {
      const winner = await prisma.workoutCompletion.findFirst({
        where: { userId, status: 'draft', isArchived: false },
        select: DRAFT_SELECT,
      })
      if (winner) return { ok: false, draft: toExisting(winner) }
    }
    throw txErr
  }
}
