/**
 * Ratio presets (issue #928)
 *
 * Named starting points for per-FAU importance ratings so users don't have to
 * hand-tune 18 weights. A preset writes the `fauImportance` slice of the
 * training profile (1-5 per FAU, introduced by the profile expansion in #915).
 *
 * A preset is a *starting point*, not a mode: after applying, individual
 * ratings remain editable. Which preset a user is on is *derivable* — see
 * {@link detectAppliedPreset} — so we can say "based on your Powerlifter
 * preset" without persisting an extra field.
 */

import { ALL_FAUS, type FAUKey } from '@/lib/fau-volume'
import {
  type FauImportance,
  MAX_IMPORTANCE,
  MIN_IMPORTANCE,
} from '@/lib/user-training-profile'

export const RATIO_PRESET_IDS = [
  'bodybuilder',
  'powerlifter',
  'cyclist',
  'general',
  'sport_specific',
] as const

export type RatioPresetId = (typeof RATIO_PRESET_IDS)[number]

/** Every FAU carries an importance rating on the 1-5 scale. */
export type RatioPresetRatings = Record<FAUKey, number>

export type RatioPreset = {
  id: RatioPresetId
  label: string
  /** One-line description shown in the picker UI. */
  description: string
  ratings: RatioPresetRatings
}

/**
 * Preset rating tables. Every FAU is listed explicitly (1-5) so a preset can
 * never accidentally leave a muscle unset. Design notes:
 *
 * - `general` is intentionally flat (everything at 3) — a balanced baseline.
 * - `cyclist` follows the archetype: upper-body tilt, leg volume deliberately
 *   spared (cyclists already load quads/hamstrings on the bike), bench
 *   prioritized, posture muscles (rear-delts, mid-back, core) valued.
 */
export const RATIO_PRESETS: readonly RatioPreset[] = [
  {
    id: 'bodybuilder',
    label: 'Bodybuilder',
    description: 'Hypertrophy across the board with extra love for the show muscles.',
    ratings: {
      chest: 5,
      'mid-back': 4,
      'lower-back': 3,
      'front-delts': 4,
      'side-delts': 5,
      'rear-delts': 4,
      lats: 5,
      traps: 4,
      biceps: 5,
      triceps: 5,
      forearms: 3,
      quads: 5,
      adductors: 3,
      hamstrings: 4,
      glutes: 4,
      calves: 4,
      abs: 4,
      obliques: 3,
    },
  },
  {
    id: 'powerlifter',
    label: 'Powerlifter',
    description: 'Built around the squat, bench, and deadlift — prime movers first.',
    ratings: {
      chest: 5,
      'mid-back': 4,
      'lower-back': 5,
      'front-delts': 4,
      'side-delts': 2,
      'rear-delts': 2,
      lats: 4,
      traps: 3,
      biceps: 2,
      triceps: 5,
      forearms: 3,
      quads: 5,
      adductors: 3,
      hamstrings: 4,
      glutes: 5,
      calves: 2,
      abs: 4,
      obliques: 3,
    },
  },
  {
    id: 'cyclist',
    label: 'Cyclist',
    description: 'Upper-body tilt with legs spared for the bike, and bench prioritized.',
    ratings: {
      chest: 5,
      'mid-back': 4,
      'lower-back': 4,
      'front-delts': 3,
      'side-delts': 3,
      'rear-delts': 4,
      lats: 4,
      traps: 3,
      biceps: 3,
      triceps: 4,
      forearms: 3,
      quads: 2,
      adductors: 2,
      hamstrings: 2,
      glutes: 3,
      calves: 1,
      abs: 4,
      obliques: 4,
    },
  },
  {
    id: 'general',
    label: 'General',
    description: 'A balanced baseline — every muscle group weighted equally.',
    ratings: {
      chest: 3,
      'mid-back': 3,
      'lower-back': 3,
      'front-delts': 3,
      'side-delts': 3,
      'rear-delts': 3,
      lats: 3,
      traps: 3,
      biceps: 3,
      triceps: 3,
      forearms: 3,
      quads: 3,
      adductors: 3,
      hamstrings: 3,
      glutes: 3,
      calves: 3,
      abs: 3,
      obliques: 3,
    },
  },
  {
    id: 'sport_specific',
    label: 'Sport-specific',
    description: 'Athletic base: posterior chain, core, and explosive power.',
    ratings: {
      chest: 3,
      'mid-back': 4,
      'lower-back': 4,
      'front-delts': 3,
      'side-delts': 3,
      'rear-delts': 3,
      lats: 4,
      traps: 4,
      biceps: 3,
      triceps: 3,
      forearms: 3,
      quads: 4,
      adductors: 3,
      hamstrings: 5,
      glutes: 5,
      calves: 4,
      abs: 5,
      obliques: 5,
    },
  },
] as const

const PRESET_BY_ID: ReadonlyMap<RatioPresetId, RatioPreset> = new Map(
  RATIO_PRESETS.map((preset) => [preset.id, preset])
)

/** Look up a preset by id, or null if the id is unknown. */
export function getRatioPreset(id: string): RatioPreset | null {
  return PRESET_BY_ID.get(id as RatioPresetId) ?? null
}

/**
 * Produce the `fauImportance` map for a preset. Returns a fresh copy so callers
 * can mutate the result without touching the shared preset definition. Returns
 * null for an unknown preset id.
 */
export function applyRatioPreset(id: string): FauImportance | null {
  const preset = getRatioPreset(id)
  if (!preset) return null
  const result: FauImportance = {}
  for (const fau of ALL_FAUS) {
    result[fau] = preset.ratings[fau]
  }
  return result
}

/**
 * Derive which preset (if any) the given importance ratings exactly match.
 * A match requires every FAU to equal the preset's rating. Returns null when
 * ratings are custom (edited) or incomplete. Enables copy like "based on your
 * Powerlifter preset" without persisting a mode flag.
 */
export function detectAppliedPreset(
  fauImportance: FauImportance
): RatioPresetId | null {
  for (const preset of RATIO_PRESETS) {
    if (ALL_FAUS.every((fau) => fauImportance[fau] === preset.ratings[fau])) {
      return preset.id
    }
  }
  return null
}

/**
 * Validate a preset's rating table: every FAU present, each an integer within
 * the importance scale. Used by tests to guard against all-zero or malformed
 * presets.
 */
export function validatePresetRatings(ratings: RatioPresetRatings): boolean {
  return ALL_FAUS.every((fau) => {
    const value = ratings[fau]
    return (
      Number.isInteger(value) &&
      value >= MIN_IMPORTANCE &&
      value <= MAX_IMPORTANCE
    )
  })
}
