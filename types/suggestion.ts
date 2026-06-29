/**
 * Type definitions for Suggest Workout LLM suggestion request/response payloads.
 *
 * These shapes are persisted in the Suggestion table (requestPayload, responsePayload
 * JSON columns) so that suggestions can be debugged, replayed, and used as the source
 * of truth for the implicit-feedback loop (distinguishing "user edited their own
 * workout" from "user edited an AI suggestion").
 *
 * See issue #869 and design context in #868.
 */

/**
 * Snapshot of the user's training profile at the time the suggestion was requested.
 * Mirrors UserTrainingProfile (issue #870) — duplicated here so changes to the
 * profile after the suggestion don't invalidate the original context.
 */
export interface SuggestionProfileSnapshot {
  experienceLevel?: string | null
  equipmentAvailable?: string[]
  goals?: string[]
  focusAreas?: string[]
  intensityEnabled?: boolean
  defaultIntensityRating?: 'rpe' | 'rir' | null
  /** Free-form notes / additional context provided by the user */
  notes?: string | null
}

/**
 * One slot in the recent-history window the LLM sees.
 * Lightweight by design — full workouts are too large to fit in context.
 */
export interface SuggestionHistoryEntry {
  completedAt: string // ISO 8601
  workoutName: string
  /** Primary muscle groups / functional anatomy units hit by this session */
  primaryFAUs?: string[]
  /** Exercise names performed, in order */
  exercises: string[]
}

/**
 * Full payload sent to the LLM. Stored verbatim in Suggestion.requestPayload
 * so we can replay or debug a specific suggestion.
 */
export interface SuggestionRequestPayload {
  /** Schema version of this payload shape — bump when fields change incompatibly */
  schemaVersion: 1
  /** When the suggestion was requested (server time) */
  requestedAt: string // ISO 8601
  /** Snapshot of user profile at request time */
  profile: SuggestionProfileSnapshot
  /** Recent completed workouts (most recent first), bounded window */
  history: SuggestionHistoryEntry[]
  /** Optional user-supplied free-form prompt ("I want a push day, no barbell") */
  userPrompt?: string
  /** Optional explicit target FAUs / focus for this session */
  targetFAUs?: string[]
  /** Target session duration in minutes, if specified */
  targetDurationMinutes?: number
}

/**
 * One exercise the LLM suggests as part of the workout.
 */
export interface SuggestedExercise {
  /** Canonical exercise name (should resolve to an ExerciseDefinition) */
  name: string
  /** Optional explicit ExerciseDefinition id if the LLM was given the catalog */
  exerciseDefinitionId?: string
  /** Optional grouping hint (e.g. "A1", "A2" for supersets) */
  exerciseGroup?: string | null
  order: number
  sets: SuggestedSet[]
  /** Per-exercise rationale / coaching note */
  notes?: string | null
}

/**
 * One prescribed set in a suggested exercise.
 */
export interface SuggestedSet {
  setNumber: number
  /** Rep prescription — string to allow ranges like "8-12" or "AMRAP" */
  reps: string
  /** Weight prescription — string to allow "135 lbs", "BW", "RPE 7", "%1RM" */
  weight?: string | null
  rpe?: number | null
  rir?: number | null
  isWarmup?: boolean
}

/**
 * Full structured output from the LLM. Stored verbatim in Suggestion.responsePayload.
 * The Suggest Workout flow translates this into Workout + Exercise + PrescribedSet rows,
 * stamping Workout.sourceSuggestionId for traceability.
 */
export interface SuggestionResponsePayload {
  schemaVersion: 1
  workoutName: string
  /** Overall rationale for the session (shown to user, used for implicit feedback) */
  rationale: string
  exercises: SuggestedExercise[]
  /** Estimated duration in minutes, if the LLM provided one */
  estimatedDurationMinutes?: number
  /** Optional warm-up guidance / cooldown notes */
  warmupNotes?: string | null
  cooldownNotes?: string | null
}
