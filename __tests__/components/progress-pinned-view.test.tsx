/**
 * Progress S3 (pinned lifts): the Lifts tab, the pin toggle and the "Edit tracked lifts" editor
 * on the Progress page (work item 116). Spec: features/analytics/pinned-lifts.feature. Text,
 * structure and behaviour only: colours, the 390px / dark look and the pin icon are the
 * reviewer's job.
 *
 * Pinned interface (the page is `@/components/features/progress/ProgressView`, fetch-driven; the
 * report in GET /api/progress/week carries `pinned`, see pinned-lifts-report.test.ts):
 *   pinned: [{ exerciseDefinitionId, name, lift: WeekLift | null, last: { weight, reps, e1rm | null,
 *             completedAt } | null }]   (a report without `pinned` is read as no pins)
 *
 * Lifts tab (the second tab of the folder; everything below is the Lifts panel):
 *   - With pins: a group headed "Pinned" with one [data-pinned="<id>"] row per pin, in order; then
 *     a group toggle button "Also this week (N)" (N = the week's lifts that are not pinned), with
 *     aria-expanded, collapsed at first: its [data-lift="<id>"] rows are not shown (absent, hidden
 *     or aria-hidden) until the button is clicked; clicking again collapses. No such button when
 *     N is 0.
 *   - A pinned row done this week shows what a Lifts row showed in S2: the name, "115×5 · e1RM
 *     128", the signed change, and the "Flat" chip with "3rd session below 133".
 *   - A pinned row not done this week: "Not this week" and "Last: 185×8 · e1RM 234 lb" (× is U+00D7;
 *     "lb" or "kg" by report.weightUnit; weights as in S2, e1RM a whole number; a bodyweight last
 *     set is "Last: 12 reps" with no e1RM). A pinned lift never logged (last null): "No sessions yet".
 *   - No pins: no "Pinned" heading, no "Also this week" button; the week's lifts as a plain list of
 *     [data-lift] rows as in S2, and the hint "Pin lifts to track them here".
 *   - Every row has a pin button, labelled "Pin <name>" on a lift in the Also group or in the plain
 *     list and "Unpin <name>" on a pinned row, at least 48px (class h-12/min-h-12 and w-12/min-w-12).
 *   - "Edit tracked lifts": a button on the Lifts panel, with or without pins.
 * Saving: PUT /api/progress/pins, content-type JSON, body { exerciseDefinitionIds: [...] } with
 * the whole list in order. Tapping Pin sends the current pins (what the report shows, anchors
 * included) plus the lift at the end; Unpin sends them without it. The page then shows the saved
 * pins (the next report, or the same change at once); the Lifts tab stays selected. When the save
 * fails, the page shows the server's pins again and a role="alert" message. More than 12:
 * "You can track up to 12 lifts" and nothing is sent.
 * Editor: a role="dialog" named "Edit tracked lifts" with
 *   - a list (role=list, named "Tracked lifts") with one item per pin, in order, each with buttons
 *     "Move <name> up", "Move <name> down" (the first up and the last down are disabled) and
 *     "Remove <name>";
 *   - a search box (role searchbox or textbox) that asks GET /api/exercises/search?query=<text>&...
 *     (the picker's endpoint, answer { exercises: [{ id, name, ... }] }) and lists the results, each
 *     with a button "Add <name>" (none for a lift already in the list); adding puts it last;
 *   - buttons "Save" (sends the PUT with the edited order and closes) and "Cancel" (closes, sends
 *     nothing, edits are dropped).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

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
type Last = { weight: number; reps: number; e1rm: number | null; completedAt: string }
type Pin = { id: string; name: string }

/** A tiny server: the week's lifts, the saved pins, and what each pinned lift last did. */
const h = vi.hoisted(() => ({
  weeks: [] as string[],
  lifts: [] as unknown[],
  pins: [] as Array<{ id: string; name: string }>,
  last: {} as Record<string, unknown>,
  withoutPinnedField: false,
  weightUnit: 'lbs' as 'lbs' | 'kg',
  current: '2026-10-26',
  puts: [] as Array<{ url: string; init: RequestInit }>,
  putStatus: 200,
  searches: [] as string[],
  catalogue: [] as Array<{ id: string; name: string }>,
  names: {} as Record<string, string>,
}))

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const stats = (weekStart: string, workingSets = 0) => ({ weekStart, workouts: workingSets > 0 ? 3 : 0, workingSets, durationSeconds: 0, cardioMinutes: 0, effort: null })
function reportFor(weekStart: string) {
  const weeks = [57, 63, 31, 55, 60, 62, 64, 66].map((n, i) => stats(addDays(weekStart, (i - 7) * 7), n))
  const lifts = h.lifts as Lift[]
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
    weightUnit: h.weightUnit,
    records: [],
    lifts,
    trend: null,
    ...(h.withoutPinnedField
      ? {}
      : {
          pinned: h.pins.map((p) => {
            const lift = lifts.find((l) => l.exerciseDefinitionId === p.id) ?? null
            return { exerciseDefinitionId: p.id, name: p.name, lift, last: lift ? null : (h.last[p.id] ?? null) }
          }),
        }),
  }
}

