#!/usr/bin/env node
/**
 * perf-check tap test: one tap on a phone-like link, timed.
 *
 *   node .claude/skills/perf-check/scripts/tap-test.mjs --base http://localhost:3230 \
 *     --login bodybuilder@synthetic.test:password --start /progress \
 *     --before 'role=tab[name=/Lifts/]' --tap 'a[href^="/progress/lift/"]' \
 *     --content 'section[aria-label="Chart"]'
 *
 * Opens --start at 390px with touch, on an emulated phone link (default 150 ms RTT,
 * 1.5 Mbps down, 750 kbps up, CPU 4x slower), taps --tap and measures, from the touch:
 *   feedback  the first visible DOM change (an element added, removed, or restyled in view)
 *   content   until --content (a CSS selector) is visible
 *   chain     the longest run of same-origin requests where each starts after the one
 *             before finished: the waterfall depth
 * Each run is a fresh page load, so the tap meets the same prefetch state a user would.
 * The verdict is on the median of --runs. Fails (exit 1) over budget; the timeline
 * (requests, marks, screenshots) is saved in --out.
 *
 * Options (defaults): --feedback-ms 100  --content-ms 2000  --max-chain (none)  --runs 3
 *   --rtt 150  --down-kbps 1500  --up-kbps 750  --cpu 4  --settle-ms 1500
 *   --before <selector> (repeatable: tapped in order before measuring, e.g. a tab)
 *   --login email:password (the app's /login form; or PERF_LOGIN)  --out <dir>
 * Selectors for --tap/--before are Playwright selectors; --content must be CSS.
 * Run it against `next build && next start`: `next dev` compiles on demand and never prefetches.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

// ---------- args ----------
const argv = process.argv.slice(2)
const o = {
  base: 'http://localhost:3000',
  start: '/',
  before: [],
  runs: 3,
  'feedback-ms': 100,
  'content-ms': 2000,
  'max-chain': null,
  rtt: 150,
  'down-kbps': 1500,
  'up-kbps': 750,
  cpu: 4,
  'settle-ms': 1500,
  login: process.env.PERF_LOGIN ?? null,
  out: null,
}
for (let i = 0; i < argv.length; i++) {
  const key = argv[i].replace(/^--/, '')
  if (key === 'help' || key === 'h') {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
    process.exit(0)
  }
  const value = argv[++i]
  if (key === 'before') o.before.push(value)
  else o[key] = /^\d+$/.test(value) ? Number(value) : value
}
if (!o.tap || !o.content) {
  console.error('tap-test: --tap and --content are required (see --help)')
  process.exit(2)
}
const out = o.out ?? path.join(tmpdir(), 'perf-check', `tap-${new Date().toISOString().replace(/[:.]/g, '-')}`)
mkdirSync(out, { recursive: true })

// ---------- playwright: the repo's, else the one `npx -p playwright` put on PATH ----------
function loadPlaywright() {
  const tries = [process.cwd(), ...(process.env.PATH ?? '').split(':').filter((p) => p.endsWith('node_modules/.bin'))]
  for (const from of tries) {
    try {
      return createRequire(path.join(from, 'noop.js'))('playwright')
    } catch {}
  }
  console.error('tap-test: Playwright not found. Run it through `npm run perf:tap -- ...` (uses npx -p playwright).')
  process.exit(2)
}
const { chromium } = loadPlaywright()

// ---------- in-page probe ----------
/* The probe runs in the page: it timestamps the touch, the first visible change, and the content. */
function probe(contentSelector) {
  const p = { tapAt: null, tapWall: null, changedAt: null, changedWhat: null, contentAt: null }
  window.__perfProbe = p
  const inView = (el) => {
    if (!(el instanceof Element)) return false
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false
    const s = getComputedStyle(el)
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0
  }
  const describe = (el) => (el instanceof Element ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').slice(0, 2).join('.')}` : ''}` : String(el))
  const NOT_CONTENT = /^(SCRIPT|STYLE|LINK|META|TEMPLATE|NEXT-ROUTE-ANNOUNCER|NEXTJS-PORTAL)$/
  const contentVisible = () => [...document.querySelectorAll(contentSelector)].some(inView)
  addEventListener(
    'touchstart',
    () => {
      if (p.tapAt == null) {
        p.tapAt = performance.now()
        p.tapWall = Date.now()
      }
    },
    { capture: true, passive: true },
  )
  new MutationObserver((muts) => {
    if (p.tapAt == null) return
    const now = performance.now()
    if (p.changedAt == null) {
      for (const m of muts) {
        // A removal counts when the parent is in view and isn't <body>/<head> (portals,
        // scripts, announcers come and go there); a detached node can't be measured.
        const removedContent = [...m.removedNodes].some((r) => r instanceof Element && !NOT_CONTENT.test(r.tagName))
        const hit =
          (m.type === 'childList' &&
            ([...m.addedNodes].find((a) => inView(a) && !NOT_CONTENT.test(a.tagName)) ||
              (removedContent && m.target !== document.body && inView(m.target) && m.target))) ||
          (m.type === 'characterData' && inView(m.target.parentElement) && m.target.parentElement) ||
          (m.type === 'attributes' && m.target !== document.body && m.target !== document.documentElement && inView(m.target) && m.target)
        if (hit) {
          p.changedAt = now
          p.changedWhat = `${m.type} ${describe(hit)}`
          break
        }
      }
    }
    if (p.contentAt == null && contentVisible()) p.contentAt = now
  }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-state', 'open', 'aria-busy'] })
}

// ---------- one run ----------
const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b)
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null
}
const origin = new URL(o.base).origin

