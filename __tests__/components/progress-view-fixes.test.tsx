/**
 * Progress S1 fixes from review 109 (work item 110), the page: with no week
 * since the first workout to compare with (`normalWeeks` 0), every normal
 * reads "–" with no % change; the current week's chart label reads "This wk".
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProgressView from '@/components/features/progress/ProgressView'
import type { WeeklyReport, WeekStats } from '@/lib/insights/progress'

vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const h = vi.hoisted(() => ({ reports: {} as Record<string, unknown> }))
const CURRENT = '2026-10-26'

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const stats = (weekStart: string, o: Partial<WeekStats> = {}): WeekStats => ({
  weekStart,
  workouts: 0,
  workingSets: 0,
  durationSeconds: 0,
  cardioMinutes: 0,
  effort: null,
  ...o,
})
function report(weekStart: string, o: Partial<WeeklyReport> = {}): WeeklyReport {
  const current = stats(weekStart, {
    workouts: 2,
    workingSets: 30,
    durationSeconds: 5400,
    cardioMinutes: 0,
    effort: { avgRpe: 8, pctAtOrAbove9: 10, setsAt10: 0, ratedSets: 30 },
  })
  return {
    weekStart,
    isCurrentWeek: weekStart === CURRENT,
    target: 3,
    programWeek: null,
    current,
    normal: { workouts: 3, workingSets: 40, durationSeconds: 6000, cardioMinutes: 0, avgRpe: 7.5 },
    normalWeeks: 4,
    streak: 0,
    weeks: [...Array.from({ length: 7 }, (_, i) => stats(addDays(weekStart, (i - 7) * 7))), current],
    ...o,
  }
}

beforeEach(() => {
  h.reports = {}
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const start = new URL(input, 'http://localhost').searchParams.get('start') ?? CURRENT
      return { ok: true, status: 200, json: async () => ({ success: true, report: h.reports[start] ?? report(start) }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const flat = (name: string) => (document.querySelector(`[data-row="${name}"]`)?.textContent ?? '').replace(/\s+/g, ' ')
const open = async () => {
  render(<ProgressView />)
  await screen.findByText(/^week of /i)
}

describe('Normal only counts weeks since the first workout', () => {
  it('with no week to compare with, every normal reads "–" with no % change', async () => {
    h.reports[CURRENT] = report(CURRENT, {
      normalWeeks: 0,
      normal: { workouts: 0, workingSets: 0, durationSeconds: 0, cardioMinutes: 0, avgRpe: null },
    })
    await open()
    for (const row of ['workouts', 'sets', 'time', 'effort']) {
      expect(flat(row)).toContain('–')
      expect(flat(row)).not.toMatch(/normal|[+−]\d/)
    }
    // The effort row's own "% of sets at 9+" stays; no row shows a % change.
    expect(flat('sets')).not.toContain('%')
    expect(flat('sets')).toContain('30')
    expect(flat('effort')).toContain('RPE 8.0')
  })

  it('with weeks to compare with, the normal and the change show', async () => {
    await open()
    expect(flat('workouts')).toContain('normal 3.0')
    expect(flat('sets')).toContain('−25%')
    expect(flat('sets')).toContain('normal 40')
    expect(flat('effort')).toContain('+0.5')
  })
})

describe('Chart label', () => {
  const lastLabel = () => document.querySelectorAll('[data-week]')[7]?.textContent ?? ''

  it('the current week\'s last label reads "This wk"', async () => {
    await open()
    expect(lastLabel()).toContain('This wk')
    expect(lastLabel()).not.toContain('Oct 26')
  })

  it('an earlier week keeps its date', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await screen.findByText('Week of Oct 19')
    expect(lastLabel()).toContain('Oct 19')
    expect(lastLabel()).not.toContain('This wk')
  })
})
