/**
 * Exercise Matching Utilities
 *
 * Name normalization, similarity scoring, and fuzzy matching logic
 * for mapping our seed exercises to free-exercise-db entries.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OurExercise {
  id: string
  name: string
  normalizedName: string
  aliases: string[]
}

export interface TheirExercise {
  id: string
  name: string
  force: string | null
  level: string
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

export type MatchType = 'exact' | 'alias' | 'close'
export type Confidence = 'high' | 'medium' | 'low'

export interface MatchCandidate {
  theirExercise: TheirExercise
  matchType: MatchType
  confidence: Confidence
  similarity: number
}

export interface Match {
  our_id: string
  our_name: string
  their_id: string
  their_name: string
  match_type: MatchType
  confidence: Confidence
  similarity?: number
  validated: boolean
  force?: string | null
  mechanic?: string | null
  level?: string | null
}

export interface UnmatchedExercise {
  id: string
  name: string
}

export interface MappingOutput {
  generated_at: string
  stats: {
    our_total: number
    their_total: number
    exact_matches: number
    alias_matches: number
    close_matches: number
    our_unmatched: number
    their_unmatched: number
  }
  matches: Match[]
  our_unmatched: UnmatchedExercise[]
  their_unmatched: UnmatchedExercise[]
}

// ---------------------------------------------------------------------------
// Name Normalization
// ---------------------------------------------------------------------------

export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '') // remove apostrophes
    .replace(/[-–—]/g, ' ') // dashes to spaces
    .replace(/[()]/g, '') // remove parens
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

/**
 * Deeper normalization for fuzzy comparison:
 * - Strips trailing 's' from words (plurals: "curls" -> "curl")
 * - Removes common filler words
 */
export function deepNormalize(name: string): string {
  const norm = normalize(name)
  return norm
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .filter((w) => !['the', 'a', 'an', 'with', 'on', 'style'].includes(w))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Levenshtein Distance (no external deps)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const prev = new Array(n + 1)
  const curr = new Array(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }

  return prev[n]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// ---------------------------------------------------------------------------
// Token-based Similarity (handles word reordering)
// ---------------------------------------------------------------------------

function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(Boolean))
  const tokensB = new Set(b.split(' ').filter(Boolean))

  if (tokensA.size === 0 && tokensB.size === 0) return 1

  let intersection = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++
  }

  const union = new Set([...tokensA, ...tokensB]).size
  return union === 0 ? 0 : intersection / union
}

// ---------------------------------------------------------------------------
// Confidence Scoring
// ---------------------------------------------------------------------------

function containsCheck(ourNorm: string, theirNorm: string): boolean {
  if (theirNorm.includes(ourNorm) && ourNorm.length >= 4) return true
  if (ourNorm.includes(theirNorm) && theirNorm.length >= 4) return true
  return false
}

function computeConfidence(
  ourNorm: string,
  theirNorm: string,
  tokenSim: number
): Confidence {
  const sim = similarity(ourNorm, theirNorm)
  const contains = containsCheck(ourNorm, theirNorm)

  if (sim >= 0.85 || (contains && tokenSim >= 0.6)) return 'high'
  if (sim >= 0.65 || tokenSim >= 0.6) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------------
// Fuzzy Scoring
// ---------------------------------------------------------------------------

function scoreFuzzyMatch(ourNorm: string, theirNorm: string): number {
  const ourDeep = deepNormalize(ourNorm)
  const theirDeep = deepNormalize(theirNorm)

  const sim = similarity(ourDeep, theirDeep)
  const tokenSim = tokenSimilarity(ourDeep, theirDeep)

  // Length ratio penalty: prefer matches with similar word counts
  const ourWords = ourDeep.split(' ').length
  const theirWords = theirDeep.split(' ').length
  const lengthRatio =
    Math.min(ourWords, theirWords) / Math.max(ourWords, theirWords)

  return sim * 0.5 + tokenSim * 0.35 + lengthRatio * 0.15
}

// ---------------------------------------------------------------------------
// Matching Engine
// ---------------------------------------------------------------------------

export function findBestMatch(
  ourExercise: OurExercise,
  theirNormalized: Map<string, TheirExercise>,
  theirDeepNormalized: Map<string, TheirExercise>,
  theirNormalizedList: { norm: string; exercise: TheirExercise }[]
): MatchCandidate | null {
  const ourNorm = normalize(ourExercise.name)
  const ourDeep = deepNormalize(ourExercise.name)

  // 1. Exact normalized name match
  const exactMatch = theirNormalized.get(ourNorm)
  if (exactMatch) {
    return { theirExercise: exactMatch, matchType: 'exact',
      confidence: 'high', similarity: 1.0 }
  }

  // 1b. Deep-normalized exact match (handles plurals)
  const deepMatch = theirDeepNormalized.get(ourDeep)
  if (deepMatch) {
    return { theirExercise: deepMatch, matchType: 'exact',
      confidence: 'high', similarity: 1.0 }
  }

  // 2. Alias match - check all our aliases against their names
  for (const alias of ourExercise.aliases) {
    const aliasNorm = normalize(alias)
    const aliasMatch = theirNormalized.get(aliasNorm)
    if (aliasMatch) {
      return { theirExercise: aliasMatch, matchType: 'alias',
        confidence: 'high', similarity: 1.0 }
    }

    const aliasDeep = deepNormalize(alias)
    const aliasDeepMatch = theirDeepNormalized.get(aliasDeep)
    if (aliasDeepMatch) {
      return { theirExercise: aliasDeepMatch, matchType: 'alias',
        confidence: 'high', similarity: 1.0 }
    }
  }

  // 3. Fuzzy matching - find the best close match
  let bestCandidate: MatchCandidate | null = null
  let bestScore = 0

  const searchNames = [ourNorm, ...ourExercise.aliases.map(normalize)]

  for (const searchNorm of searchNames) {
    const searchDeep = deepNormalize(searchNorm)
    const isAlias = searchNorm !== ourNorm

    for (const { norm: theirNorm, exercise: theirEx } of theirNormalizedList) {
      const combinedScore = scoreFuzzyMatch(searchNorm, theirNorm)
      if (combinedScore < 0.5 || combinedScore <= bestScore) continue

      bestScore = combinedScore
      const theirDeep = deepNormalize(theirNorm)
      const tokenSim = tokenSimilarity(searchDeep, theirDeep)
      const confidence = computeConfidence(searchDeep, theirDeep, tokenSim)

      bestCandidate = {
        theirExercise: theirEx,
        matchType: isAlias ? 'alias' : 'close',
        confidence,
        similarity: Math.round(combinedScore * 1000) / 1000,
      }
    }
  }

  // Reject weak close matches
  if (bestCandidate && bestCandidate.matchType === 'close') {
    if (bestCandidate.confidence === 'low' && bestScore < 0.55) {
      return null
    }
  }

  return bestCandidate
}
