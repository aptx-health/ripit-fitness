/**
 * Anchor movement taxonomy (Target Movements, #976).
 *
 * The 6 compound movement patterns a user can curate as "anchors" — big lifts
 * they want to guarantee periodic exposure to. A deliberate subset of the
 * auto-tagger's `MOVEMENT_PATTERNS` (`./auto-tag`), omitting the ones that
 * aren't anchor-worthy (lunge, carry, isolation, accessory).
 *
 * This module is intentionally dependency-free (no Prisma, no logger) so both
 * client components (the picker's Anchors view, the settings editor) and server
 * code can import the taxonomy without dragging server-only deps into the client
 * bundle. Keys double as the JSON keys of `UserTrainingProfile.targetMovements`.
 */

import type { MovementPattern } from './auto-tag';

export const ANCHOR_PATTERNS = [
  'hinge',
  'squat',
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
] as const satisfies readonly MovementPattern[];

export type AnchorPattern = (typeof ANCHOR_PATTERNS)[number];

export const ANCHOR_PATTERN_DISPLAY_NAMES: Record<AnchorPattern, string> = {
  hinge: 'Hinge',
  squat: 'Squat',
  horizontal_push: 'Horizontal Push',
  horizontal_pull: 'Horizontal Pull',
  vertical_push: 'Vertical Push',
  vertical_pull: 'Vertical Pull',
};

export function isAnchorPattern(value: unknown): value is AnchorPattern {
  return (
    typeof value === 'string' &&
    (ANCHOR_PATTERNS as readonly string[]).includes(value)
  );
}

/** Max curated exercises a user can pin to a single anchor pattern. */
export const MAX_ANCHOR_EXERCISES = 5

/** pattern -> up to {@link MAX_ANCHOR_EXERCISES} ExerciseDefinition ids. */
export type TargetMovements = Partial<Record<AnchorPattern, string[]>>
