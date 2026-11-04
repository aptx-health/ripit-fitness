/**
 * Per-lift page: getting there and back, on the Progress tab (work item 125). Spec:
 * features/analytics/lift-page.feature, "Tap a lift row", "Back returns to the same week".
 * The lift page itself is lift-page-view.test.tsx. Text, structure and behaviour only.
 *
 * Pinned (ProgressView, `@/components/features/progress/ProgressView`):
 *   - Every Lifts-tab row, a pinned one ([data-pinned]) or one in the plain list or the "Also this
 *     week" group ([data-lift]), holds exactly one link, to
 *       /progress/lift/<exerciseDefinitionId>?week=<the shown report's weekStart>
 *     whose text contains the lift's name. The pin button is NOT inside the link (a button in a
 *     link is invalid HTML) and keeps its own label.
 *   - The week in the link is the week on screen: after Previous week it is the earlier week.
 *   - The Progress tab reads `?week=YYYY-MM-DD` (useSearchParams): a real Monday is sent as
 *     `start` on the first request; no `week`, a date that is not a Monday and garbage send no
 *     `start`, so the current week shows.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const h = vi.hoisted(() => ({
  search: '' as string,
  starts: [] as Array<string | null>,
  lifts: [] as unknown[],
  pins: [] as Array<{ id: string; name: string }>,
  current: '2026-10-26',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress',
  useSearchParams: () => new URLSearchParams(h.search),
  redirect: vi.fn(),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

type Lift = { exerciseDefinitionId: string; name: string; workingSets: number; bestSet: { weight: number; reps: number }; e1rm: number | null; previousE1rm: number | null; bestE1rm: number | null; sessionsBelowBest: number }

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
    weightUnit: 'lbs',
    records: [],
    lifts,
    trend: null,
    pinned: h.pins.map((p) => {
      const lift = lifts.find((l) => l.exerciseDefinitionId === p.id) ?? null
      return { exerciseDefinitionId: p.id, name: p.name, lift, last: null }
    }),
  }
}

beforeEach(() => {
  h.search = ''
  h.starts = []
  h.lifts = []
  h.pins = []
  h.current = '2026-10-26'
  const real = Intl.DateTimeFormat.prototype.resolvedOptions
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: 'America/Denver' }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const path = new URL(String(input), 'http://localhost')
      const start = path.searchParams.get('start')
      h.starts.push(start)
      return { ok: true, status: 200, json: async () => ({ success: true, report: reportFor(start ?? h.current) }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const lift = (id: string, name: string): Lift => ({
  exerciseDefinitionId: `d-${id}`,
  name,
  workingSets: 6,
  bestSet: { weight: 115, reps: 5 },
  e1rm: 128.1,
  previousE1rm: 131,
  bestE1rm: 133.3,
  sessionsBelowBest: 0,
})

async function open({ lifts = [], pins = [], search = '' }: { lifts?: Lift[]; pins?: Array<{ id: string; name: string }>; search?: string } = {}) {
  h.lifts = lifts
  h.pins = pins
  h.search = search
  const View = ((await load('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
  render(createElement(View))
  await screen.findByText(/^week of /i)
  fireEvent.click(screen.getByRole('tab', { name: /^Lifts/ }))
}
const rowOf = (attr: 'data-lift' | 'data-pinned', id: string) => document.querySelector(`[${attr}="${id}"]`) as HTMLElement
const hrefOf = (el: HTMLElement) => within(el).getByRole('link').getAttribute('href')

// =====================================================================================
describe('lift rows link to the lift page', () => {
  it('a row in the plain list (no pins) links with the shown week', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), lift('bench', 'Bench Press')] })
    const squat = rowOf('data-lift', 'd-squat')
    expect(within(squat).getAllByRole('link')).toHaveLength(1)
    expect(hrefOf(squat)).toBe('/progress/lift/d-squat?week=2026-10-26')
    expect(within(squat).getByRole('link').textContent).toContain('Back Squat')
    expect(hrefOf(rowOf('data-lift', 'd-bench'))).toBe('/progress/lift/d-bench?week=2026-10-26')
  })

  it('a pinned row links too, whether it was done this week or not', async () => {
    await open({
      lifts: [lift('squat', 'Back Squat')],
      pins: [
        { id: 'd-squat', name: 'Back Squat' },
        { id: 'd-front', name: 'Front Squat' }, // pinned, not done this week
      ],
    })
    expect(hrefOf(rowOf('data-pinned', 'd-squat'))).toBe('/progress/lift/d-squat?week=2026-10-26')
    expect(hrefOf(rowOf('data-pinned', 'd-front'))).toBe('/progress/lift/d-front?week=2026-10-26')
    expect(within(rowOf('data-pinned', 'd-front')).getByRole('link').textContent).toContain('Front Squat')
  })

  it('a row in the "Also this week" group links once it is expanded', async () => {
    await open({ lifts: [lift('squat', 'Back Squat'), lift('leg', 'Leg Press')], pins: [{ id: 'd-squat', name: 'Back Squat' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Also this week (1)' }))
    expect(hrefOf(rowOf('data-lift', 'd-leg'))).toBe('/progress/lift/d-leg?week=2026-10-26')
  })

  it('the pin button is not inside the link, and keeps its label', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')] })
    const squat = rowOf('data-lift', 'd-squat')
    const link = within(squat).getByRole('link')
    expect(link.querySelector('button')).toBeNull()
    expect(within(squat).getByRole('button', { name: 'Pin Back Squat' })).toBeTruthy()
    expect(link.contains(within(squat).getByRole('button', { name: 'Pin Back Squat' }))).toBe(false)
  })

  it('the link carries the week on screen: after Previous week it is the earlier one', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')] })
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(screen.getByText(/^week of oct 19$/i)).toBeTruthy())
    await waitFor(() => expect(hrefOf(rowOf('data-lift', 'd-squat'))).toBe('/progress/lift/d-squat?week=2026-10-19'))
  })
})

// =====================================================================================
describe('the Progress tab honours ?week=', () => {
  it('opens on that week and sends it as start', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')], search: 'week=2026-10-12' })
    expect(h.starts[0]).toBe('2026-10-12')
    expect(screen.getByText(/^week of oct 12$/i)).toBeTruthy()
    expect(hrefOf(rowOf('data-lift', 'd-squat'))).toBe('/progress/lift/d-squat?week=2026-10-12')
  })

  it('without ?week= it asks for the current week (no start)', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')] })
    expect(h.starts[0]).toBeNull()
  })

  it('ignores a ?week= that is not a Monday, not a date, or empty', async () => {
    for (const search of ['week=2026-10-13', 'week=abc', 'week=', 'week=2026-02-30', 'week=2026-10-12%0A']) {
      cleanup()
      h.starts = []
      await open({ lifts: [lift('squat', 'Back Squat')], search })
      expect(h.starts[0], search).toBeNull()
    }
  })

  it('the first request is the only one that uses ?week=; Next/Previous move from there', async () => {
    await open({ lifts: [lift('squat', 'Back Squat')], search: 'week=2026-10-12' })
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(h.starts).toContain('2026-10-05'))
  })
})
