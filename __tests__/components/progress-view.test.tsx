/**
 * Progress S1: the weekly report page (work item 107).
 * Spec: features/analytics/weekly-report.feature; mockup
 * initiatives/analytics/docs/discovery/ideas/c-report.html (Report card, week
 * navigator, Last 8 weeks; no Records, Lifts or trend note).
 *
 * Pinned interface:
 *   - `@/components/features/progress/ProgressView` (default export, no props) is the
 *     page body. `app/(app)/progress/page.tsx` renders it under the page title "Progress".
 *   - On mount it reads the browser zone (Intl.DateTimeFormat().resolvedOptions().timeZone)
 *     and fetches GET /api/progress/week?tz=<zone> (no `start`: the server picks the
 *     current week). The body is { success: true, report } (see progress-report.test.ts).
 *   - Week navigator: the title "Week of Oct 26" (month short, day, from the report's
 *     weekStart), the subtitle "Week 3 of Strength Block" when report.programWeek is set,
 *     buttons "Previous week" and "Next week" (48px). Previous fetches
 *     ?start=<weekStart minus 7 days>&tz=..., Next the week after; Next is disabled
 *     when report.isCurrentWeek.
 *   - Report card rows are [data-row="workouts" | "sets" | "time" | "effort" | "streak"].
 *   - "Last 8 weeks": a heading with that text and, for each report.weeks entry in
 *     order, an element [data-week="<weekStart>"] with data-selected="true" on the
 *     selected one, an aria-label "Week of Oct 26: 66 sets, RPE 8.7" (or "RPE –"),
 *     and the RPE value (or "–") in its text, beneath the bar.
 *   - A failed load shows an element with role="alert".
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const h = vi.hoisted(() => ({
  fetches: [] as string[],
  fail: false,
  reports: {} as Record<string, unknown>,
  current: '2026-10-26',
  tz: 'America/Denver',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

type Effort = { avgRpe: number; pctAtOrAbove9: number; setsAt10: number; ratedSets: number }
type Stats = {
  weekStart: string
  workouts: number
  workingSets: number
  durationSeconds: number
  cardioMinutes: number
  effort: Effort | null
}
type Report = {
  weekStart: string
  isCurrentWeek: boolean
  target: number
  programWeek: { weekNumber: number; programName: string } | null
  current: Stats
  normal: { workouts: number; workingSets: number; durationSeconds: number; cardioMinutes: number; avgRpe: number | null }
  streak: number
  weeks: Stats[]
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const stats = (weekStart: string, o: Partial<Stats> = {}): Stats => ({
  weekStart,
  workouts: 0,
  workingSets: 0,
  durationSeconds: 0,
  cardioMinutes: 0,
  effort: null,
  ...o,
})
const effort = (avgRpe: number): Effort => ({ avgRpe, pctAtOrAbove9: 20, setsAt10: 1, ratedSets: 30 })

/** The spec's example week: 3 workouts, 66 sets, 3h 22m + 35m cardio, RPE 8.7, a 6-week streak. */
function example(weekStart = '2026-10-26', o: Partial<Report> = {}): Report {
  const weeks = [57, 63, 31, 55, 60, 62, 64, 66].map((sets, i) =>
    stats(addDays(weekStart, (i - 7) * 7), {
      workouts: 3,
      workingSets: sets,
      effort: i === 2 ? null : effort([8.2, 8.4, 0, 7.7, 8.0, 8.2, 8.5, 8.7][i]),
    }),
  )
  const current = stats(weekStart, {
    workouts: 3,
    workingSets: 66,
    durationSeconds: 12120,
    cardioMinutes: 35,
    effort: { avgRpe: 8.7, pctAtOrAbove9: 31, setsAt10: 2, ratedSets: 40 },
  })
  weeks[7] = current
  return {
    weekStart,
    isCurrentWeek: weekStart === h.current,
    target: 3,
    programWeek: { weekNumber: 3, programName: 'Strength Block' },
    current,
    normal: { workouts: 3.375, workingSets: 58, durationSeconds: 10860, cardioMinutes: 20, avgRpe: 8.1 },
    streak: 6,
    weeks,
    ...o,
  }
}
const emptyWeek = (weekStart = '2026-10-26'): Report => ({
  weekStart,
  isCurrentWeek: weekStart === h.current,
  target: 3,
  programWeek: null,
  current: stats(weekStart),
  normal: { workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, avgRpe: null },
  streak: 0,
  weeks: Array.from({ length: 8 }, (_, i) => stats(addDays(weekStart, (i - 7) * 7))),
})

