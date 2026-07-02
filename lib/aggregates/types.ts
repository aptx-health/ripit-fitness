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

/** Pre-chewed balance label for a FAU; omitted (undefined) when low_data. */
export type FauStatus = 'neglected' | 'balanced' | 'over'

/** One entry per FAU with at least one effective set in the trailing 8 weeks. */
export interface PerFauAggregate {
  fau: string
  /** Days since the most recent qualifying session with an effective set for
   * this FAU; null when no such session falls in the detail window. */
  last_session_days_ago: number | null
  /** Days since the most recent session-relative-heavy session for this FAU;
   * null when never heavy in the window (see lib/learning/weekly-intent). */
  last_heavy_days_ago: number | null
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
   * Target share of total effective volume, derived from the user's
   * `ratioTargets` (default preset weight 1.0 per FAU when unset), normalized
   * over the emitted (present) FAUs so shares sum to 1.
   */
  target_share: number
  /** This FAU's share of total rolling-14d effective sets (0 when 14d volume is 0). */
  actual_14d_share: number
  /** `target_share - actual_14d_share`; positive = under-trained vs target. */
  deficit_share: number
  /**
   * Whole-body low-data flag (identical across all FAUs on a row): true when
   * the rolling 14d window holds < 3 qualifying sessions or < 20 effective sets.
   */
  low_data: boolean
  /** Pre-chewed balance label; omitted (undefined) whenever `low_data` is true. */
  status?: FauStatus
}

/** e1RM trend classification for a goal (spec §goal_progress). */
export type GoalTrend = 'progressing' | 'stalled' | 'regressing' | 'new'

/** One entry per interpretable goal sentence (mapped to a movement pattern). */
export interface GoalProgress {
  /** The goal sentence (pass-through from the profile). */
  goal: string
  /** How the goal was mapped to a measurable signal. */
  interpretation: string
  /** Last <= 5 top-set weights (lbs) for the mapped pattern, oldest -> newest. */
  recent_top_sets_lbs: number[]
  /** Trend classified from the per-session e1RM (Epley) series; `"new"` when
   * fewer than `goalProgressMinWeeks` distinct weeks were observed. */
  trend: GoalTrend
  /** Distinct rolling 7-day buckets (floor(days_ago / 7)) with an observation
   * in the calibration window. */
  weeks_observed: number
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
  goalProgress: GoalProgress[]
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
  /** ExerciseDefinition.intensityClass ('heavy'|'moderate'|'light'); cold-start
   * fallback signal for session-relative heaviness. */
  intensityClass: string | null
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
  /** Per-FAU ratio targets (from the profile); null/absent = default preset
   * (uniform weight 1.0). Drives `target_share` / `deficit_share` / `status`. */
  ratioTargets?: Record<string, number> | null
  /** Goal sentences (from the profile); each interpretable one yields a
   * `goal_progress[]` entry. Absent/empty = no goal_progress. */
  goals?: string[]
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
  /** per_fau status: |deficit_share| within this band is 'balanced'; above =>
   * 'neglected' (deficit > band) or 'over' (deficit < -band). */
  fauStatusDeadband: number
  /** goal_progress: relative e1RM change within +/- this band is 'stalled'. */
  goalTrendStallBand: number
  /** goal_progress: below this many distinct observed weeks => trend 'new'. */
  goalProgressMinWeeks: number
}
