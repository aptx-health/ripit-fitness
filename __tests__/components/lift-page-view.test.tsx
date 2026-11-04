/**
 * Per-lift page: the client view (work item 125). Spec: features/analytics/lift-page.feature.
 * Text, structure and behaviour only: colours, the chart's look, the 390px / dark layout and the
 * mockup (initiatives/analytics/docs/discovery/ideas/b-exercise.html) are the reviewer's job.
 * The maths comes from the real `@/lib/insights/lift-history` (lift-history.test.ts).
 *
 * Pinned (`@/components/features/progress/LiftView`, default export, prop `exerciseDefinitionId`,
 * fetch-driven like ProgressView):
 *   - Asks GET /api/progress/lift/<id>?tz=<browser zone>; answer { success, lift } with lift =
 *     { name, weightUnit, isBodyweight, sessions, records, weeklySets, pinned } (dates are ISO
 *     strings; see progress-lift.test.ts). 404: "Lift not found". Other failure: role="alert"
 *     "Couldn't load this lift. Try again." and a "Try again" button that asks again.
 *     While loading: "Loading…".
 *   - Reads `?week=` (useSearchParams) only to pass it on: a link "Back to Progress" to
 *     /progress?week=<week> (/progress without one); also shown with "Lift not found".
 *   - Title: heading level 1 with the lift's name. Chips: a nav named "Pinned lifts" with one link
 *     per pin (text = name; href /progress/lift/<id>?week=<week>, no query without a week), the
 *     page's own lift marked aria-current="page". No chips without pins.
 *   - No sessions: the text "No sessions yet" and none of the tabs, ranges, Records and Sessions.
 *   - Chart tabs (role=tablist; role=tab, aria-selected): "e1RM", "Top set", "Volume"; bodyweight
 *     (isBodyweight): "Reps", "Volume". The first tab is selected. Ranges: buttons "3M" "6M" "1Y"
 *     "All" with aria-pressed, 6M first; they apply to all tabs.
 *   - The chart is [data-chart="e1rm" | "top-set" | "reps" | "volume"]. Points are [data-point]
 *     with data-value (the plotted number, raw) and data-pr="true" on the all-time PR; the e1RM
 *     tab also draws [data-series="top-set"] (the dashed top-set weights) and a legend with the
 *     words "all-time PR" and "top-set weight". Top set: data-value = the weight and data-reps =
 *     its reps. Volume: [data-bar] with data-value = working sets that week (0 for empty weeks).
 *     Volume shows the weeks of `weeklySets` that fall in the range (the last ~13 / ~26 / ~52
 *     weeks, or all).
 *   - Tiles, [data-tile=...], text (spaces between the parts are not pinned; "lb" or "kg"; dates
 *     are the user's local "Oct 30"):
 *       e1RM:    best    "Best e1RM 287 lb · Oct 30" (all-time best, whole number)
 *                change  "<range> +8.3% 265 → 287"  (percent one decimal with a sign, "−" for a fall,
 *                        first and last whole numbers; "—" in place of both when null)
 *                sessions "Sessions 19 since Jun"   (sessions in the range; month of the first)
 *       Top set: best    "Heaviest 275 lb × 4 · Oct 30", change as above, sessions
 *       Reps:    best    "Best 12 reps · Oct 30", change, sessions
 *       Volume:  avg     average working sets per week over the shown weeks (one decimal, no ".0"),
 *                total   the total over them, and sessions
 *   - Records: [data-section="records"] headed "Records", one [data-record="<reps>"] row per record
 *     (as given): "4 reps", the weight with the unit ("275 lb", "122.5 kg"), the date, and a chip
 *     "New" when isNew. Bodyweight: ONE row with "Most reps", the reps and the date, no weight.
 *   - Sessions: [data-section="sessions"] headed "Sessions" and the count (all of them), with the 10
 *     newest as [data-session] rows: "Fri Oct 30", the sets "275×4 · 255×6 · 255×6" (bodyweight
 *     "12 reps"), " · RPE 8.5" when avgRpe (no trailing ".0": "RPE 8"), and the e1RM, whole,
 *     with the word "e1RM". A button "Show more" adds the next 10; gone when all are shown.
 *   - Every button and link is at least 48px tall (class h-12 / min-h-12 or taller).
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const h = vi.hoisted(() => ({
  search: '' as string,
  status: 200,
  lift: null as unknown,
  urls: [] as string[],
  gate: null as null | Promise<void>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress/lift/d-squat',
  useSearchParams: () => new URLSearchParams(h.search),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

type Set = { weight: number; reps: number }
type Sess = { completionId: string; date: string; sets: Set[]; e1rm: number | null; topSet: Set; avgRpe: number | null }
type Rec = { reps: number; weight: number; date: string; isNew: boolean }
type Json = {
  name: string
  weightUnit: 'lbs' | 'kg'
  isBodyweight: boolean
  sessions: Sess[]
  records: Rec[]
  weeklySets: Array<{ weekStart: string; sets: number }>
  pinned: Array<{ exerciseDefinitionId: string; name: string }>
}

const NOW = new Date('2026-11-02T18:00:00Z') // Monday noon, Denver
const DAY = 86_400_000
const ago = (days: number) => new Date(Date.UTC(2026, 9, 30, 18) - days * DAY).toISOString() // Oct 30 18:00Z minus days

beforeEach(() => {
  h.search = ''
  h.status = 200
  h.lift = null
  h.urls = []
  h.gate = null
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  const real = Intl.DateTimeFormat.prototype.resolvedOptions
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: 'America/Denver' }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      h.urls.push(String(input))
      if (h.gate) await h.gate
      if (h.status !== 200) return { ok: false, status: h.status, json: async () => ({ error: 'nope' }) }
      return { ok: true, status: 200, json: async () => ({ success: true, lift: h.lift }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// --- fixtures -------------------------------------------------------------------------
/** 19 sessions, 8 days apart, newest Fri Oct 30 (287 e1RM, 275x4) and oldest Jun 8 (265, 245x5). */
function nineteen(): Sess[] {
  return Array.from({ length: 19 }, (_, i) => {
    if (i === 0) {
      return {
        completionId: 's0',
        date: ago(0),
        sets: [{ weight: 275, reps: 4 }, { weight: 255, reps: 6 }, { weight: 255, reps: 6 }],
        e1rm: 287,
        topSet: { weight: 275, reps: 4 },
        avgRpe: 8.5,
      }
    }
    const top = 275 - Math.round((i * 30) / 18)
    return {
      completionId: `s${i}`,
      date: ago(i * 8),
      sets: [{ weight: top, reps: 5 }],
      e1rm: i === 18 ? 265 : 287 - Math.round((i * 22) / 18) - 3,
      topSet: { weight: top, reps: 5 },
      avgRpe: null,
    }
  })
}
const RECORDS: Rec[] = [
  { reps: 1, weight: 270, date: '2026-08-14T18:00:00.000Z', isNew: false },
  { reps: 3, weight: 275, date: '2026-10-09T18:00:00.000Z', isNew: false },
  { reps: 4, weight: 275, date: '2026-10-30T18:00:00.000Z', isNew: true },
  { reps: 5, weight: 265, date: '2026-10-23T18:00:00.000Z', isNew: false },
]
const PINS = [
  { exerciseDefinitionId: 'd-squat', name: 'Back Squat' },
  { exerciseDefinitionId: 'd-bench', name: 'Bench Press' },
  { exerciseDefinitionId: 'd-dead', name: 'Deadlift' },
]
const base = (o: Partial<Json> = {}): Json => ({
  name: 'Back Squat',
  weightUnit: 'lbs',
  isBodyweight: false,
  sessions: nineteen(),
  records: RECORDS,
  weeklySets: [
    { weekStart: '2026-09-28', sets: 8 },
    { weekStart: '2026-10-05', sets: 12 },
    { weekStart: '2026-10-12', sets: 0 },
    { weekStart: '2026-10-19', sets: 10 },
    { weekStart: '2026-10-26', sets: 20 },
  ],
  pinned: PINS,
  ...o,
})

