/**
 * Type definitions for the Suggest Workout LLM pipeline.
 *
 * These types describe the JSON shapes stored in `Suggestion.requestPayload`
 * and `Suggestion.responsePayload`. They are intentionally kept here (not in
 * `types/`) so the suggest-worker and API surface share a single source of
 * truth.
 *
 * NOTE: These types are the wire contract with the LLM. Changing a field name
 * is a breaking change for any queued Suggestion rows; prefer additive changes
 * and version bumps via `SuggestionRequestPayload.schemaVersion`.
 */

/**
 * Snapshot of the caller's UserTrainingProfile at the time of enqueue.
 * Locked into the Suggestion row so the LLM sees the same profile even if
 * the user edits their profile mid-generation.
 *
 * Field names align with the `UserTrainingProfile` Prisma model (#870).
 */
export interface SuggestionProfileSnapshot {
  goalSentences: string[];
  weeklyIntent: string[];
  equipmentAvailable: string[];
  bannedExerciseIds: string[];
  ratioTargets: Record<string, number>;
  defaultIntensityPreference: string | null;
}

/**
 * Recent history hints supplied to the LLM to bias its plan (e.g., avoid
 * repeating yesterday's leg-day pattern). Kept intentionally lightweight —
 * the worker enriches from the DB rather than shipping full session logs.
 */
export interface SuggestionRecentActivity {
  /** ISO timestamps of the last N completed workouts, most recent first. */
  recentCompletionDates: string[];
  /** exerciseDefinitionIds trained in the last 7 days. */
  recentExerciseIds: string[];
  /** Optional muscle-balance signals derived server-side. */
  muscleBalanceNotes?: string[];
}

/**
 * The full LLM input payload. Stored verbatim in `Suggestion.requestPayload`
 * so we can replay the same request against a different model for regression
 * testing.
 */
export interface SuggestionRequestPayload {
  /** Bump on any breaking shape change. */
  schemaVersion: 1;
  userId: string;
  /** When the user requested this suggestion (client clock, ISO 8601). */
  requestedAt: string;
  profile: SuggestionProfileSnapshot;
  recentActivity: SuggestionRecentActivity;
  /** Free-form user prompt ("today I want something short and pushy"). */
  userPrompt?: string;
  /** Optional constraints — target duration, focus area, etc. */
  constraints?: {
    targetDurationMinutes?: number;
    focusArea?: string;
    excludeExerciseIds?: string[];
  };
}

/**
 * A single prescribed set inside the suggested workout. Shape mirrors the
 * `PrescribedSet` Prisma model so the worker can materialize it directly.
 */
export interface SuggestedPrescribedSet {
  setNumber: number;
  reps: string;
  weight?: string | null;
  rpe?: number | null;
  rir?: number | null;
  isWarmup?: boolean;
}

/**
 * A single exercise in the suggested workout.
 */
export interface SuggestedExercise {
  order: number;
  /** Preferred: reference an existing ExerciseDefinition. */
  exerciseDefinitionId?: string;
  /** Fallback name if the LLM proposed something we don't have a def for yet. */
  name: string;
  exerciseGroup?: string | null;
  notes?: string | null;
  prescribedSets: SuggestedPrescribedSet[];
}

/**
 * The structured output from the LLM, stored in `Suggestion.responsePayload`.
 */
export interface SuggestionResponsePayload {
  schemaVersion: 1;
  workoutName: string;
  /** Short human-readable rationale surfaced in the UI. */
  rationale: string;
  /** Longer form reasoning used for debugging / evals. */
  reasoningNotes?: string;
  estimatedDurationMinutes?: number;
  exercises: SuggestedExercise[];
}

/**
 * Status values stored in `Suggestion.status`. Kept as a union so callers
 * can narrow without importing an enum.
 */
export type SuggestionStatus =
  | 'queued'
  | 'in_progress'
  | 'ready'
  | 'failed';

/**
 * Progress substates surfaced to the polling UI while `status='in_progress'`.
 */
export type SuggestionProgressStep =
  | 'analyzing'
  | 'planning'
  | 'finalizing';
