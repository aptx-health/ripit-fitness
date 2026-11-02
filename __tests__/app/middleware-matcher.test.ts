/**
 * UI1: the service worker and manifest load when signed out. The middleware
 * redirects signed-out visitors to /login for every path its `config.matcher`
 * matches, so /sw.js and /site.webmanifest must not match. This reads the
 * matcher the way Next does (each entry anchored as a regular expression over
 * the whole path) and checks which paths the middleware would run for.
 *
 * Seam: middleware.ts, export `config.matcher` (string or string[]).
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/middleware', () => ({ updateSession: vi.fn() }))

const load = (spec: string) => import(/* @vite-ignore */ spec)

async function runsFor(path: string) {
  const { config } = await load('@/middleware')
  const entries: string[] = ([] as string[]).concat(config.matcher)
  return entries.some((m) => new RegExp(`^${m}$`).test(path))
}

describe('The service worker loads when signed out', () => {
  it.each(['/sw.js', '/site.webmanifest', '/swe-worker-5c72df51e68a5d0a.js', '/swe-worker-abc123.js'])(
    'the middleware does not run for %s (so it is served, not redirected)',
    async (path) => {
      expect(await runsFor(path)).toBe(false)
    },
  )
})

describe('The middleware still protects the app', () => {
  it.each(['/', '/training', '/library', '/library/programs/abc123', '/settings', '/login', '/api/health', '/api/mcp'])(
    'runs for %s',
    async (path) => {
      expect(await runsFor(path)).toBe(true)
    },
  )

  it.each(['/swim', '/sw', '/swatches', '/site', '/site-settings', '/sitemap.xml', '/settings/sw-notes'])(
    'does not exclude look-alike path %s',
    async (path) => {
      expect(await runsFor(path)).toBe(true)
    },
  )

  it.each(['/favicon.ico', '/_next/static/chunks/main.js', '/_next/image', '/icon-192.png', '/logo.svg', '/hero.webp', '/sentry-tunnel'])(
    'keeps its existing exclusion for %s',
    async (path) => {
      expect(await runsFor(path)).toBe(false)
    },
  )

  it('hands requests to updateSession', async () => {
    const { updateSession } = await load('@/lib/auth/middleware')
    const { middleware } = await load('@/middleware')
    const request = { nextUrl: { pathname: '/training' } }
    await middleware(request)
    expect(updateSession).toHaveBeenCalledWith(request)
  })
})