async function open(o: Partial<Json> = {}, search = '') {
  h.lift = base(o)
  h.search = search
  const View = ((await load('@/components/features/progress/LiftView')) as { default: ComponentType<{ exerciseDefinitionId: string }> }).default
  render(createElement(View, { exerciseDefinitionId: 'd-squat' }))
  await screen.findByRole('heading', { level: 1 })
}
const flat = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const tile = (name: string) => flat(document.querySelector(`[data-tile="${name}"]`))
const points = () => Array.from(document.querySelectorAll('[data-point]')) as HTMLElement[]
const values = () => points().map((p) => Number(p.getAttribute('data-value')))
const tab = (name: string) => screen.getByRole('tab', { name })
const range = (name: string) => screen.getByRole('button', { name })
const chart = () => document.querySelector('[data-chart]')?.getAttribute('data-chart')
const sessionRows = () => Array.from(document.querySelectorAll('[data-session]')) as HTMLElement[]
const tall = (el: Element) => /(^|\s)(min-)?h-(12|14|16|20|24)(\s|$)/.test(el.getAttribute('class') ?? '')

// =====================================================================================
describe('getting there and back', () => {
  it('asks for the lift with the browser time zone and shows its name as the title', async () => {
    await open()
    const url = new URL(h.urls[0], 'http://localhost')
    expect(url.pathname).toBe('/api/progress/lift/d-squat')
    expect(url.searchParams.get('tz')).toBe('America/Denver')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Back Squat')
  })

  it('shows Loading… until the answer arrives', async () => {
    let release: () => void = () => {}
    h.gate = new Promise<void>((r) => {
      release = r
    })
    h.lift = base()
    const View = ((await load('@/components/features/progress/LiftView')) as { default: ComponentType<{ exerciseDefinitionId: string }> }).default
    render(createElement(View, { exerciseDefinitionId: 'd-squat' }))
    expect(screen.getByText(/^Loading/)).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    release()
    await screen.findByRole('heading', { level: 1 })
  })

  it('the back link returns to the same week', async () => {
    await open({}, 'week=2026-10-12')
    expect(screen.getByRole('link', { name: 'Back to Progress' }).getAttribute('href')).toBe('/progress?week=2026-10-12')
  })

  it('the back link goes to plain /progress when no week was passed', async () => {
    await open()
    expect(screen.getByRole('link', { name: 'Back to Progress' }).getAttribute('href')).toBe('/progress')
  })

  it('does not pass on a week that is not a real Monday', async () => {
    await open({}, 'week=not-a-date')
    expect(screen.getByRole('link', { name: 'Back to Progress' }).getAttribute('href')).toBe('/progress')
  })

  it('shows a chip per pinned lift, marks the current one and links each to its page with the week', async () => {
    await open({}, 'week=2026-10-12')
    const nav = screen.getByRole('navigation', { name: 'Pinned lifts' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Back Squat', 'Bench Press', 'Deadlift'])
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/progress/lift/d-squat?week=2026-10-12',
      '/progress/lift/d-bench?week=2026-10-12',
      '/progress/lift/d-dead?week=2026-10-12',
    ])
    expect(links.map((l) => l.getAttribute('aria-current'))).toEqual(['page', null, null])
  })

  it('chips link without a query when there is no week', async () => {
    await open()
    const links = within(screen.getByRole('navigation', { name: 'Pinned lifts' })).getAllByRole('link')
    expect(links[1].getAttribute('href')).toBe('/progress/lift/d-bench')
  })

  it('has no chips without pins, and marks none when this lift is not pinned', async () => {
    await open({ pinned: [] })
    expect(screen.queryByRole('navigation', { name: 'Pinned lifts' })).toBeNull()
    cleanup()
    await open({ pinned: PINS.slice(1) })
    const links = within(screen.getByRole('navigation', { name: 'Pinned lifts' })).getAllByRole('link')
    expect(links.some((l) => l.getAttribute('aria-current') === 'page')).toBe(false)
  })
})

