/**
 * Progress S2 fixes from review 113 (work item 115), the page: the "no light week" sentence
 * only claims 8 weeks when the search covered 8 (TrendNote.lightWeeksSearched). With fewer,
 * the first workout is inside the chart: "No light week since you started."
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProgressView from '@/components/features/progress/ProgressView'
import type { WeeklyReport, WeekStats } from '@/lib/insights/progress'
import type { TrendNote } from '@/lib/insights/progress-records'

vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const h = vi.hoisted(() => ({ trend: null as unknown }))
const CURRENT = '2026-10-26'

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const stats = (weekStart: string): WeekStats => ({
  weekStart,
  workouts: 3,
  workingSets: 40,
  durationSeconds: 0,
  cardioMinutes: 0,
  effort: null,
})
function report(weekStart: string): WeeklyReport {
  const weeks = Array.from({ length: 8 }, (_, i) => stats(addDays(weekStart, (i - 7) * 7)))
  return {
    weekStart,
    isCurrentWeek: weekStart === CURRENT,
    target: 3,
    programWeek: null,
    current: weeks[7],
    normal: { workouts: 3, workingSets: 40, durationSeconds: 0, cardioMinutes: 0, avgRpe: null },
    normalWeeks: 4,
    streak: 0,
    weeks,
    weightUnit: 'lbs',
    records: [],
    lifts: [],
    trend: h.trend as TrendNote | null,
  }
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, report: report(CURRENT) }) })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const last8 = () => (screen.getByRole('region', { name: 'Last 8 weeks' }).textContent ?? '').replace(/\s+/g, ' ')
async function open(trend: Partial<TrendNote>) {
  h.trend = { effortRisingWeeks: 0, effortFrom: null, effortTo: null, lastLightWeeksAgo: null, ...trend }
  render(<ProgressView />)
  await screen.findByText(/^week of /i)
}

describe('The no-light-week sentence', () => {
  it('fewer than 8 weeks searched: "No light week since you started."', async () => {
    await open({ lightWeeksSearched: 4 })
    expect(last8()).toContain('No light week since you started.')
    expect(last8()).not.toMatch(/last 8 weeks/)
  })

  it('7 weeks searched is still not 8', async () => {
    await open({ lightWeeksSearched: 7 })
    expect(last8()).toContain('No light week since you started.')
  })

  it('all 8 weeks searched: "No light week in the last 8 weeks."', async () => {
    await open({ lightWeeksSearched: 8 })
    expect(last8()).toContain('No light week in the last 8 weeks.')
    expect(last8()).not.toMatch(/since you started/)
  })

  it('a light week found reads the same whatever was searched', async () => {
    await open({ lightWeeksSearched: 4, lastLightWeeksAgo: 2 })
    expect(last8()).toContain('Your last light week was 2 weeks ago.')
    expect(last8()).not.toMatch(/since you started|No light week/)
  })
})
