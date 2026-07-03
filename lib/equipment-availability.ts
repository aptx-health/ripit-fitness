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
    label: 'Commercial Gym',
    values: [
      'barbell',
      'dumbbell',
      'kettlebell',
      'cable',
      'machine',
      'bodyweight',
      'bench',
      'pull_up_bar',
      'smith_machine',
      'resistance_band',
      'ez_bar',
      'dip_bars',
      'incline_bench',
      'decline_bench',
      'preacher_bench',
      'ab_wheel',
      'foam_roller',
      'weight_belt',
      'parallel_bars',
      'roman_chair',
      'trap_bar',
      'bands',
    ],
  },
  {
    id: 'home_dumbbells_bands',
    label: 'Home: Dumbbells + Bands',
    values: ['dumbbell', 'bodyweight', 'resistance_band', 'bands', 'bench'],
  },
  {
    id: 'bodyweight_only',
    label: 'Bodyweight Only',
    values: ['bodyweight', 'pull_up_bar'],
  },
]
