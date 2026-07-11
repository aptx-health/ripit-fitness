/**
 * Shared staleness presentation + normalization helpers.
 *
 * Two consumers:
 *   - the recovery-aware FAU score (#963, lib/recommendations/fau-score.ts) — its
 *     staleness reason chip and its normalized staleness terms; and
 *   - the Target Movements / "Anchors" picker (#976) — its per-movement
 *     "days since" badge.
 * Keeping the wording here means both surfaces read identically.
 *
 * Pure and dependency-free (no zod, no Prisma, no React) so it is safe to import
 * from client components, server code, and the clone-worker-reachable paths.
 */

/**
 * Compact human label for "days since last trained". `null` means never trained
 * in the relevant window.
 *
 *   null -> "New — never logged"
 *   0    -> "Today"
 *   n    -> "{n}d since"
 */
export function daysSinceLabel(daysAgo: number | null): string {
  if (daysAgo === null) return 'New — never logged'
  if (daysAgo <= 0) return 'Today'
  return `${daysAgo}d since`
}

/**
 * Normalize a "days since last trained" value to a [0, 1] staleness score:
 * 0 = trained today (fresh), 1 = at or beyond `horizonDays` (maximally stale).
 * `null` (never trained in-window) is maximally stale. A non-positive horizon
 * degrades to 0 (no staleness signal) rather than dividing by zero.
 */
export function stalenessScore(daysAgo: number | null, horizonDays: number): number {
  if (daysAgo === null) return 1
  if (horizonDays <= 0) return 0
  const score = daysAgo / horizonDays
  if (score < 0) return 0
  if (score > 1) return 1
  return score
}
