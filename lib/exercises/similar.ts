/**
 * Ranking for the swap picker's "Similar" list.
 *
 * Best first: more primary muscles shared with the current exercise, then
 * sharing any of its equipment, then the same movement pattern (only when both
 * are tagged). Full ties keep the input order, so the caller decides (by name).
 * Candidates sharing no primary muscle, and the current exercise itself, are
 * dropped. Pure: the input array is not changed.
 */

export const SIMILAR_LIMIT = 8

export type SimilarCandidate = {
  id: string
  primaryFAUs: string[]
  equipment: string[]
  movementPattern?: string | null
}

export function rankSimilar<T extends SimilarCandidate>(current: SimilarCandidate, candidates: T[]): T[] {
  const primary = new Set(current.primaryFAUs)
  if (primary.size === 0) return []
  const equipment = new Set(current.equipment)
  const pattern = current.movementPattern || null

  const scored = candidates.flatMap((candidate, index) => {
    if (candidate.id === current.id) return []
    const muscles = candidate.primaryFAUs.filter((fau) => primary.has(fau)).length
    if (muscles === 0) return []
    return [
      {
        candidate,
        index,
        muscles,
        equipment: candidate.equipment.some((eq) => equipment.has(eq)) ? 1 : 0,
        pattern: pattern !== null && candidate.movementPattern === pattern ? 1 : 0,
      },
    ]
  })

  scored.sort(
    (a, b) => b.muscles - a.muscles || b.equipment - a.equipment || b.pattern - a.pattern || a.index - b.index
  )
  return scored.slice(0, SIMILAR_LIMIT).map((s) => s.candidate)
}
