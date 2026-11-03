/**
 * Progress S2: the Records / Lifts folder and the trend note on the Progress page
 * (work item 111). Spec: features/analytics/weekly-records.feature; mockup
 * initiatives/analytics/docs/discovery/ideas/c-report.html. Text, structure and order
 * only: colours, classes and the 390px / dark look are the reviewer's job.
 *
 * Pinned interface (the S1 page, `@/components/features/progress/ProgressView`, fetch-driven;
 * the body's `report` carries, besides S1's fields, `weightUnit`, `records`, `lifts`, `trend`,
 * see progress-week-records.test.ts):
 *   - A folder of paper tabs under the report card and above "Last 8 weeks": a tablist with
 *     two role="tab" buttons, "Records" then "Lifts" (the Records tab also shows its count,
 *     records.length, as text in the tab), Records selected first. The selected tab's panel
 *     is the page's one accessible role="tabpanel"; the other is hidden or not rendered.
 *     Clicking a tab switches. (components/ui/PaperTabs does all of this.)
 *   - Records panel: one [data-record="<exerciseDefinitionId>"] per record, in order, with the
 *     exercise name, one detail line and a chip:
 *       kind 'e1rm'            "275×4 · e1RM 287 lb (was 278)"   chip "PR"
 *       kind 'rep', weight > 0 "185×8 · best 8-rep set (was 180)" chip "Rep PR"
 *       kind 'rep', weight 0   "12 reps (was 10)"                chip "Rep PR"
 *     (× is U+00D7; "lb" for weightUnit 'lbs', "kg" for 'kg'; weights without a trailing .0, up
 *     to one decimal; e1RM and the e1rm kind's "was" are whole numbers; the rep kinds' "was" is
 *     a weight or rep count as is). No records: the panel says "No records this week".
 *   - Lifts panel: one [data-lift="<exerciseDefinitionId>"] per lift, in order, with the name,
 *     the best set as "115×5" and "e1RM 128" (a bodyweight set, weight 0, as "12 reps" and no
 *     e1RM), the change against previousE1rm as a signed whole number (+9, −3 with the real
 *     minus sign U+2212; nothing when previousE1rm is null), and, when sessionsBelowBest is 3 or
 *     more, a chip "Flat" and the text "3rd session below 133" (133 = bestE1rm rounded; 3rd, 4th,
 *     5th ... 11th, 12th, 21st). The page decides "Flat"; the payload only has the count.
 *   - Trend note, inside the "Last 8 weeks" region (role region, named by that heading), after
 *     the chart, from report.trend:
 *       effortRisingWeeks >= 3  "Effort has risen 4 weeks running (8.0 → 8.7)."
 *       lastLightWeeksAgo n >= 1  "Your last light week was 5 weeks ago." ("1 week ago")
 *       lastLightWeeksAgo null  "No light week in the last 8 weeks."
 *     trend null: no note at all.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const h = vi.hoisted(() => ({
  fetches: [] as string[],
  reports: {} as Record<string, unknown>,
  current: '2026-10-26',
  extras: {} as Record<string, unknown>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

type Rec = { exerciseDefinitionId: string; name: string; kind: 'e1rm' | 'rep'; weight: number; reps: number; e1rm: number | null; previous: number }
type Lift = {
  exerciseDefinitionId: string
  name: string
  workingSets: number
  bestSet: { weight: number; reps: number }
  e1rm: number | null
  previousE1rm: number | null
  bestE1rm: number | null
  sessionsBelowBest: number
}
type Trend = { effortRisingWeeks: number; effortFrom: number | null; effortTo: number | null; lastLightWeeksAgo: number | null }
type Extras = { weightUnit: 'lbs' | 'kg'; records: Rec[]; lifts: Lift[]; trend: Trend | null }

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const stats = (weekStart: string, workingSets = 0) => ({
  weekStart,
  workouts: workingSets > 0 ? 3 : 0,
  workingSets,
  durationSeconds: 0,
  cardioMinutes: 0,
  effort: null,
})
/** S1's report for a week, with the S2 fields on top. */
function report(weekStart: string, extras: Partial<Extras> = {}) {
  const weeks = [57, 63, 31, 55, 60, 62, 64, 66].map((n, i) => stats(addDays(weekStart, (i - 7) * 7), n))
  return {
    weekStart,
    isCurrentWeek: weekStart === h.current,
    target: 3,
    programWeek: null,
    current: weeks[7],
    normal: { workouts: 3, workingSets: 58, durationSeconds: 0, cardioMinutes: 0, avgRpe: null },
    normalWeeks: 8,
    streak: 2,
    weeks,
    weightUnit: 'lbs',
    records: [],
    lifts: [],
    trend: null,
    ...extras,
  }
}

