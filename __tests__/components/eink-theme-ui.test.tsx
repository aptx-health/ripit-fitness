/**
 * E-INK in the theme picker, the Settings switch and the safety-net initializer (work item 131).
 * Spec: features/ui/eink.feature, "Pick the e-ink theme", "Light only", "Leaving the theme",
 * "Toggle in Settings". Real hooks and real lib/theme (storage, cookies and <html> attributes are
 * the observable results); only auth, settings data and navigation are stubbed.
 *
 * Pinned:
 *   - ThemeSelector (header) and the Look block of Settings list "E-INK". Picking it saves
 *     { eink, light } (even from a dark mode), applies data-theme="eink" / data-mode="light" with no
 *     dark class, AND turns E-ink display on: localStorage einkDisplay "true", cookie
 *     eink_display=true, data-display="eink" on <html>, and the Settings switch shows on.
 *   - Picking any other theme leaves E-ink display exactly as it was: off stays off (never written
 *     "true"), on stays on, including when leaving E-INK.
 *   - With the e-ink theme chosen the light/dark switch (the header's "Switch to ... mode" button,
 *     Settings' Mode row) is hidden, or disabled with the words "E-INK is light only" (in its name,
 *     title, description or the Look block); pressing it, if it's there, doesn't change the mode.
 *     With any other theme it is there, enabled, and works as before.
 *   - Settings has a role="switch" named "E-ink display" with the hint "Turns off animation and
 *     makes text bolder for e-ink screens", 48px tall (an h-12 / min-h-12 / 48px height on the switch
 *     or the element around it), aria-checked from the stored value, which toggles E-ink display
 *     (storage, cookie, <html>) whatever the theme. Turning it off while E-INK is the theme leaves
 *     the theme alone.
 *   - ThemeInitializer applies the stored display and reads a stored eink:dark as light.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { updateTheme } from '@/hooks/useThemePreference'
import type { ThemePreference } from '@/lib/theme'

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
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth-client', () => ({
  useSession: () => {
    throw new Error('useSession must not be called by the Settings page')
  },
  authClient: { changePassword: vi.fn(), signOut: vi.fn() },
}))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: h.settings, isLoading: false, error: null, refetch: vi.fn(), updateSettings: vi.fn(async () => {}) }),
}))
vi.mock('@/components/features/FeedbackModal', () => ({ default: () => null }))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const root = document.documentElement
const HINT = 'Turns off animation and makes text bolder for e-ink screens'

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=;path=/;max-age=0`
  }
}
const stored = () => JSON.parse(localStorage.getItem('themePreference') ?? 'null') as ThemePreference | null

async function seedEink(on: boolean) {
  localStorage.setItem('einkDisplay', String(on))
  if (on) root.dataset.display = 'eink'
  else root.removeAttribute('data-display')
  try {
    const d = (await load('@/lib/display')) as { setEinkDisplay: (on: boolean) => void; applyEinkDisplay: (on: boolean) => void }
    d.setEinkDisplay(on)
    d.applyEinkDisplay(on)
  } catch {
    // lib/display isn't there yet
  }
}
/** A device in a known state. updateTheme also resets useThemePreference's cached snapshot. */
async function seed(pref: ThemePreference, einkOn = false) {
  localStorage.clear()
  clearCookies()
  root.removeAttribute('data-display')
  act(() => updateTheme(pref))
  await seedEink(einkOn)
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ email: 'ada@example.com', providers: [] }) })))
  h.getCurrentUser.mockResolvedValue({ user: { id: 'u1', email: 'ada@example.com', role: 'user' }, error: null })
})
afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  await seedEink(false)
  localStorage.clear()
  clearCookies()
  root.removeAttribute('data-display')
})

/** Opens a Radix menu the way a keyboard does, and picks an item by name. */
async function pick(trigger: HTMLElement, label: string) {
  fireEvent.keyDown(trigger, { key: 'Enter' })
  const item = await screen.findByRole('menuitem', { name: label })
  fireEvent.click(item)
  await act(async () => {})
}