beforeEach(() => {
  h.weeks = []
  h.lifts = []
  h.pins = []
  h.last = {}
  h.withoutPinnedField = false
  h.weightUnit = 'lbs'
  h.current = '2026-10-26'
  h.puts = []
  h.putStatus = 200
  h.searches = []
  h.catalogue = []
  h.names = {}
  const real = Intl.DateTimeFormat.prototype.resolvedOptions
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: 'America/Denver' }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      const path = new URL(url, 'http://localhost')
      if (path.pathname === '/api/progress/pins') {
        h.puts.push({ url, init: init ?? {} })
        if (h.putStatus !== 200) return { ok: false, status: h.putStatus, json: async () => ({ error: 'nope' }) }
        const ids = (JSON.parse(String(init?.body)) as { exerciseDefinitionIds: string[] }).exerciseDefinitionIds
        h.pins = ids.map((id) => ({ id, name: h.names[id] ?? h.catalogue.find((e) => e.id === id)?.name ?? id }))
        return { ok: true, status: 200, json: async () => ({ success: true }) }
      }
      if (path.pathname === '/api/exercises/search') {
        h.searches.push(url)
        const q = (path.searchParams.get('query') ?? '').toLowerCase()
        const exercises = h.catalogue
          .filter((e) => e.name.toLowerCase().includes(q))
          .map((e) => ({ ...e, primaryFAUs: [], secondaryFAUs: [], equipment: [] }))
        return { ok: true, status: 200, json: async () => ({ success: true, exercises }) }
      }
      h.weeks.push(path.searchParams.get('start') ?? h.current)
      const start = path.searchParams.get('start') ?? h.current
      return { ok: true, status: 200, json: async () => ({ success: true, report: reportFor(start) }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// --- fixtures -------------------------------------------------------------------------
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
const pin = (id: string, name: string): Pin => ({ id: `d-${id}`, name })
const last = (weight: number, reps: number, e1rm: number | null): Last => ({ weight, reps, e1rm, completedAt: '2026-10-12T18:00:00.000Z' })
const SQUAT = pin('squat', 'Back Squat')
const BENCH = pin('bench', 'Bench Press')
const LEG = lift('leg', 'Leg Press')
const PULL = lift('pull', 'Pull-up')

/** The server's week: lifts done, pins saved, what pinned lifts last did; then open the page on the Lifts tab. */
async function open(o: { lifts?: Lift[]; pins?: Pin[]; last?: Record<string, Last>; unit?: 'lbs' | 'kg'; stayOnRecords?: boolean } = {}) {
  h.lifts = o.lifts ?? []
  h.pins = o.pins ?? []
  h.last = o.last ?? {}
  h.weightUnit = o.unit ?? 'lbs'
  for (const p of h.pins) h.names[p.id] = p.name
  for (const l of h.lifts as Lift[]) h.names[l.exerciseDefinitionId] = l.name
  const View = ((await load('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
  const view = render(createElement(View))
  await screen.findByText(/^week of /i)
  if (!o.stayOnRecords) fireEvent.click(screen.getByRole('tab', { name: /^Lifts/ }))
  return view
}
const flat = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const panel = () => screen.getByRole('tabpanel')
const row = (sel: string, id: string) => document.querySelector(`[${sel}="${id}"]`) as HTMLElement | null
const shown = (el: Element | null): boolean => {
  if (!el) return false
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (n.hasAttribute('hidden') || n.getAttribute('aria-hidden') === 'true') return false
    if (getComputedStyle(n).display === 'none') return false
  }
  return true
}
const pinnedRows = () => Array.from(document.querySelectorAll('[data-pinned]')) as HTMLElement[]
const shownLifts = () => (Array.from(document.querySelectorAll('[data-lift]')) as HTMLElement[]).filter(shown)
const alsoButton = (n: number) => screen.getByRole('button', { name: `Also this week (${n})` })
const expandAlso = (n: number) => fireEvent.click(alsoButton(n))
const idsOf = (rows: HTMLElement[], attr: string) => rows.map((r) => r.getAttribute(attr))
const button = (name: string) => screen.getByRole('button', { name })
const lastPut = () => JSON.parse(String(h.puts[h.puts.length - 1]?.init.body)) as { exerciseDefinitionIds: string[] }
const LEG_ID = 'd-leg'

// =====================================================================================
describe('Pinned lifts come first', () => {
  it('a "Pinned" group (Back Squat, then Bench Press) and "Also this week (2)" with Leg Press and Pull-up, collapsed', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG, PULL], pins: [SQUAT, BENCH], last: { 'd-bench': last(185, 8, 234.33) } })
    expect(screen.getAllByText('Pinned')).toHaveLength(1)
    expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-squat', 'd-bench'])
    expect(flat(row('data-pinned', 'd-squat'))).toContain('Back Squat')
    expect(flat(row('data-pinned', 'd-bench'))).toContain('Bench Press')

    const also = alsoButton(2)
    expect(also.getAttribute('aria-expanded')).toBe('false')
    expect(shown(row('data-lift', 'd-leg'))).toBe(false)
    expect(shown(row('data-lift', 'd-pull'))).toBe(false)
    expect(screen.getByText('Pinned').compareDocumentPosition(also) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pinnedRows()[1].compareDocumentPosition(also) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('opening "Also this week" shows its lifts in the week\'s order; closing hides them again', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG, PULL], pins: [SQUAT, BENCH], last: { 'd-bench': last(185, 8, 234.33) } })
    expandAlso(2)
    expect(alsoButton(2).getAttribute('aria-expanded')).toBe('true')
    expect(idsOf(shownLifts(), 'data-lift')).toEqual(['d-leg', 'd-pull'])
    expect(flat(row('data-lift', 'd-leg'))).toContain('Leg Press')
    expandAlso(2)
    expect(alsoButton(2).getAttribute('aria-expanded')).toBe('false')
    expect(shownLifts()).toEqual([])
  })

  it('a pinned lift done this week is in Pinned only, not again under Also this week', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG], pins: [SQUAT] })
    expect(alsoButton(1)).toBeTruthy()
    expandAlso(1)
    expect(idsOf(shownLifts(), 'data-lift')).toEqual(['d-leg'])
  })

  it('every lift of the week is pinned: there is no "Also this week" group', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')], pins: [SQUAT] })
    expect(screen.queryByRole('button', { name: /^Also this week/ })).toBeNull()
    expect(screen.queryByText(/Also this week/)).toBeNull()
  })

  it('the pin order is the report\'s order, not the week\'s', async () => {
    await open({ lifts: [lift('a', 'Lift A'), lift('b', 'Lift B'), lift('c', 'Lift C')], pins: [pin('c', 'Lift C'), pin('a', 'Lift A'), pin('b', 'Lift B')] })
    expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-c', 'd-a', 'd-b'])
  })

  it('the Lifts tab is the one selected, and Records is still the first tab', async () => {
    await open({ lifts: [LEG], pins: [SQUAT] })
    expect(screen.getByRole('tab', { name: /^Lifts/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('tab').map((t) => /^(Records|Lifts)/.exec(flat(t))?.[1])).toEqual(['Records', 'Lifts'])
  })

  it('the Pinned group is not on the Records tab', async () => {
    await open({ lifts: [LEG], pins: [SQUAT], stayOnRecords: true })
    expect(screen.queryByText('Pinned')).toBeNull()
    expect(pinnedRows()).toEqual([])
  })
})

