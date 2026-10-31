import type { ExerciseLine } from '@/lib/format/savedWorkoutSets'
import type { ProgramInput } from '@/lib/proposals/program'

/**
 * Data for the per-kind proposal renderers, shared by the admin proposal page
 * and the user's suggestion review. Pure types, so client components can use them.
 */

export interface DiffRow {
  field: string
  before?: unknown
  after: unknown
  /** The live value, shown only when it differs from `before` (stale). */
  current?: unknown
}

export type SuggestionBody =
  | { type: 'saved_workout_create'; name: string; notes?: string | null; exercises: ExerciseLine[] }
  | { type: 'saved_workout_update'; rows: DiffRow[] }
  | { type: 'program'; program: ProgramInput; definitionNames: Record<string, string> }
  | { type: 'diff'; rows: DiffRow[] }

/** A pending suggestion as listed on Training and /suggestions. */
export interface SuggestionItem {
  id: string
  kind: string
  /** What users see (suggestionTitle). */
  title: string
  /** The service summary, kept for admin and the API; not shown to users. */
  summary: string
  /** A suggested workout's exercise count, for its meta line; null for other kinds. */
  exerciseCount?: number | null
  rationale: string
  createdAt: Date
}

export interface SuggestionDetail extends SuggestionItem {
  kindLabel: string
  status: string
  outcome: string | null
  /** The program an accepted program suggestion created. */
  programId: string | null
  body: SuggestionBody
}