beforeEach(() => {
  h.fetches = []
  h.fail = false
  h.reports = {}
  h.current = '2026-10-26'
  const real = Intl.DateTimeFormat.prototype.resolvedOptions
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: h.tz }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input)
      h.fetches.push(url)
      if (h.fail) return { ok: false, status: 500, json: async () => ({ error: 'Internal server error' }) }
      const start = new URL(url, 'http://localhost').searchParams.get('start') ?? h.current
      const report = h.reports[start] ?? example(start)
      return { ok: true, status: 200, json: async () => ({ success: true, report }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function open() {
  const View = ((await load('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
  const view = render(createElement(View))
  await screen.findByText(/^week of /i)
  return view
}
const params = (url: string) => new URL(url, 'http://localhost').searchParams
const flat = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const row = (name: string) => {
  const el = document.querySelector(`[data-row="${name}"]`)
  if (!el) throw new Error(`no [data-row="${name}"]`)
  return el as HTMLElement
}
const waitFetches = (n: number) => waitFor(() => expect(h.fetches.length).toBeGreaterThanOrEqual(n))

// ---------------------------------------------------------------------------
describe('loading', () => {
  it('asks the API for the current week in the browser\'s zone', async () => {
    await open()
    expect(h.fetches).toHaveLength(1)
    const url = new URL(h.fetches[0], 'http://localhost')
    expect(url.pathname).toBe('/api/progress/week')
    expect(url.searchParams.get('tz')).toBe('America/Denver')
    expect(url.searchParams.get('start')).toBeNull()
  })

  it('sends whichever zone the browser has', async () => {
    h.tz = 'Pacific/Auckland'
    await open()
    expect(params(h.fetches[0]).get('tz')).toBe('Pacific/Auckland')
    h.tz = 'America/Denver'
  })

  it('shows a visible error, not a blank page, when the load fails', async () => {
    h.fail = true
    const View = ((await load('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
    render(createElement(View))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(document.querySelector('[data-row]')).toBeNull()
  })
})

describe('the page', () => {
  it('has the page title Progress', async () => {
    const page = (await load('@/app/(app)/progress/page')) as { default: () => unknown }
    const out = page.default()
    const el = out instanceof Promise ? await out : out
    render(el as never)
    expect(screen.getByRole('heading', { level: 1, name: 'Progress' })).toBeTruthy()
    await screen.findByText(/^week of /i)
    expect(h.fetches.length).toBeGreaterThan(0)
  })
})

describe('Week navigator', () => {
  it('opens on the current week, titled "Week of <Monday>"', async () => {
    await open()
    expect(screen.getByText('Week of Oct 26')).toBeTruthy()
  })

  it('Active program week in the subtitle', async () => {
    await open()
    expect(screen.getByText('Week 3 of Strength Block')).toBeTruthy()
  })

  it('has no subtitle when the week is not in a program', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { programWeek: null })
    await open()
    expect(screen.queryByText(/^week \S+ of /i)).toBeNull()
  })

  it('"previous" shows the week before', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFetches(2)
    const url = params(h.fetches[1])
    expect(url.get('start')).toBe('2026-10-19')
    expect(url.get('tz')).toBe('America/Denver')
    expect(await screen.findByText('Week of Oct 19')).toBeTruthy()
    expect(screen.queryByText('Week of Oct 26')).toBeNull()
  })

  it('"next" is disabled on the current week and does not fetch', async () => {
    await open()
    const next = screen.getByRole('button', { name: 'Next week' }) as HTMLButtonElement
    expect(next.disabled).toBe(true)
    fireEvent.click(next)
    await new Promise((r) => setTimeout(r, 50))
    expect(h.fetches).toHaveLength(1)
  })

  it('"next" works from an earlier week and is disabled again on getting back', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await screen.findByText('Week of Oct 19')
    const next = screen.getByRole('button', { name: 'Next week' }) as HTMLButtonElement
    expect(next.disabled).toBe(false)
    fireEvent.click(next)
    await screen.findByText('Week of Oct 26')
    expect(params(h.fetches[h.fetches.length - 1]).get('start')).toBe('2026-10-26')
    expect((screen.getByRole('button', { name: 'Next week' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('goes back several weeks in a row, one week at a time, across a month and a year', async () => {
    h.current = '2027-01-04'
    await open()
    expect(screen.getByText('Week of Jan 4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await screen.findByText('Week of Dec 28')
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await screen.findByText('Week of Dec 21')
    expect(h.fetches.slice(1).map((u) => params(u).get('start'))).toEqual(['2026-12-28', '2026-12-21'])
  })

  it('both buttons are 48px targets', async () => {
    await open()
    for (const name of ['Previous week', 'Next week']) {
      expect(screen.getByRole('button', { name }).className).toMatch(/\b(h-12|min-h-12|size-12|h-\[48px\]|min-h-\[48px\])\b/)
      expect(screen.getByRole('button', { name }).className).toMatch(/\b(w-12|min-w-12|size-12|w-\[48px\]|min-w-\[48px\])\b/)
    }
  })

  it('recovers from a failed week change: an alert shows, and the next click loads the week', async () => {
    await open()
    h.fail = true
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    h.fail = false
    // A retry by clicking the same button works again.
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})

describe('Report card', () => {
  it('Workouts against the target: "3 of 3", marked done, with the normal', async () => {
    await open()
    const r = row('workouts')
    const text = flat(r)
    expect(text).toMatch(/workouts/i)
    expect(text).toContain('3 of 3')
    expect(within(r).getByText('Done')).toBeTruthy()
    expect(text).toContain('normal 3.4')
  })

  it('under the target it is not marked done', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { current: { ...example().current, workouts: 2 } })
    await open()
    expect(flat(row('workouts'))).toContain('2 of 3')
    expect(within(row('workouts')).queryByText('Done')).toBeNull()
  })

  it('no workouts is not marked done', async () => {
    h.reports['2026-10-26'] = emptyWeek()
    await open()
    expect(flat(row('workouts'))).toContain('0 of 3')
    expect(within(row('workouts')).queryByText('Done')).toBeNull()
  })

  it('Weekly target setting: the row follows the target, so a target of 4 reads "3 of 4" and is not done', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { target: 4 })
    await open()
    expect(flat(row('workouts'))).toContain('3 of 4')
    expect(within(row('workouts')).queryByText('Done')).toBeNull()
  })

  it('a target of 4 with 4 workouts is done', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { target: 4, current: { ...example().current, workouts: 4 } })
    await open()
    expect(flat(row('workouts'))).toContain('4 of 4')
    expect(within(row('workouts')).getByText('Done')).toBeTruthy()
  })

  it('Working sets against normal: 66, "+14%" and "normal 58"', async () => {
    await open()
    const text = flat(row('sets'))
    expect(text).toMatch(/working sets/i)
    expect(text).toContain('66')
    expect(text).toContain('+14%')
    expect(text).toContain('normal 58')
  })

  it('below normal the change is negative', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { current: { ...example().current, workingSets: 50 } })
    await open()
    const text = flat(row('sets'))
    expect(text).toMatch(/[-−–]14%/)
    expect(text).not.toContain('+14%')
  })

  it('Time trained: "3h 22m", "+21m" against normal and "+ 35m cardio"', async () => {
    await open()
    const text = flat(row('time'))
    expect(text).toMatch(/time trained/i)
    expect(text).toContain('3h 22m')
    expect(text).toContain('+21m')
    expect(text).toMatch(/\+\s?35m cardio/)
  })

  it('leaves the cardio out when there was none', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { current: { ...example().current, cardioMinutes: 0 } })
    await open()
    expect(flat(row('time'))).not.toMatch(/cardio/i)
  })

  it('shows a session under an hour in minutes', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { current: { ...example().current, durationSeconds: 2700 } })
    await open()
    expect(flat(row('time'))).toContain('45m')
    expect(flat(row('time'))).not.toContain('0h')
  })

  it('Effort: "RPE 8.7", "31% of sets at 9+ · 2 sets at 10" and the change from normal', async () => {
    await open()
    const text = flat(row('effort'))
    expect(text).toMatch(/effort/i)
    expect(text).toContain('RPE 8.7')
    expect(text).toContain('31% of sets at 9+ · 2 sets at 10')
    expect(text).toContain('+0.6')
    expect(text).toContain('normal 8.1')
  })

  it('Too few rated sets hides the effort number and says why', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { current: { ...example().current, workingSets: 40, effort: null } })
    await open()
    const text = flat(row('effort'))
    expect(text).toMatch(/effort isn.t tracked enough this week/i)
    expect(text).not.toMatch(/RPE\s*\d/)
    expect(text).not.toMatch(/% of sets at 9\+/)
  })

  it('Streak: "6 weeks"', async () => {
    await open()
    const text = flat(row('streak'))
    expect(text).toMatch(/streak/i)
    expect(text).toContain('6 weeks')
  })

  it('says "1 week" for a streak of one, and "0 weeks" for none', async () => {
    h.reports['2026-10-26'] = example('2026-10-26', { streak: 1 })
    await open()
    expect(flat(row('streak'))).toMatch(/\b1 week\b(?!s)/)
    cleanup()
    h.reports['2026-10-26'] = example('2026-10-26', { streak: 0 })
    await open()
    expect(flat(row('streak'))).toContain('0 weeks')
  })

  it('has exactly the five report rows', async () => {
    await open()
    expect([...document.querySelectorAll('[data-row]')].map((e) => e.getAttribute('data-row'))).toEqual([
      'workouts',
      'sets',
      'time',
      'effort',
      'streak',
    ])
  })

  it('Empty week: 0 workouts, and "–" wherever there is nothing to compare', async () => {
    h.reports['2026-10-26'] = emptyWeek()
    await open()
    expect(flat(row('workouts'))).toContain('0 of 3')
    const sets = flat(row('sets'))
    expect(sets).toContain('0')
    expect(sets).toContain('–')
    expect(sets).not.toMatch(/%|NaN|Infinity|normal/)
    const effortText = flat(row('effort'))
    expect(effortText).toContain('–')
    expect(effortText).not.toMatch(/RPE\s*\d|NaN|normal/)
    expect(flat(row('time'))).not.toMatch(/NaN|undefined/)
    expect(flat(row('streak'))).toContain('0 weeks')
  })

  // Amended for S2 (work item 111): the Records / Lifts folder now belongs to the page
  // (progress-records-view.test.tsx). Without a trend in the report there is still no note.
  it('shows no trend note when the report has none', async () => {
    await open()
    expect(screen.queryByText(/light week/i)).toBeNull()
  })
})

