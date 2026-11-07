/**
 * The ?next= return path that sign-in, sign-up and onboarding carry, so a user
 * who opened a coach invite signed out lands back on it. Only a same-origin
 * path is kept: //evil.com, https://evil.com, /\evil.com and javascript: are
 * dropped.
 */

const BASE = 'http://return-path.invalid'

/** The path (+ query) when `raw` is a same-origin path, else null. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw?.startsWith('/') || raw.startsWith('//') || /[\\\s]/.test(raw)) return null
  try {
    const url = new URL(raw, BASE)
    if (url.origin !== BASE) return null
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

/** `path` with the return path attached, or `path` alone when there is none. */
export function withReturnPath(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path
}

/** The safe return path in the current page's ?next=, read in the browser. */
export function currentReturnPath(): string | null {
  if (typeof window === 'undefined') return null
  return safeReturnPath(new URLSearchParams(window.location.search).get('next'))
}
