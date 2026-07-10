/**
 * Pure-math helpers for strength calibration and exercise preference learning.
 *
 * - Gap-decayed EWMA for strength estimates (calendar-time aware, so layoffs
 *   decay the estimate toward uncertainty instead of freezing it).
 * - Beta-distribution preference helpers with weekly exponential decay so
 *   ancient dislikes don't drown out recent signal.
 *
 * This module is intentionally free of I/O: no Prisma, no fetch, no fs.
 * Input hygiene (warmup exclusion, bodyweight exclusion, lbs normalization)
 * is the callers' contract, but violations are asserted here loudly.
 *
 * See docs/data-signal-audit.md (finding 3 / "gap-blind EWMA" and the
 * preference-decay recommendation) and issue #907.
 */

// ---------------------------------------------------------------------------
// Gap-decayed EWMA
// ---------------------------------------------------------------------------

export interface StrengthObservation {
  /** Weight in lbs. Callers must pre-normalize via normalizeWeightToLbs. */
  weightLbs: number
  /** Days before "now" this set was performed. 0 = today. */
  daysAgo: number
  /** Must be false/undefined — warmup sets are excluded from calibration. */
  isWarmup?: boolean
  /**
   * Must be false/undefined — bodyweight-exercise weights (often logged as 0)
   * are excluded from weight EWMAs (ExerciseDefinition.isBodyweight).
   */
  isBodyweight?: boolean
}

export interface EwmaOptions {
  /** Base smoothing factor applied when the gap equals typicalGapDays. */
  alpha?: number
  /** Expected days between observations of this movement (default weekly). */
  typicalGapDays?: number
}

export interface StrengthEstimate {
  /** Gap-decayed EWMA of observed weights (lbs), or null with no data. */
  estimateLbs: number | null
  /** Days since the most recent observation, or null with no data. */
  estimateStalenessDays: number | null
  observationCount: number
}

export const DEFAULT_EWMA_ALPHA = 0.3
export const DEFAULT_TYPICAL_GAP_DAYS = 7

/**
 * Effective smoothing factor for a given calendar gap:
 *   alpha' = 1 - (1 - alpha)^(gapDays / typicalGapDays)
 *
 * gap == typicalGapDays reproduces the base alpha; longer gaps weight the new
 * observation more heavily (a 3x-typical gap with alpha 0.3 gives ~0.66).
 * Gaps are clamped to a minimum of 1 day so same-day observations still
 * contribute instead of being ignored (alpha' of 0).
 */
export function effectiveAlpha(
  alpha: number,
  gapDays: number,
  typicalGapDays: number
): number {
  if (alpha <= 0 || alpha >= 1) {
    throw new Error(`alpha must be in (0, 1), got ${alpha}`)
  }
  if (typicalGapDays <= 0) {
    throw new Error(`typicalGapDays must be > 0, got ${typicalGapDays}`)
  }
  const clampedGap = Math.max(gapDays, 1)
  return 1 - (1 - alpha) ** (clampedGap / typicalGapDays)
}

function assertObservationHygiene(obs: StrengthObservation): void {
  if (obs.isWarmup === true) {
    throw new Error('gapDecayedEwma: warmup sets must be excluded by callers')
  }
  if (obs.isBodyweight === true) {
    throw new Error(
      'gapDecayedEwma: bodyweight-exercise observations must be excluded by callers'
    )
  }
  if (!Number.isFinite(obs.weightLbs) || obs.weightLbs < 0) {
    throw new Error(
      `gapDecayedEwma: weightLbs must be a finite non-negative number, got ${obs.weightLbs}`
    )
  }
  if (!Number.isFinite(obs.daysAgo) || obs.daysAgo < 0) {
    throw new Error(
      `gapDecayedEwma: daysAgo must be a finite non-negative number, got ${obs.daysAgo}`
    )
  }
}

/**
 * Gap-decayed exponentially weighted moving average of strength observations.
 *
 * Observations may be provided in any order; they are processed oldest-first.
 * The smoothing factor for each step scales with the calendar gap since the
 * previous observation (see effectiveAlpha), so a stream with a 3-week layoff
 * leans much harder on the post-layoff observation than a fresh stream does.
 *
 * Always emits estimateStalenessDays (days since the newest observation) so
 * downstream consumers can decay confidence in the estimate itself.
 */
export function gapDecayedEwma(
  observations: StrengthObservation[],
  options: EwmaOptions = {}
): StrengthEstimate {
  const alpha = options.alpha ?? DEFAULT_EWMA_ALPHA
  const typicalGapDays = options.typicalGapDays ?? DEFAULT_TYPICAL_GAP_DAYS

  for (const obs of observations) {
    assertObservationHygiene(obs)
  }

  if (observations.length === 0) {
    return { estimateLbs: null, estimateStalenessDays: null, observationCount: 0 }
  }

  // Oldest first (largest daysAgo first).
  const ordered = [...observations].sort((a, b) => b.daysAgo - a.daysAgo)

  let estimate = ordered[0].weightLbs
  for (let i = 1; i < ordered.length; i++) {
    const gapDays = ordered[i - 1].daysAgo - ordered[i].daysAgo
    const a = effectiveAlpha(alpha, gapDays, typicalGapDays)
    estimate = a * ordered[i].weightLbs + (1 - a) * estimate
  }

  return {
    estimateLbs: estimate,
    estimateStalenessDays: ordered[ordered.length - 1].daysAgo,
    observationCount: ordered.length,
  }
}