// =====================================================================================
describe('a lift that is not there', () => {
  it('404 says "Lift not found" with a way back to the same week', async () => {
    h.status = 404
    h.search = 'week=2026-10-12'
    const View = ((await load('@/components/features/progress/LiftView')) as { default: ComponentType<{ exerciseDefinitionId: string }> }).default
    render(createElement(View, { exerciseDefinitionId: 'nope' }))
    expect(await screen.findByText('Lift not found')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Progress' }).getAttribute('href')).toBe('/progress?week=2026-10-12')
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(document.querySelector('[data-chart]')).toBeNull()
  })

  it('another failure is an alert with Try again, which asks again', async () => {
    h.status = 500
    const View = ((await load('@/components/features/progress/LiftView')) as { default: ComponentType<{ exerciseDefinitionId: string }> }).default
    render(createElement(View, { exerciseDefinitionId: 'd-squat' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain("Couldn't load this lift. Try again.")
    expect(screen.queryByText('Lift not found')).toBeNull()
    h.status = 200
    h.lift = base()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Back Squat')
    expect(h.urls).toHaveLength(2)
  })
})

// =====================================================================================
describe('a lift with no sessions', () => {
  it('says "No sessions yet" instead of the chart, records and sessions', async () => {
    await open({ name: 'Front Squat', sessions: [], records: [], weeklySets: [] })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Front Squat')
    expect(screen.getByText('No sessions yet')).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(document.querySelector('[data-chart]')).toBeNull()
    expect(document.querySelector('[data-section="records"]')).toBeNull()
    expect(document.querySelector('[data-section="sessions"]')).toBeNull()
    expect(screen.queryByRole('button', { name: '6M' })).toBeNull()
  })

  it('keeps the chips and the way back', async () => {
    await open({ sessions: [], records: [], weeklySets: [] })
    expect(screen.getByRole('navigation', { name: 'Pinned lifts' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Progress' })).toBeTruthy()
  })
})

// =====================================================================================
describe('e1RM tab (the default)', () => {
  it('has the three tabs with e1RM selected, and the four ranges with 6M selected', async () => {
    await open()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['e1RM', 'Top set', 'Volume'])
    expect(tab('e1RM').getAttribute('aria-selected')).toBe('true')
    expect(tab('Top set').getAttribute('aria-selected')).toBe('false')
    expect(['3M', '6M', '1Y', 'All'].map((r) => range(r).getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false'])
    expect(chart()).toBe('e1rm')
  })

  it('plots each session’s best e1RM, oldest first, with a dashed top-set line and the legend', async () => {
    await open()
    const v = values()
    expect(v).toHaveLength(19)
    expect(v[0]).toBe(265)
    expect(v[18]).toBe(287)
    expect(document.querySelector('[data-series="top-set"]')).toBeTruthy()
    expect(screen.getByText(/all-time PR/)).toBeTruthy()
    expect(screen.getByText(/top-set weight/)).toBeTruthy()
  })

  it('marks the session with the all-time best e1RM as "all-time PR", and only that one', async () => {
    await open()
    const prs = points().filter((p) => p.getAttribute('data-pr') === 'true')
    expect(prs).toHaveLength(1)
    expect(prs[0].getAttribute('data-value')).toBe('287')
    expect(points().indexOf(prs[0])).toBe(18)
  })

  it('the tiles: best e1RM with its date, the change over the range, and the sessions with the first month', async () => {
    await open()
    expect(tile('best')).toMatch(/Best e1RM\s*287\s*lb\s*·\s*Oct 30/)
    expect(tile('change')).toMatch(/6M\s*\+8\.3%\s*265\s*→\s*287/)
    expect(tile('sessions')).toMatch(/Sessions\s*19\s*since Jun$/)
  })

  it('shows a fall with the minus sign', async () => {
    const down = nineteen().slice(0, 3).map((s, i) => ({ ...s, e1rm: [180, 190, 200][i] }))
    await open({ sessions: down })
    expect(tile('change')).toMatch(/6M\s*−10\.0%\s*200\s*→\s*180/)
  })

  it('writes weights in kg for a kg user', async () => {
    await open({ weightUnit: 'kg', sessions: nineteen().map((s) => ({ ...s, e1rm: 130, topSet: { weight: 100, reps: 5 } })) })
    expect(tile('best')).toMatch(/Best e1RM\s*130\s*kg/)
    expect(tile('best')).not.toMatch(/lb/)
  })

  it('shows the dates in the user’s zone, not UTC', async () => {
    const late = nineteen()
    late[0] = { ...late[0], date: '2026-10-31T03:00:00.000Z' } // Oct 30 21:00 in Denver
    await open({ sessions: late })
    expect(tile('best')).toMatch(/·\s*Oct 30/)
    expect(flat(sessionRows()[0])).toContain('Fri Oct 30')
  })

  it('rounds the e1RM in tiles and rows to whole numbers', async () => {
    const odd = nineteen()
    odd[0] = { ...odd[0], e1rm: 286.6 }
    await open({ sessions: odd })
    expect(tile('best')).toMatch(/Best e1RM\s*287/)
    expect(flat(sessionRows()[0])).toMatch(/287\s*e1RM/)
  })
})

// =====================================================================================
describe('ranges', () => {
  it('3M plots fewer sessions than 6M and the sessions tile follows', async () => {
    await open()
    fireEvent.click(range('3M'))
    expect(range('3M').getAttribute('aria-pressed')).toBe('true')
    expect(range('6M').getAttribute('aria-pressed')).toBe('false')
    const n = points().length
    expect(n).toBeGreaterThanOrEqual(10)
    expect(n).toBeLessThanOrEqual(13)
    expect(tile('sessions')).toMatch(new RegExp(`Sessions\\s*${n}\\s*since (Aug|Jul)$`))
    expect(tile('change')).toMatch(/^3M/)
    expect(tile('best')).toMatch(/Best e1RM\s*287/) // the best stays all-time
  })

  it('the change tile covers only the range', async () => {
    await open()
    fireEvent.click(range('3M'))
    expect(tile('change')).not.toMatch(/265/) // the oldest session is outside 3M
    expect(tile('change')).toMatch(/→\s*287/)
  })

  it('1Y and All plot one point per week', async () => {
    const sessions: Sess[] = [
      { completionId: 'a', date: '2026-10-30T18:00:00.000Z', sets: [{ weight: 270, reps: 5 }], e1rm: 290, topSet: { weight: 270, reps: 5 }, avgRpe: null },
      { completionId: 'b', date: '2026-10-27T18:00:00.000Z', sets: [{ weight: 285, reps: 2 }], e1rm: 280, topSet: { weight: 285, reps: 2 }, avgRpe: null },
      { completionId: 'c', date: '2026-10-12T18:00:00.000Z', sets: [{ weight: 240, reps: 4 }], e1rm: 250, topSet: { weight: 240, reps: 4 }, avgRpe: null },
    ]
    await open({ sessions })
    expect(points()).toHaveLength(3) // 6M: every session
    fireEvent.click(range('1Y'))
    expect(values()).toEqual([250, 290]) // the week of Oct 26: its best
    fireEvent.click(range('All'))
    expect(values()).toEqual([250, 290])
    expect(tile('sessions')).toMatch(/Sessions\s*3(?!\d)/)
  })

  it('one session in the range: a single point, "—" for the change', async () => {
    const sessions = [nineteen()[0], { ...nineteen()[1], date: '2025-01-10T18:00:00.000Z' }]
    await open({ sessions })
    expect(points()).toHaveLength(1)
    expect(tile('change')).toMatch(/6M\s*—/)
    expect(tile('change')).not.toMatch(/%/)
    expect(tile('sessions')).toMatch(/Sessions\s*1\s*since Oct$/)
  })
})

// =====================================================================================
describe('Top set tab', () => {
  it('plots each session’s heaviest working set with its reps', async () => {
    await open()
    fireEvent.click(tab('Top set'))
    expect(tab('Top set').getAttribute('aria-selected')).toBe('true')
    expect(chart()).toBe('top-set')
    const v = values()
    expect(v).toHaveLength(19)
    expect(v[0]).toBe(245)
    expect(v[18]).toBe(275)
    expect(points()[18].getAttribute('data-reps')).toBe('4')
    expect(points()[0].getAttribute('data-reps')).toBe('5')
    expect(document.querySelector('[data-series="top-set"]')).toBeNull() // no second line on this tab
  })

  it('the tiles: heaviest with reps and date, the change in weight, the sessions', async () => {
    await open()
    fireEvent.click(tab('Top set'))
    expect(tile('best')).toMatch(/Heaviest\s*275\s*lb\s*×\s*4\s*·\s*Oct 30/)
    expect(tile('change')).toMatch(/6M\s*\+12\.2%\s*245\s*→\s*275/)
    expect(tile('sessions')).toMatch(/Sessions\s*19\s*since Jun$/)
  })

  it('keeps the range when switching tabs', async () => {
    await open()
    fireEvent.click(range('3M'))
    fireEvent.click(tab('Top set'))
    expect(range('3M').getAttribute('aria-pressed')).toBe('true')
    expect(points().length).toBeLessThan(19)
  })
})

// =====================================================================================
describe('Volume tab', () => {
  it('shows working sets per week as bars, the empty week as 0', async () => {
    await open()
    fireEvent.click(tab('Volume'))
    expect(chart()).toBe('volume')
    const bars = Array.from(document.querySelectorAll('[data-bar]')).map((b) => b.getAttribute('data-value'))
    expect(bars).toEqual(['8', '12', '0', '10', '20'])
  })

  it('the tiles: average per week over all the shown weeks, total, sessions', async () => {
    await open()
    fireEvent.click(tab('Volume'))
    // Lead, work 128: tiles count the sessions' sets in the exact range (21), not the bars.
    expect(tile('avg')).toMatch(/(^|\D)4\.2(\D|$)/) // 21 sets in range / 5 weeks
    expect(tile('total')).toMatch(/(^|\D)21(\D|$)/)
    expect(tile('sessions')).toMatch(/Sessions\s*19/)
  })

  it('the average keeps one decimal when it is not whole', async () => {
    await open({ weeklySets: [{ weekStart: '2026-10-19', sets: 9 }, { weekStart: '2026-10-26', sets: 12 }] })
    fireEvent.click(tab('Volume'))
    expect(tile('avg')).toMatch(/10\.5/)
    expect(tile('total')).toMatch(/(^|\D)21(\D|$)/)
  })

  it('follows the range: 3M < 6M < 1Y < All', async () => {
    const weeks = Array.from({ length: 60 }, (_, i) => ({
      weekStart: new Date(Date.UTC(2026, 9, 26) - (59 - i) * 7 * DAY).toISOString().slice(0, 10),
      sets: 1,
    }))
    await open({ weeklySets: weeks })
    fireEvent.click(tab('Volume'))
    const bars = () => document.querySelectorAll('[data-bar]').length
    fireEvent.click(range('3M'))
    expect(bars()).toBeGreaterThanOrEqual(12)
    expect(bars()).toBeLessThanOrEqual(14)
    fireEvent.click(range('6M'))
    expect(bars()).toBeGreaterThanOrEqual(25)
    expect(bars()).toBeLessThanOrEqual(27)
    fireEvent.click(range('1Y'))
    expect(bars()).toBeGreaterThanOrEqual(51)
    expect(bars()).toBeLessThanOrEqual(53)
    fireEvent.click(range('All'))
    expect(bars()).toBe(60)
    expect(tile('total')).toMatch(/(^|\D)21(\D|$)/) // lead, work 128: sets in range, not bars
  })
})

// =====================================================================================
describe('bodyweight lifts', () => {
  const pull = (): Sess[] =>
    [12, 10, 8].map((reps, i) => ({
      completionId: `p${i}`,
      date: ago(i * 10),
      sets: [{ weight: 0, reps }, { weight: 0, reps: reps - 1 }],
      e1rm: null,
      topSet: { weight: 0, reps },
      avgRpe: null,
    }))
  const open_ = () =>
    open({
      name: 'Pull-up',
      isBodyweight: true,
      sessions: pull(),
      records: [{ reps: 12, weight: 0, date: ago(0), isNew: true }],
    })

  it('the first tab is Reps, there is no Top set tab, Volume stays', async () => {
    await open_()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Reps', 'Volume'])
    expect(tab('Reps').getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('tab', { name: 'Top set' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'e1RM' })).toBeNull()
  })

  it('plots each session’s best reps, with "Best 12 reps · date"', async () => {
    await open_()
    expect(chart()).toBe('reps')
    expect(values()).toEqual([8, 10, 12])
    expect(tile('best')).toMatch(/Best\s*12\s*reps\s*·\s*Oct 30/)
    expect(tile('change')).toMatch(/6M\s*\+50\.0%\s*8\s*→\s*12/)
    expect(document.querySelector('[data-series="top-set"]')).toBeNull()
  })

  it('Records shows the most reps in one set, with its date', async () => {
    await open_()
    const rows = document.querySelectorAll('[data-record]')
    expect(rows).toHaveLength(1)
    const text = flat(rows[0])
    expect(text).toContain('Most reps')
    expect(text).toContain('12')
    expect(text).toContain('Oct 30')
    expect(text).not.toMatch(/\b(lb|kg)\b/)
  })

  it('the sessions list the sets as reps', async () => {
    await open_()
    expect(flat(sessionRows()[0])).toContain('12 reps · 11 reps')
    expect(flat(sessionRows()[0])).not.toMatch(/e1RM/)
  })

  it('Volume works as for any lift', async () => {
    await open_()
    fireEvent.click(tab('Volume'))
    expect(chart()).toBe('volume')
    expect(document.querySelectorAll('[data-bar]').length).toBe(5)
  })
})

// =====================================================================================
describe('Records', () => {
  it('lists the heaviest set at each rep count that was done, with its date, as given', async () => {
    await open()
    const rows = Array.from(document.querySelectorAll('[data-record]')) as HTMLElement[]
    expect(rows.map((r) => r.getAttribute('data-record'))).toEqual(['1', '3', '4', '5'])
    expect(flat(rows[0])).toContain('1 rep')
    expect(flat(rows[0])).toContain('270 lb')
    expect(flat(rows[0])).toContain('Aug 14')
    expect(flat(rows[1])).toContain('3 reps')
    expect(flat(rows[3])).toContain('265 lb')
    expect(flat(rows[3])).toContain('Oct 23')
    expect(flat(document.querySelector('[data-section="records"]')).startsWith('Records')).toBe(true)
  })

  it('shows a "New" chip on the record set this week and only there', async () => {
    await open()
    const rows = Array.from(document.querySelectorAll('[data-record]')) as HTMLElement[]
    expect(rows.map((r) => /\bNew\b/.test(flat(r)))).toEqual([false, false, true, false])
    expect(flat(rows[2])).toContain('4 reps')
    expect(flat(rows[2])).toContain('275 lb')
  })

  it('writes record weights in kg with one decimal at most', async () => {
    await open({ weightUnit: 'kg', records: [{ reps: 5, weight: 122.5, date: ago(3), isNew: false }, { reps: 3, weight: 99.79012, date: ago(9), isNew: false }] })
    const rows = Array.from(document.querySelectorAll('[data-record]')) as HTMLElement[]
    expect(flat(rows[0])).toContain('122.5 kg')
    expect(flat(rows[1])).toContain('99.8 kg')
  })
})

// =====================================================================================
describe('Sessions', () => {
  it('shows the count and the 10 newest, newest first', async () => {
    await open()
    const section = document.querySelector('[data-section="sessions"]') as HTMLElement
    expect(flat(section)).toMatch(/^Sessions\s*19/)
    expect(sessionRows()).toHaveLength(10)
    expect(flat(sessionRows()[0])).toContain('Fri Oct 30')
    expect(flat(sessionRows()[1])).toContain('Thu Oct 22')
  })

  it('each row has the date, the sets, the average RPE and the e1RM', async () => {
    await open()
    const text = flat(sessionRows()[0])
    expect(text).toContain('Fri Oct 30')
    expect(text).toContain('275×4 · 255×6 · 255×6')
    expect(text).toContain('RPE 8.5')
    expect(text).toMatch(/287\s*e1RM/)
  })

  it('leaves out RPE when no set was rated, and writes a whole RPE without ".0"', async () => {
    await open()
    expect(flat(sessionRows()[1])).not.toContain('RPE')
    const whole = nineteen()
    whole[1] = { ...whole[1], avgRpe: 8 }
    cleanup()
    await open({ sessions: whole })
    expect(flat(sessionRows()[1])).toContain('RPE 8')
    expect(flat(sessionRows()[1])).not.toContain('RPE 8.0')
  })

  it('Show more adds the next 10, then the rest, then goes away', async () => {
    const twentyFive = Array.from({ length: 25 }, (_, i) => ({ ...nineteen()[1], completionId: `x${i}`, date: ago(i * 5) }))
    await open({ sessions: twentyFive })
    expect(sessionRows()).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(sessionRows()).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(sessionRows()).toHaveLength(25)
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
    expect(flat(document.querySelector('[data-section="sessions"]'))).toMatch(/^Sessions\s*25/)
  })

  it('has no Show more with 10 or fewer, and lists them all', async () => {
    await open({ sessions: nineteen().slice(0, 10) })
    expect(sessionRows()).toHaveLength(10)
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  })

  it('lists sessions beyond the chart range too (all of them)', async () => {
    await open()
    fireEvent.click(range('3M'))
    expect(flat(document.querySelector('[data-section="sessions"]'))).toMatch(/^Sessions\s*19/)
    expect(sessionRows()).toHaveLength(10)
  })
})

// =====================================================================================
describe('tap targets', () => {
  it('every button and link is at least 48px tall', async () => {
    await open({ sessions: Array.from({ length: 12 }, (_, i) => ({ ...nineteen()[1], completionId: `x${i}`, date: ago(i * 5) })) }, 'week=2026-10-12')
    const targets = Array.from(document.querySelectorAll('button, a'))
    expect(targets.length).toBeGreaterThan(10) // 3 tabs, 4 ranges, 3 chips, back, show more
    const short = targets.filter((t) => !tall(t)).map((t) => flat(t))
    expect(short).toEqual([])
  })
})
