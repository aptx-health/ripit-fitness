/**
 * E-ink display preference (work item 131). Spec: features/ui/eink.feature, "Toggle in Settings",
 * "Off by default", "Before first paint".
 *
 * Pinned (`@/lib/display`, no React needed for these four):
 *   getEinkDisplay(): boolean
 *     - On only when localStorage `einkDisplay` is the string "true". "false" is off. A new device
 *       (nothing stored) is off.
 *     - With no usable localStorage value, the cookie `eink_display` ("true" / "false") decides, the
 *       way the theme falls back to `theme_pref` when iOS evicts storage. A stored localStorage
 *       value ("true" or "false") wins over the cookie.
 *     - A localStorage read that throws is not an error: the cookie decides.
 *   setEinkDisplay(on): writes localStorage `einkDisplay` = "true" | "false" and the cookie
 *     `eink_display` = "true" | "false" (path=/, a year of max-age, SameSite=Lax like theme_pref).
 *     A localStorage write that throws is swallowed and the cookie is still written. It doesn't
 *     touch the theme preference.
 *   applyEinkDisplay(on): on sets `data-display="eink"` on <html>; off removes the attribute. It
 *     leaves data-theme, data-mode and the dark class alone.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
type Display = {
  getEinkDisplay: () => boolean
  setEinkDisplay: (on: boolean) => void
  applyEinkDisplay: (on: boolean) => void
}
const display = () => load('@/lib/display') as Promise<Display>

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
  vi.restoreAllMocks()
  localStorage.clear()
  clearCookies()
  document.documentElement.removeAttribute('data-display')
})

describe('getEinkDisplay', () => {
  it('is off on a new device', async () => {
    expect((await display()).getEinkDisplay()).toBe(false)
  })

  it('is on when localStorage says "true"', async () => {
    localStorage.setItem('einkDisplay', 'true')
    expect((await display()).getEinkDisplay()).toBe(true)
  })

  it('is off when localStorage says "false"', async () => {
    localStorage.setItem('einkDisplay', 'false')
    expect((await display()).getEinkDisplay()).toBe(false)
  })

  it.each(['yes', '1', '', 'TRUE', '{"on":true}'])('reads the stored value %j as off (only "true" is on)', async (value) => {
    localStorage.setItem('einkDisplay', value)
    expect((await display()).getEinkDisplay()).toBe(false)
  })

  it('falls back to the cookie when nothing is in localStorage', async () => {
    document.cookie = 'eink_display=true;path=/'
    expect((await display()).getEinkDisplay()).toBe(true)
    clearCookies()
    document.cookie = 'eink_display=false;path=/'
    expect((await display()).getEinkDisplay()).toBe(false)
  })

  it('a stored localStorage value wins over the cookie', async () => {
    localStorage.setItem('einkDisplay', 'false')
    document.cookie = 'eink_display=true;path=/'
    expect((await display()).getEinkDisplay()).toBe(false)
    localStorage.setItem('einkDisplay', 'true')
    clearCookies()
    document.cookie = 'eink_display=false;path=/'
    expect((await display()).getEinkDisplay()).toBe(true)
  })

  it('a localStorage read that throws falls back to the cookie, and to off without one', async () => {
    const { getEinkDisplay } = await display()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(getEinkDisplay()).toBe(false)
    document.cookie = 'eink_display=true;path=/'
    expect(getEinkDisplay()).toBe(true)
  })

  it('ignores the theme cookie and theme preference (the two are separate preferences)', async () => {
    localStorage.setItem('themePreference', JSON.stringify({ themeName: 'eink', mode: 'light' }))
    document.cookie = 'theme_pref=eink:light;path=/'
    expect((await display()).getEinkDisplay()).toBe(false)
  })
})

describe('setEinkDisplay', () => {
  it('turning on stores "true" in localStorage and the cookie, and reads back on', async () => {
    const { setEinkDisplay, getEinkDisplay } = await display()
    setEinkDisplay(true)
    expect(localStorage.getItem('einkDisplay')).toBe('true')
    expect(document.cookie).toContain('eink_display=true')
    expect(getEinkDisplay()).toBe(true)
  })

  it('turning off stores "false" in both, and reads back off', async () => {
    const { setEinkDisplay, getEinkDisplay } = await display()
    setEinkDisplay(true)
    setEinkDisplay(false)
    expect(localStorage.getItem('einkDisplay')).toBe('false')
    expect(document.cookie).toContain('eink_display=false')
    expect(document.cookie).not.toContain('eink_display=true')
    expect(getEinkDisplay()).toBe(false)
  })

  it('writes the cookie like theme_pref: path=/, a year, SameSite=Lax', async () => {
    const { setEinkDisplay } = await display()
    const writes = vi.spyOn(document, 'cookie', 'set')
    setEinkDisplay(true)
    const raw = writes.mock.calls.map((c) => String(c[0])).find((c) => c.startsWith('eink_display='))
    expect(raw).toBeDefined()
    expect(raw).toMatch(/path=\//i)
    expect(raw).toMatch(/max-age=31536000/i)
    expect(raw).toMatch(/samesite=lax/i)
  })

  it('a localStorage write that throws is swallowed and the cookie is still written', async () => {
    const { setEinkDisplay, getEinkDisplay } = await display()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => setEinkDisplay(true)).not.toThrow()
    expect(document.cookie).toContain('eink_display=true')
    expect(getEinkDisplay()).toBe(true)
  })

  it('does not touch the theme preference', async () => {
    const pref = JSON.stringify({ themeName: 'doom', mode: 'dark' })
    localStorage.setItem('themePreference', pref)
    document.cookie = 'theme_pref=doom:dark;path=/'
    const { setEinkDisplay } = await display()
    setEinkDisplay(true)
    setEinkDisplay(false)
    expect(localStorage.getItem('themePreference')).toBe(pref)
    expect(document.cookie).toContain('theme_pref=doom:dark')
  })
})

describe('applyEinkDisplay', () => {
  it('on sets data-display="eink" on <html>', async () => {
    ;(await display()).applyEinkDisplay(true)
    expect(document.documentElement.dataset.display).toBe('eink')
  })

  it('off removes the attribute (it is not left as "off" or empty)', async () => {
    const { applyEinkDisplay } = await display()
    applyEinkDisplay(true)
    applyEinkDisplay(false)
    expect(document.documentElement.hasAttribute('data-display')).toBe(false)
  })

  it('off on a page that never had it is fine', async () => {
    ;(await display()).applyEinkDisplay(false)
    expect(document.documentElement.hasAttribute('data-display')).toBe(false)
  })

  it('applying twice keeps it on', async () => {
    const { applyEinkDisplay } = await display()
    applyEinkDisplay(true)
    applyEinkDisplay(true)
    expect(document.documentElement.dataset.display).toBe('eink')
  })

  it('leaves the theme, mode and dark class alone', async () => {
    const { applyEinkDisplay } = await display()
    applyEinkDisplay(true)
    expect(document.documentElement.dataset.theme).toBe('ripit')
    expect(document.documentElement.dataset.mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyEinkDisplay(false)
    expect(document.documentElement.dataset.theme).toBe('ripit')
    expect(document.documentElement.dataset.mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
