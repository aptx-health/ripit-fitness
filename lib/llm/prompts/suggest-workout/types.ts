/**
 * Zod-free shared types for the Suggest Workout domain.
 *
 * `WeeklyIntent` lives here (not in `schemas.ts`) so consumers that only need
 * the *type* — notably `lib/learning/weekly-intent.ts`, which the aggregates
 * job pulls into the clone-worker build — do not transitively drag `zod` into
 * a package that doesn't depend on it (Risk 3 from the Suggest Workout audit).
 *
 * `schemas.ts` imports this type and asserts its zod schema stays structurally
 * identical to it, so the hand-written union can never silently drift from the
 * validated contract.
 */

/** Weekly intent discriminated union — mirrors issue #884. */
export type WeeklyIntent =
  | {
      type: 'heavy_session'
      muscle_group: 'legs' | 'upper' | 'pull' | 'push'
      min_per_week: number
    }
  | {
      type: 'volume_tilt'
      toward: string[]
      away_from: string[]
      ratio: number
    }
  | {
      type: 'movement_frequency'
      movement_pattern: string
      min_per_week: number
    }
  | {
      type: 'free_text'
      text: string
    }
