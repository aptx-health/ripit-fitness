/**
 * Progress writes the shown week to the URL (work item 128). Spec: features/analytics/lift-page.feature,
 * "Browser back keeps the week". After each week loads, the address reads /progress?week=<Monday>
 * for a past week and bare /progress for this week, replaced (no new history entry), so the phone or
 * browser Back from a lift page lands on the same week. Only the first request uses ?week=.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ search: '', starts: [] as Array<string | null>, current: '2026-10-26' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress',
  useSearchParams: () => new URLSearchParams(h.search),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const stats = (weekStart: string) => ({ weekStart, workouts: 3, workingSets: 40, durationSeconds: 0, cardioMinutes: 0, effort: null })
const report = (weekStart: string) => ({
  weekStart,
  isCurrentWeek: weekStart === h.current,
  target: 3,
  programWeek: null,
  current: stats(weekStart),
  normal: { workouts: 3, workingSets: 40, durationSeconds: 0, cardioMinutes: 0, avgRpe: null },
  normalWeeks: 8,
  streak: 1,
  weeks: Array.from({ length: 8 }, (_, i) => stats(addDays(weekStart, (i - 7) * 7))),
  weightUnit: 'lbs',
  records: [],
  lifts: [],
  trend: null,
  pinned: [],
})

beforeEach(() => {
  h.search = ''
  h.starts = []
  window.history.replaceState(null, '', '/progress')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const start = new URL(input, 'http://localhost').searchParams.get('start')
      h.starts.push(start)
      return { ok: true, status: 200, json: async () => ({ success: true, report: report(start ?? h.current) }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function open(search = '') {
  h.search = search
  window.history.replaceState(null, '', search ? `/progress?${search}` : '/progress')
  const View = ((await import('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
  render(createElement(View))
  await screen.findByText(/^week of /i)
}
const address = () => `${window.location.pathname}${window.location.search}`

describe('the shown week is in the URL', () => {
  it('this week leaves the address bare', async () => {
    await open()
    expect(address()).toBe('/progress')
  })

  it('stepping back writes ?week=, and stepping forward to this week clears it', async () => {
    await open()
    const length = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(address()).toBe('/progress?week=2026-10-19'))
    expect(window.history.length).toBe(length) // replaced, not pushed
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await waitFor(() => expect(address()).toBe('/progress'))
  })

  it('opening on ?week= keeps it, and writing the URL does not reload the week', async () => {
    await open('week=2026-10-12')
    expect(address()).toBe('/progress?week=2026-10-12')
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() => expect(address()).toBe('/progress?week=2026-10-05'))
    expect(h.starts).toEqual(['2026-10-12', '2026-10-05'])
  })

  it('a bad ?week= is replaced by the bare address once the current week shows', async () => {
    await open('week=2026-10-13')
    await waitFor(() => expect(address()).toBe('/progress'))
  })
})