/**
 * Estimated 1RM via the Epley formula: weight * (1 + reps / 30).
 * Epley is the project-wide e1RM choice (see lib/stats/exercise-performance.ts);
 * duplicated here rather than imported to keep this module free of files that
 * touch Prisma types.
 */
export function epleyE1RM(weightLbs: number, reps: number): number {
  if (reps <= 0) throw new Error(`epleyE1RM: reps must be >= 1, got ${reps}`)
  if (reps === 1) return weightLbs
  return weightLbs * (1 + reps / 30)
}

// ---------------------------------------------------------------------------
// Beta-distribution preference helpers
// ---------------------------------------------------------------------------

export interface BetaParams {
  alpha: number
  beta: number
}

/** Uninformative Beta(1, 1) prior. */
export const UNIFORM_PRIOR: BetaParams = { alpha: 1, beta: 1 }

/** Weekly multiplicative decay on evidence counts (~10-month half-life). */
export const WEEKLY_DECAY_FACTOR = 0.985

function assertBetaParams(params: BetaParams, context: string): void {
  if (!Number.isFinite(params.alpha) || params.alpha <= 0) {
    throw new Error(`${context}: alpha must be > 0, got ${params.alpha}`)
  }
  if (!Number.isFinite(params.beta) || params.beta <= 0) {
    throw new Error(`${context}: beta must be > 0, got ${params.beta}`)
  }
}

/** Standard conjugate Beta update from accept/reject-style evidence counts. */
export function updateBeta(
  params: BetaParams,
  accepts: number,
  rejects: number
): BetaParams {
  assertBetaParams(params, 'updateBeta')
  if (accepts < 0 || rejects < 0) {
    throw new Error(
      `updateBeta: evidence counts must be >= 0, got accepts=${accepts} rejects=${rejects}`
    )
  }
  return { alpha: params.alpha + accepts, beta: params.beta + rejects }
}

/**
 * Exponentially decay accumulated evidence: counts above the prior shrink by
 * factor^weeks (default 0.985/week, half-life ~46 weeks). The decay applies to
 * evidence only — parameters relax toward the prior rather than below 1, which
 * a raw `Beta_old * factor^weeks` multiply would eventually do (an invalid,
 * bimodal Beta). At the half-life, the influence of old accepts/rejects is
 * halved, so ancient dislikes fade behind recent signal.
 */
export function decayBeta(
  params: BetaParams,
  weeks: number,
  factor: number = WEEKLY_DECAY_FACTOR,
  prior: BetaParams = UNIFORM_PRIOR
): BetaParams {
  assertBetaParams(params, 'decayBeta')
  assertBetaParams(prior, 'decayBeta prior')
  if (weeks < 0) throw new Error(`decayBeta: weeks must be >= 0, got ${weeks}`)
  if (factor <= 0 || factor > 1) {
    throw new Error(`decayBeta: factor must be in (0, 1], got ${factor}`)
  }
  const f = factor ** weeks
  return {
    alpha: prior.alpha + (params.alpha - prior.alpha) * f,
    beta: prior.beta + (params.beta - prior.beta) * f,
  }
}

/** Posterior mean: alpha / (alpha + beta). */
export function betaMean(params: BetaParams): number {
  assertBetaParams(params, 'betaMean')
  return params.alpha / (params.alpha + params.beta)
}

/** Posterior variance. */
export function betaVariance(params: BetaParams): number {
  assertBetaParams(params, 'betaVariance')
  const { alpha: a, beta: b } = params
  const n = a + b
  return (a * b) / (n * n * (n + 1))
}

/** z-scores for common two-sided credible-interval levels. */
export const Z_90 = 1.6449
export const Z_95 = 1.96

/**
 * Approximate central credible interval via the normal approximation
 * (mean +/- z * sd), clamped to [0, 1]. Good enough for ranking/eligibility
 * decisions downstream; avoids shipping an incomplete-beta inverse.
 */
export function betaCredibleInterval(
  params: BetaParams,
  z: number = Z_90
): { lower: number; upper: number } {
  const mean = betaMean(params)
  const sd = Math.sqrt(betaVariance(params))
  return {
    lower: Math.max(0, mean - z * sd),
    upper: Math.min(1, mean + z * sd),
  }
}

/** Marsaglia–Tsang gamma sampler (shape only; scale 1). */
function sampleGamma(shape: number, rng: () => number): number {
  if (shape < 1) {
    // Boost: Gamma(shape) = Gamma(shape + 1) * U^(1/shape)
    return sampleGamma(shape + 1, rng) * rng() ** (1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number
    let v: number
    do {
      // Box–Muller standard normal
      const u1 = rng()
      const u2 = rng()
      x = Math.sqrt(-2 * Math.log(u1 || Number.MIN_VALUE)) * Math.cos(2 * Math.PI * u2)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rng()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

/**
 * Draw a sample from Beta(alpha, beta) — e.g. for Thompson sampling over
 * exercise preferences. Pass a seeded rng for deterministic tests.
 */
export function sampleBeta(
  params: BetaParams,
  rng: () => number = Math.random
): number {
  assertBetaParams(params, 'sampleBeta')
  const x = sampleGamma(params.alpha, rng)
  const y = sampleGamma(params.beta, rng)
  return x / (x + y)
}
