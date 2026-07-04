import type { FAUKey } from '@/lib/fau-volume'

/**
 * Importance-rating presets so users don't hand-tune per-FAU weights.
 *
 * Each preset writes the 1-5 `fauImportance` ratings introduced by the training
 * profile expansion (#915). A preset is a *starting point*, not a mode: applying
 * one overwrites the current ratings, but every rating stays individually
 * editable afterwards. The applied preset id is tracked on the profile
 * (`fauImportancePreset`) so copy can say "based on your Powerlifter preset"
 * even after the user tweaks a rating.
 *
 * Ratings cover every FAU in {@link ALL_FAUS} — the `Record<FAUKey, number>`
 * type makes missing keys a compile error.
 */

export const RATIO_PRESET_IDS = [
  'bodybuilder',
  'powerlifter',
  'cyclist',
  'general',
  'sport_specific',
] as const

export type RatioPresetId = (typeof RATIO_PRESET_IDS)[number]

export type RatioPreset = {
  id: RatioPresetId
  label: string
  /** Short blurb shown next to the chip in the wizard/settings UI. */
  description: string
  /** Per-FAU importance, 1 (spare it) to 5 (prioritize). All 18 FAUs covered. */
  ratings: Record<FAUKey, number>
}

/**
 * Preset definitions. Values are deliberate archetypes, not exhaustive science:
 * the point is a sensible starting spread the user then refines.
 */
export const RATIO_PRESETS: readonly RatioPreset[] = [
  {
    id: 'bodybuilder',
    label: 'Bodybuilder',
    description: 'Balanced aesthetic development — every muscle matters, with a lean toward the "show" muscles.',
    ratings: {
      chest: 5,
      'mid-back': 4,
      'lower-back': 3,
      'front-delts': 4,
      'side-delts': 5,
      'rear-delts': 4,
      lats: 5,
      traps: 3,
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
    description: 'Squat, bench, and deadlift prime movers up front; isolation work spared.',
    ratings: {
      chest: 5,
      'mid-back': 4,
      'lower-back': 5,
      'front-delts': 3,
      'side-delts': 2,
      'rear-delts': 2,
      lats: 4,
      traps: 4,
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
    description: 'Upper-body tilt with the bench prioritized; leg volume deliberately spared since the bike covers it.',
    ratings: {
      chest: 5,
      'mid-back': 4,
      'lower-back': 3,
      'front-delts': 4,
      'side-delts': 4,
      'rear-delts': 4,
      lats: 4,
      traps: 3,
      biceps: 3,
      triceps: 4,
      forearms: 2,
      quads: 2,
      adductors: 1,
      hamstrings: 3,
      glutes: 3,
      calves: 2,
      abs: 3,
      obliques: 3,
    },
  },
  {
    id: 'general',
    label: 'General',
    description: 'Even, full-body coverage with a gentle nudge toward the big compound movers.',
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
      forearms: 2,
      quads: 4,
      adductors: 2,
      hamstrings: 3,
      glutes: 4,
      calves: 2,
      abs: 3,
      obliques: 3,
    },
  },
  {
    id: 'sport_specific',
    label: 'Sport-specific',
    description: 'Athletic base — posterior chain, core, and power emphasized over isolation work.',
    ratings: {
      chest: 3,
      'mid-back': 4,
      'lower-back': 4,
      'front-delts': 3,
      'side-delts': 3,
      'rear-delts': 3,
      lats: 4,
      traps: 3,
      biceps: 2,
      triceps: 3,
      forearms: 3,
      quads: 4,
      adductors: 3,
      hamstrings: 5,
      glutes: 5,
      calves: 4,
      abs: 5,
      obliques: 4,
    },
  },
] as const

const PRESETS_BY_ID: Record<RatioPresetId, RatioPreset> = Object.fromEntries(
  RATIO_PRESETS.map((preset) => [preset.id, preset])
) as Record<RatioPresetId, RatioPreset>

/** Narrow an arbitrary value to a known preset id. */
export function isRatioPresetId(value: unknown): value is RatioPresetId {
  return (
    typeof value === 'string' &&
    (RATIO_PRESET_IDS as readonly string[]).includes(value)
  )
}

/** Look up a preset by id, or `null` if the id is unknown. */
export function getRatioPreset(id: unknown): RatioPreset | null {
  return isRatioPresetId(id) ? PRESETS_BY_ID[id] : null
}