describe('pinned rows', () => {
  it('Pinned lifts keep the S2 numbers: the best set, e1RM and the change', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')], pins: [SQUAT] })
    const r = flat(row('data-pinned', 'd-squat'))
    expect(r).toContain('Back Squat')
    expect(r).toContain('115×5')
    expect(r).toContain('e1RM 128')
    expect(r).toContain('−3')
    expect(r).not.toMatch(/Flat|Not this week/)
  })

  it('Pinned lifts keep the S2 numbers: a lift 3 sessions below its best shows the "Flat" chip', async () => {
    await open({ lifts: [lift('ohp', 'Overhead Press', { sessionsBelowBest: 3 })], pins: [pin('ohp', 'Overhead Press')] })
    const r = row('data-pinned', 'd-ohp') as HTMLElement
    expect(within(r).getByText('Flat')).toBeTruthy()
    expect(flat(r)).toContain('3rd session below 133')
  })

  it('A pinned lift not done this week: "Not this week" and "Last: 185×8 · e1RM 234 lb"', async () => {
    await open({ lifts: [LEG], pins: [BENCH], last: { 'd-bench': last(185, 8, 185 * (1 + 8 / 30)) } })
    const r = flat(row('data-pinned', 'd-bench'))
    expect(r).toContain('Bench Press')
    expect(r).toContain('Not this week')
    expect(r).toContain('Last: 185×8 · e1RM 234 lb')
  })

  it('"Last" is in kg for a kg user', async () => {
    await open({ pins: [BENCH], last: { 'd-bench': last(100, 5, 116.67) }, unit: 'kg' })
    expect(flat(row('data-pinned', 'd-bench'))).toContain('Last: 100×5 · e1RM 117 kg')
  })

  it('"Last" shows a weight to one decimal at most', async () => {
    await open({ pins: [BENCH], last: { 'd-bench': last(102.5, 5, 119.58) } })
    expect(flat(row('data-pinned', 'd-bench'))).toContain('Last: 102.5×5 · e1RM 120 lb')
  })

  it('"Last" of a bodyweight lift is its reps and no e1RM', async () => {
    await open({ pins: [pin('pull', 'Pull-up')], last: { 'd-pull': last(0, 12, null) } })
    const r = flat(row('data-pinned', 'd-pull'))
    expect(r).toContain('Last: 12 reps')
    expect(r).not.toMatch(/e1RM|×/)
  })

  it('A pinned lift never done: "No sessions yet", and no "Last:"', async () => {
    await open({ lifts: [LEG], pins: [pin('front', 'Front Squat')] })
    const r = flat(row('data-pinned', 'd-front'))
    expect(r).toContain('Front Squat')
    expect(r).toContain('No sessions yet')
    expect(r).not.toContain('Last:')
  })

  it('a lift done this week does not say "Not this week" or "No sessions yet"', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')], pins: [SQUAT] })
    expect(panel().textContent).not.toMatch(/Not this week|No sessions yet/)
  })
})

