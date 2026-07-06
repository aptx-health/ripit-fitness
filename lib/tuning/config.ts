/**
 * TuningConfig — the deliberately-minimal, admin-editable set of learning-pipeline
 * knobs (issue #937).
 *
 * This module is the single source of truth for the knob set, their code
 * defaults (imported from where each value already lives — change the default
 * there, not here), their valid ranges, and their downstream-effect copy. It is
 * also the READ path: `parseTuningConfig` turns a stored JSON blob into a fully
 * populated config with per-field fallback to the code default, so a malformed,
 * partial, or missing row can never break the pipeline.
 *
 * DEPENDENCY BOUNDARY (see #942 CI break): the aggregates compute path runs
 * inside the clone-worker image, and this module is reachable from it. It MUST
 * NOT import zod (not even `import type`). Write-time validation with ranges
 * lives in `lib/tuning/schema.ts`, imported only by the admin write route.
 *
 * Explicitly NOT tunable: write-time normalizations (the RIR→RPE mapping
 * `10 − rir`, preference-evidence normalization). Those are contracts, not
 * parameters — changing them would silently reinterpret stored history. Resist
 * adding knobs beyond this curated v1 set.
 */

import { DEFAULT_AGGREGATES_OPTIONS } from '@/lib/aggregates/compute'
import type { AggregatesOptions } from '@/lib/aggregates/types'
import {
  DEFAULT_EWMA_ALPHA,
  DEFAULT_TYPICAL_GAP_DAYS,
  WEEKLY_DECAY_FACTOR,
} from '@/lib/learning/math'
import { HEAVY_E1RM_FRACTION, HEAVY_EFFORT_RPE } from '@/lib/learning/weekly-intent'

/** The curated v1 knob set. All values are plain numbers. */
export interface TuningConfig {
  /** Session-relative "heavy": top-set e1RM ≥ this fraction of the movement EWMA. */
  heavyE1rmFraction: number
  /** Session-relative "heavy": logged effort (RPE-equivalent) ≥ this counts as heavy. */
  heavyEffortCutoff: number
  /** Weekly multiplicative decay on exercise-preference (Beta) evidence. */
  betaWeeklyDecay: number
  /** Base EWMA smoothing factor for strength calibration. */
  ewmaAlpha: number
  /** Expected days between observations for the gap-decayed EWMA. */
  ewmaTypicalGapDays: number
  /** Fewer than this many qualifying sessions in 14d flags low_data. */
  lowDataMinSessions: number
  /** Fewer than this many effective sets in 14d flags low_data. */
  lowDataMinSets: number
  /** A gap of at least this many days since the last session populates detraining_gap. */
  detrainingGapDays: number
}

/**
 * Code defaults, sourced from the constants each knob shadows so "code default"
 * shown in the admin UI is genuinely today's production behavior.
 */
export const DEFAULT_TUNING_CONFIG: TuningConfig = {
  heavyE1rmFraction: HEAVY_E1RM_FRACTION,
  heavyEffortCutoff: HEAVY_EFFORT_RPE,
  betaWeeklyDecay: WEEKLY_DECAY_FACTOR,
  ewmaAlpha: DEFAULT_EWMA_ALPHA,
  ewmaTypicalGapDays: DEFAULT_TYPICAL_GAP_DAYS,
  lowDataMinSessions: DEFAULT_AGGREGATES_OPTIONS.lowDataMinSessions,
  lowDataMinSets: DEFAULT_AGGREGATES_OPTIONS.lowDataMinSets,
  detrainingGapDays: DEFAULT_AGGREGATES_OPTIONS.detrainingMinDays,
}

/** Per-knob metadata for validation (ranges) and the admin form (label/effect). */
export interface KnobMeta {
  key: keyof TuningConfig
  label: string
  /** Inclusive minimum enforced at write time and in the read-path fallback. */
  min: number
  /** Inclusive maximum enforced at write time and in the read-path fallback. */
  max: number
  /** UI slider/step granularity. */
  step: number
  /** Whether the value must be an integer. */
  integer: boolean
  /** One-line description of the downstream effect (shown in the form). */
  effect: string
}

/**
 * The knob table. Ranges are conservative guardrails, not the mathematically
 * valid domain — e.g. ewmaAlpha's true domain is (0,1) but we clamp tighter so
 * an admin can't drive smoothing to a useless extreme.
 */