describe('Last 8 weeks chart', () => {
  it('has a "Last 8 weeks" heading and eight bars, oldest first, for the 8 weeks ending with the selected one', async () => {
    await open()
    expect(screen.getByText('Last 8 weeks')).toBeTruthy()
    const bars = [...document.querySelectorAll('[data-week]')]
    expect(bars.map((b) => b.getAttribute('data-week'))).toEqual([
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ])
  })

  it('names each bar with its week and working sets', async () => {
    await open()
    const bars = [...document.querySelectorAll('[data-week]')]
    expect(bars[7].getAttribute('aria-label')).toMatch(/^Week of Oct 26: 66 sets/)
    expect(bars[0].getAttribute('aria-label')).toMatch(/^Week of Sep 7: 57 sets/)
    expect(bars[3].getAttribute('aria-label')).toMatch(/^Week of Sep 28: 55 sets/)
  })

  it('each bar has its average RPE beneath it, or "–" when effort isn\'t tracked enough', async () => {
    await open()
    const bars = [...document.querySelectorAll('[data-week]')]
    expect(bars[7].getAttribute('aria-label')).toContain('RPE 8.7')
    expect(flat(bars[7])).toContain('8.7')
    expect(bars[0].getAttribute('aria-label')).toContain('RPE 8.2')
    expect(flat(bars[0])).toContain('8.2')
    // Week index 2 has no effort.
    expect(bars[2].getAttribute('aria-label')).toContain('RPE –')
    expect(flat(bars[2])).toContain('–')
    expect(flat(bars[2])).not.toMatch(/\d\.\d/)
  })

  it('the selected week\'s bar is highlighted, and only that one', async () => {
    await open()
    const bars = [...document.querySelectorAll('[data-week]')]
    expect(bars.filter((b) => b.getAttribute('data-selected') === 'true').map((b) => b.getAttribute('data-week'))).toEqual(['2026-10-26'])
  })

  it('moves the highlight and the bars when the week changes', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await screen.findByText('Week of Oct 19')
    const bars = [...document.querySelectorAll('[data-week]')]
    expect(bars).toHaveLength(8)
    expect(bars[7].getAttribute('data-week')).toBe('2026-10-19')
    expect(bars.find((b) => b.getAttribute('data-selected') === 'true')?.getAttribute('data-week')).toBe('2026-10-19')
  })

  it('an empty history still draws 8 bars with no RPE', async () => {
    h.reports['2026-10-26'] = emptyWeek()
    await open()
    const bars = [...document.querySelectorAll('[data-week]')]
    expect(bars).toHaveLength(8)
    for (const b of bars) {
      expect(b.getAttribute('aria-label')).toContain('0 sets')
      expect(b.getAttribute('aria-label')).toContain('RPE –')
    }
  })
})