describe('Past weeks use history up to that week', () => {
  it('stepping back asks for the earlier week and shows its pinned lifts', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')], pins: [SQUAT, BENCH], last: { 'd-bench': last(185, 8, 234.33) } })
    expect(flat(row('data-pinned', 'd-squat'))).toContain('115×5')
    h.lifts = []
    h.last = { 'd-squat': last(135, 5, 157.5), 'd-bench': last(175, 8, 221.7) }
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(h.weeks).toContain('2026-10-19'))
    await waitFor(() => expect(flat(row('data-pinned', 'd-squat'))).toContain('Last: 135×5 · e1RM 158 lb'))
    expect(flat(row('data-pinned', 'd-bench'))).toContain('Last: 175×8 · e1RM 222 lb')
    expect(screen.getByRole('tab', { name: /^Lifts/ }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('No anchors and no pins', () => {
  it('shows the week\'s lifts as before, and the "Pin lifts to track them here" hint', async () => {
    await open({ lifts: [LEG, PULL] })
    expect(screen.queryByText('Pinned')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Also this week/ })).toBeNull()
    expect(pinnedRows()).toEqual([])
    expect(idsOf(shownLifts(), 'data-lift')).toEqual(['d-leg', 'd-pull'])
    expect(panel().textContent).toContain('Pin lifts to track them here')
  })

  it('with the pin action: each lift has "Pin <name>", and there is an "Edit tracked lifts" button', async () => {
    await open({ lifts: [LEG, PULL] })
    expect(button('Pin Leg Press')).toBeTruthy()
    expect(button('Pin Pull-up')).toBeTruthy()
    expect(button('Edit tracked lifts')).toBeTruthy()
  })

  it('an empty week with no pins says so, and still has the hint and the editor', async () => {
    await open({})
    expect(panel().textContent).toContain('No lifts this week')
    expect(panel().textContent).toContain('Pin lifts to track them here')
    expect(button('Edit tracked lifts')).toBeTruthy()
  })

  it('the hint is gone once there are pins', async () => {
    await open({ lifts: [LEG], pins: [SQUAT] })
    expect(panel().textContent).not.toContain('Pin lifts to track them here')
  })

  it('a report from before pins existed (no pinned field) reads as no pins', async () => {
    h.withoutPinnedField = true
    await open({ lifts: [LEG, PULL] })
    expect(idsOf(shownLifts(), 'data-lift')).toEqual(['d-leg', 'd-pull'])
    expect(panel().textContent).toContain('Pin lifts to track them here')
  })
})

describe('the pin toggle', () => {
  it('a lift under "Also this week" has "Pin <name>"; a pinned lift has "Unpin <name>" and not "Pin <name>"', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG], pins: [SQUAT, BENCH], last: { 'd-bench': last(185, 8, 234.33) } })
    expect(button('Unpin Back Squat')).toBeTruthy()
    expect(button('Unpin Bench Press')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pin Back Squat' })).toBeNull()
    expandAlso(1)
    expect(button('Pin Leg Press')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Unpin Leg Press' })).toBeNull()
  })

  it('is a 48px target, on pinned rows and others', async () => {
    await open({ lifts: [LEG], pins: [SQUAT] })
    expandAlso(1)
    for (const name of ['Unpin Back Squat', 'Pin Leg Press']) {
      const c = button(name).className
      expect(c, name).toMatch(/(^|\s)(h-12|min-h-12|size-12|h-\[48px\]|min-h-\[48px\])(\s|$)/)
      expect(c, name).toMatch(/(^|\s)(w-12|min-w-12|size-12|w-\[48px\]|min-w-\[48px\])(\s|$)/)
    }
  })

  it('Pin from a row: Leg Press moves to the end of the Pinned group, and the pin is saved', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG, PULL], pins: [SQUAT, BENCH], last: { 'd-bench': last(185, 8, 234.33) } })
    expandAlso(2)
    fireEvent.click(button('Pin Leg Press'))
    await waitFor(() => expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-squat', 'd-bench', LEG_ID]))
    expect(h.puts).toHaveLength(1)
    expect(h.puts[0].url).toContain('/api/progress/pins')
    expect(h.puts[0].init.method).toBe('PUT')
    expect(new Headers(h.puts[0].init.headers).get('content-type')).toMatch(/application\/json/)
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-squat', 'd-bench', LEG_ID] })
    expect(h.pins.map((p) => p.id)).toEqual(['d-squat', 'd-bench', LEG_ID])
  })

  it('after pinning, "Also this week" counts one fewer and the Lifts tab is still selected', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG, PULL], pins: [SQUAT] })
    expandAlso(2)
    fireEvent.click(button('Pin Leg Press'))
    await waitFor(() => expect(pinnedRows()).toHaveLength(2))
    await waitFor(() => expect(alsoButton(1)).toBeTruthy())
    expect(screen.getByRole('tab', { name: /^Lifts/ }).getAttribute('aria-selected')).toBe('true')
    expect(flat(row('data-pinned', LEG_ID))).toContain('115×5')
  })

  it('pinning from the plain list (no pins yet) pins just that lift', async () => {
    await open({ lifts: [LEG, PULL] })
    fireEvent.click(button('Pin Pull-up'))
    await waitFor(() => expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-pull']))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-pull'] })
    expect(panel().textContent).not.toContain('Pin lifts to track them here')
  })

  it('Unpin from a row: Bench Press (not done this week) leaves the Pinned group and the page, and the pin is saved', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')], pins: [SQUAT, BENCH], last: { 'd-bench': last(185, 8, 234.33) } })
    fireEvent.click(button('Unpin Bench Press'))
    await waitFor(() => expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-squat']))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-squat'] })
    expect(screen.queryByText('Bench Press')).toBeNull()
  })

  it('Unpin from a row: a lift done this week shows under "Also this week"', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG], pins: [SQUAT, BENCH], last: { 'd-bench': last(185, 8, 234.33) } })
    fireEvent.click(button('Unpin Back Squat'))
    await waitFor(() => expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-bench']))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-bench'] })
    await waitFor(() => expect(alsoButton(2)).toBeTruthy())
    expandAlso(2)
    expect(idsOf(shownLifts(), 'data-lift')).toEqual(['d-squat', 'd-leg'])
  })

  it('unpinning the last pin leaves no pins: the plain list and the hint come back', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG], pins: [SQUAT] })
    fireEvent.click(button('Unpin Back Squat'))
    await waitFor(() => expect(pinnedRows()).toEqual([]))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: [] })
    expect(panel().textContent).toContain('Pin lifts to track them here')
    expect(idsOf(shownLifts(), 'data-lift')).toEqual(['d-squat', 'd-leg'])
  })

  it('the starting (anchor) pins are sent whole when the user changes one', async () => {
    // The page does not know which pins are anchors: it sends what it shows.
    await open({ lifts: [LEG], pins: [pin('dead', 'Deadlift'), SQUAT, BENCH], last: { 'd-dead': last(405, 3, 445.5), 'd-bench': last(185, 8, 234.33) } })
    expandAlso(1)
    fireEvent.click(button('Pin Leg Press'))
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-dead', 'd-squat', 'd-bench', LEG_ID] })
  })

  it('Pin limit: with 12 pinned, pinning another is refused with "You can track up to 12 lifts" and nothing is sent', async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => pin(`p${String(i).padStart(2, '0')}`, `Pinned ${String(i).padStart(2, '0')}`))
    await open({ lifts: [LEG], pins: twelve })
    expandAlso(1)
    fireEvent.click(button('Pin Leg Press'))
    expect(await screen.findByText('You can track up to 12 lifts')).toBeTruthy()
    expect(h.puts).toEqual([])
    expect(pinnedRows()).toHaveLength(12)
  })

  it('11 pinned is not at the limit', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) => pin(`p${String(i).padStart(2, '0')}`, `Pinned ${String(i).padStart(2, '0')}`))
    await open({ lifts: [LEG], pins: eleven })
    expandAlso(1)
    fireEvent.click(button('Pin Leg Press'))
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(screen.queryByText('You can track up to 12 lifts')).toBeNull()
  })

  it('a failed save: the page shows the saved pins again and says so', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), LEG], pins: [SQUAT] })
    h.putStatus = 500
    expandAlso(1)
    fireEvent.click(button('Pin Leg Press'))
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-squat'])
    expect(pinnedRows().map((r) => r.getAttribute('data-pinned'))).not.toContain(LEG_ID)
  })
})

