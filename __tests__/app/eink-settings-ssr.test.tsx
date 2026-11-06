// @vitest-environment node
/**
 * E-ink display on the server (work item 131). Settings and everything that reads the display
 * preference is rendered to HTML with no window, document or localStorage, as the server does it
 * (the same way settings-page-ssr.test.tsx does). Reading the preference during render must not
 * crash the page (that was the 500 on /settings once).
 *
 *   - The Settings page HTML has the "E-ink display" switch and its hint, off (aria-checked="false"),
 *     and logs no React error.
 *   - `useReducedMotion()` renders on the server as false.
 *   - `getEinkDisplay()` is false, and `setEinkDisplay` / `applyEinkDisplay` do nothing and don't
 *     throw, with no window or document.
 */

import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const h = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))

vi.mock('@/lib/auth/server', () => ({ getCurrentUser: h.getCurrentUser }))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth-client', () => ({
  useSession: () => {
    throw new Error('useSession cannot run while rendering on the server')
  },
  authClient: { changePassword: vi.fn(), signOut: vi.fn() },
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))

let errors: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: 'ada@example.com', role: 'user' }, error: null })
})
afterEach(() => errors.mockRestore())

describe('E-ink display on the server', () => {
  it('there is no window or document, as on a real server', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('Settings renders with the E-ink display switch and hint, off, and logs no error', async () => {
    const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
    const html = renderToString(createElement('div', null, await mod.default()))
    expect(html).toContain('E-ink display')
    expect(html).toContain('Turns off animation and makes text bolder for e-ink screens')
    expect(html).toMatch(/role="switch"[^>]*aria-checked="false"[^>]*>|aria-checked="false"[^>]*role="switch"/)
    expect(errors).not.toHaveBeenCalled()
  })

  it('useReducedMotion is false in server HTML', async () => {
    const { useReducedMotion } = (await load('@/lib/display')) as { useReducedMotion: () => boolean }
    const Probe = () => createElement('span', null, `rm:${useReducedMotion()}`)
    expect(renderToString(createElement(Probe))).toContain('rm:false')
    expect(errors).not.toHaveBeenCalled()
  })

  it('getEinkDisplay is false, and set / apply do nothing and do not throw', async () => {
    const d = (await load('@/lib/display')) as { getEinkDisplay: () => boolean; setEinkDisplay: (on: boolean) => void; applyEinkDisplay: (on: boolean) => void }
    expect(d.getEinkDisplay()).toBe(false)
    expect(() => d.setEinkDisplay(true)).not.toThrow()
    expect(() => d.applyEinkDisplay(true)).not.toThrow()
    expect(d.getEinkDisplay()).toBe(false)
  })
})
