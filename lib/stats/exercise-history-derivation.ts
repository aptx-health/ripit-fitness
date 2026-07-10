/**
 * Pure derivations for the logger history panel: best working-set e1RM per
 * session, all-time PR detection, and a coarse up/down/flat trend.
 *
 * No Prisma / no I/O — everything operates on plain session objects so it can
 * run in unit tests and on the client. e1RM uses the project-wide Epley formula
 * (`epleyE1RM`); weights are normalized to lbs so sessions logged in different
 * units stay comparable.
 */

import { epleyE1RM } from '@/lib/learning/math'
import { normalizeWeightToLbs } from '@/lib/stats/exercise-performance'

/** Minimal set shape the derivations need (structural — matches ExerciseHistorySet). */
export interface DerivationSet {
  reps: number
  weight: number
  weightUnit: string
  isWarmup: boolean
}

/** Minimal session shape (structural — matches ExerciseHistory). */
export interface DerivationSession {
  sets: DerivationSet[]
}

/**
 * Relative gap (as a fraction of the older value) below which two e1RMs are
 * treated as equal for the trend arrow — avoids flapping on rounding noise.
 */
export const TREND_EPSILON = 0.01

export type Trend = 'up' | 'down' | 'flat'

/**
 * A working set counts toward e1RM only if it is not a warmup and carries real
 * external load. Bodyweight / zero-weight sets are excluded because Epley on a
 * 0 lb load is meaningless.
 */
function isWorkingSet(set: DerivationSet): boolean {
  return !set.isWarmup && set.weight > 0
}

/**
 * The working set with the highest estimated 1RM in a session, or null when no
 * set qualifies (all warmups / bodyweight). Ties resolve to the first (lowest
 * set number) qualifying set.
 */
export function bestWorkingSet(sets: DerivationSet[]): DerivationSet | null {
  let best: DerivationSet | null = null
  let bestE1RM = -Infinity

  for (const set of sets) {
    if (!isWorkingSet(set)) continue
    const e1rm = epleyE1RM(normalizeWeightToLbs(set.weight, set.weightUnit), set.reps)
    if (e1rm > bestE1RM) {
      bestE1RM = e1rm
      best = set
    }
  }

  return best
}

/** Best working-set e1RM (lbs) for a session, or null when none qualifies. */
export function bestSetE1RM(sets: DerivationSet[]): number | null {
  const best = bestWorkingSet(sets)
  if (!best) return null
  return epleyE1RM(normalizeWeightToLbs(best.weight, best.weightUnit), best.reps)
}

/** Per-session best working-set e1RM, aligned to the input order. */
export function sessionE1RMs(sessions: DerivationSession[]): (number | null)[] {
  return sessions.map(session => bestSetE1RM(session.sets))
}

/**
 * Index of the session holding the all-time-best e1RM among those shown, or
 * null when no session has a qualifying working set. Sessions are expected
 * newest-first, so ties resolve to the most recent (earliest index).
 */
export function allTimePRSessionIndex(sessions: DerivationSession[]): number | null {
  const e1rms = sessionE1RMs(sessions)
  let prIndex: number | null = null
  let prValue = -Infinity

  for (let i = 0; i < e1rms.length; i++) {
    const value = e1rms[i]
    if (value === null) continue
    // Strict `>` keeps the earliest (most recent) session on ties.
    if (value > prValue) {
      prValue = value
      prIndex = i
    }
  }

  return prIndex
}

/**
 * Coarse trend of best-set e1RM across the shown sessions. Compares the newest
 * qualifying session against the oldest qualifying one (sessions newest-first).
 * Returns 'flat' when fewer than two sessions qualify or the change is within
 * TREND_EPSILON.
 */
export function e1rmTrend(sessions: DerivationSession[]): Trend {
  const e1rms = sessionE1RMs(sessions)

  // Newest qualifying (scan from front) and oldest qualifying (scan from back).
  const newest = e1rms.find((v): v is number => v !== null)
  let oldest: number | null = null
  for (let i = e1rms.length - 1; i >= 0; i--) {
    if (e1rms[i] !== null) {
      oldest = e1rms[i]
      break
    }
  }

  if (newest === undefined || oldest === null || newest === oldest) return 'flat'

  const delta = newest - oldest
  if (Math.abs(delta) <= oldest * TREND_EPSILON) return 'flat'
  return delta > 0 ? 'up' : 'down'
}
