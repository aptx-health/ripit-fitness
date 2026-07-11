/**
 * Shared types for the Suggest Workout eval loop.
 *
 * The payload types mirror the locked payload spec (#877 comment). The
 * eval loop synthesizes these payloads directly (no DB) so scenario
 * generation is deterministic and runnable anywhere. When the real
 * training-state builder (#876) lands, its output must be assignable to
 * `SuggestPayload` — golden-file tests in #886 enforce that from the
 * other side.
 */

import type { FAUKey } from '@/lib/fau-volume'
import type { IntensityClass, MovementPattern } from '@/lib/exercises/auto-tag'

// ---------------------------------------------------------------------------
// Payload (input to the planner LLM) — per #877 locked spec
// ---------------------------------------------------------------------------

export interface DurableProfile {
  goal_sentences: string[]
  weekly_intent: string[]
  equipment_available: string[]
  banned_exercise_ids: string[]
  default_intensity_preference: 'hypertrophy' | 'strength' | 'balanced' | null
  ratio_targets: Partial<Record<FAUKey, number>>
}

export interface EphemeralContext {
  time_budget_minutes: number
  intensity_vibe: 'easy' | 'solid' | 'heavy'
  deprioritize_freetext: string | null
  prioritize_freetext: string | null
  equipment_override: string[] | null
}

export interface PerFAUState {
  fau: FAUKey
  last_session_days_ago: number | null
  last_heavy_days_ago: number | null
  rolling_7d_sets: number
  rolling_14d_sets: number
  target_share: number
  actual_14d_share: number
  deficit_share: number
  status: 'neglected' | 'balanced' | 'over'
}

export interface MovementCalibration {
  movement_pattern: MovementPattern
  current_ewma_top_weight_lbs: number
  recent_observations: number[]
  typical_rep_range: string
  typical_rpe: number
  last_session_days_ago: number
}

export interface WeeklyIntentStatus {
  intent_summary: string
  satisfied_this_week: boolean
  last_satisfied_days_ago?: number
  evidence?: string
}

export interface GoalProgress {
  goal: string
  interpretation: string
  recent_top_sets_lbs: number[]
  trend: 'progressing' | 'stalled' | 'regressing' | 'new'
  weeks_observed: number
}

export interface RecentFeedback {
  suggestions_last_30d: number
  swap_rate: number
  common_swaps: Array<{ from: string; to: string; count: number }>
  common_additions_fau: string[]
  common_deletions_fau: string[]
}

export interface PreferencesSummary {
  high_confidence_likes: string[]
  high_confidence_dislikes: string[]
  low_confidence_note: string | null
}

export interface TrainingState {
  now: string
  today_dow: string
  per_fau: PerFAUState[]
  per_movement_calibration: MovementCalibration[]
  weekly_intent_status: WeeklyIntentStatus[]
  goal_progress: GoalProgress[]
  recent_feedback: RecentFeedback
  preferences_summary: PreferencesSummary
}

export interface CandidateExercise {
  id: string
  name: string
  primary_faus: FAUKey[]
  secondary_faus: FAUKey[]
  equipment: string
  movement_pattern: MovementPattern | null
  intensity_class: IntensityClass
  user_preference_score?: number
  user_preference_confidence?: 'high'
}

export interface SuggestPayload {
  durable_profile: DurableProfile
  ephemeral_context: EphemeralContext
  training_state: TrainingState
  candidate_exercises: CandidateExercise[]
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export type ArchetypeKey =
  | 'cyclist'
  | 'bodybuilder'
  | 'powerlifter'
  | 'beginner'
  | 'inconsistent'

export type ModifierKey =
  | 'injury-recovery'
  | 'deload'
  | 'sparse-data'
  | 'competing-goals'
  | 'activity-overlap'
  | 'time-crunch'
  | 'equipment-limited'
  | 'return-from-break'
  | 'all-satisfied'
  | 'ambiguous-freetext'

/** Deterministic, machine-checkable rule attached to a scenario. */
export type HardRule =
  | { type: 'exclude_exercises'; exerciseIds: string[] }
  | { type: 'exclude_heavy_fau'; fau: FAUKey }
  | { type: 'max_exercise_count'; max: number }

/**
 * Scenario-specific expectation. `hard` rules are enforced by code in
 * hard-checks; `judge` expectations are handed to the LLM judge as
 * "things to look for" so scoring is grounded in scenario intent rather
 * than the judge's own taste.
 */
export interface ScenarioExpectation {
  description: string
  kind: 'hard' | 'judge'
  rule?: HardRule
}

export interface EvalScenario {
  id: string
  seed: string
  archetype: ArchetypeKey
  modifiers: ModifierKey[]
  description: string
  payload: SuggestPayload
  expectations: ScenarioExpectation[]
}

// ---------------------------------------------------------------------------
// Planner output (three-option shape per #877)
// ---------------------------------------------------------------------------

export type OptionId = 'user_preference' | 'data_driven' | 'wild_card'

export interface SuggestedExercise {
  id: string
  rationale: string
}

export interface SuggestionOption {
  id: OptionId
  name: string
  description: string
  summary: string
  exercises: SuggestedExercise[]
}

export interface SuggestionResponse {
  options: SuggestionOption[]
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface HardCheckResult {
  name: string
  passed: boolean
  detail: string | null
  /** Which option failed, when the check is per-option. */
  optionId?: OptionId
}

export interface DimensionScore {
  dimension: string
  /** Judge must produce evidence BEFORE the score — see judge.ts. */
  evidence: string
  score: number
}

export interface OptionJudgement {
  option_id: OptionId
  dimension_scores: DimensionScore[]
  note: string
}

export interface JudgeResult {
  per_option: OptionJudgement[]
  /** Scored once across all three options. */
  option_identity: DimensionScore
  overall_note: string
}

export interface ScenarioResult {
  scenarioId: string
  response: SuggestionResponse | null
  /** Planner call error, if the call itself failed. */
  error: string | null
  latencyMs: number | null
  plannerModel: string | null
  hardChecks: HardCheckResult[]
  /** One entry per judge run (K runs for stability measurement). */
  judgeRuns: JudgeResult[]
  /** Median-aggregated composite in [1,4]; null if judging failed. */
  composite: number | null
  /** Per-dimension median across options and judge runs. */
  dimensionMedians: Record<string, number>
}

export interface RunMeta {
  runId: string
  createdAt: string
  promptVariant: string
  seed: string
  scenarioCount: number
  plannerModel: string
  judgeModel: string
  judgeRuns: number
}

// ---------------------------------------------------------------------------
// Human ratings
// ---------------------------------------------------------------------------

export interface HumanRating {
  ratedAt: string
  runId: string
  scenarioId: string
  optionId: OptionId
  /** Overall 1–4 on the same anchored scale the judge uses. */
  overall: number
  /** Dimension keys the human flagged as the problem (may be empty). */
  flaggedDimensions: string[]
  note: string | null
}
