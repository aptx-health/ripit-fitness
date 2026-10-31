/**
 * The proposal kinds users review as "suggestions". Exercise-library kinds stay
 * in admin: every user-facing route and loader treats them as not found.
 */

export const SUGGESTION_KINDS = [
  'saved_workout.create',
  'saved_workout.update',
  'program.create',
  'anchors.update',
  'balance_targets.update',
] as const

export type SuggestionKind = (typeof SUGGESTION_KINDS)[number]

const LABELS: Record<SuggestionKind, string> = {
  'saved_workout.create': 'Workout',
  'saved_workout.update': 'Workout change',
  'program.create': 'Program',
  'anchors.update': 'Anchor lifts',
  'balance_targets.update': 'Training targets',
}

export const isSuggestionKind = (kind: string): kind is SuggestionKind => kind in LABELS

/** The user-facing label, or null for a kind users never see. */
export function suggestionKindLabel(kind: string): string | null {
  return isSuggestionKind(kind) ? LABELS[kind] : null
}

/** What a decided suggestion shows instead of Accept and Reject. */
export function suggestionOutcome(status: string): string | null {
  switch (status) {
    case 'applied':
      return 'Accepted'
    case 'rejected':
      return 'Rejected'
    case 'conflict':
      return 'No longer applies'
    case 'reverted':
      return 'Undone'
    default:
      return null
  }
}
