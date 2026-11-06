/**
 * E-ink fixes after review 133 (work item 134), read from app/globals.css. Spec:
 * features/ui/eink.feature, "Paper look", "No thin greys", "Bolder text". jsdom can't render, so
 * these pin what the stylesheet declares under [data-theme="eink"] / [data-display="eink"].
 *
 *   1. Fields are visible: `.border-input` (and raw `border-gray-*` borders) are black; placeholders
 *      use --muted-foreground at full opacity (auth pages hard-code #6B6B6B, 5.3:1).
 *   2. No fades: whole-class `opacity-*` utilities are drawn at opacity 1, except `opacity-0` (it
 *      hides things); disabled controls (`:disabled`, `[aria-disabled="true"]`) are at opacity 1
 *      with a cue that isn't a fade: not-allowed cursor, dashed border, muted fill.
 *   4. Follow-along progress segments: done filled, the rest outlined (not colour alone).
 *   5. The semibold floor covers text-[9px] to text-[12px] too, not only .text-xs.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type Rule = { selectors: string[]; decls: Map<string, string> }

function parse(css: string): Rule[] {
  const out: Rule[] = []
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open < 0) break
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const head = css.slice(i, open)
    const selector = head.slice(head.lastIndexOf(';') + 1).trim()
    const body = css.slice(open + 1, j - 1)
    if (selector.startsWith('@')) {
      if (!/^@(keyframes|font-face|property)/.test(selector)) out.push(...parse(body))
    } else {
      const decls = new Map<string, string>()
      for (const d of body.split(';')) {
        const k = d.indexOf(':')
        if (k > 0) decls.set(d.slice(0, k).trim(), d.slice(k + 1).trim())
      }
      // Split on top-level commas only (not inside :is()/:not()).
      const selectors: string[] = []
      let cur = ''
      let paren = 0
      for (const ch of selector) {
        if (ch === '(') paren++
        if (ch === ')') paren--
        if (ch === ',' && paren === 0) {
          selectors.push(cur.trim())
          cur = ''
        } else cur += ch
      }
      selectors.push(cur.trim())
      out.push({ selectors, decls })
    }
    i = j
  }
  return out
}

const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = parse(css)
const declsFor = (test: (selector: string) => boolean) => rules.filter((r) => r.selectors.some(test)).map((r) => r.decls)
const has = (test: (selector: string) => boolean, prop: string, value: RegExp) => declsFor(test).some((d) => value.test(d.get(prop) ?? ''))
const BLACK = /^(#000(000)?|black|var\(--border\)|var\(--foreground\))$/i

describe('1. fields are visible', () => {
  it('.border-input is black under the e-ink theme', () => {
    expect(has((s) => /^\[data-theme="eink"\]\s+\.border-input$/.test(s), 'border-color', BLACK)).toBe(true)
  })

  it('raw grey borders (border-gray-*) are black, as whole classes', () => {
    expect(has((s) => s.startsWith('[data-theme="eink"]') && s.includes('[class^="border-gray-"]') && s.includes('[class*=" border-gray-"]'), 'border-color', BLACK)).toBe(true)
  })

  it('placeholders use the muted text colour at full opacity', () => {
    const d = declsFor((s) => /^\[data-theme="eink"\]\s+::placeholder$/.test(s))
    expect(d.some((x) => x.get('color') === 'var(--muted-foreground)' && x.get('opacity') === '1')).toBe(true)
  })
})

describe('2. no fades', () => {
  const opacityRule = (s: string) => s.startsWith('[data-theme="eink"]') && s.includes('[class^="opacity-"]') && s.includes('[class*=" opacity-"]')

  it('whole-class opacity-* utilities are drawn at opacity 1', () => {
    expect(has(opacityRule, 'opacity', /^1$/)).toBe(true)
  })

  it('opacity-0 is left alone (it hides things)', () => {
    const sel = rules.flatMap((r) => r.selectors).find(opacityRule) ?? ''
    expect(sel).toContain(':not(.opacity-0)')
  })

  it('variants (disabled:, hover:) are not matched: only a class at the start or after a space', () => {
    const sel = rules.flatMap((r) => r.selectors).find(opacityRule) ?? ''
    expect(sel).not.toMatch(/\[class\*="opacity-"\]/)
  })

  describe('disabled controls keep a cue that is not a fade', () => {
    const disabled = (s: string) => s.startsWith('[data-theme="eink"]') && s.includes(':disabled') && s.includes('[aria-disabled="true"]')
    it('full opacity', () => expect(has(disabled, 'opacity', /^1$/)).toBe(true))
    it('not-allowed cursor', () => expect(has(disabled, 'cursor', /^not-allowed$/)).toBe(true))
    it('a dashed border', () => expect(has(disabled, 'border-style', /^dashed$/)).toBe(true))
    it('a muted fill', () => expect(has(disabled, 'background-color', /^var\(--muted\)$/)).toBe(true))
  })
})

describe('4. follow-along progress segments', () => {
  it('under e-ink, remaining segments are outlined on paper', () => {
    const d = declsFor((s) => /^\[data-theme="eink"\]\s+\.fa-segment$/.test(s))
    expect(d.some((x) => /solid var\(--border\)/.test(x.get('border') ?? '') && x.get('background-color') === 'var(--background)')).toBe(true)
  })

  it('done segments are filled', () => {
    expect(has((s) => /^\[data-theme="eink"\]\s+\.fa-segment\[data-done\]$/.test(s), 'background-color', /^var\(--foreground\)$/)).toBe(true)
  })
})

describe('5. the semibold floor covers arbitrary small sizes', () => {
  it.each(['9px', '10px', '11px', '12px'])('text-[%s] is at least 600 with E-ink display', (size) => {
    const re = new RegExp(`^\\[data-display="eink"\\]\\s+\\.text-\\\\\\[${size}\\\\\\]`)
    expect(declsFor((s) => re.test(s)).some((d) => Number.parseInt(d.get('font-weight') ?? '0', 10) >= 600)).toBe(true)
  })

  it('does not lighten bold small text', () => {
    const sel = rules.flatMap((r) => r.selectors).find((s) => s.includes('.text-\\[11px\\]')) ?? ''
    expect(sel).toContain(':not(.font-bold)')
  })
})
