/**
 * Golden file for the iOS theme tests (work item 184, features/ios-app/settings-look.feature,
 * "Themes").
 *
 * Asks a real browser what the web's tokens are. It loads app/globals.css (without the Tailwind
 * import, which only adds utilities) into headless Chrome, then for every theme in lib/theme.ts's
 * THEMES and both modes it runs the web's own normalizePreference and applyTheme (bundled from
 * lib/theme.ts with esbuild) and reads every color token off <html> with getComputedStyle. So the
 * cascade is the browser's: a dark block that leaves a token out inherits the light block's value,
 * and a token no block defines for that theme is left out. E-ink has no dark block; its dark entry
 * is what the web shows for a stored eink:dark (normalized to light).
 *
 * Tokens are the custom properties declared in the [data-theme="…"] blocks. Values are as the web
 * writes them, trimmed, with hex digits uppercased ("#1A1108", "16, 185, 129").
 *
 * Regenerate (from the repo root; needs Google Chrome, or CHROME=/path/to/chrome):
 *   npx tsx scripts/ios/theme-tokens-goldens.ts
 * It writes ios/RipitCore/Tests/Fixtures/themes/tokens.json. Deterministic: run it twice and
 * `git diff` shows nothing. The Swift tests (ThemeTokenTests) are locked; unlock them if the golden
 * changes on purpose.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildSync } from 'esbuild'

const ROOT = process.cwd()
const OUT = join(ROOT, 'ios/RipitCore/Tests/Fixtures/themes')
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8').replace(/^@import "tailwindcss";\s*$/m, '')

const themeJs = buildSync({
  entryPoints: [join(ROOT, 'lib/theme.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'webTheme',
  write: false,
  platform: 'browser',
  tsconfig: join(ROOT, 'tsconfig.json'),
}).outputFiles[0].text

// Runs in the page. Writes its answer as JSON into <pre id="out">.
const probe = `
(() => {
  const t = webTheme
  const block = /^\\[data-theme="[a-z]+"\\](\\[data-mode="dark"\\])?$/
  const names = new Set()
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule) || !block.test(rule.selectorText)) continue
      for (let i = 0; i < rule.style.length; i++) {
        const name = rule.style[i]
        if (name.startsWith('--')) names.add(name.slice(2))
      }
    }
  }
  const tokenNames = [...names].sort()
  const read = () => {
    const style = getComputedStyle(document.documentElement)
    const out = {}
    for (const name of tokenNames) {
      const value = style.getPropertyValue('--' + name).trim()
      if (value) out[name] = value.replace(/#[0-9a-fA-F]{3,8}\\b/g, (h) => h.toUpperCase())
    }
    return out
  }
  const themes = {}
  for (const themeName of t.THEMES) {
    themes[themeName] = {}
    for (const mode of t.MODES) {
      const shown = t.normalizePreference({ themeName, mode })
      t.applyTheme(shown)
      themes[themeName][mode] = { shown, tokens: read() }
    }
  }
  const result = {
    order: t.THEMES,
    labels: t.THEME_LABELS,
    lightOnly: t.LIGHT_ONLY_THEMES,
    defaultTheme: t.DEFAULT_THEME,
    tokenNames,
    themes,
  }
  document.getElementById('out').textContent = JSON.stringify(result)
})()
`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body><pre id="out"></pre><script>${themeJs}</script><script>${probe}</script></body></html>`

const dir = mkdtempSync(join(tmpdir(), 'theme-goldens-'))
const page = join(dir, 'page.html')
writeFileSync(page, html)
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--dump-dom', `file://${page}`], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'ignore'],
})
const match = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)
if (!match?.[1]) throw new Error('The page wrote no answer; check the Chrome path and the probe.')
const result = JSON.parse(match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'))

// Sanity: every theme and mode has tokens, and RIPIT dark is the web's night jungle.
for (const theme of result.order) {
  for (const mode of ['light', 'dark']) {
    if (Object.keys(result.themes[theme][mode].tokens).length < 40) throw new Error(`Too few tokens for ${theme} ${mode}`)
  }
}
if (result.themes.ripit.dark.tokens.background !== '#1A1108') throw new Error('RIPIT dark background is not #1A1108')

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'tokens.json'), `${JSON.stringify({ source: 'scripts/ios/theme-tokens-goldens.ts', ...result }, null, 2)}\n`)
console.log(`Wrote ${join(OUT, 'tokens.json')}: ${result.order.length} themes, ${result.tokenNames.length} token names`)
