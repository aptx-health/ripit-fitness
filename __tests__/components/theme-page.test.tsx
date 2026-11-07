/**
 * Settings → Theme page (work 149). Spec: features/ui/theme-page.feature.
 * Real hooks and real lib/theme: storage, cookies and <html> attributes are the
 * observable results; only auth, settings data and navigation are stubbed.
 *
 *   - Settings' Look block has a Theme link to /settings/theme (no menu).
 *   - /settings/theme: the "← Settings" header, title "Theme", one card per
 *     theme in THEMES order, each a button named by its label, with a Light and
 *     a Dark preview scoped by data-theme / data-mode (E-INK: Light only).
 *   - The current card is pressed and says "Current"; tapping a card picks it
 *     through pickTheme (E-INK still turns the display on, leaving it restores
 *     the mode). The page shows the mode in use, and fetches nothing.
 *   - The header picker's menu is capped to the space Radix says is available,
 *     and scrolls inside it.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { updateTheme } from '@/hooks/useThemePreference'
import { THEME_LABELS, THEMES, type ThemePreference } from '@/lib/theme'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  settings: { displayName: null, defaultWeightUnit: 'lbs', defaultIntensityRating: 'rir', intensityEnabled: false, loggingMode: 'full' },
}))

vi.mock('@/lib/auth/server', () => ({ getCurrentUser: h.getCurrentUser }))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings/theme',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth-client', () => ({ authClient: { changePassword: vi.fn(), signOut: vi.fn() } }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: h.settings, isLoading: false, error: null, refetch: vi.fn(), updateSettings: vi.fn(async () => {}) }),
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const root = document.documentElement
const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ email: 'ada@example.com', providers: [] }) }))

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=;path=/;max-age=0`
  }
}
async function seed(pref: ThemePreference, einkOn = false) {
  localStorage.clear()
  clearCookies()
  const d = (await load('@/lib/display')) as { setEinkDisplay: (on: boolean) => void; applyEinkDisplay: (on: boolean) => void }
  d.setEinkDisplay(einkOn)
  d.applyEinkDisplay(einkOn)
  act(() => updateTheme(pref))
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
  fetchSpy.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
  h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: 'ada@example.com', role: 'user' }, error: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
  clearCookies()
  root.removeAttribute('data-display')
})

async function openThemePage() {
  const mod = (await load('@/app/(app)/settings/theme/page')) as { default: () => React.ReactElement }
  render(mod.default())
  await act(async () => {})
}
const card = (label: string) => screen.getByRole('button', { name: label })
const cards = () => THEMES.map((t) => card(THEME_LABELS[t]))

describe('Settings links to the Theme page', () => {
  it('the Look block has a Theme link to /settings/theme showing the current theme, and no menu', async () => {
    await seed({ themeName: 'dracula', mode: 'dark' })
    const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
    render(await mod.default())
    await act(async () => {})
    const look = screen.getByRole('region', { name: 'Look' })
    const link = within(look).getByRole('link', { name: /theme/i })
    expect(link.getAttribute('href')).toBe('/settings/theme')
    expect(link.textContent).toMatch(/DRACULA/)
    expect(within(look).queryByRole('button', { name: /theme/i })).toBeNull()
    expect(link.getAttribute('aria-haspopup')).toBeNull()
  })
})

describe('/settings/theme', () => {
  it('has the shared "Settings" back link and the title "Theme"', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    expect(screen.getByRole('link', { name: /settings/i }).getAttribute('href')).toBe('/settings')
    expect(screen.getByRole('heading', { level: 1, name: 'Theme' })).toBeTruthy()
  })

  it('has one card per theme, in THEMES order, each at least 48px tall', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    const all = cards()
    expect(all).toHaveLength(THEMES.length)
    for (let i = 1; i < all.length; i++) {
      // DOCUMENT_POSITION_FOLLOWING: each card comes after the one before it
      expect(all[i - 1].compareDocumentPosition(all[i]) & 4).toBe(4)
    }
    for (const c of all) expect(c.className).toMatch(/(^|\s)min-h-12(\s|$)/)
  })

  it('each card previews Light and Dark, scoped to its own theme', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    for (const t of THEMES.filter((x) => x !== 'eink')) {
      const c = card(THEME_LABELS[t])
      const previews = c.querySelectorAll<HTMLElement>('[data-theme]')
      expect([...previews].map((p) => [p.dataset.theme, p.dataset.mode])).toEqual([
        [t, 'light'],
        [t, 'dark'],
      ])
      expect(within(c).getByText('Light')).toBeTruthy()
      expect(within(c).getByText('Dark')).toBeTruthy()
    }
  })

  it('each preview draws a background, a card with a heading and muted text, a primary button and an accent', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    const preview = card('DOOM').querySelector<HTMLElement>('[data-theme="doom"][data-mode="dark"]') as HTMLElement
    const html = preview.outerHTML
    for (const v of ['--background', '--card', '--foreground', '--muted-foreground', '--primary', '--accent']) {
      expect(html, v).toContain(`var(${v})`)
    }
  })

  it('E-INK shows only Light, marked "Light only"', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    const c = card('E-INK')
    const previews = c.querySelectorAll<HTMLElement>('[data-theme]')
    expect([...previews].map((p) => [p.dataset.theme, p.dataset.mode])).toEqual([['eink', 'light']])
    expect(within(c).getByText('Light only')).toBeTruthy()
    expect(within(c).queryByText('Dark')).toBeNull()
  })

  it('marks the current theme with "Current", and only that one', async () => {
    await seed({ themeName: 'catppuccin', mode: 'light' })
    await openThemePage()
    const current = card('CATPPUCCIN')
    expect(current.getAttribute('aria-pressed')).toBe('true')
    expect(within(current).getByText('Current')).toBeTruthy()
    expect(screen.getAllByText('Current')).toHaveLength(1)
    expect(card('DOOM').getAttribute('aria-pressed')).toBe('false')
  })

  it('shows the mode in use', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    expect(screen.getByText(/dark mode/i)).toBeTruthy()
    cleanup()
    await seed({ themeName: 'github', mode: 'light' })
    await openThemePage()
    expect(screen.getByText(/light mode/i)).toBeTruthy()
  })

  it('tapping a card switches the theme at once, keeping the mode, and the card becomes Current', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    fireEvent.click(card('FOREST'))
    await act(async () => {})
    expect(root.dataset.theme).toBe('forest')
    expect(root.dataset.mode).toBe('dark')
    await waitFor(() => expect(card('FOREST').getAttribute('aria-pressed')).toBe('true'))
    expect(card('RIPIT').getAttribute('aria-pressed')).toBe('false')
  })

  it('picking E-INK turns E-ink display on; leaving it restores the old mode and keeps the display', async () => {
    await seed({ themeName: 'doom', mode: 'dark' })
    await openThemePage()
    fireEvent.click(card('E-INK'))
    await act(async () => {})
    expect(root.dataset.theme).toBe('eink')
    expect(root.dataset.mode).toBe('light')
    expect(localStorage.getItem('einkDisplay')).toBe('true')
    expect(root.dataset.display).toBe('eink')
    fireEvent.click(card('GITHUB'))
    await act(async () => {})
    expect(root.dataset.theme).toBe('github')
    expect(root.dataset.mode).toBe('dark')
    expect(root.dataset.display).toBe('eink')
  })

  it('fetches nothing', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await openThemePage()
    fireEvent.click(card('CYBER'))
    await act(async () => {})
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('has a loading.tsx', async () => {
    const mod = (await load('@/app/(app)/settings/theme/loading')) as { default: () => React.ReactElement }
    render(mod.default())
    expect(screen.getByText(/loading theme/i)).toBeTruthy()
  })
})

describe('the header picker', () => {
  it('caps its menu to the available height and scrolls inside it', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    const { ThemeSelector } = (await load('@/components/ThemeSelector')) as { ThemeSelector: () => React.ReactElement }
    render(createElement(ThemeSelector))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Select theme' }), { key: 'Enter' })
    const menu = await screen.findByRole('menu')
    expect(menu.className).toContain('max-h-[var(--radix-dropdown-menu-content-available-height)]')
    expect(menu.className).toMatch(/(^|\s)overflow-y-auto(\s|$)/)
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(THEMES.length)
  })
})