function lightOnlyOk(control: HTMLElement | null, scope: HTMLElement) {
  if (control === null) return // hidden
  const described = (control.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
  const words = [control.getAttribute('aria-label'), control.getAttribute('title'), control.textContent, described, scope.textContent].join(' ')
  const disabled = (control as HTMLButtonElement).disabled === true || control.getAttribute('aria-disabled') === 'true'
  expect(disabled, 'the mode control is shown but not disabled').toBe(true)
  expect(words).toMatch(/E-INK is light only/i)
}

// =====================================================================================
describe('ThemeSelector (header)', () => {
  async function mount() {
    const { ThemeSelector } = (await load('@/components/ThemeSelector')) as { ThemeSelector: () => React.ReactElement }
    render(createElement(ThemeSelector))
    return screen.getByRole('button', { name: 'Select theme' })
  }
  const modeButton = () => screen.queryByRole('button', { name: /switch to (dark|light) mode|light only/i })

  it('lists E-INK', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    fireEvent.keyDown(await mount(), { key: 'Enter' })
    expect(await screen.findByRole('menuitem', { name: 'E-INK' })).toBeTruthy()
  })

  it('picking E-INK from dark mode applies the e-ink theme in light mode', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await pick(await mount(), 'E-INK')
    expect(root.dataset.theme).toBe('eink')
    expect(root.dataset.mode).toBe('light')
    expect(root.classList.contains('dark')).toBe(false)
    expect(stored()).toEqual({ themeName: 'eink', mode: 'light' })
    expect(document.cookie).toContain('theme_pref=eink:light')
  })

  it('picking E-INK turns E-ink display on: stored, cookie, and <html>', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await pick(await mount(), 'E-INK')
    expect(localStorage.getItem('einkDisplay')).toBe('true')
    expect(document.cookie).toContain('eink_display=true')
    expect(root.dataset.display).toBe('eink')
  })

  it('picking E-INK with the display already on keeps it on', async () => {
    await seed({ themeName: 'doom', mode: 'dark' }, true)
    await pick(await mount(), 'E-INK')
    expect(localStorage.getItem('einkDisplay')).toBe('true')
    expect(root.dataset.display).toBe('eink')
  })

  it('picking another theme leaves a display that is off, off (never written "true")', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await pick(await mount(), 'DOOM')
    expect(root.dataset.theme).toBe('doom')
    expect(localStorage.getItem('einkDisplay')).not.toBe('true')
    expect(document.cookie).not.toContain('eink_display=true')
    expect(root.hasAttribute('data-display')).toBe(false)
  })

  it('picking another theme leaves a display that is on, on', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' }, true)
    await pick(await mount(), 'DOOM')
    expect(root.dataset.theme).toBe('doom')
    expect(localStorage.getItem('einkDisplay')).toBe('true')
    expect(root.dataset.display).toBe('eink')
  })

  it('leaving E-INK for another theme keeps the display on (the user turns it off)', async () => {
    await seed({ themeName: 'eink' as never, mode: 'light' }, true)
    await pick(await mount(), 'CYBER')
    expect(root.dataset.theme).toBe('cyber')
    expect(localStorage.getItem('einkDisplay')).toBe('true')
    expect(document.cookie).toContain('eink_display=true')
    expect(root.dataset.display).toBe('eink')
  })

  it('with E-INK chosen the light/dark switch is hidden, or disabled with "E-INK is light only"', async () => {
    await seed({ themeName: 'eink' as never, mode: 'light' }, true)
    const trigger = await mount()
    lightOnlyOk(modeButton(), trigger.parentElement as HTMLElement)
  })

  it('pressing the light/dark switch, if it is there, leaves E-INK light', async () => {
    await seed({ themeName: 'eink' as never, mode: 'light' }, true)
    await mount()
    const btn = modeButton()
    if (btn) fireEvent.click(btn)
    await act(async () => {})
    expect(root.dataset.mode).toBe('light')
    expect(root.classList.contains('dark')).toBe(false)
    expect(stored()?.mode).toBe('light')
  })

  it('the switch is hidden the moment E-INK is picked, not only after a reload', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    const trigger = await mount()
    expect(modeButton()).not.toBeNull()
    await pick(trigger, 'E-INK')
    lightOnlyOk(modeButton(), trigger.parentElement as HTMLElement)
  })

  it('control: with another theme the switch is there, enabled, and flips the mode', async () => {
    await seed({ themeName: 'ripit', mode: 'dark' })
    await mount()
    const btn = modeButton() as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    await act(async () => {})
    expect(root.dataset.mode).toBe('light')
  })

  it('leaving E-INK brings the light/dark switch back, enabled', async () => {
    await seed({ themeName: 'eink' as never, mode: 'light' }, true)
    const trigger = await mount()
    await pick(trigger, 'GITHUB')
    const btn = modeButton() as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    await act(async () => {})
    expect(root.dataset.mode).toBe('dark')
  })
})

