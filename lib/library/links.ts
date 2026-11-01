/**
 * Addresses for the Library (`/library`), and where the old list pages send
 * the user. Pure, so client components can use them.
 */

export type LibraryType = 'workouts' | 'programs'

type Query = Record<string, string | string[] | undefined>

/** `/library` with whichever of type, tab and cloning are given. */
export function libraryHref(opts: { type?: LibraryType; tab?: 'browse'; cloning?: string } = {}): string {
  const params = new URLSearchParams()
  if (opts.type) params.set('type', opts.type)
  if (opts.tab) params.set('tab', opts.tab)
  if (opts.cloning) params.set('cloning', opts.cloning)
  const qs = params.toString()
  return qs ? `/library?${qs}` : '/library'
}

/** Only the exact string 'workouts' means Workouts; anything else is Programs. */
export function parseLibraryType(raw: string | string[] | undefined | null): LibraryType {
  return raw === 'workouts' ? 'workouts' : 'programs'
}

/** `/library?type=<type>` plus the rest of the query; any incoming `type` is replaced. */
function withType(type: LibraryType, query: Query): string {
  const params = new URLSearchParams({ type })
  for (const [key, value] of Object.entries(query)) {
    if (key === 'type' || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v)
  }
  return `/library?${params.toString()}`
}

/** `/programs` (keeps `tab`, `cloning` and the rest). */
export function legacyProgramsRedirectTarget(query: Query): string {
  return withType('programs', query)
}

/** `/workouts/saved`. */
export function legacySavedWorkoutsRedirectTarget(query: Query): string {
  return withType('workouts', query)
}

/** `/community`: straight to Browse. */
export function legacyCommunityRedirectTarget(): string {
  return libraryHref({ type: 'programs', tab: 'browse' })
}