/** Longest chain of requests where each starts after the previous one finished. */
function chain(requests) {
  const rs = [...requests].sort((a, b) => a.start - b.start)
  const depth = new Map()
  const prev = new Map()
  for (const r of rs) {
    let best = null
    for (const q of rs) if (q !== r && q.end != null && q.end <= r.start && (!best || depth.get(q) > depth.get(best))) best = q
    depth.set(r, best ? depth.get(best) + 1 : 1)
    prev.set(r, best)
  }
  let last = null
  for (const r of rs) if (!last || depth.get(r) > depth.get(last)) last = r
  const path = []
  for (let r = last; r; r = prev.get(r)) path.unshift(r)
  return path
}

async function run(browser, n) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  // The Next dev overlay would count as a visible change.
  await ctx.addInitScript(() => {
    const hide = () => {
      const st = document.createElement('style')
      st.textContent = 'nextjs-portal{display:none!important}'
      document.head.appendChild(st)
    }
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', hide) : hide()
  })
  const page = await ctx.newPage()
  page.on('dialog', (d) => d.dismiss())

  if (o.login) {
    const [email, ...rest] = o.login.split(':')
    await page.goto(`${o.base}/login`)
    await page.fill('#email', email)
    await page.fill('#password', rest.join(':'))
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60000 }), page.click('button[type=submit]')])
  }

  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: o.rtt,
    downloadThroughput: (o['down-kbps'] * 1000) / 8,
    uploadThroughput: (o['up-kbps'] * 1000) / 8,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: o.cpu })

  await page.goto(`${o.base}${o.start}`, { waitUntil: 'load', timeout: 120000 })
  for (const sel of o.before) {
    await page.locator(sel).first().tap()
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  const target = page.locator(o.tap).first()
  await target.waitFor({ state: 'visible', timeout: 60000 })
  // Let prefetches for the links now on screen finish, as they would while a user looks.
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(o['settle-ms'])
  if (await page.locator(o.content).first().isVisible()) throw new Error(`--content ${o.content} is already visible before the tap`)

  const requests = []
  const byReq = new Map()
  page.on('request', (r) => {
    const rec = { url: r.url(), type: r.resourceType(), method: r.method(), start: Date.now(), end: null, status: null }
    byReq.set(r, rec)
    requests.push(rec)
  })
  const finish = (r, failed) => {
    const rec = byReq.get(r)
    if (!rec) return
    const t = r.timing()
    rec.start = t.startTime > 0 ? t.startTime : rec.start
    rec.end = t.responseEnd >= 0 ? t.startTime + t.responseEnd : Date.now()
    rec.failed = failed
  }
  page.on('requestfinished', (r) => finish(r, false))
  page.on('requestfailed', (r) => finish(r, true))
  page.on('response', (res) => {
    const rec = byReq.get(res.request())
    if (rec) rec.status = res.status()
  })

  await page.evaluate(probe, o.content)
  await page.screenshot({ path: path.join(out, `run${n}-0-before.png`) })
  await target.tap()
  const deadline = Math.max(o['content-ms'] * 3, 10000)
  await page.waitForFunction(() => window.__perfProbe.contentAt != null, null, { timeout: deadline, polling: 50 }).catch(() => {})
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, `run${n}-1-after.png`) })
  const p = await page.evaluate(() => window.__perfProbe)
  await ctx.close()

  const tapWall = p.tapWall
  const after = requests
    .filter((r) => r.start >= tapWall - 5 && new URL(r.url).origin === origin)
    .map((r) => ({ ...r, startMs: Math.round(r.start - tapWall), endMs: r.end == null ? null : Math.round(r.end - tapWall) }))
  const longest = chain(after)
  return {
    feedbackMs: p.changedAt == null ? null : Math.round(p.changedAt - p.tapAt),
    feedbackWhat: p.changedWhat,
    contentMs: p.contentAt == null ? null : Math.round(p.contentAt - p.tapAt),
    chainDepth: longest.length,
    chain: longest.map((r) => `${r.method} ${r.url.replace(origin, '')} [${r.type}] ${r.startMs}→${r.endMs} ms`),
    requests: after,
  }
}