// =====================================================================================
describe('Settings page', () => {
  async function open() {
    const mod = (await load('@/app/(app)/settings/page')) as { default: () => Promise<React.ReactElement> }
    render(await mod.default())
    await act(async () => {})
  }
  const eink = () => screen.getByRole('switch', { name: /e-ink display/i })
  const look = () => screen.getByRole('region', { name: 'Look' })
  // work 149: the Theme row is a link to /settings/theme; themes are picked there, on its cards.
  const themeLink = () => within(look()).getByRole('link', { name: /theme/i })
  async function pickOnPage(label: string) {
    if (!screen.queryByRole('button', { name: label })) {
      const page = (await load('@/app/(app)/settings/theme/page')) as { default: () => React.ReactElement }
      render(page.default())
      await act(async () => {})
    }
    fireEvent.click(screen.getByRole('button', { name: label }))
    await act(async () => {})
  }

  describe('the E-ink display switch', () => {
    it('is a switch named "E-ink display" with the hint, and off on a new device', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      expect(eink().getAttribute('aria-checked')).toBe('false')
      expect(screen.getByText(HINT)).toBeTruthy()
    })

    it('is 48px: an h-12 / min-h-12 / 48px height on the switch or the element around it', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      const el = eink()
      const tall = (e: HTMLElement | null) =>
        !!e && (/(^|\s)(min-)?h-(12|\[48px\]|\[3rem\])(\s|$)|(^|\s)(min-)?h-1[3-9](\s|$)/.test(e.getAttribute('class') ?? '') || Number.parseInt(e.style.minHeight || e.style.height || '0', 10) >= 48)
      expect(tall(el) || tall(el.parentElement), `class: ${el.getAttribute('class')}`).toBe(true)
    })

    it('shows on when E-ink display is already on', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' }, true)
      await open()
      expect(eink().getAttribute('aria-checked')).toBe('true')
    })

    it('tapping it turns the display on everywhere: switch, storage, cookie, <html>', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      fireEvent.click(eink())
      await waitFor(() => expect(eink().getAttribute('aria-checked')).toBe('true'))
      expect(localStorage.getItem('einkDisplay')).toBe('true')
      expect(document.cookie).toContain('eink_display=true')
      expect(root.dataset.display).toBe('eink')
    })

    it('tapping it again turns it off everywhere', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' }, true)
      await open()
      fireEvent.click(eink())
      await waitFor(() => expect(eink().getAttribute('aria-checked')).toBe('false'))
      expect(localStorage.getItem('einkDisplay')).toBe('false')
      expect(document.cookie).toContain('eink_display=false')
      expect(root.hasAttribute('data-display')).toBe(false)
    })

    it('does not change the theme or mode', async () => {
      await seed({ themeName: 'doom', mode: 'dark' })
      await open()
      fireEvent.click(eink())
      await waitFor(() => expect(eink().getAttribute('aria-checked')).toBe('true'))
      expect(root.dataset.theme).toBe('doom')
      expect(root.dataset.mode).toBe('dark')
      expect(stored()).toEqual({ themeName: 'doom', mode: 'dark' })
    })

    it('works with a dark theme and with a light one', async () => {
      for (const pref of [{ themeName: 'cyber', mode: 'dark' }, { themeName: 'github', mode: 'light' }] as ThemePreference[]) {
        cleanup()
        await seed(pref)
        await open()
        const sw = eink() as HTMLButtonElement
        expect(sw.disabled).toBe(false)
        fireEvent.click(sw)
        await waitFor(() => expect(eink().getAttribute('aria-checked')).toBe('true'))
        expect(root.dataset.display).toBe('eink')
      }
    })

    it('turning it off while E-INK is the theme leaves the theme as it is', async () => {
      await seed({ themeName: 'eink' as never, mode: 'light' }, true)
      await open()
      fireEvent.click(eink())
      await waitFor(() => expect(eink().getAttribute('aria-checked')).toBe('false'))
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
      expect(stored()).toEqual({ themeName: 'eink', mode: 'light' })
      expect(root.hasAttribute('data-display')).toBe(false)
    })
  })

  // work 149: was "the Theme menu" (a dropdown); now the Theme link and the /settings/theme cards.
  describe('the Theme page', () => {
    it('lists E-INK', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      expect(themeLink().getAttribute('href')).toBe('/settings/theme') // work 149
      const page = (await load('@/app/(app)/settings/theme/page')) as { default: () => React.ReactElement } // work 149
      render(page.default()) // work 149
      expect(await screen.findByRole('button', { name: 'E-INK' })).toBeTruthy() // work 149
    })

    it('picking E-INK applies it in light mode and flips the E-ink display switch on', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      expect(eink().getAttribute('aria-checked')).toBe('false')
      await pickOnPage('E-INK') // work 149
      await waitFor(() => expect(eink().getAttribute('aria-checked')).toBe('true'))
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
      expect(root.classList.contains('dark')).toBe(false)
      expect(stored()).toEqual({ themeName: 'eink', mode: 'light' })
      expect(localStorage.getItem('einkDisplay')).toBe('true')
      expect(root.dataset.display).toBe('eink')
    })

    it('the Theme row shows E-INK once picked', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      await pickOnPage('E-INK') // work 149
      await waitFor(() => expect(themeLink().textContent).toMatch(/E-INK/)) // work 149
    })

    it('picking another theme leaves the switch where it was', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' }, true)
      await open()
      await pickOnPage('DRACULA') // work 149
      expect(root.dataset.theme).toBe('dracula')
      expect(eink().getAttribute('aria-checked')).toBe('true')
      expect(localStorage.getItem('einkDisplay')).toBe('true')
    })

    it('picking another theme does not turn a switch that is off on', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      await pickOnPage('DRACULA') // work 149
      expect(eink().getAttribute('aria-checked')).toBe('false')
      expect(root.hasAttribute('data-display')).toBe(false)
    })
  })

  describe('the Mode row', () => {
    const modeRow = () => within(look()).queryByRole('button', { name: /mode/i })

    it('with E-INK it is hidden, or disabled with "E-INK is light only"', async () => {
      await seed({ themeName: 'eink' as never, mode: 'light' }, true)
      await open()
      lightOnlyOk(modeRow(), look())
    })

    it('with E-INK pressing it, if it is there, leaves the mode light', async () => {
      await seed({ themeName: 'eink' as never, mode: 'light' }, true)
      await open()
      const row = modeRow()
      if (row) fireEvent.click(row)
      await act(async () => {})
      expect(root.dataset.mode).toBe('light')
      expect(stored()?.mode).toBe('light')
    })

    it('it goes away as soon as E-INK is picked', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      expect(modeRow()).not.toBeNull()
      await pickOnPage('E-INK') // work 149
      await waitFor(() => lightOnlyOk(modeRow(), look()))
    })

    it('control: with another theme the row is there, enabled, and flips the mode', async () => {
      await seed({ themeName: 'ripit', mode: 'dark' })
      await open()
      const row = modeRow() as HTMLButtonElement
      expect(row.disabled).toBe(false)
      fireEvent.click(row)
      await waitFor(() => expect(root.dataset.mode).toBe('light'))
    })
  })
})

