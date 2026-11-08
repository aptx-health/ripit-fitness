/**
 * Blocked storage on the first-paint path (work item 134, review 133 finding 3). Spec:
 * features/ui/eink.feature, "Before first paint". When every localStorage call throws (blocked
 * storage, some private modes), both inline scripts still run to the end: the theme_pref and
 * eink_display cookies decide, so an e-ink device keeps E-INK (light) and E-ink display. The old
 * darkMode migration doesn't throw when writing fails. ThemeInitializer doesn't throw either.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SCRIPTS = ['app/layout.tsx', 'app/(auth)/layout.tsx']

function scriptOf(file: string): string {
  const src = readFileSync(path.join(process.cwd(), file), 'utf8')
  const m = /__html:\s*`([^`]*)`/.exec(src)
  if (!m) throw new Error(`${file}: no inline script`)
  return new Function(`return \`${m[1]}\``)() as string
}

const root = document.documentElement
const win = window as unknown as { __authThemeListenerAttached?: boolean }

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=;path=/;max-age=0`
  }
}
function blockStorage() {
  const boom = () => {
    throw new Error('SecurityError')
  }
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom)
}

beforeEach(() => {
  localStorage.clear()
  clearCookies()
  root.dataset.theme = 'ripit'
  root.dataset.mode = 'dark'
  root.classList.add('dark')
  root.removeAttribute('data-display')
  delete win.__authThemeListenerAttached
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  clearCookies()
  root.removeAttribute('data-display')
})

describe.each(SCRIPTS)('inline script %s with storage blocked', (file) => {
  const code = scriptOf(file)

  it('does not throw, and the cookies decide: E-INK in light, display on', () => {
    document.cookie = 'theme_pref=eink:dark;path=/'
    document.cookie = 'eink_display=true;path=/'
    blockStorage()
    expect(() => new Function(code)()).not.toThrow()
    expect(root.dataset.theme).toBe('eink')
    expect(root.dataset.mode).toBe('light')
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.dataset.display).toBe('eink')
  })

  it('another theme from the cookie applies too', () => {
    document.cookie = 'theme_pref=doom:dark;path=/'
    blockStorage()
    expect(() => new Function(code)()).not.toThrow()
    expect(root.dataset.theme).toBe('doom')
    expect(root.dataset.mode).toBe('dark')
    expect(root.hasAttribute('data-display')).toBe(false)
  })
})

describe('the darkMode migration', () => {
  it('applies the old value when writing the new one throws', () => {
    localStorage.setItem('darkMode', 'false')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => new Function(scriptOf('app/layout.tsx'))()).not.toThrow()
    expect(root.dataset.mode).toBe('light')
  })
})

describe('ThemeInitializer with storage blocked', () => {
  it('mounts without throwing and applies the cookies', async () => {
    document.cookie = 'theme_pref=eink:light;path=/'
    document.cookie = 'eink_display=true;path=/'
    blockStorage()
    const { ThemeInitializer } = await import('@/components/ThemeInitializer')
    expect(() => render(createElement(ThemeInitializer))).not.toThrow()
    await act(async () => {})
    expect(root.dataset.theme).toBe('eink')
    expect(root.dataset.mode).toBe('light')
    expect(root.dataset.display).toBe('eink')
  })

  it('the old darkMode migration does not throw from lib/theme either', async () => {
    const { getThemePreference } = await import('@/lib/theme')
    localStorage.setItem('darkMode', 'true')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(getThemePreference()).toEqual({ themeName: 'doom', mode: 'dark' })
  })
})
