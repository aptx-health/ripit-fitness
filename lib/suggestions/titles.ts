import { ANCHOR_PATTERN_DISPLAY_NAMES, type AnchorPattern } from '@/lib/exercises/anchor-patterns'
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume'
import { formatTarget } from '@/lib/insights/balance'

/**
 * The title users see for a suggestion. Admin keeps the service summary; users
 * never see it, because it uses keys ("quads", "mid-back") and admin wording.
 */

type Json = Record<string, unknown>
const asObject = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {})

const WORKOUT_FIELDS = ['name', 'notes', 'exercises'] as const

/**
 * `workoutName` is the saved workout's name for an update that doesn't touch
 * the name (the proposal only stores the fields it touches).
 */
export function suggestionTitle(kind: string, payload: unknown, before: unknown, workoutName?: string | null): string {
  const data = asObject(payload)
  const prior = asObject(before)
  const changes = asObject(data.changes)

  switch (kind) {
    case 'saved_workout.create':
      return String(data.name ?? 'Workout')
    case 'program.create':
      return String(asObject(data.program).name ?? data.name ?? 'Program')
    case 'saved_workout.update': {
      const name = (prior.name as string | undefined) ?? workoutName ?? 'Saved workout'
      return `${name}: ${WORKOUT_FIELDS.filter((field) => field in changes).join(', ')}`
    }
    case 'balance_targets.update':
      return Object.entries(changes)
        .map(([fau, after]) => {
          const was = typeof prior[fau] === 'number' ? (prior[fau] as number) : 1
          return `${FAU_DISPLAY_NAMES[fau] ?? fau} ${formatTarget(was)} → ${formatTarget(after as number)}`
        })
        .join(', ')
    case 'anchors.update':
      return Object.keys(changes)
        .map((pattern) => ANCHOR_PATTERN_DISPLAY_NAMES[pattern as AnchorPattern] ?? pattern)
        .join(', ')
    default:
      return 'Suggestion'
  }
}
