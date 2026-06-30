/**
 * Type definitions for the Suggest Workout flow (LLM-powered).
 *
 * These types describe the JSON payloads stored on the `Suggestion` model:
 *   - `requestPayload`  → SuggestionRequestPayload  (input sent to LLM)
 *   - `responsePayload` → SuggestionResponsePayload (structured output from LLM)
 *
 * See issues #871 (this table), #879 (Suggest Workout flow), #875 (implicit feedback).
 */

/**
 * Friendly loading messages surfaced in the polling UI (#879).
 * Stored in `Suggestion.progressStep`.
 */
export type SuggestionProgressStep = 'analyzing' | 'planning' | 'finalizing';

/**
 * Lifecycle states for a Suggestion (mirrors the Prisma `SuggestionStatus` enum).
 * Re-declared here so frontend code can import without pulling in the full Prisma client.
 */
export type SuggestionStatus = 'queued' | 'in_progress' | 'ready' | 'failed';

/**
 * Snapshot of the user's training profile at the time the suggestion was requested.
 * Mirrors the durable profile from #870 (`UserTrainingProfile`).
 */
export interface SuggestionProfileSnapshot {
  experienceLevel?: string;
  goals?: string[];
  equipmentAvailable?: string[];
  preferredSplits?: string[];
  injuriesOrLimitations?: string[];
  preferredDurationMinutes?: number;
  intensityPreference?: 'rir' | 'rpe' | 'none';
}

/**
 * Lightweight summary of a recent workout used as context for the LLM.
 */
export interface SuggestionRecentWorkoutSummary {
  workoutId: string;
  completedAt: string; // ISO timestamp
  name: string;
  muscleGroupsTrained: string[];
  totalVolume?: number;
}

/**
 * The full input payload sent to the LLM and persisted in `Suggestion.requestPayload`.
 * Persisted verbatim so suggestions can be replayed or debugged without re-running the LLM.
 */
export interface SuggestionRequestPayload {
  /** Schema version for forward compatibility */
  version: 1;

  /** User-provided context for this specific suggestion (e.g., "today I have 45min, no squats") */
  userPrompt?: string;

  /** Snapshot of the user's training profile at request time */
  profile: SuggestionProfileSnapshot;

  /** Recent workout history fed to the LLM for context */
  recentWorkouts: SuggestionRecentWorkoutSummary[];

  /** Muscle-group balance signals from `UserMuscleBalanceSettings` */
  muscleBalance?: Record<string, number>;

  /** Optional: ID of a saved workout the user wants to use as a starting point */
  basedOnSavedWorkoutId?: string;

  /** Timestamp the request was assembled */
  requestedAt: string;
}

/**
 * A single prescribed set proposed by the LLM.
 */
export interface SuggestedSet {
  reps: number;
  weight?: string; // flexible: "135lbs" | "65%" | "RPE 8"
  rir?: number;
  rpe?: number;
  isWarmup?: boolean;
  notes?: string;
}

/**
 * A single exercise proposed by the LLM, including rationale.
 */
export interface SuggestedExercise {
  /** Name as proposed by the LLM (may be matched to ExerciseDefinition during workout creation) */
  name: string;

  /** Optional resolved ExerciseDefinition id (set by the worker after matching) */
  exerciseDefinitionId?: string;

  /** Primary muscle groups the LLM intends to target */
  targetMuscleGroups: string[];

  /** LLM's per-exercise rationale (why this exercise, in this order) */
  rationale?: string;

  sets: SuggestedSet[];
}

/**
 * The structured output produced by the LLM and persisted in `Suggestion.responsePayload`.
 */
export interface SuggestionResponsePayload {
  /** Schema version for forward compatibility */
  version: 1;

  /** Suggested workout name (user can edit) */
  workoutName: string;

  /** High-level rationale: why this workout, now, for this user */
  overallRationale: string;

  /** Ordered list of exercises with sets */
  exercises: SuggestedExercise[];

  /** Estimated duration in minutes */
  estimatedDurationMinutes?: number;

  /** Optional warm-up suggestions */
  warmupNotes?: string;

  /** Optional cool-down / recovery suggestions */
  cooldownNotes?: string;
}
