/**
 * Anchor staleness (Target Movements, #976).
 *
 * "Staleness" here is pure days-since-last-logged, derived synchronously from
 * logged-set history — no aggregates job, no deficit/recovery blend (see
 * docs/features/TARGET_MOVEMENTS.md). A movement's staleness is the days since
 * the *freshest* of its ≤5 curated picks was last logged; a movement with no
 * logged picks is "never logged" and sorts to the top.
 *
 * The scoring core ({@link computeAnchorStaleness}) is pure and unit-tested; the
 * async {@link getAnchorStaleness} wrapper is the thin DB seam that feeds it the
 * last-logged dates via {@link getBatchExercisePerformance}.
 */

import {
  ANCHOR_PATTERN_DISPLAY_NAMES,
  ANCHOR_PATTERNS,
  type AnchorPattern,
  type TargetMovements,
} from '@/lib/exercises/anchor-patterns'
import { getBatchExercisePerformance } from '@/lib/queries/exercise-history'

export type AnchorStalenessRow = {
  pattern: AnchorPattern
  displayName: string
  /** The movement's curated exercise ids (order preserved from the profile). */
  exerciseIds: string[]
  /**
   * Whole days since the freshest curated pick was last logged, or null when
   * none of the picks have ever been logged (maximally stale).
   */
  lastLoggedDaysAgo: number | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Whole days between two instants, clamped at 0 (future dates read as today). */
function daysBetween(now: Date, then: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / MS_PER_DAY))
}

/**
 * Pure staleness ranking. Considers only patterns present in `targetMovements`
 * with a non-empty id list. Rows are sorted staleness-descending: never-logged
 * first, then by days-since descending, with ties broken by the fixed
 * {@link ANCHOR_PATTERNS} taxonomy order so the output is deterministic.
 */
export function computeAnchorStaleness(
  targetMovements: TargetMovements,
  lastLoggedByExerciseId: Map<string, Date>,
  now: Date,
): AnchorStalenessRow[] {
  const rows: AnchorStalenessRow[] = []

  for (const pattern of ANCHOR_PATTERNS) {
    const exerciseIds = targetMovements[pattern]
    if (!exerciseIds || exerciseIds.length === 0) continue

    let freshest: number | null = null
    for (const id of exerciseIds) {
      const logged = lastLoggedByExerciseId.get(id)
      if (!logged) continue
      const daysAgo = daysBetween(now, logged)
      if (freshest === null || daysAgo < freshest) freshest = daysAgo
    }

    rows.push({
      pattern,
      displayName: ANCHOR_PATTERN_DISPLAY_NAMES[pattern],
      exerciseIds,
      lastLoggedDaysAgo: freshest,
    })
  }

  const taxonomyOrder = new Map(ANCHOR_PATTERNS.map((p, i) => [p, i]))
  return rows.sort((a, b) => {
    // null (never logged) is maximally stale -> sorts first.
    if (a.lastLoggedDaysAgo === null || b.lastLoggedDaysAgo === null) {
      if (a.lastLoggedDaysAgo === b.lastLoggedDaysAgo) {
        return (
          (taxonomyOrder.get(a.pattern) ?? 0) -
          (taxonomyOrder.get(b.pattern) ?? 0)
        )
      }
      return a.lastLoggedDaysAgo === null ? -1 : 1
    }
    if (b.lastLoggedDaysAgo !== a.lastLoggedDaysAgo) {
      return b.lastLoggedDaysAgo - a.lastLoggedDaysAgo
    }
    return (
      (taxonomyOrder.get(a.pattern) ?? 0) - (taxonomyOrder.get(b.pattern) ?? 0)
    )
  })
}

/**
 * Assemble the staleness ranking for a user's configured anchors. Returns an
 * empty array when nothing is configured (the caller renders a "set up" CTA
 * rather than an empty list). Never throws for missing history — an unlogged /
 * deleted id simply contributes nothing and reads as "never logged".
 */
export async function getAnchorStaleness(
  userId: string,
  targetMovements: TargetMovements,
): Promise<AnchorStalenessRow[]> {
  const allIds = Array.from(
    new Set(Object.values(targetMovements).flat().filter(Boolean)),
  ) as string[]

  if (allIds.length === 0) return []

  const history = await getBatchExercisePerformance(allIds, userId)
  const lastLoggedByExerciseId = new Map<string, Date>()
  for (const [id, entry] of history) {
    lastLoggedByExerciseId.set(id, entry.completedAt)
  }

  return computeAnchorStaleness(targetMovements, lastLoggedByExerciseId, new Date())
}