const SQUAT: Rec = { exerciseDefinitionId: 'd-squat', name: 'Back Squat', kind: 'e1rm', weight: 275, reps: 4, e1rm: 287.4, previous: 278.2 }
const BENCH: Rec = { exerciseDefinitionId: 'd-bench', name: 'Bench Press', kind: 'rep', weight: 185, reps: 8, e1rm: 234.3, previous: 180 }
const PULLUP: Rec = { exerciseDefinitionId: 'd-pullup', name: 'Pull-up', kind: 'rep', weight: 0, reps: 12, e1rm: null, previous: 10 }
const lift = (id: string, name: string, o: Partial<Lift> = {}): Lift => ({
  exerciseDefinitionId: `d-${id}`,
  name,
  workingSets: 6,
  bestSet: { weight: 115, reps: 5 },
  e1rm: 128.1,
  previousE1rm: 131,
  bestE1rm: 133.3,
  sessionsBelowBest: 0,
  ...o,
})

beforeEach(() => {
  h.fetches = []
  h.reports = {}
  h.current = '2026-10-26'
  h.extras = {}
  const real = Intl.DateTimeFormat.prototype.resolvedOptions
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: 'America/Denver' }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input)
      h.fetches.push(url)
      const start = new URL(url, 'http://localhost').searchParams.get('start') ?? h.current
      return { ok: true, status: 200, json: async () => ({ success: true, report: h.reports[start] ?? report(start, h.extras as Partial<Extras>) }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function open(extras: Partial<Extras> = {}) {
  h.extras = extras
  const View = ((await load('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
  const view = render(createElement(View))
  await screen.findByText(/^week of /i)
  return view
}
const flat = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const tab = (name: RegExp) => screen.getByRole('tab', { name })
const records = () => Array.from(document.querySelectorAll('[data-record]')) as HTMLElement[]
const lifts = () => Array.from(document.querySelectorAll('[data-lift]')) as HTMLElement[]
const recordRow = (id: string) => {
  const el = document.querySelector(`[data-record="${id}"]`)
  if (!el) throw new Error(`no [data-record="${id}"]`)
  return el as HTMLElement
}
const liftRow = (id: string) => {
  const el = document.querySelector(`[data-lift="${id}"]`)
  if (!el) throw new Error(`no [data-lift="${id}"]`)
  return el as HTMLElement
}
const last8 = () => screen.getByRole('region', { name: 'Last 8 weeks' })

// ---------------------------------------------------------------------------
describe('The folder', () => {
  it('Records and Lifts are two tabs, Records first and selected, under the report card and above Last 8 weeks', async () => {
    await open({ records: [SQUAT], lifts: [lift('ohp', 'Overhead Press')] })
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => /^(Records|Lifts)/.exec(flat(t))?.[1])).toEqual(['Records', 'Lifts'])
    expect(tab(/^Records/).getAttribute('aria-selected')).toBe('true')
    expect(tab(/^Lifts/).getAttribute('aria-selected')).toBe('false')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    const card = screen.getByRole('heading', { name: 'Report card' })
    const eight = screen.getByRole('heading', { name: 'Last 8 weeks' })
    const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(card, tab(/^Records/))).toBe(true)
    expect(follows(tab(/^Lifts/), eight)).toBe(true)
  })

  it('The Records tab shows a count: 2 records', async () => {
    await open({ records: [SQUAT, BENCH] })
    expect(flat(tab(/^Records/))).toMatch(/^Records\s*2$/)
  })

  it('the count follows the records: 3', async () => {
    await open({ records: [SQUAT, BENCH, PULLUP] })
    expect(flat(tab(/^Records/))).toMatch(/^Records\s*3$/)
  })

  it('the count is the records only, not the lifts as well', async () => {
    await open({
      records: [SQUAT, BENCH],
      lifts: [lift('a', 'Lift A'), lift('b', 'Lift B'), lift('c', 'Lift C')],
    })
    expect(flat(tab(/^Records/))).toMatch(/^Records\s*2$/)
    expect(flat(tab(/^Lifts/))).not.toMatch(/\d/)
  })

  it('No records: the Records tab says "No records this week" and the Lifts tab is still there', async () => {
    await open({ records: [], lifts: [lift('ohp', 'Overhead Press')] })
    expect(screen.getByText('No records this week')).toBeTruthy()
    expect(records()).toHaveLength(0)
    fireEvent.click(tab(/^Lifts/))
    expect(liftRow('d-ohp')).toBeTruthy()
    expect(screen.queryByText('No records this week')).toBeNull()
  })

  it('records are not shown with the Lifts tab, nor lifts with Records, and switching goes both ways', async () => {
    await open({ records: [SQUAT], lifts: [lift('ohp', 'Overhead Press')] })
    expect(records()).toHaveLength(1)
    expect(lifts()).toHaveLength(0)
    fireEvent.click(tab(/^Lifts/))
    expect(tab(/^Lifts/).getAttribute('aria-selected')).toBe('true')
    expect(lifts()).toHaveLength(1)
    expect(records()).toHaveLength(0)
    fireEvent.click(tab(/^Records/))
    expect(records()).toHaveLength(1)
    expect(lifts()).toHaveLength(0)
  })

  it('the Lifts tab works with no lifts', async () => {
    await open({ records: [], lifts: [] })
    fireEvent.click(tab(/^Lifts/))
    expect(screen.getByRole('tabpanel')).toBeTruthy()
    expect(lifts()).toHaveLength(0)
  })

  it('Past weeks show the records set in that week: stepping back asks for the earlier week and shows its records', async () => {
    h.reports['2026-10-19'] = report('2026-10-19', { records: [PULLUP] })
    await open({ records: [SQUAT, BENCH] })
    expect(records().map((r) => r.getAttribute('data-record'))).toEqual(['d-squat', 'd-bench'])
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(flat(document.body)).toContain('Week of Oct 19'))
    expect(new URL(h.fetches.at(-1) as string, 'http://localhost').searchParams.get('start')).toBe('2026-10-19')
    await waitFor(() => expect(records().map((r) => r.getAttribute('data-record'))).toEqual(['d-pullup']))
    expect(flat(tab(/^Records/))).toMatch(/^Records\s*1$/)
  })
})

// ---------------------------------------------------------------------------
describe('Records', () => {
  it('e1RM PR: "275×4 · e1RM 287 lb (was 278)" and a PR chip', async () => {
    await open({ records: [SQUAT] })
    const r = recordRow('d-squat')
    expect(flat(r)).toContain('Back Squat')
    expect(flat(r)).toContain('275×4 · e1RM 287 lb (was 278)')
    expect(within(r).getByText('PR')).toBeTruthy()
    expect(within(r).queryByText('Rep PR')).toBeNull()
  })

  it('Rep PR: "185×8 · best 8-rep set (was 180)" and a Rep PR chip', async () => {
    await open({ records: [BENCH] })
    const r = recordRow('d-bench')
    expect(flat(r)).toContain('Bench Press')
    expect(flat(r)).toContain('185×8 · best 8-rep set (was 180)')
    expect(within(r).getByText('Rep PR')).toBeTruthy()
    expect(within(r).queryByText('PR')).toBeNull() // "PR" as a whole word on its own, not "Rep PR"
  })

  it('Bodyweight rep PR: "12 reps (was 10)" and a Rep PR chip', async () => {
    await open({ records: [PULLUP] })
    const r = recordRow('d-pullup')
    expect(flat(r)).toContain('Pull-up')
    expect(flat(r)).toContain('12 reps (was 10)')
    expect(flat(r)).not.toMatch(/e1RM|×/)
    expect(within(r).getByText('Rep PR')).toBeTruthy()
  })

  it('lists one row per record, in the order given, each with its own chip', async () => {
    await open({ records: [BENCH, SQUAT, PULLUP] })
    expect(records().map((r) => r.getAttribute('data-record'))).toEqual(['d-bench', 'd-squat', 'd-pullup'])
    expect(within(recordRow('d-squat')).getByText('PR')).toBeTruthy()
    expect(within(recordRow('d-bench')).getByText('Rep PR')).toBeTruthy()
  })

  it('the numbers are rounded for reading: e1RM and "was" to whole numbers, weights to a tenth', async () => {
    await open({
      records: [
        { ...SQUAT, weight: 102.5, reps: 5, e1rm: 311.67, previous: 277.5 },
        { ...BENCH, weight: 42.5, reps: 10, previous: 40 },
      ],
    })
    expect(flat(recordRow('d-squat'))).toContain('102.5×5 · e1RM 312 lb (was 278)')
    expect(flat(recordRow('d-bench'))).toContain('42.5×10 · best 10-rep set (was 40)')
  })

  it('a whole weight has no decimals: 275, not 275.0', async () => {
    await open({ records: [{ ...SQUAT, weight: 275.0, e1rm: 287.0, previous: 278.0 }] })
    expect(flat(recordRow('d-squat'))).toContain('275×4 · e1RM 287 lb (was 278)')
    expect(flat(recordRow('d-squat'))).not.toContain('275.0')
  })

  it('a kg user sees kg', async () => {
    await open({ weightUnit: 'kg', records: [{ ...SQUAT, weight: 120, reps: 5, e1rm: 140, previous: 135.4 }] })
    expect(flat(recordRow('d-squat'))).toContain('120×5 · e1RM 140 kg (was 135)')
    expect(flat(recordRow('d-squat'))).not.toMatch(/\blb\b/)
  })
})

// ---------------------------------------------------------------------------
describe('Lifts', () => {
  it('Lifts lists the exercises in the order given, most working sets first', async () => {
    await open({
      lifts: [
        lift('ohp', 'Overhead Press', { workingSets: 12 }),
        lift('pullup', 'Pull-up', { workingSets: 9, bestSet: { weight: 0, reps: 12 }, e1rm: null, previousE1rm: null, bestE1rm: null }),
        lift('squat', 'Back Squat', { workingSets: 6 }),
      ],
    })
    fireEvent.click(tab(/^Lifts/))
    expect(lifts().map((l) => l.getAttribute('data-lift'))).toEqual(['d-ohp', 'd-pullup', 'd-squat'])
    expect(flat(liftRow('d-ohp'))).toContain('Overhead Press')
    expect(flat(liftRow('d-squat'))).toContain('Back Squat')
  })

  it('each row shows the week\'s best set and its e1RM', async () => {
    await open({ lifts: [lift('ohp', 'Overhead Press', { bestSet: { weight: 115, reps: 5 }, e1rm: 128.1 })] })
    fireEvent.click(tab(/^Lifts/))
    const text = flat(liftRow('d-ohp'))
    expect(text).toContain('115×5')
    expect(text).toContain('e1RM 128')
  })

  it('and the change against the previous session: up shows +, down shows −', async () => {
    await open({
      lifts: [
        lift('squat', 'Back Squat', { e1rm: 287.4, previousE1rm: 278.3 }),
        lift('ohp', 'Overhead Press', { e1rm: 128.1, previousE1rm: 131 }),
      ],
    })
    fireEvent.click(tab(/^Lifts/))
    expect(flat(liftRow('d-squat'))).toMatch(/\+9(?!\d)/)
    expect(flat(liftRow('d-ohp'))).toMatch(/[−-]3(?!\d)/)
    expect(flat(liftRow('d-ohp'))).not.toMatch(/\+3/)
  })

  it('a lift without a previous session shows no change', async () => {
    await open({ lifts: [lift('hack', 'Hack Squat', { previousE1rm: null, e1rm: 250, bestE1rm: 250 })] })
    fireEvent.click(tab(/^Lifts/))
    expect(flat(liftRow('d-hack'))).not.toMatch(/[+−]\d/)
    expect(flat(liftRow('d-hack'))).toContain('e1RM 250')
  })

  it('a bodyweight lift shows its reps and no e1RM', async () => {
    await open({ lifts: [lift('pullup', 'Pull-up', { bestSet: { weight: 0, reps: 12 }, e1rm: null, previousE1rm: null, bestE1rm: null })] })
    fireEvent.click(tab(/^Lifts/))
    expect(flat(liftRow('d-pullup'))).toContain('12 reps')
    expect(flat(liftRow('d-pullup'))).not.toMatch(/e1RM/)
  })

  it('Flat lift: the 3rd session in a row below the best shows a Flat chip and "3rd session below 133"', async () => {
    await open({ lifts: [lift('ohp', 'Overhead Press', { sessionsBelowBest: 3, bestE1rm: 133.3 })] })
    fireEvent.click(tab(/^Lifts/))
    const r = liftRow('d-ohp')
    expect(within(r).getByText('Flat')).toBeTruthy()
    expect(flat(r)).toContain('3rd session below 133')
  })

  it('Fewer than 3 sessions below the best is not flat: 2, 1 and 0 show no chip and no count', async () => {
    await open({
      lifts: [
        lift('a', 'Lift A', { sessionsBelowBest: 2 }),
        lift('b', 'Lift B', { sessionsBelowBest: 1 }),
        lift('c', 'Lift C', { sessionsBelowBest: 0 }),
      ],
    })
    fireEvent.click(tab(/^Lifts/))
    expect(screen.queryByText('Flat')).toBeNull()
    expect(flat(document.body)).not.toMatch(/session below/)
  })

  it.each([
    [4, '4th'],
    [5, '5th'],
    [11, '11th'],
    [12, '12th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
  ])('a longer slide reads the %i as "%s session below"', async (n, ordinal) => {
    await open({ lifts: [lift('ohp', 'Overhead Press', { sessionsBelowBest: n, bestE1rm: 133.3 })] })
    fireEvent.click(tab(/^Lifts/))
    expect(flat(liftRow('d-ohp'))).toContain(`${ordinal} session below 133`)
    expect(within(liftRow('d-ohp')).getByText('Flat')).toBeTruthy()
  })

  it('"Flat" belongs to Lifts: the Records tab never carries it', async () => {
    await open({ records: [SQUAT], lifts: [lift('ohp', 'Overhead Press', { sessionsBelowBest: 3 })] })
    expect(screen.queryByText('Flat')).toBeNull()
    expect(flat(recordRow('d-squat'))).not.toMatch(/Flat|session below/)
  })
})

// ---------------------------------------------------------------------------
describe('The trend note under Last 8 weeks', () => {
  const RISING: Trend = { effortRisingWeeks: 4, effortFrom: 8.0, effortTo: 8.7, lastLightWeeksAgo: 5 }

  it('Rising effort and Last light week: both sentences, as in the mockup', async () => {
    await open({ trend: RISING })
    const text = flat(last8())
    expect(text).toContain('Effort has risen 4 weeks running (8.0 → 8.7).')
    expect(text).toContain('Your last light week was 5 weeks ago.')
  })

  it('the note is in the Last 8 weeks region, after the chart\'s weeks', async () => {
    await open({ trend: RISING })
    const note = within(last8()).getByText(/Your last light week was 5 weeks ago/)
    const weeks = Array.from(document.querySelectorAll('[data-week]'))
    expect(weeks).toHaveLength(8)
    expect(weeks.every((w) => Boolean(w.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true)
  })

  it('RPE is shown with one decimal: 8 reads 8.0', async () => {
    await open({ trend: { effortRisingWeeks: 3, effortFrom: 8, effortTo: 9.25, lastLightWeeksAgo: null } })
    expect(flat(last8())).toContain('Effort has risen 3 weeks running (8.0 → 9.3)')
  })

  it('No light week in the 8 weeks', async () => {
    await open({ trend: { effortRisingWeeks: 0, effortFrom: null, effortTo: null, lastLightWeeksAgo: null } })
    expect(flat(last8())).toContain('No light week in the last 8 weeks.')
    expect(flat(last8())).not.toMatch(/Your last light week/)
  })

  it('"1 week ago" is singular', async () => {
    await open({ trend: { effortRisingWeeks: 0, effortFrom: null, effortTo: null, lastLightWeeksAgo: 1 } })
    expect(flat(last8())).toContain('Your last light week was 1 week ago.')
    expect(flat(last8())).not.toMatch(/1 weeks/)
  })

  it('Rising effort needs at least 3 weeks: nothing about effort when it did not rise', async () => {
    await open({ trend: { effortRisingWeeks: 0, effortFrom: null, effortTo: null, lastLightWeeksAgo: 5 } })
    expect(flat(last8())).not.toMatch(/Effort has|risen/i)
    expect(flat(last8())).toContain('Your last light week was 5 weeks ago.')
  })

  it('Little effort data: no effort sentence, the light-week one stays', async () => {
    await open({ trend: { effortRisingWeeks: 0, effortFrom: null, effortTo: null, lastLightWeeksAgo: 2 } })
    expect(flat(last8())).not.toMatch(/Effort has/)
    expect(flat(last8())).toContain('2 weeks ago')
  })

  it('Not enough history: no trend note is shown at all', async () => {
    await open({ trend: null })
    expect(flat(document.body)).not.toMatch(/light week|Effort has risen|running/i)
  })

  it('a different week asks for and shows its own note', async () => {
    h.reports['2026-10-19'] = report('2026-10-19', { trend: { effortRisingWeeks: 0, effortFrom: null, effortTo: null, lastLightWeeksAgo: 3 } })
    await open({ trend: RISING })
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(flat(last8())).toContain('Your last light week was 3 weeks ago.'))
    expect(flat(last8())).not.toMatch(/Effort has risen/)
  })
})
