/**
 * The E-INK theme in the theme system (work item 131). Spec: features/ui/eink.feature, "Pick the
 * e-ink theme", "Light only", "Off by default".
 *
 * Pinned (`@/lib/theme`):
 *   - ThemeName gains 'eink'. It is in THEMES (once), and THEME_LABELS.eink is 'E-INK'. Every
 *     theme in THEMES has a label.
 *   - E-INK is light only: getThemePreference() reads a stored { eink, dark } as { eink, light },
 *     and the `theme_pref=eink:dark` cookie fallback the same way (and re-populates localStorage
 *     with the light value, not the dark one). { eink, light } is read as it is. Other themes are
 *     unaffected: { doom, dark } stays dark.
 *   - The default theme is still ripit, and a new device has no E-ink display (see
 *     eink-display.test.ts).
 *   - applyTheme({ eink, light }) sets data-theme="eink", data-mode="light" and drops the dark
 *     class; saveThemePreference writes the cookie as `eink:light`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, DEFAULT_THEME, getThemePreference, saveThemePreference, THEME_LABELS, THEMES } from '@/lib/theme'

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=;path=/;max-age=0`
  }
}

beforeEach(() => {
  localStorage.clear()
  clearCookies()
  document.documentElement.removeAttribute('data-display')
  document.documentElement.dataset.theme = 'ripit'
  document.documentElement.dataset.mode = 'dark'
  document.documentElement.classList.add('dark')
})
afterEach(() => {
  localStorage.clear()
  clearCookies()
})

describe('theme list', () => {
  it('has E-INK, once, labelled "E-INK"', () => {
    expect((THEMES as string[]).filter((t) => t === 'eink')).toHaveLength(1)
    expect((THEME_LABELS as Record<string, string>).eink).toBe('E-INK')
  })

  it('every theme in the list has a label, and no theme is listed twice', () => {
    for (const name of THEMES) expect(THEME_LABELS[name], name).toBeTruthy()
    expect(new Set(THEMES).size).toBe(THEMES.length)
  })

  it('the default theme is still ripit', () => {
    expect(DEFAULT_THEME.themeName).toBe('ripit')
  })
})

describe('E-INK is light only', () => {
  it('a stored eink:dark is read as light', () => {
    localStorage.setItem('themePreference', JSON.stringify({ themeName: 'eink', mode: 'dark' }))
    expect(getThemePreference()).toEqual({ themeName: 'eink', mode: 'light' })
  })

  it('a stored eink:light is read as it is', () => {
    localStorage.setItem('themePreference', JSON.stringify({ themeName: 'eink', mode: 'light' }))
    expect(getThemePreference()).toEqual({ themeName: 'eink', mode: 'light' })
  })

  it('the cookie fallback reads eink:dark as light too, and stores the light value', () => {
    document.cookie = 'theme_pref=eink:dark;path=/'
    expect(getThemePreference()).toEqual({ themeName: 'eink', mode: 'light' })
    const stored = JSON.parse(localStorage.getItem('themePreference') ?? 'null')
    expect(stored).toEqual({ themeName: 'eink', mode: 'light' })
  })

  it('the cookie fallback accepts eink as a theme at all', () => {
    document.cookie = 'theme_pref=eink:light;path=/'
    expect(getThemePreference().themeName).toBe('eink')
  })

  it('other themes keep their stored mode', () => {
    localStorage.setItem('themePreference', JSON.stringify({ themeName: 'doom', mode: 'dark' }))
    expect(getThemePreference()).toEqual({ themeName: 'doom', mode: 'dark' })
    localStorage.setItem('themePreference', JSON.stringify({ themeName: 'okabe', mode: 'dark' }))
    expect(getThemePreference().mode).toBe('dark')
  })
})

describe('applying and saving E-INK', () => {
  it('applyTheme sets the e-ink theme in light mode and drops the dark class', () => {
    applyTheme({ themeName: 'eink' as never, mode: 'light' })
    const root = document.documentElement
    expect(root.dataset.theme).toBe('eink')
    expect(root.dataset.mode).toBe('light')
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('saveThemePreference stores it, and the cookie says eink:light', () => {
    saveThemePreference({ themeName: 'eink' as never, mode: 'light' })
    expect(JSON.parse(localStorage.getItem('themePreference') ?? 'null')).toEqual({ themeName: 'eink', mode: 'light' })
    expect(document.cookie).toContain('theme_pref=eink:light')
  })
})