// =====================================================================================
describe('Edit tracked lifts', () => {
  const pins3 = [SQUAT, BENCH, pin('dead', 'Deadlift')]
  async function openEditor(o: Parameters<typeof open>[0] = { pins: pins3 }) {
    await open(o)
    fireEvent.click(button('Edit tracked lifts'))
    return screen.findByRole('dialog', { name: 'Edit tracked lifts' })
  }
  const items = (dialog: HTMLElement) => within(within(dialog).getByRole('list', { name: 'Tracked lifts' })).queryAllByRole('listitem')
  const listed = (dialog: HTMLElement) => items(dialog).map((li) => flat(li))
  const searchBox = (dialog: HTMLElement) => {
    const boxes = [...within(dialog).queryAllByRole('searchbox'), ...within(dialog).queryAllByRole('textbox')]
    expect(boxes).toHaveLength(1)
    return boxes[0]
  }
  const save = () => fireEvent.click(button('Save'))

  it('opens a dialog listing the pins in order', async () => {
    const dialog = await openEditor()
    expect(items(dialog)).toHaveLength(3)
    expect(listed(dialog).map((t) => /Back Squat|Bench Press|Deadlift/.exec(t)?.[0])).toEqual(['Back Squat', 'Bench Press', 'Deadlift'])
  })

  it('also opens with no pins, and the list is empty', async () => {
    const dialog = await openEditor({ lifts: [LEG] })
    expect(items(dialog)).toHaveLength(0)
  })

  it('Edit tracked lifts: move a pinned lift up or down, and saving keeps that order', async () => {
    const dialog = await openEditor()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move Deadlift up' }))
    expect(listed(dialog).map((t) => /Back Squat|Bench Press|Deadlift/.exec(t)?.[0])).toEqual(['Back Squat', 'Deadlift', 'Bench Press'])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move Back Squat down' }))
    expect(listed(dialog).map((t) => /Back Squat|Bench Press|Deadlift/.exec(t)?.[0])).toEqual(['Deadlift', 'Back Squat', 'Bench Press'])
    save()
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-dead', 'd-squat', 'd-bench'] })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-dead', 'd-squat', 'd-bench'])
  })

  it('the first lift cannot move up and the last cannot move down', async () => {
    const dialog = await openEditor()
    expect((within(dialog).getByRole('button', { name: 'Move Back Squat up' }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(dialog).getByRole('button', { name: 'Move Deadlift down' }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(dialog).getByRole('button', { name: 'Move Bench Press up' }) as HTMLButtonElement).disabled).toBe(false)
    expect((within(dialog).getByRole('button', { name: 'Move Bench Press down' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('Edit tracked lifts: remove a pinned lift', async () => {
    const dialog = await openEditor()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Back Squat' }))
    expect(items(dialog)).toHaveLength(2)
    expect(flat(dialog)).not.toContain('Back Squat')
    save()
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-bench', 'd-dead'] })
    await waitFor(() => expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-bench', 'd-dead']))
  })

  it('removing every lift and saving sends an empty list', async () => {
    const dialog = await openEditor({ lifts: [LEG], pins: [SQUAT] })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Back Squat' }))
    save()
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: [] })
    await waitFor(() => expect(panel().textContent).toContain('Pin lifts to track them here'))
  })

  it('Edit tracked lifts: search all exercises and add one, which goes last', async () => {
    h.catalogue = [
      { id: 'd-hack', name: 'Hack Squat' },
      { id: 'd-squat', name: 'Back Squat' },
      { id: 'd-row', name: 'Barbell Row' },
    ]
    const dialog = await openEditor()
    fireEvent.change(searchBox(dialog), { target: { value: 'squat' } })
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Add Hack Squat' })).toBeTruthy())
    expect(h.searches.some((u) => new URL(u, 'http://localhost').searchParams.get('query') === 'squat')).toBe(true)
    expect(within(dialog).queryByRole('button', { name: 'Add Barbell Row' })).toBeNull()
    // Back Squat is already in the list: nothing to add.
    expect(within(dialog).queryByRole('button', { name: 'Add Back Squat' })).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Hack Squat' }))
    await waitFor(() => expect(items(dialog)).toHaveLength(4))
    expect(listed(dialog).map((t) => /Back Squat|Bench Press|Deadlift|Hack Squat/.exec(t)?.[0])).toEqual(['Back Squat', 'Bench Press', 'Deadlift', 'Hack Squat'])
    save()
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-squat', 'd-bench', 'd-dead', 'd-hack'] })
    await waitFor(() => expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-squat', 'd-bench', 'd-dead', 'd-hack']))
  })

  it('a lift added in the editor that was not done this week shows its last set', async () => {
    h.catalogue = [{ id: 'd-hack', name: 'Hack Squat' }]
    const dialog = await openEditor({ pins: pins3, last: { 'd-hack': last(225, 6, 270) } })
    fireEvent.change(searchBox(dialog), { target: { value: 'hack' } })
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Add Hack Squat' }))
    save()
    await waitFor(() => expect(row('data-pinned', 'd-hack')).not.toBeNull())
    expect(flat(row('data-pinned', 'd-hack'))).toContain('Last: 225×6 · e1RM 270 lb')
  })

  it('Pin limit: with 12 in the list, adding another is refused with "You can track up to 12 lifts"', async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => pin(`p${String(i).padStart(2, '0')}`, `Pinned ${String(i).padStart(2, '0')}`))
    h.catalogue = [{ id: 'd-hack', name: 'Hack Squat' }]
    const dialog = await openEditor({ pins: twelve })
    fireEvent.change(searchBox(dialog), { target: { value: 'hack' } })
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Add Hack Squat' }))
    expect(await within(dialog).findByText('You can track up to 12 lifts')).toBeTruthy()
    expect(items(dialog)).toHaveLength(12)
    expect(flat(dialog)).not.toMatch(/Hack Squat.*Move Hack Squat/)
    expect(h.puts).toEqual([])
  })

  it('removing one of 12 makes room to add one', async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => pin(`p${String(i).padStart(2, '0')}`, `Pinned ${String(i).padStart(2, '0')}`))
    h.catalogue = [{ id: 'd-hack', name: 'Hack Squat' }]
    const dialog = await openEditor({ pins: twelve })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Pinned 00' }))
    fireEvent.change(searchBox(dialog), { target: { value: 'hack' } })
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Add Hack Squat' }))
    await waitFor(() => expect(items(dialog)).toHaveLength(12))
    expect(within(dialog).queryByText('You can track up to 12 lifts')).toBeNull()
  })

  it('Cancel closes the dialog, sends nothing, and drops the edits', async () => {
    const dialog = await openEditor()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Back Squat' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(h.puts).toEqual([])
    expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-squat', 'd-bench', 'd-dead'])
    fireEvent.click(button('Edit tracked lifts'))
    const again = await screen.findByRole('dialog', { name: 'Edit tracked lifts' })
    expect(items(again)).toHaveLength(3)
  })

  it('a failed save keeps the dialog open with a message, and the pins as they were', async () => {
    const dialog = await openEditor()
    h.putStatus = 500
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Back Squat' }))
    save()
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(await within(await screen.findByRole('dialog')).findByRole('alert')).toBeTruthy()
    expect(idsOf(pinnedRows(), 'data-pinned')).toEqual(['d-squat', 'd-bench', 'd-dead'])
  })

  it('saving without changes still sends the list (it makes the current pins the saved ones)', async () => {
    const dialog = await openEditor()
    expect(dialog).toBeTruthy()
    save()
    await waitFor(() => expect(h.puts).toHaveLength(1))
    expect(lastPut()).toEqual({ exerciseDefinitionIds: ['d-squat', 'd-bench', 'd-dead'] })
  })
})
