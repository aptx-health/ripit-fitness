/**
 * Persistence + accessor layer for per-user, per-exercise preference learning.
 *
 * The Beta math (evidence update, weekly decay) lives in ./math. This module is
 * the thin I/O layer over the UserExercisePreference table:
 *
 *   - readPreference applies decay-on-read: stored (alpha, beta) are decayed by
 *     the elapsed weeks since lastUpdatedAt, so a preference that hasn't been
 *     touched in months relaxes toward the uniform prior automatically.
 *   - updatePreference decays the stored evidence to "now", applies the new
 *     accept/reject counts, writes the result, and stamps lastUpdatedAt. This
 *     keeps decay and update in one atomic upsert so repeated writes compose
 *     correctly instead of double-counting or double-decaying.
 *
 * No callers are wired yet — implicit-feedback hooks (writers) and the
 * training-state builder (reader) consume this in later issues. See issue #913.
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import {
  type BetaParams,
  UNIFORM_PRIOR,
  WEEKLY_DECAY_FACTOR,
  decayBeta,
  updateBeta,
} from './math'

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

/** Minimal Prisma surface so tests can pass a client or a transaction handle. */
type PreferenceDelegate = Pick<
  PrismaClient['userExercisePreference'],
  'findUnique' | 'upsert'
>

export interface PreferenceReadResult extends BetaParams {
  /** Whether a stored row existed. When false, the uniform prior is returned. */
  exists: boolean
  /** Weeks of decay applied to the stored evidence (0 when no row exists). */
  decayedWeeks: number
}

/**
 * Elapsed whole-and-fractional weeks between two instants, clamped to >= 0.
 * A negative gap (clock skew, future stamp) is treated as no elapsed time so
 * decayBeta never receives a negative exponent.
 */
export function elapsedWeeks(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_WEEK)
}

/**
 * Read a user's decayed preference for an exercise. Applies weekly decay based
 * on elapsed time since lastUpdatedAt. Returns the uniform prior when no row
 * exists, so callers always get a valid Beta to sample/rank from.
 */
export async function readPreference(
  db: PreferenceDelegate,
  userId: string,
  exerciseDefinitionId: string,
  now: Date = new Date(),
  factor: number = WEEKLY_DECAY_FACTOR
): Promise<PreferenceReadResult> {
  const row = await db.findUnique({
    where: { userId_exerciseDefinitionId: { userId, exerciseDefinitionId } },
  })

  if (!row) {
    return { ...UNIFORM_PRIOR, exists: false, decayedWeeks: 0 }
  }

  const weeks = elapsedWeeks(row.lastUpdatedAt, now)
  const decayed = decayBeta({ alpha: row.alpha, beta: row.beta }, weeks, factor)
  return { ...decayed, exists: true, decayedWeeks: weeks }
}

/**
 * Record new accept/reject evidence for a user's exercise preference.
 *
 * The stored evidence is first decayed to `now` (so stale evidence has faded
 * before the fresh signal lands), then updated with the new counts, then
 * written back with lastUpdatedAt stamped to `now`. Idempotent in structure:
 * calling with accepts=rejects=0 collapses the stored evidence toward the prior
 * by the elapsed decay and re-stamps, without inventing signal.
 */
export async function updatePreference(
  db: PreferenceDelegate,
  userId: string,
  exerciseDefinitionId: string,
  accepts: number,
  rejects: number,
  now: Date = new Date(),
  factor: number = WEEKLY_DECAY_FACTOR
): Promise<BetaParams> {
  const existing = await db.findUnique({
    where: { userId_exerciseDefinitionId: { userId, exerciseDefinitionId } },
  })

  const base: BetaParams = existing
    ? decayBeta(
        { alpha: existing.alpha, beta: existing.beta },
        elapsedWeeks(existing.lastUpdatedAt, now),
        factor
      )
    : { ...UNIFORM_PRIOR }

  const next = updateBeta(base, accepts, rejects)

  const created: Prisma.UserExercisePreferenceCreateInput = {
    userId,
    alpha: next.alpha,
    beta: next.beta,
    lastUpdatedAt: now,
    exerciseDefinition: { connect: { id: exerciseDefinitionId } },
  }

  await db.upsert({
    where: { userId_exerciseDefinitionId: { userId, exerciseDefinitionId } },
    create: created,
    update: { alpha: next.alpha, beta: next.beta, lastUpdatedAt: now },
  })

  return next
}
