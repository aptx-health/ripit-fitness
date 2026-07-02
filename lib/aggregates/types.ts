/**
 * Shapes for the UserTrainingAggregates precomputed training-state layer.
 *
 * These types define both the compute layer's output and the JSON column
 * contents persisted on the UserTrainingAggregates row. Field names follow
 * docs/SUGGEST_PAYLOAD_SPEC.md (v2, issue #919): snake_case inside the JSON
 * blobs to match the payload the training-state builder emits downstream, and
 * effort is always on the RPE-equivalent scale (`avg_effort_rpe_equiv`).
 */

export type DataMaturity = 'cold_start' | 'partial' | 'established'

/** One entry per FAU with at least one effective set in the trailing 8 weeks. */
export interface PerFauAggregate {
  fau: string
  /** Effective (non-warmup) sets attributed to this FAU's primary muscles, rolling 7d. */
  rolling_7d_sets: number
  /** Effective sets, rolling 14d. */
  rolling_14d_sets: number
  /** Qualifying sessions in rolling 14d containing >= 1 effective set for this FAU. */
  sessions_14d: number
  /**
   * Trailing 8-week median of this FAU's weekly effective sets, zero weeks
   * excluded; null until >= 2 non-zero weeks exist.
   */
  baseline_weekly_sets: number | null
  /**
   * Whole-body low-data flag (identical across all FAUs on a row): true when
   * the rolling 14d window holds < 3 qualifying sessions or < 20 effective sets.
   */
  low_data: boolean
}

/** A single timestamped top-set observation for a movement pattern. */
export interface CalibrationObservation {
  weight_lbs: number
  days_ago: number
}

/** One entry per movement pattern with >= 3 observations in the last 30 days. */
export interface MovementCalibration {
  movement_pattern: string
  /** Gap-decayed EWMA of per-session top-set e1RM (Epley), lbs. */
  ewma_e1rm_lbs: number
  /** Days since the observation the EWMA was last updated with. */
  estimate_staleness_days: number
  /** Mean of `rpe ?? (10 - rir)` across the top-set observations; null when none logged. */
  avg_effort_rpe_equiv: number | null
  /** e.g. "5-8" (min-max reps across top sets), or a single value when constant. */
  typical_rep_range: string
  /** Number of per-session top-set observations in the 30d window. */
  observation_count: number
  /** Last <= 5 top-set observations (actual weight, not e1RM), ordered oldest -> newest. */
  recent_observations: CalibrationObservation[]
  /** Days since the most recent observation for this pattern. */
  last_session_days_ago: number
}

/**
 * Full compute output. Timestamps are absolute (the builder converts to
 * days_ago at request time); the derived `daysSince*` / `detrainingGapDays`
 * integers are computed relative to `computedAt` for convenience.
 */
export interface TrainingAggregates {
  computedAt: Date
  sessionsLast7d: number
  daysSinceAnySession: number | null
  lastSessionAt: Date | null
  firstSessionAt: Date | null
  qualifyingSessionsTotal: number
  totalWeeklySetsBaseline: number | null
  acuteChronicRatio: number | null
  detrainingGapDays: number | null
  dataMaturity: DataMaturity
  perFau: PerFauAggregate[]
  perMovementCalibration: MovementCalibration[]
}

// ---------------------------------------------------------------------------
// Compute input
// ---------------------------------------------------------------------------

export interface AggregateSetInput {
  /** Raw logged weight; normalized to lbs inside compute via normalizeWeightToLbs. */
  weight: number
  weightUnit: string
  reps: number
  rpe: number | null
  rir: number | null
  isWarmup: boolean
  /** ExerciseDefinition.movementPattern; null when untagged (excluded from calibration). */
  movementPattern: string | null
  /** ExerciseDefinition.isBodyweight; bodyweight weights are excluded from EWMAs. */
  isBodyweight: boolean
  /** ExerciseDefinition.primaryFAUs; sets attribute to these for FAU volume. */
  primaryFAUs: string[]
}

/** A qualifying session (completed|abandoned, >= 1 non-warmup set) with its sets. */
export interface AggregateSessionInput {
  completedAt: Date
  status: string
  sets: AggregateSetInput[]
}

export interface ComputeInput {
  now: Date
  /** Detailed qualifying sessions within the trailing detail window (>= ~70d). */
  detailSessions: AggregateSessionInput[]
  /** All-time qualifying-session summary (may extend well beyond the detail window). */
  allTime: {
    firstSessionAt: Date | null
    lastSessionAt: Date | null
    qualifyingSessionsTotal: number
  }
}

/**
 * Tunable thresholds for the aggregates computation. Every field has a
 * production default (DEFAULT_AGGREGATES_OPTIONS); callers pass a Partial to
 * override individual values. #937 (TuningConfig + payload preview) supplies
 * overrides from an admin-editable config; today all values are the defaults.
 */
export interface AggregatesOptions {
  /** low_data: fewer than this many qualifying sessions in 14d flags low data. */
  lowDataMinSessions: number
  /** low_data: fewer than this many effective sets in 14d flags low data. */
  lowDataMinSets: number
  /** detraining_gap floor: gap must be >= this many days to populate. */
  detrainingMinDays: number
  /** detraining_gap: user must have had >= this many qualifying sessions before the gap. */
  detrainingMinPriorSessions: number
  /** acute:chronic ratio is null until the trailing-28d window holds >= this many sets. */
  acrMin28dSets: number
  /** Number of complete Mon-Sun weeks in the baseline window. */
  baselineWeeks: number
  /** Movement-pattern observations are drawn from this trailing window (days). */
  calibrationWindowDays: number
  /** A movement pattern needs >= this many observations to emit a calibration entry. */
  calibrationMinObservations: number
  /** Base EWMA smoothing factor (see lib/learning/math gapDecayedEwma). */
  ewmaAlpha: number
  /** Expected days between observations for the gap-decayed EWMA. */
  ewmaTypicalGapDays: number
  /** data_maturity: below this many qualifying sessions is cold_start. */
  coldStartMinSessions: number
  /** data_maturity: at/above this many sessions (with span) is established. */
  establishedMinSessions: number
  /** data_maturity / ACR: minimum first-session span (days) for established / non-null ACR. */
  maturityMinSpanDays: number
}
