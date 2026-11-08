/**
 * E-ink theme tokens and E-ink display rules, read from app/globals.css (work item 131). Spec:
 * features/ui/eink.feature, "Paper look", "Few, strong colours on fills only", "No thin greys",
 * "No motion", "Bolder text". Text and numbers only: jsdom can't render a page, so the contract is
 * what the stylesheet declares. How it looks on the BOOX is a device check.
 *
 * Pinned, [data-theme="eink"] (the light block; selector exactly `[data-theme="eink"]`):
 *   - Defines every token the ripit theme block defines (a missing one would leak the DOOM :root
 *     value into the theme).
 *   - Paper: --background #FFFFFF, --card #FFFFFF, --foreground / --card-foreground #000000,
 *     --border #000000 (solid black dividers and borders).
 *   - Text contrast >= 7:1: foreground on background, card, muted and input; muted-foreground on
 *     background, card, muted and input (muted-foreground is a neutral grey: r = g = b).
 *   - Colour is for fills only: every --*-text token is #000000; every --*-foreground is #000000 or
 *     #FFFFFF; every --*-border is #000000; each fill (primary, secondary, success, warning, error,
 *     accent) and its -hover / -active, and each --*-muted tint, has >= 7:1 against the text on it.
 *   - A small, distinct, saturated palette: each of the six fills is a plain hex colour with HSL
 *     saturation >= 0.5; primary, secondary, accent, warning and error are pairwise at least 90
 *     apart in RGB distance (so they stay distinct on Kaleido 3).
 *   - No shadows, gradients, glows or translucency in the tokens: no gradient / rgba / hsla /
 *     color-mix / 8-digit hex values, and any --shadow* / --glow* token is none or 0.
 *   - Light only: a [data-theme="eink"][data-mode="dark"] block, if there is one, declares the
 *     same values as the light block.
 *   - Rules scoped to the theme (`[data-theme="eink"] ...`) switch off the rest of the look: a
 *     `*` rule with `box-shadow: none`, `text-shadow: none` and `background-image: none`, each
 *     !important, and borders / dividers of at least 2px: a rule for `.border` and one for a
 *     `divide-*` utility, each declaring a border width >= 2px.
 *   - The colour utilities that would paint text or borders in a fill colour are overridden: each of
 *     `.text-primary / -secondary / -accent / -success / -warning / -error` gets `color` black (or
 *     var(--foreground)), and each of `.border-primary / ... / -error` gets `border-color` black
 *     (or var(--border)). (They're used over 400 times across the app; the tokens can't reach them.)
 *
 * Pinned, [data-display="eink"] (any theme; the selectors don't mention data-theme):
 *   - Animations and transitions off everywhere: rules (!important) on `[data-display="eink"] *`,
 *     its ::before and ::after, with `animation: none` (or a zero animation-duration) and
 *     `transition: none` (or a zero transition-duration).
 *   - Bolder text: body text >= weight 500 (a rule on `[data-display="eink"]` itself, or its
 *     html / body), `.font-normal` and `.font-light` raised to >= 500, and `.text-xs` (small
 *     labels) >= 600.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

// ---------- a small CSS reader (rules, declarations, colours) ----------

type Rule = { selector: string; body: string; ctx: string }
type Decl = { value: string; important: boolean }

function parseRules(css: string, ctx = ''): Rule[] {
  const out: Rule[] = []
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open < 0) break
    const head = css.slice(i, open)
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const body = css.slice(open + 1, j - 1)
    const selector = head.slice(head.lastIndexOf(';') + 1).trim()
    if (selector.startsWith('@')) {
      if (!/^@(keyframes|font-face|property)/.test(selector)) out.push(...parseRules(body, `${ctx} ${selector}`.trim()))
    } else {
      out.push({ selector, body, ctx })
    }
    i = j
  }
  return out
}

function parseDecls(body: string): Map<string, Decl> {
  const map = new Map<string, Decl>()
  let depth = 0
  let cur = ''
  const parts: string[] = []
  for (const ch of body) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ';' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  for (const p of parts) {
    const k = p.indexOf(':')
    if (k < 0) continue
    const prop = p.slice(0, k).trim()
    let value = p.slice(k + 1).trim()
    const important = /!\s*important\s*$/i.test(value)
    value = value.replace(/!\s*important\s*$/i, '').trim()
    if (prop) map.set(prop, { value, important })
  }
  return map
}

const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = parseRules(css)
const sels = (r: Rule) => r.selector.split(',').map((s) => s.trim())
const q = (s: string) => s.replace(/'/g, '"')

const blockOf = (selector: string) => {
  const found = rules.filter((r) => sels(r).some((s) => q(s) === selector))
  const merged = new Map<string, Decl>()
  for (const r of found) for (const [k, v] of parseDecls(r.body)) merged.set(k, v)
  return { found: found.length > 0, decls: merged }
}

const EINK = blockOf('[data-theme="eink"]')
const EINK_DARK = blockOf('[data-theme="eink"][data-mode="dark"]')
const RIPIT = blockOf('[data-theme="ripit"]')

function token(name: string, decls = EINK.decls, seen = 0): string | undefined {
  const v = decls.get(name)?.value
  if (v === undefined) return undefined
  const ref = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(v)
  return ref && seen < 5 ? token(ref[1], decls, seen + 1) : v
}

function rgb(hex: string | undefined): [number, number, number] | null {
  if (!hex) return null
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrast(a: string | undefined, b: string | undefined): number {
  const ra = rgb(a)
  const rb = rgb(b)
  if (!ra || !rb) return 0
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function saturation(hex: string | undefined): number {
  const c = rgb(hex)
  if (!c) return 0
  const [r, g, b] = c.map((x) => x / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
}
function distance(a: string | undefined, b: string | undefined): number {
  const ra = rgb(a)
  const rb = rgb(b)
  if (!ra || !rb) return 0
  return Math.hypot(ra[0] - rb[0], ra[1] - rb[1], ra[2] - rb[2])
}
const same = (a: string | undefined, b: string) => (a ?? '').toLowerCase() === b.toLowerCase()
const FILLS = ['primary', 'secondary', 'success', 'warning', 'error', 'accent'] as const

// ---------- guards: the reader itself ----------

describe('reading globals.css (guards)', () => {
  it('finds the ripit theme block and reads its colours', () => {
    expect(RIPIT.found).toBe(true)
    expect(token('--background', RIPIT.decls)).toBe('#FBF8F3')
  })

  it('contrast maths: black on white is 21:1, white on white is 1:1', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })
})

// ---------- the theme block ----------

describe('[data-theme="eink"] tokens', () => {
  // Without the block nothing below can mean anything (and "no gradients" would pass on nothing).
  beforeEach(() => {
    expect(EINK.found, 'no [data-theme="eink"] block in app/globals.css').toBe(true)
  })

  it('has a light theme block', () => {
    expect(EINK.found).toBe(true)
  })

  it('defines every token the ripit theme defines (nothing leaks in from :root)', () => {
    const missing = [...RIPIT.decls.keys()].filter((k) => k.startsWith('--') && !EINK.decls.has(k))
    expect(missing).toEqual([])
  })

  describe('paper', () => {
    it('the page and the cards are white; text is black', () => {
      expect(same(token('--background'), '#FFFFFF')).toBe(true)
      expect(same(token('--card'), '#FFFFFF')).toBe(true)
      expect(same(token('--foreground'), '#000000')).toBe(true)
      expect(same(token('--card-foreground'), '#000000')).toBe(true)
    })

    it('borders are solid black', () => {
      expect(same(token('--border'), '#000000')).toBe(true)
    })
  })

  describe('text contrast (7:1)', () => {
    const SURFACES = ['--background', '--card', '--muted', '--input']
    it.each(SURFACES)('foreground on %s', (surface) => {
      expect(contrast(token('--foreground'), token(surface))).toBeGreaterThanOrEqual(7)
    })
    it.each(SURFACES)('muted-foreground on %s', (surface) => {
      expect(contrast(token('--muted-foreground'), token(surface))).toBeGreaterThanOrEqual(7)
    })
    it('card-foreground on card', () => {
      expect(contrast(token('--card-foreground'), token('--card'))).toBeGreaterThanOrEqual(7)
    })
    it('muted-foreground is a neutral grey, not a coloured text', () => {
      const c = rgb(token('--muted-foreground'))
      expect(c).not.toBeNull()
      expect(new Set(c ?? []).size).toBe(1)
    })
  })

  describe('colour is for fills only', () => {
    it('every --*-text token is black', () => {
      const names = [...EINK.decls.keys()].filter((k) => /^--[\w-]+-text$/.test(k))
      expect(names.length).toBeGreaterThan(0)
      for (const n of names) expect(same(token(n), '#000000'), `${n}: ${token(n)}`).toBe(true)
    })

    it('every --*-foreground token is black or white', () => {
      const names = [...EINK.decls.keys()].filter((k) => /^--[\w-]+-foreground$/.test(k) && k !== '--muted-foreground')
      expect(names.length).toBeGreaterThan(0)
      for (const n of names) {
        const v = token(n)
        expect(same(v, '#000000') || same(v, '#FFFFFF'), `${n}: ${v}`).toBe(true)
      }
    })

    it('every --*-border token is black (borders are not coloured)', () => {
      const names = [...EINK.decls.keys()].filter((k) => /^--[\w-]+-border$/.test(k))
      for (const n of names) expect(same(token(n), '#000000'), `${n}: ${token(n)}`).toBe(true)
    })

    it.each(FILLS)('%s: its text has 7:1 on the fill, and on hover and active', (fill) => {
      expect(contrast(token(`--${fill}`), token(`--${fill}-foreground`)), `--${fill}`).toBeGreaterThanOrEqual(7)
      for (const state of ['hover', 'active']) {
        const t = token(`--${fill}-${state}`)
        if (t !== undefined) expect(contrast(t, token(`--${fill}-foreground`)), `--${fill}-${state}`).toBeGreaterThanOrEqual(7)
      }
    })

    it('black text has 7:1 on every --*-muted tint', () => {
      const names = [...EINK.decls.keys()].filter((k) => /^--[\w]+-muted$/.test(k) && k !== '--muted-foreground')
      expect(names.length).toBeGreaterThan(0)
      for (const n of names) expect(contrast('#000000', token(n)), `${n}: ${token(n)}`).toBeGreaterThanOrEqual(7)
    })
  })

  describe('a small palette that stays distinct', () => {
    it.each(FILLS)('%s is a plain hex colour', (fill) => {
      expect(rgb(token(`--${fill}`)), `--${fill}: ${token(`--${fill}`)}`).not.toBeNull()
    })

    it.each(FILLS)('%s is saturated (HSL saturation >= 0.5)', (fill) => {
      expect(saturation(token(`--${fill}`)), `--${fill}: ${token(`--${fill}`)}`).toBeGreaterThanOrEqual(0.5)
    })

    it('primary, secondary, accent, warning and error are told apart (RGB distance >= 90)', () => {
      const five = ['primary', 'secondary', 'accent', 'warning', 'error'] as const
      for (let i = 0; i < five.length; i++) {
        for (let j = i + 1; j < five.length; j++) {
          const a = token(`--${five[i]}`)
          const b = token(`--${five[j]}`)
          expect(distance(a, b), `${five[i]} ${a} vs ${five[j]} ${b}`).toBeGreaterThanOrEqual(90)
        }
      }
    })
  })

  describe('no shadows, gradients, glows or translucency in the tokens', () => {
    it('no gradient / rgba / hsla / color-mix / 8-digit hex value', () => {
      const bad = [...EINK.decls].filter(([, d]) => /gradient|rgba\(|hsla\(|color-mix|#[0-9a-f]{8}\b/i.test(d.value))
      expect(bad.map(([k, d]) => `${k}: ${d.value}`)).toEqual([])
    })

    it('any shadow or glow token is none', () => {
      const names = [...EINK.decls.keys()].filter((k) => /shadow|glow/.test(k))
      for (const n of names) expect(token(n), n).toMatch(/^(none|0|0px)$/)
    })
  })

  describe('light only', () => {
    it('a dark block, if there is one, declares what the light block does', () => {
      if (!EINK_DARK.found) return
      for (const [k, d] of EINK_DARK.decls) {
        if (k.startsWith('--')) expect(token(k, EINK_DARK.decls), k).toBe(token(k, EINK.decls) ?? d.value)
      }
    })
  })

  describe('rules scoped to the theme', () => {
    const scoped = rules.filter((r) => sels(r).some((s) => q(s).startsWith('[data-theme="eink"] ')))
    const declsFor = (re: RegExp) => scoped.filter((r) => sels(r).some((s) => re.test(q(s)))).map((r) => parseDecls(r.body))

    it.each(['box-shadow', 'text-shadow', 'background-image'])('%s is none, !important, on everything', (prop) => {
      const all = declsFor(/^\[data-theme="eink"\]\s+\*(::before|::after)?$/)
      expect(all.some((d) => d.get(prop)?.value === 'none' && d.get(prop)?.important), `no "[data-theme=eink] * { ${prop}: none !important }"`).toBe(true)
    })

    const wide = (d: Map<string, Decl>) => {
      for (const [k, v] of d) {
        if (/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?-width$/.test(k) || /^border(-(top|right|bottom|left))?$/.test(k)) {
          const m = /(\d+(?:\.\d+)?)px/.exec(v.value)
          if (m && Number(m[1]) >= 2) return true
        }
      }
      return false
    }

    const BLACK = /^(#000(000)?|black|var\(--foreground\)|var\(--border\)|var\(--card-foreground\))$/i
    const overridden = (prefix: 'text' | 'border', name: string) => {
      const prop = prefix === 'text' ? 'color' : 'border-color'
      return declsFor(new RegExp(`\\.${prefix}-${name}(?![\\w-])`)).some((d) => BLACK.test(d.get(prop)?.value ?? ''))
    }
    it.each(['primary', 'secondary', 'accent', 'success', 'warning', 'error'])('.text-%s is black, not the fill colour', (name) => {
      expect(overridden('text', name), `no "[data-theme=eink] .text-${name} { color: black }"`).toBe(true)
    })
    it.each(['primary', 'secondary', 'accent', 'success', 'warning', 'error'])('.border-%s is black, not the fill colour', (name) => {
      expect(overridden('border', name), `no "[data-theme=eink] .border-${name} { border-color: black }"`).toBe(true)
    })

    it('the .border utility is at least 2px', () => {
      expect(declsFor(/\.border(?![\w-])/).some(wide)).toBe(true)
    })

    it('dividers (divide-* utilities) are at least 2px', () => {
      expect(declsFor(/\.divide-[xy]/).some(wide)).toBe(true)
    })
  })
})

// ---------- the display rules ----------

describe('[data-display="eink"] rules', () => {
  const display = rules.filter((r) => sels(r).some((s) => q(s).includes('[data-display="eink"]')))
  const withSel = (re: RegExp) => display.filter((r) => sels(r).some((s) => re.test(q(s))))

  it('there are display rules', () => {
    expect(display.length).toBeGreaterThan(0)
  })

  describe('no motion', () => {
    const zeroAnim = (d: Map<string, Decl>) => {
      const a = d.get('animation')
      const ad = d.get('animation-duration')
      const ok = (x: Decl | undefined, re: RegExp) => !!x && x.important && re.test(x.value)
      return ok(a, /^none\b/) || ok(ad, /^0(\.0+)?m?s$/)
    }
    const zeroTrans = (d: Map<string, Decl>) => {
      const t = d.get('transition')
      const td = d.get('transition-duration')
      const ok = (x: Decl | undefined, re: RegExp) => !!x && x.important && re.test(x.value)
      return ok(t, /^none\b/) || ok(td, /^0(\.0+)?m?s$/)
    }
    const targets = [
      ['everything', /^\[data-display="eink"\]\s+\*$/],
      ['::before', /^\[data-display="eink"\]\s+\*::before$/],
      ['::after', /^\[data-display="eink"\]\s+\*::after$/],
    ] as const

    it.each(targets)('animations are off on %s', (_n, re) => {
      expect(withSel(re).some((r) => zeroAnim(parseDecls(r.body)))).toBe(true)
    })
    it.each(targets)('transitions are off on %s', (_n, re) => {
      expect(withSel(re).some((r) => zeroTrans(parseDecls(r.body)))).toBe(true)
    })

    it('works with any theme: the motion rules never mention data-theme', () => {
      const motion = display.filter((r) => {
        const d = parseDecls(r.body)
        return zeroAnim(d) || zeroTrans(d)
      })
      expect(motion.length).toBeGreaterThan(0)
      for (const r of motion) expect(r.selector).not.toContain('data-theme')
    })
  })

  describe('bolder text', () => {
    const weightOf = (r: Rule) => {
      const v = parseDecls(r.body).get('font-weight')?.value
      if (!v) return 0
      if (v === 'bold' || v === 'bolder') return 700
      if (v === 'normal') return 400
      return Number.parseInt(v, 10) || 0
    }
    it('body text is at least medium (500)', () => {
      const hits = withSel(/^\[data-display="eink"\](\s+(html|body))?$|^html\[data-display="eink"\](\s+body)?$|^\[data-display="eink"\]\s+body$/)
      expect(hits.some((r) => weightOf(r) >= 500)).toBe(true)
    })
    it.each(['.font-normal', '.font-light'])('%s is raised to at least 500', (cls) => {
      expect(withSel(new RegExp(`\\${cls}(?![\\w-])`)).some((r) => weightOf(r) >= 500)).toBe(true)
    })
    it('small labels (.text-xs) are at least semibold (600)', () => {
      expect(withSel(/\.text-xs(?![\w-])/).some((r) => weightOf(r) >= 600)).toBe(true)
    })
  })
})
