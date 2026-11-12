/**
 * Ranking for the swap picker's "Similar" list.
 *
 * Best first: more primary muscles shared with the current exercise, then
 * sharing any of its equipment, then the same load type (weighted, bodyweight
 * or band; see loadType), then the same movement pattern (only when both are
 * tagged), then a shared movement word in the name (see MOVEMENT_WORDS). Full
 * ties keep the input order, so the caller decides (by name). Candidates
 * sharing no primary muscle, and the current exercise itself, are dropped.
 * Pure: the input array is not changed.
 */

export const SIMILAR_LIMIT = 8

export type SimilarCandidate = {
  id: string
  name?: string | null
  primaryFAUs: string[]
  equipment: string[]
  movementPattern?: string | null
  isBodyweight?: boolean | null
}

export type LoadType = 'weighted' | 'bodyweight' | 'band'

// Equipment is free text ("smith-machine", "ez bar preacher curl"), so these match as substrings.
const WEIGHTED_EQUIPMENT = ['barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'plate', 'smith', 'ez bar', 'ez-bar', 'trap bar', 'trap-bar', 'landmine', 'sled']

/**
 * isBodyweight wins (it is the source of truth for bodyweight loading), then
 * any weighted equipment, then a band, then "bodyweight" in the equipment.
 * null when none apply; an unknown load type never matches.
 */
export function loadType(def: Pick<SimilarCandidate, 'equipment' | 'isBodyweight'>): LoadType | null {
  if (def.isBodyweight) return 'bodyweight'
  const equipment = def.equipment.map((eq) => eq.toLowerCase())
  if (equipment.some((eq) => WEIGHTED_EQUIPMENT.some((w) => eq.includes(w)))) return 'weighted'
  if (equipment.some((eq) => eq.includes('band'))) return 'band'
  if (equipment.some((eq) => eq.includes('bodyweight'))) return 'bodyweight'
  return null
}

// The last tie-breaker, for when movementPattern is untagged: names sharing one
// of these words ("Barbell Back Squat", "Dumbbell Goblet Squat") move up. Kept
// small on purpose: only words that name a movement, not equipment or body parts.
// Plurals ("lunges", "presses", "flyes") count.
export const MOVEMENT_WORDS = [
  'squat',
  'lunge',
  'deadlift',
  'press',
  'row',
  'curl',
  'raise',
  'fly',
  'pulldown',
  'pullup',
  'extension',
  'thrust',
  'shrug',
  'dip',
]

export function movementWords(name: string | null | undefined): Set<string> {
  const found = new Set<string>()
  for (const token of (name ?? '').toLowerCase().replace(/pull-up/g, 'pullup').split(/[^a-z]+/)) {
    const word = MOVEMENT_WORDS.find((w) => token === w || token === `${w}s` || token === `${w}es`)
    if (word) found.add(word)
  }
  return found
}

export function rankSimilar<T extends SimilarCandidate>(current: SimilarCandidate, candidates: T[]): T[] {
  const primary = new Set(current.primaryFAUs)
  if (primary.size === 0) return []
  const equipment = new Set(current.equipment)
  const load = loadType(current)
  const pattern = current.movementPattern || null
  const words = movementWords(current.name)

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
        load: load !== null && loadType(candidate) === load ? 1 : 0,
        pattern: pattern !== null && candidate.movementPattern === pattern ? 1 : 0,
        word: [...movementWords(candidate.name)].some((w) => words.has(w)) ? 1 : 0,
      },
    ]
  })

  scored.sort(
    (a, b) =>
      b.muscles - a.muscles ||
      b.equipment - a.equipment ||
      b.load - a.load ||
      b.pattern - a.pattern ||
      b.word - a.word ||
      a.index - b.index
  )
  return scored.slice(0, SIMILAR_LIMIT).map((s) => s.candidate)
}
