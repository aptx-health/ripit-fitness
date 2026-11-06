/**
 * The two inline theme scripts run before React (work item 131). Spec: features/ui/eink.feature,
 * "Before first paint", "Light only", "Off by default". Both scripts are evaluated here against the
 * jsdom document with stored values, and the attributes on <html> are checked: that is all the first
 * paint sees.
 *
 *   app/layout.tsx          dangerouslySetInnerHTML.__html of the <head> script
 *   app/(auth)/layout.tsx   the same for the sign-in pages
 *
 * Pinned (both scripts; they stay plain template-literal text with NO ${} interpolation, because
 * they are read back from the source here and run as they are):
 *   - Stored or cookie theme `eink` is a theme (VALID_THEMES lists it), and its mode is always
 *     light: eink:dark in localStorage or in the theme_pref cookie gives data-mode="light", no
 *     `dark` class, and a theme_pref cookie that never says eink:dark.
 *   - E-ink display is read like lib/display.ts: localStorage `einkDisplay` === "true" is on,
 *     "false" is off, else the cookie `eink_display`. On sets data-display="eink" on <html>; off
 *     leaves no data-display attribute. It does not depend on the theme: any theme can have it.
 *   - localStorage.getItem('einkDisplay') throwing doesn't stop the script: the theme is still
 *     applied and the cookie decides the display.
 *   - VALID_THEMES in each script is the same set as THEMES in lib/theme.ts.
 *   Other themes behave as before (guards).
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEMES } from '@/lib/theme'

const SCRIPTS = [
  { name: 'app/layout.tsx', file: 'app/layout.tsx' },
  { name: 'app/(auth)/layout.tsx', file: 'app/(auth)/layout.tsx' },
] as const

function scriptOf(file: string): string {
  const src = readFileSync(path.join(process.cwd(), file), 'utf8')
  const m = /__html:\s*`([^`]*)`/.exec(src)
  if (!m) throw new Error(`${file}: no inline script (dangerouslySetInnerHTML.__html template literal) found`)
  if (m[1].includes('${')) throw new Error(`${file}: the inline script must not interpolate \${...}; it is plain text`)
  // Cooked, as the browser receives it (a \s in the template literal text is just an s).
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
function run(code: string) {
  new Function(code)()
}

beforeEach(() => {
  localStorage.clear()
  clearCookies()
  // What app/layout.tsx renders before the script runs.
  root.dataset.theme = 'ripit'
  root.dataset.mode = 'dark'
  root.classList.add('dark')
  root.removeAttribute('data-display')
  delete win.__authThemeListenerAttached
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  clearCookies()
  root.removeAttribute('data-display')
})

const store = (themeName: string, mode: string) => localStorage.setItem('themePreference', JSON.stringify({ themeName, mode }))

describe.each(SCRIPTS)('inline script: $name', ({ file }) => {
  const code = scriptOf(file)

  describe('the e-ink theme', () => {
    it('a stored eink:light paints the e-ink theme in light mode', () => {
      store('eink', 'light')
      run(code)
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
      expect(root.classList.contains('dark')).toBe(false)
    })

    it('a stored eink:dark is read as light: no dark mode, no dark class', () => {
      store('eink', 'dark')
      run(code)
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
      expect(root.classList.contains('dark')).toBe(false)
    })

    it('a stored eink:dark never writes eink:dark back to the cookie', () => {
      store('eink', 'dark')
      run(code)
      expect(document.cookie).not.toContain('eink:dark')
    })

    it('the cookie fallback accepts eink (theme_pref=eink:light)', () => {
      document.cookie = 'theme_pref=eink:light;path=/'
      run(code)
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
    })

    it('the cookie fallback reads theme_pref=eink:dark as light', () => {
      document.cookie = 'theme_pref=eink:dark;path=/'
      run(code)
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
      expect(root.classList.contains('dark')).toBe(false)
      expect(document.cookie).not.toContain('eink:dark')
    })

    it('the cookie fallback re-populates localStorage with the light value', () => {
      document.cookie = 'theme_pref=eink:dark;path=/'
      run(code)
      const stored = JSON.parse(localStorage.getItem('themePreference') ?? 'null')
      expect(stored).toEqual({ themeName: 'eink', mode: 'light' })
    })
  })

  describe('other themes are unchanged', () => {
    it('a stored doom:dark stays dark', () => {
      store('doom', 'dark')
      run(code)
      expect(root.dataset.theme).toBe('doom')
      expect(root.dataset.mode).toBe('dark')
      expect(root.classList.contains('dark')).toBe(true)
    })

    it('a stored github:light stays light and drops the dark class the server rendered', () => {
      store('github', 'light')
      run(code)
      expect(root.dataset.theme).toBe('github')
      expect(root.dataset.mode).toBe('light')
      expect(root.classList.contains('dark')).toBe(false)
    })

    it('a cookie for an unknown theme is still ignored', () => {
      document.cookie = 'theme_pref=nonsense:dark;path=/'
      run(code)
      expect(root.dataset.theme).toBe('ripit')
    })
  })

  describe('E-ink display', () => {
    it('is off on a new device: no data-display', () => {
      run(code)
      expect(root.hasAttribute('data-display')).toBe(false)
    })

    it('localStorage "true" sets data-display="eink" before anything else runs', () => {
      localStorage.setItem('einkDisplay', 'true')
      run(code)
      expect(root.dataset.display).toBe('eink')
    })

    it('localStorage "false" leaves it off', () => {
      localStorage.setItem('einkDisplay', 'false')
      run(code)
      expect(root.hasAttribute('data-display')).toBe(false)
    })

    it('falls back to the cookie: eink_display=true is on', () => {
      document.cookie = 'eink_display=true;path=/'
      run(code)
      expect(root.dataset.display).toBe('eink')
    })

    it('a cookie that says false is off', () => {
      document.cookie = 'eink_display=false;path=/'
      run(code)
      expect(root.hasAttribute('data-display')).toBe(false)
    })

    it('a stored localStorage value wins over the cookie', () => {
      localStorage.setItem('einkDisplay', 'false')
      document.cookie = 'eink_display=true;path=/'
      run(code)
      expect(root.hasAttribute('data-display')).toBe(false)
    })

    it('works with any theme: ripit with display on', () => {
      store('ripit', 'dark')
      localStorage.setItem('einkDisplay', 'true')
      run(code)
      expect(root.dataset.theme).toBe('ripit')
      expect(root.dataset.mode).toBe('dark')
      expect(root.dataset.display).toBe('eink')
    })

    it('the e-ink theme alone does not turn the display on (they are separate preferences)', () => {
      store('eink', 'light')
      run(code)
      expect(root.hasAttribute('data-display')).toBe(false)
    })

    it('the e-ink theme with the display on: both at first paint', () => {
      store('eink', 'light')
      localStorage.setItem('einkDisplay', 'true')
      run(code)
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
      expect(root.dataset.display).toBe('eink')
    })

    it('display on with nothing else stored still applies (no stored theme)', () => {
      document.cookie = 'eink_display=true;path=/'
      run(code)
      expect(root.dataset.display).toBe('eink')
      expect(root.dataset.theme).toBe('ripit')
    })

    it('a localStorage read of einkDisplay that throws does not stop the theme; the cookie decides', () => {
      store('eink', 'dark')
      document.cookie = 'eink_display=true;path=/'
      const real = Storage.prototype.getItem
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
        if (key === 'einkDisplay') throw new Error('SecurityError')
        return real.call(this, key)
      })
      expect(() => run(code)).not.toThrow()
      expect(root.dataset.theme).toBe('eink')
      expect(root.dataset.mode).toBe('light')
      expect(root.dataset.display).toBe('eink')
    })

    it('a throwing einkDisplay read with no cookie leaves the display off and the theme applied', () => {
      store('doom', 'dark')
      const real = Storage.prototype.getItem
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
        if (key === 'einkDisplay') throw new Error('SecurityError')
        return real.call(this, key)
      })
      expect(() => run(code)).not.toThrow()
      expect(root.dataset.theme).toBe('doom')
      expect(root.hasAttribute('data-display')).toBe(false)
    })
  })

  describe('the theme list in the script', () => {
    it('VALID_THEMES is the same set as THEMES in lib/theme.ts', () => {
      const m = /VALID_THEMES\s*=\s*\[([^\]]*)\]/.exec(code)
      expect(m, 'VALID_THEMES array not found').not.toBeNull()
      const listed = [...(m?.[1] ?? '').matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1])
      expect([...listed].sort()).toEqual([...THEMES].sort())
    })

    it('lists eink', () => {
      const m = /VALID_THEMES\s*=\s*\[([^\]]*)\]/.exec(code)
      expect(m?.[1] ?? '').toMatch(/['"]eink['"]/)
    })
  })
})

describe('the two scripts agree', () => {
  it.each([
    ['eink', 'dark', 'true'],
    ['eink', 'light', 'false'],
    ['okabe', 'dark', 'true'],
    ['cyber', 'light', 'false'],
  ])('%s:%s with einkDisplay=%s gives the same attributes in both', (themeName, mode, einkDisplay) => {
    const seen = SCRIPTS.map(({ file }) => {
      localStorage.clear()
      clearCookies()
      root.dataset.theme = 'ripit'
      root.dataset.mode = 'dark'
      root.classList.add('dark')
      root.removeAttribute('data-display')
      delete win.__authThemeListenerAttached
      store(themeName, mode)
      localStorage.setItem('einkDisplay', einkDisplay)
      run(scriptOf(file))
      return [root.dataset.theme, root.dataset.mode, root.classList.contains('dark'), root.dataset.display ?? null]
    })
    expect(seen[0]).toEqual(seen[1])
  })
})
