// @vitest-environment node
/**
 * UI5 "Settings renders on the server": the page is rendered to HTML the way
 * the server does it, in a node environment with no window, document or
 * localStorage, using the REAL useUserSettings and useThemePreference hooks
 * (their server snapshots). The old page called useSession() during this render
 * and crashed, which is the 500 on GET /settings. A browser-only call in any
 * block's render path fails here.
 *
 * Seam: app/(app)/settings/page.tsx, `export default async function
 * SettingsPage()` (see settings-page.test.tsx for the full pinned interface).
 * On the server (settings not loaded yet) these must already be in the HTML:
 * the heading, the blocks Look, Training targets, Account and Help, the email,
 * and, for admin or editor only, the Admin block. (The Workouts block's
 * controls need the saved settings, so its content may wait for them.)
 */

import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const h = vi.hoisted(() => ({ getCurrentUser: vi.fn(), useSession: vi.fn() }))

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
  useSession: (...args: unknown[]) => {
    h.useSession(...args)
    throw new Error('useSession cannot run while rendering on the server')
  },
  authClient: { changePassword: vi.fn(), signOut: vi.fn() },
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))

const EMAIL = 'ada@example.com'
let errors: ReturnType<typeof vi.spyOn>

async function serverRender(role = 'user'): Promise<string> {
  h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: EMAIL, role }, error: null })
  const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
  return renderToString(createElement('div', null, await mod.default()))
}

beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  h.useSession.mockClear()
})
afterEach(() => errors.mockRestore())

describe('Settings renders on the server', () => {
  it('there is no window or document, as on a real server', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('renders to HTML without throwing', async () => {
    const html = await serverRender()
    expect(html.length).toBeGreaterThan(0)
  })

  it('never calls useSession while rendering', async () => {
    await serverRender('admin')
    expect(h.useSession).not.toHaveBeenCalled()
  })

  it('logs no server error (no React warnings, no hydration-breaking markup)', async () => {
    await serverRender('admin')
    expect(errors).not.toHaveBeenCalled()
  })

  it('the page is in the HTML before any client fetch: heading and blocks', async () => {
    const html = await serverRender()
    expect(html).toMatch(/Settings/)
    for (const block of [/Look/, /Training targets/i, /Account/, /Help/]) expect(html).toMatch(block)
  })

  it('the signed-in email is in the server HTML', async () => {
    expect(await serverRender()).toContain(EMAIL)
  })

  it.each(['admin', 'editor'])('the Admin block is in the server HTML for a %s', async (role) => {
    expect(await serverRender(role)).toMatch(/aria-label="Admin"/)
  })

  it('and not for a regular user', async () => {
    const html = await serverRender('user')
    expect(html).not.toMatch(/aria-label="Admin"/)
    expect(html).not.toMatch(/href="\/admin"/)
  })

  it('has the Equipment link in the server HTML', async () => {
    expect(await serverRender()).toContain('href="/settings/equipment"')
  })

  it('renders for a user whose role is missing', async () => {
    h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: EMAIL }, error: null })
    const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
    const html = renderToString(createElement('div', null, await mod.default()))
    expect(html).not.toMatch(/aria-label="Admin"/)
  })
})
