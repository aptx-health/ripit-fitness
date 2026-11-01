/**
 * A program's detail address. No server imports, so client components can use
 * it; lib/training/program-links.ts re-exports it with the server redirects.
 */

export type Query = Record<string, string | string[] | undefined>

function queryString(query: Query = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function programDetailHref(programId: string, query?: Query): string {
  return `/library/programs/${programId}${queryString(query)}`
}
