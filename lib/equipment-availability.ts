import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'

/**
 * Canonical equipment values a user can mark as available on their training
 * profile. Derived directly from `EQUIPMENT_LABELS` — the same enum that
 * validates `ExerciseDefinition.equipment` — so planner filtering is a join,
 * not a mapping (issue #927).
 */
export const EQUIPMENT_AVAILABILITY_VALUES = Object.keys(
  EQUIPMENT_LABELS
) as readonly string[]

const EQUIPMENT_VALUE_SET = new Set(EQUIPMENT_AVAILABILITY_VALUES)

/**
 * Normalize an equipmentAvailable list: trim, drop unknown values, dedupe,
 * and return in canonical enum order. An empty result means "no equipment
 * record" — the training-state builder degrades to assuming a full
 * commercial gym (SUGGEST_PAYLOAD_SPEC data_maturity-style degradation).
 */
export function normalizeEquipmentAvailability(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const provided = new Set<string>()
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (EQUIPMENT_VALUE_SET.has(trimmed)) provided.add(trimmed)
  }
  return EQUIPMENT_AVAILABILITY_VALUES.filter((v) => provided.has(v))
}

export type EquipmentChecklistGroup = {
  id: string
  label: string
  values: readonly string[]
}

/**
 * Curated, grouped layout the settings checklist renders (#927). This is a
 * subset of {@link EQUIPMENT_AVAILABILITY_VALUES} chosen for what a real user
 * would recognize and own — every value the exercise database actually uses,
 * plus a few common items. Niche/duplicate enum values (climbing boards,
 * `bands` alias of `resistance_band`, chains, sled, etc.) stay in the enum for
 * `ExerciseDefinition.equipment` validation but are omitted from the UI.
 *
 * Enum-parity requirement (issue #927) still holds via
 * {@link EQUIPMENT_AVAILABILITY_VALUES}: every equipment value remains
 * representable/normalizable even if it isn't offered as a toggle.
 */
export const EQUIPMENT_CHECKLIST_GROUPS: readonly EquipmentChecklistGroup[] = [
  {
    id: 'barbells',
    label: 'Barbells & Bars',
    values: ['barbell', 'ez_bar', 'trap_bar'],
  },
  {
    id: 'dumbbells',
    label: 'Dumbbells & Kettlebells',
    values: ['dumbbell', 'kettlebell'],
  },
  {
    id: 'machines',
    label: 'Machines & Cables',
    values: [
      'cable',
      'machine',
      'smith_machine',
      'functional_trainer',
      'assisted_pullup_dip',
    ],
  },
  {
    id: 'benches',
    label: 'Benches & Racks',
    values: ['bench', 'incline_bench', 'decline_bench', 'preacher_bench'],
  },
  {
    id: 'bodyweight',
    label: 'Bodyweight & Bars',
    values: ['bodyweight', 'pull_up_bar', 'dip_bars', 'suspension_trainer'],
  },
  {
    id: 'accessories',
    label: 'Bands & Accessories',
    values: [
      'resistance_band',
      'ab_wheel',
      'foam_roller',
      'plyo_box',
      'medicine_ball',
    ],
  },
]

/**
 * Flat list of the values offered as toggles, in group order. Used as the
 * "full gym" default when the user has no saved record.
 */
export const EQUIPMENT_CHECKLIST_VALUES: readonly string[] =
  EQUIPMENT_CHECKLIST_GROUPS.flatMap((group) => group.values)

export type EquipmentPresetId =
  | 'commercial_gym'
  | 'home_dumbbells_bands'
  | 'bodyweight_only'

export type EquipmentPreset = {
  id: EquipmentPresetId
  label: string
  values: string[]
}

/**
 * Common setups a user can apply with one tap, then fine-tune. Values must
 * all be members of {@link EQUIPMENT_AVAILABILITY_VALUES} (enforced by test).
 */
export const EQUIPMENT_PRESETS: readonly EquipmentPreset[] = [
  {
    id: 'commercial_gym',
    // A full commercial gym has every toggle we offer.
    label: 'Commercial Gym',
    values: [...EQUIPMENT_CHECKLIST_VALUES],
  },
  {
    id: 'home_dumbbells_bands',
    label: 'Home: Dumbbells + Bands',
    values: [
      'dumbbell',
      'bodyweight',
      'resistance_band',
      'bench',
      'suspension_trainer',
    ],
  },
  {
    id: 'bodyweight_only',
    label: 'Bodyweight Only',
    values: ['bodyweight', 'pull_up_bar', 'dip_bars'],
  },
]