// =====================================================================================
describe('ThemeInitializer', () => {
  async function mount() {
    const { ThemeInitializer } = (await load('@/components/ThemeInitializer')) as { ThemeInitializer: () => null }
    render(createElement(ThemeInitializer))
    await act(async () => {})
  }

  it('reads a stored eink:dark as light: attributes, class and the saved copies', async () => {
    localStorage.clear()
    clearCookies()
    root.dataset.theme = 'ripit'
    root.dataset.mode = 'dark'
    root.classList.add('dark')
    localStorage.setItem('themePreference', JSON.stringify({ themeName: 'eink', mode: 'dark' }))
    await mount()
    expect(root.dataset.theme).toBe('eink')
    expect(root.dataset.mode).toBe('light')
    expect(root.classList.contains('dark')).toBe(false)
    expect(stored()).toEqual({ themeName: 'eink', mode: 'light' })
    expect(document.cookie).not.toContain('eink:dark')
  })

  it('applies a stored E-ink display that the page does not carry yet', async () => {
    localStorage.clear()
    clearCookies()
    root.removeAttribute('data-display')
    localStorage.setItem('einkDisplay', 'true')
    await mount()
    expect(root.dataset.display).toBe('eink')
  })

  it('leaves a device with no E-ink display without the attribute', async () => {
    localStorage.clear()
    clearCookies()
    root.removeAttribute('data-display')
    await mount()
    expect(root.hasAttribute('data-display')).toBe(false)
  })
})
