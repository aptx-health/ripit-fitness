/**
 * Leaving E-INK restores the mode from before (work item 134, review 133 finding 7). Spec:
 * features/ui/eink.feature, "Leaving the theme". pickTheme (hooks/useThemePreference) remembers
 * the mode when E-INK (light only) is picked and restores it when another theme is picked. With
 * nothing remembered (E-INK set some other way, or storage cleared) it falls back to the device's
 * own mode, as a new device gets. Switching between other themes keeps the mode as before.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickTheme, updateTheme } from '@/hooks/useThemePreference'
import { getThemePreference, type ThemeName, type ThemePreference } from '@/lib/theme'

vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const root = document.documentElement
let osDark = false

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=;path=/;max-age=0`
  }
}
function seed(pref: ThemePreference) {
  localStorage.clear()
  clearCookies()
  act(() => updateTheme(pref))
}
const pick = (themeName: ThemeName) => act(() => pickTheme(getThemePreference(), themeName))

beforeEach(() => {
  osDark = false
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('prefers-color-scheme: dark') && osDark,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  clearCookies()
  root.removeAttribute('data-display')
})

describe('leaving E-INK', () => {
  it('from dark: E-INK is light, and the next theme is dark again', () => {
    seed({ themeName: 'doom', mode: 'dark' })
    pick('eink')
    expect(getThemePreference()).toEqual({ themeName: 'eink', mode: 'light' })
    pick('github')
    expect(getThemePreference()).toEqual({ themeName: 'github', mode: 'dark' })
    expect(root.dataset.mode).toBe('dark')
    expect(root.classList.contains('dark')).toBe(true)
  })

  it('from light: the next theme is light', () => {
    osDark = true // the device would say dark; the remembered light wins
    seed({ themeName: 'ripit', mode: 'light' })
    pick('eink')
    pick('cyber')
    expect(getThemePreference()).toEqual({ themeName: 'cyber', mode: 'light' })
  })

  it('the remembered mode is used once: a later trip to E-INK remembers afresh', () => {
    seed({ themeName: 'doom', mode: 'dark' })
    pick('eink')
    pick('github')
    act(() => updateTheme({ themeName: 'github', mode: 'light' }))
    pick('eink')
    pick('okabe')
    expect(getThemePreference().mode).toBe('light')
  })

  it.each([
    [true, 'dark'],
    [false, 'light'],
  ] as const)('with nothing remembered it falls back to the device mode (OS dark %s -> %s)', (dark, mode) => {
    osDark = dark
    seed({ themeName: 'eink', mode: 'light' })
    pick('dracula')
    expect(getThemePreference()).toEqual({ themeName: 'dracula', mode })
  })

  it('switching between other themes keeps the mode', () => {
    seed({ themeName: 'doom', mode: 'dark' })
    pick('cyber')
    expect(getThemePreference().mode).toBe('dark')
  })

  it('works when storage of the remembered mode is blocked (falls back to the device mode)', () => {
    seed({ themeName: 'doom', mode: 'dark' })
    const real = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === 'themeModeBeforeLightOnly') throw new Error('QuotaExceededError')
      real.call(this, key, value)
    })
    expect(() => pick('eink')).not.toThrow()
    pick('github')
    expect(getThemePreference()).toEqual({ themeName: 'github', mode: 'light' })
  })
})

describe('through the header theme menu', () => {
  it('DOOM dark -> E-INK -> GITHUB lands in dark', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    seed({ themeName: 'doom', mode: 'dark' })
    const { ThemeSelector } = await import('@/components/ThemeSelector')
    render(createElement(ThemeSelector))
    const trigger = screen.getByRole('button', { name: 'Select theme' })
    for (const label of ['E-INK', 'GITHUB']) {
      fireEvent.keyDown(trigger, { key: 'Enter' })
      fireEvent.click(await screen.findByRole('menuitem', { name: label }))
      await act(async () => {})
    }
    expect(root.dataset.theme).toBe('github')
    expect(root.dataset.mode).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
  })
})
