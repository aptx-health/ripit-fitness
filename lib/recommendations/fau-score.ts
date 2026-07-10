/**
 * Recovery-aware FAU need score (#963) — the composite that powers the picker's
 * third "Recovery-aware" sort mode.
 *
 * The plain neglected sort (#962) can only see deficit + how long since a FAU
 * was last trained. This score layers in the signals only the aggregates job and
 * session-effort data expose:
 *
 *   need(fau) = deficitWeight · deficitShare
 *             + w1 · staleness(lastSessionDaysAgo)
 *             + w2 · heavyStaleness(lastHeavyDaysAgo)
 *             − w3 · recoveryPenalty
 *
 * where `recoveryPenalty` fires when the FAU was trained inside the recovery
 * window (default 48h) in a session logged at or above the RPE cutoff (default
 * 8) — i.e. we just hammered it, so push it down rather than recommend it again.
 *
 * COMEBACK MODE. When the user has a detraining gap (they've been away),
 * `deficitWeight` drops from 1 to COMEBACK_DEFICIT_WEIGHT so frequency/staleness
 * leads instead of the single biggest deficit. Rationale: a returning user is
 * better served by "ease back in across the movements you've not touched" than
 * by "chase your one largest ratio gap" — the deficit numbers are also the least
 * trustworthy right after a layoff.
 *
 * GRACEFUL DEGRADATION. Every aggregates-derived term degrades to 0 when its
 * input is absent (`lastHeavyDaysAgo` undefined, `recentlyHammered` false,
 * comeback off). With no aggregates at all the score collapses to
 * `deficitShare + w1·staleness` — i.e. the plain #962 neglected ordering. The
 * scorer never throws.
 *
 * Pure and dependency-free apart from the FAU key type and the shared staleness
 * helpers, so it is unit-testable in isolation and safe to import client-side
 * (type-only) or server-side.
 */

import type { FAUKey } from '@/lib/fau-volume'
import { daysSinceLabel, stalenessScore } from './staleness'

// ---- Code defaults for the #963 TuningConfig knobs -------------------------
// These live here (next to the math they drive) and are re-exported into
// lib/tuning/config.ts's DEFAULT_TUNING_CONFIG so "code default" in the admin
// form is genuinely this behavior.

/** w1 — weight on staleness(lastSessionDaysAgo). */
export const DEFAULT_FAU_STALENESS_WEIGHT = 0.05
/** w2 — weight on heavyStaleness(lastHeavyDaysAgo). */
export const DEFAULT_FAU_HEAVY_STALENESS_WEIGHT = 0.05
/** w3 — recovery penalty subtracted when the FAU was recently hammered. */
export const DEFAULT_FAU_RECOVERY_PENALTY_WEIGHT = 0.1
/** Recovery window: a session this many hours ago (or fewer) can trigger the penalty. */
export const DEFAULT_FAU_RECOVERY_WINDOW_HOURS = 48
/** Recovery penalty only fires for sessions logged at/above this RPE-equivalent effort. */
export const DEFAULT_FAU_RECOVERY_RPE_CUTOFF = 8

// ---- Internal normalization / mode constants (deliberately not knobs) ------

/** Horizon (days) over which last-session staleness saturates to 1. */
const STALENESS_HORIZON_DAYS = 14
/** Heavy work recovers/decays slower, so its staleness saturates later. */
const HEAVY_STALENESS_HORIZON_DAYS = 21
/** Comeback mode deficit weight (see module header). */
const COMEBACK_DEFICIT_WEIGHT = 0.5
/** A weighted term below this magnitude is treated as "no signal" for chips. */
const REASON_EPSILON = 1e-6

export type FauReasonKind = 'stale' | 'heavy' | 'recovering'

/** At most one short chip explaining a FAU's position in the recovery sort. */
export interface FauReason {
  label: string
  kind: FauReasonKind
}

