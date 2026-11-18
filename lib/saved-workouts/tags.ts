/**
 * Saved-workout tags (workout library slice 2). A user's tags are the distinct
 * tags across their own saved workouts; a starter tag becomes one of them once
 * a workout carries it. Tags keep the case they were first typed in, and every
 * later spelling matches the one the user already has (or a starter tag).
 */

export const STARTER_TAGS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Core', 'Cardio', 'Quick'] as const

export const TAG_MAX_LENGTH = 24
export const MAX_TAGS_PER_WORKOUT = 8
export const MAX_TAGS_PER_USER = 50

/**
 * Trims and turns every run of whitespace into one space; null when nothing is
 * left. Then the first entry of `known` equal to it ignoring case, spelled as in
 * `known`; otherwise the tidied text as typed. Callers pass the user's own tags
 * followed by STARTER_TAGS. No limits here.
 */
export function normaliseTag(raw: string, known: readonly string[]): string | null {
  const tidy = raw.trim().replace(/\s+/g, ' ')
  if (!tidy) return null
  const lower = tidy.toLowerCase()
  return known.find((tag) => tag.toLowerCase() === lower) ?? tidy
}

/** normaliseTag on each; empties and repeats (ignoring case) dropped, the first kept, order kept. */
export function normaliseTags(raw: readonly string[], known: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const r of raw) {
    const tag = normaliseTag(r, known)
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    out.push(tag)
  }
  return out
}

/** The distinct tags (ignoring case, first spelling kept) across these rows, in order. */
export function distinctTags(rows: readonly { tags?: readonly string[] | null }[]): string[] {
  return normaliseTags(
    rows.flatMap((r) => r.tags ?? []),
    []
  )
}

export type TagLimit = 'length' | 'perWorkout' | 'perUser'

/** What a route answers when a tag change breaks a limit: 400 { error: TAG_LIMIT_MESSAGES[limit], limit }. */
export const TAG_LIMIT_MESSAGES: Record<TagLimit, string> = {
  length: `A tag can be at most ${TAG_MAX_LENGTH} characters`,
  perWorkout: `A workout can have at most ${MAX_TAGS_PER_WORKOUT} tags`,
  perUser: `You can have at most ${MAX_TAGS_PER_USER} different tags`,
}

/**
 * Whether giving a workout `tags` (in place of `current`) takes the user past 50
 * different tags. `others` are the user's tags on every other workout, archived
 * ones included, so un-archiving never breaks the 50. A change that doesn't
 * raise the count is always allowed, so someone already over 50 can still
 * remove or swap tags.
 */
export function overUserLimit(tags: readonly string[], others: readonly string[], current: readonly string[] = []): boolean {
  const after = distinctTags([{ tags: others }, { tags }]).length
  return after > MAX_TAGS_PER_USER && after > distinctTags([{ tags: others }, { tags: current }]).length
}

/** Which limit, if any, a workout's new (normalised) tags break; see overUserLimit for the 50. */
export function tagLimitBroken(
  tags: readonly string[],
  others: readonly string[],
  current: readonly string[] = []
): TagLimit | null {
  if (tags.some((t) => t.length > TAG_MAX_LENGTH)) return 'length'
  if (tags.length > MAX_TAGS_PER_WORKOUT) return 'perWorkout'
  if (overUserLimit(tags, others, current)) return 'perUser'
  return null
}

/**
 * At approval of an agent's or coach's workout: its tags the user already has
 * are kept; a brand-new one (a starter the user hasn't used) only while the
 * user stays at 50 or under. The rest are dropped.
 */
export function fitUserLimit(tags: readonly string[], userTags: readonly string[]): { kept: string[]; dropped: string[] } {
  const have = new Set(userTags.map((t) => t.toLowerCase()))
  let count = distinctTags([{ tags: userTags }]).length
  const kept: string[] = []
  const dropped: string[] = []
  for (const tag of tags) {
    if (have.has(tag.toLowerCase())) kept.push(tag)
    else if (count < MAX_TAGS_PER_USER) {
      kept.push(tag)
      have.add(tag.toLowerCase())
      count++
    } else dropped.push(tag)
  }
  return { kept, dropped }
}

/**
 * For an agent or coach: keep only tags the user already has or starter tags,
 * matched as normaliseTag does, at most MAX_TAGS_PER_WORKOUT; the rest are dropped
 * (as sent, tidied).
 */
export function keepKnownTags(raw: readonly string[], userTags: readonly string[]): { kept: string[]; dropped: string[] } {
  const known = [...userTags, ...STARTER_TAGS]
  const knownLower = new Set(known.map((t) => t.toLowerCase()))
  const kept: string[] = []
  const dropped: string[] = []
  for (const tag of normaliseTags(raw, known)) {
    if (knownLower.has(tag.toLowerCase()) && kept.length < MAX_TAGS_PER_WORKOUT) kept.push(tag)
    else dropped.push(tag)
  }
  return { kept, dropped }
}

/** Library → Workouts search and tag chip: the text in the name, notes or a tag (any case), and the tag if one is active. */
export function matchesFilter(
  item: { name: string; notes?: string | null; tags?: readonly string[] | null },
  query: string,
  tag: string | null
): boolean {
  const tags = item.tags ?? []
  if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [item.name, item.notes ?? '', ...tags].some((text) => text.toLowerCase().includes(q))
}