// ---------- main ----------
const browser = await chromium.launch()
const runs = []
try {
  for (let n = 1; n <= o.runs; n++) {
    const r = await run(browser, n)
    runs.push(r)
    console.log(`run ${n}: feedback ${r.feedbackMs ?? 'none'} ms (${r.feedbackWhat ?? '-'}), content ${r.contentMs ?? 'never'} ms, chain depth ${r.chainDepth}`)
  }
} finally {
  await browser.close()
}

const feedback = runs.some((r) => r.feedbackMs == null) ? null : median(runs.map((r) => r.feedbackMs))
const content = runs.some((r) => r.contentMs == null) ? null : median(runs.map((r) => r.contentMs))
const depth = median(runs.map((r) => r.chainDepth))
const failures = []
if (feedback == null || feedback > o['feedback-ms'])
  failures.push(`feedback ${feedback ?? 'never'} ms > ${o['feedback-ms']} ms: the tap shows nothing at first (a loading.tsx for the route gives instant feedback)`)
if (content == null || content > o['content-ms']) failures.push(`content ${content ?? 'never'} ms > ${o['content-ms']} ms: see the request chain`)
if (o['max-chain'] != null && depth > o['max-chain']) failures.push(`request chain depth ${depth} > ${o['max-chain']}`)

const summary = {
  verdict: failures.length ? 'fail' : 'pass',
  failures,
  median: { feedbackMs: feedback, contentMs: content, chainDepth: depth },
  budgets: { feedbackMs: o['feedback-ms'], contentMs: o['content-ms'], maxChain: o['max-chain'] },
  link: { rttMs: o.rtt, downKbps: o['down-kbps'], upKbps: o['up-kbps'], cpuSlowdown: o.cpu },
  page: { base: o.base, start: o.start, before: o.before, tap: o.tap, content: o.content },
  runs,
}
writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(summary, null, 2))
console.log(`\nlongest chain (run ${runs.length}):\n  ${runs.at(-1).chain.join('\n  ')}`)
console.log(`\nmedian of ${runs.length}: feedback ${feedback ?? 'never'} ms, content ${content ?? 'never'} ms, chain depth ${depth}`)
console.log(failures.length ? `FAIL\n  ${failures.join('\n  ')}` : 'PASS')
console.log(`timeline: ${path.join(out, 'timeline.json')}`)
process.exit(failures.length ? 1 : 0)