/** Per-FAU inputs. Aggregates-derived fields are optional and degrade to 0. */
export interface FauScoreInput {
  fau: FAUKey
  /** targetShare − actualShare from the #962 muscle-balance snapshot. */
  deficitShare: number
  /** Days since last trained, from the #962 snapshot (null = never in-window). */
  lastTrainedDaysAgo: number | null
  /**
   * Days since last session-relative-heavy work for this FAU (aggregates
   * `last_heavy_days_ago`). `undefined` = aggregates unavailable (term off);
   * `null` = aggregates present but never heavy in-window (maximally overdue).
   */
  lastHeavyDaysAgo?: number | null
  /** True when trained inside the recovery window at/above the RPE cutoff. */
  recentlyHammered?: boolean
}

export interface FauScoreWeights {
  stalenessWeight: number
  heavyStalenessWeight: number
  recoveryPenaltyWeight: number
}

export interface FauNeed {
  fau: FAUKey
  need: number
  reason: FauReason | null
}

export interface ScoreFausOptions {
  weights: FauScoreWeights
  /** Shift weighting toward frequency/staleness for a returning user. */
  comebackMode?: boolean
}

/**
 * Score and rank FAUs by recovery-aware need, highest first. Deterministic:
 * ties break on the FAU key so the order is stable across renders.
 */
export function scoreFaus(inputs: FauScoreInput[], options: ScoreFausOptions): FauNeed[] {
  const { weights } = options
  const deficitWeight = options.comebackMode ? COMEBACK_DEFICIT_WEIGHT : 1

  return inputs
    .map((input) => {
      const stale = stalenessScore(input.lastTrainedDaysAgo, STALENESS_HORIZON_DAYS)
      const heavyAvailable = input.lastHeavyDaysAgo !== undefined
      const heavyStale = heavyAvailable
        ? stalenessScore(input.lastHeavyDaysAgo ?? null, HEAVY_STALENESS_HORIZON_DAYS)
        : 0
      const penalty = input.recentlyHammered ? 1 : 0

      const cStale = weights.stalenessWeight * stale
      const cHeavy = weights.heavyStalenessWeight * heavyStale
      const cRecover = -weights.recoveryPenaltyWeight * penalty

      const need = deficitWeight * input.deficitShare + cStale + cHeavy + cRecover
      const reason = pickReason(input, cStale, cHeavy, cRecover)

      return { fau: input.fau, need, reason }
    })
    .sort((a, b) => {
      if (b.need !== a.need) return b.need - a.need
      return a.fau.localeCompare(b.fau)
    })
}

/**
 * Choose the single reason chip that best explains this FAU's position, by the
 * largest-magnitude weighted contribution:
 *   - "recovering"   — the recovery penalty is active (why it's ranked down);
 *   - staleness       — a never/long-untrained FAU leads with its "days since";
 *   - "heavy overdue" — trained recently but not heavy in a while.
 * Returns null when no term carries meaningful weight (e.g. all weights 0).
 */
function pickReason(
  input: FauScoreInput,
  cStale: number,
  cHeavy: number,
  cRecover: number
): FauReason | null {
  // The recovery penalty is a distinct "why is this pushed down" story; surface
  // it whenever it's active and carries weight.
  if (Math.abs(cRecover) >= REASON_EPSILON) {
    return { label: 'recovering', kind: 'recovering' }
  }
  // A FAU never trained in-window: its "never logged" staleness is the honest lead,
  // even if the heavy term ties it numerically.
  if (input.lastTrainedDaysAgo === null) {
    return cStale >= REASON_EPSILON
      ? { label: daysSinceLabel(null), kind: 'stale' }
      : null
  }
  // Heavy-overdue only wins when it strictly out-weighs plain staleness — i.e.
  // the FAU is being trained but hasn't been loaded heavy in a while.
  if (cHeavy > cStale && cHeavy >= REASON_EPSILON) {
    return { label: 'heavy overdue', kind: 'heavy' }
  }
  if (cStale >= REASON_EPSILON) {
    return { label: daysSinceLabel(input.lastTrainedDaysAgo), kind: 'stale' }
  }
  return null
}
