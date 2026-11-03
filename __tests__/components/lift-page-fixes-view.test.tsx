/**
 * Per-lift page fixes after review 127 (work item 128), the client view. Spec:
 * features/analytics/lift-page.feature, "After review 127". Interface as in lift-page-view.test.tsx.
 *
 *   - A weighted lift with no e1RM in any session (every set over 12 reps) opens on Top set; its
 *     e1RM tab reads "No e1RM: sets over 12 reps" when the range has sessions.
 *   - Records show a 15-rep record like any other ("15 reps", "135 lb").
 *   - Volume: the bars are the range's weeks; the total tile counts only sessions on or after the
 *     range's exact start, and the average divides it by the bars.
 *   - Weighted lifts: weight-0 sessions are left off the Top set chart and the dashed top-set line.
 *   - Line charts draw a light fill ([data-fill]) under the line.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ lift: null as unknown }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress/lift/d-calf',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

type Set = { weight: number; reps: number }
type Sess = { completionId: string; date: string; sets: Set[]; e1rm: number | null; topSet: Set; avgRpe: number | null }

const NOW = new Date('2026-11-02T18:00:00Z') // Monday noon, Denver
const DAY = 86_400_000
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString()
const sess = (id: string, days: number, sets: Set[], e1rm: number | null = null): Sess => ({
  completionId: id,
  date: ago(days),
  sets,
  e1rm,
  topSet: sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a)),
  avgRpe: null,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  const real = Intl.DateTimeFormat.prototype.resolvedOptions
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: 'America/Denver' }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, lift: h.lift }) })),
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function open(lift: Record<string, unknown>) {
  h.lift = { name: 'Calf Raise', weightUnit: 'lbs', isBodyweight: false, records: [], weeklySets: [], pinned: [], ...lift }
  const View = ((await import('@/components/features/progress/LiftView')) as { default: ComponentType<{ exerciseDefinitionId: string }> }).default
  render(createElement(View, { exerciseDefinitionId: 'd-calf' }))
  await screen.findByRole('heading', { level: 1 })
}
const flat = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const tile = (name: string) => flat(document.querySelector(`[data-tile="${name}"]`))
const tab = (name: string) => screen.getByRole('tab', { name })
const values = () => Array.from(document.querySelectorAll('[data-point]')).map((p) => Number(p.getAttribute('data-value')))
const HIGH = [sess('a', 30, [{ weight: 135, reps: 15 }]), sess('b', 3, [{ weight: 155, reps: 16 }, { weight: 135, reps: 20 }])]

describe('lifts trained above 12 reps', () => {
  it('open on Top set, plotting the heaviest sets', async () => {
    await open({ sessions: HIGH })
    expect(tab('Top set').getAttribute('aria-selected')).toBe('true')
    expect(document.querySelector('[data-chart]')?.getAttribute('data-chart')).toBe('top-set')
    expect(values()).toEqual([135, 155])
  })

  it('the e1RM tab says why it is empty', async () => {
    await open({ sessions: HIGH })
    fireEvent.click(tab('e1RM'))
    expect(screen.getByText('No e1RM: sets over 12 reps')).toBeTruthy()
    expect(screen.queryByText('No sessions in this range')).toBeNull()
    expect(document.querySelector('[data-chart]')).toBeNull()
  })

  it('a range with no sessions still says "No sessions in this range"', async () => {
    await open({ sessions: [sess('old', 300, [{ weight: 135, reps: 15 }])] })
    fireEvent.click(tab('e1RM'))
    expect(screen.getByText('No sessions in this range')).toBeTruthy()
  })

  it('a lift with an e1RM somewhere still opens on e1RM', async () => {
    await open({ sessions: [...HIGH, sess('c', 10, [{ weight: 185, reps: 8 }], 234.3)] })
    expect(tab('e1RM').getAttribute('aria-selected')).toBe('true')
  })

  it('Records list a 15-rep record like any other', async () => {
    await open({ sessions: HIGH, records: [{ reps: 15, weight: 135, date: ago(30), isNew: false }] })
    const row = document.querySelector('[data-record="15"]')
    expect(flat(row)).toContain('15 reps')
    expect(flat(row)).toContain('135 lb')
  })
})

describe('Volume counts only the range', () => {
  it('a session just before the 3M start sits in the first bar but not in the tiles', async () => {
    const sessions = [sess('in', 3, [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }]), sess('edge', 91 + 2 / 24, Array.from({ length: 6 }, () => ({ weight: 100, reps: 5 })))]
    const firstWeek = new Date(NOW.getTime() - (91 + 2 / 24) * DAY) // Monday morning, 2 hours before the 3M start
    const monday = new Date(firstWeek.getTime() - ((firstWeek.getUTCDay() + 6) % 7) * DAY).toISOString().slice(0, 10)
    const weeklySets = Array.from({ length: 14 }, (_, i) => ({
      weekStart: new Date(Date.parse(`${monday}T00:00:00Z`) + i * 7 * DAY).toISOString().slice(0, 10),
      sets: i === 0 ? 6 : i === 13 ? 2 : 0,
    }))
    await open({ sessions, weeklySets })
    fireEvent.click(tab('Volume'))
    fireEvent.click(screen.getByRole('button', { name: '3M' }))
    const bars = Array.from(document.querySelectorAll('[data-bar]')).map((b) => Number(b.getAttribute('data-value')))
    expect(bars.reduce((a, b) => a + b, 0)).toBe(8) // the edge week is still drawn
    expect(tile('total')).toMatch(/Total sets\s*2$/)
    expect(tile('avg')).toMatch(new RegExp(`${Math.round((2 / bars.length) * 10) / 10}$`))
    expect(tile('sessions')).toMatch(/Sessions\s*1(?!\d)/)
  })
})

describe('weighted lifts leave weight-0 sessions off the weight charts', () => {
  const MIXED = [
    sess('w1', 40, [{ weight: 25, reps: 8 }], 31.7),
    sess('bw', 20, [{ weight: 0, reps: 12 }]),
    sess('w2', 5, [{ weight: 35, reps: 6 }], 42),
  ]

  it('Top set plots only the weighted sessions', async () => {
    await open({ name: 'Pull-up', sessions: MIXED })
    fireEvent.click(tab('Top set'))
    expect(values()).toEqual([25, 35])
  })

  it('the dashed top-set line on e1RM never drops to 0', async () => {
    await open({ name: 'Pull-up', sessions: MIXED })
    const d = document.querySelector('[data-series="top-set"]')?.getAttribute('d') ?? ''
    expect(d.match(/[ML]/g)).toHaveLength(2)
  })
})

describe('chart fill', () => {
  it('the e1RM, Top set and Reps charts have a fill under the line', async () => {
    const sessions = [sess('a', 30, [{ weight: 200, reps: 5 }], 233.3), sess('b', 3, [{ weight: 210, reps: 5 }], 245)]
    await open({ name: 'Back Squat', sessions })
    expect(document.querySelector('[data-chart="e1rm"] [data-fill]')).toBeTruthy()
    fireEvent.click(tab('Top set'))
    expect(document.querySelector('[data-chart="top-set"] [data-fill]')).toBeTruthy()
    cleanup()
    await open({ name: 'Dips', isBodyweight: true, sessions: [sess('a', 30, [{ weight: 0, reps: 10 }]), sess('b', 3, [{ weight: 0, reps: 12 }])] })
    expect(document.querySelector('[data-chart="reps"] [data-fill]')).toBeTruthy()
  })
})