export const TUNING_KNOBS: readonly KnobMeta[] = [
  {
    key: 'heavyE1rmFraction',
    label: 'Heavy e1RM fraction',
    min: 0.5,
    max: 1.0,
    step: 0.01,
    integer: false,
    effect:
      'Top-set e1RM at or above this fraction of the movement-pattern EWMA counts a session as heavy — drives weekly-intent "heavy day" verdicts and per_fau.last_heavy_days_ago.',
  },
  {
    key: 'heavyEffortCutoff',
    label: 'Heavy effort cutoff (RPE-equiv)',
    min: 5,
    max: 10,
    step: 0.5,
    integer: false,
    effect:
      'Logged effort (RPE, or 10−RIR) at or above this counts a set as heavy regardless of load.',
  },
  {
    key: 'betaWeeklyDecay',
    label: 'Preference weekly decay',
    min: 0.9,
    max: 0.999,
    step: 0.001,
    integer: false,
    effect:
      'Weekly multiplicative decay on exercise-preference evidence; lower fades old likes/dislikes faster so recent signal dominates.',
  },
  {
    key: 'ewmaAlpha',
    label: 'EWMA alpha',
    min: 0.05,
    max: 0.95,
    step: 0.05,
    integer: false,
    effect:
      'Base smoothing for the strength-calibration EWMA; higher lets the newest session move the estimate more.',
  },
  {
    key: 'ewmaTypicalGapDays',
    label: 'EWMA typical gap (days)',
    min: 1,
    max: 28,
    step: 1,
    integer: true,
    effect:
      'Expected days between sessions for the gap-decayed EWMA; a gap this long reproduces the base alpha, longer gaps weight the new observation more.',
  },
  {
    key: 'lowDataMinSessions',
    label: 'Low-data min sessions (14d)',
    min: 1,
    max: 10,
    step: 1,
    integer: true,
    effect:
      'Fewer than this many qualifying sessions in the last 14 days flags the user low_data, suppressing per_fau status labels.',
  },
  {
    key: 'lowDataMinSets',
    label: 'Low-data min sets (14d)',
    min: 5,
    max: 60,
    step: 1,
    integer: true,
    effect: 'Fewer than this many effective sets in the last 14 days flags low_data.',
  },
  {
    key: 'detrainingGapDays',
    label: 'Detraining gap floor (days)',
    min: 3,
    max: 60,
    step: 1,
    integer: true,
    effect:
      'A gap of at least this many days since the last session (with prior training) populates detraining_gap.',
  },
] as const

/** True when `value` is within the knob's range and integer constraint. */
function isValidKnobValue(meta: KnobMeta, value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= meta.min &&
    value <= meta.max &&
    (!meta.integer || Number.isInteger(value))
  )
}

/**
 * READ PATH. Coerce a stored JSON blob into a complete TuningConfig. Every field
 * that is missing, the wrong type, non-finite, out of range, or (for integer
 * knobs) non-integer falls back to its code default. Never throws — a bad row
 * degrades to defaults so the pipeline behaves exactly as it does with no row.
 */
export function parseTuningConfig(raw: unknown): TuningConfig {
  const out: TuningConfig = { ...DEFAULT_TUNING_CONFIG }
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return out
  const obj = raw as Record<string, unknown>
  for (const meta of TUNING_KNOBS) {
    const value = obj[meta.key]
    if (isValidKnobValue(meta, value)) {
      out[meta.key] = value
    }
  }
  return out
}

/** Heavy-determination knobs consumed by lib/learning/weekly-intent. */
export interface HeavyOptions {
  heavyE1rmFraction: number
  heavyEffortCutoff: number
}

/** Extract the aggregates-relevant subset of the config for computeAggregates. */
export function toAggregatesOptions(cfg: TuningConfig): Partial<AggregatesOptions> {
  return {
    lowDataMinSessions: cfg.lowDataMinSessions,
    lowDataMinSets: cfg.lowDataMinSets,
    detrainingMinDays: cfg.detrainingGapDays,
    ewmaAlpha: cfg.ewmaAlpha,
    ewmaTypicalGapDays: cfg.ewmaTypicalGapDays,
    heavyE1rmFraction: cfg.heavyE1rmFraction,
    heavyEffortCutoff: cfg.heavyEffortCutoff,
  }
}

/** Extract the heavy-determination knobs for the weekly-intent evaluator. */
export function toHeavyOptions(cfg: TuningConfig): HeavyOptions {
  return {
    heavyE1rmFraction: cfg.heavyE1rmFraction,
    heavyEffortCutoff: cfg.heavyEffortCutoff,
  }
}
