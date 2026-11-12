/**
 * Progress in RIR: harder still reads as up (work item 162). Spec:
 * features/analytics/effort-scale.feature, "Harder still reads as up", "Session rating follows
 * the setting", and the formatters behind "Effort numbers use the chosen scale".
 *
 * The report is stubbed (efforts in RPE, as the API sends them, plus `effortScale`); the
 * end-to-end path is in progress-effort-scale-view.test.tsx.
 */

import { cleanup, render, screen } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  effortLabel,
  formatEffort,
  hardSetsText,
  labelledEffort,
  noteEffort,
} from '@/components/features/progress/format'
import { effortScaleOf, inScale } from '@/lib/insights/effort-scale'

const h = vi.hoisted(() => ({ report: null as unknown }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/progress',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const WEEK = '2026-10-26'
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const week = (i: number, avgRpe: number) => ({
  weekStart: addDays(WEEK, (i - 7) * 7),
  workouts: 3,
  workingSets: 60,
  durationSeconds: 10800,
  cardioMinutes: 0,
  effort: { avgRpe, pctAtOrAbove9: 25, setsAt10: 1, ratedSets: 40 },
})

/** Effort rising RPE 7 → 9 over the last three weeks; normal RPE 7.5. */
function report(effortScale: 'rpe' | 'rir') {
  const weeks = [7, 7, 7, 7, 7.5, 7, 8, 9].map((rpe, i) => week(i, rpe))
  return {
    weekStart: WEEK,
    isCurrentWeek: false,
    target: 3,
    programWeek: null,
    current: weeks[7],
    normal: { workouts: 3, workingSets: 60, durationSeconds: 10800, cardioMinutes: 0, avgRpe: 7.5 },
    normalWeeks: 8,
    streak: 8,
    weeks,
    weightUnit: 'lbs',
    effortScale,
    records: [],
    lifts: [],
    trend: { effortRisingWeeks: 3, effortFrom: 7, effortTo: 9, lastLightWeeksAgo: null, lightWeeksSearched: 8 },
    pinned: [],
  }
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, report: h.report }) })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const flat = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

async function open(effortScale: 'rpe' | 'rir') {
  h.report = report(effortScale)
  const View = ((await import('@/components/features/progress/ProgressView')) as { default: ComponentType }).default
  render(createElement(View))
  await screen.findByRole('heading', { name: /^Week of/ })
}

const effortRow = () => document.querySelector('[data-row="effort"]')
const value = (weekIndex: number) => document.querySelector(`[data-week="${addDays(WEEK, (weekIndex - 7) * 7)}"]`)?.lastElementChild

describe('Harder still reads as up', () => {
  it('the rising-effort note says "risen", written in RIR (RIR 3.0 → RIR 1.0)', async () => {
    await open('rir')
    expect(flat(document.body)).toContain('Effort has risen 3 weeks running (RIR 3.0 → RIR 1.0).')
  })

  it('in RPE the note reads as before (7.0 → 9.0)', async () => {
    await open('rpe')
    expect(flat(document.body)).toContain('Effort has risen 3 weeks running (7.0 → 9.0).')
  })

  it('the change from normal is "+1.5" for a harder week in both scales', async () => {
    await open('rir')
    expect(flat(effortRow())).toContain('RIR 1.0')
    expect(flat(effortRow())).toContain('+1.5')
    expect(flat(effortRow())).toContain('normal RIR 2.5')
    cleanup()
    await open('rpe')
    expect(flat(effortRow())).toContain('+1.5')
  })

  it('the hard-week highlight (RPE 9+) is RIR 1 or less', async () => {
    await open('rir')
    expect(flat(value(7))).toBe('1.0')
    expect(value(7)?.className).toContain('text-error-text')
    expect(flat(value(6))).toBe('2.0')
    expect(value(6)?.className).not.toContain('text-error-text')
  })

  it('the tile counts hard sets as RIR 1 or less and RIR 0', async () => {
    await open('rir')
    expect(flat(effortRow())).toContain('25% of sets at RIR 1 or less · 1 set at RIR 0')
  })
})

describe('the scale formatters', () => {
  it('a missing or unknown setting is RIR, the schema default', () => {
    expect(effortScaleOf('rpe')).toBe('rpe')
    expect(effortScaleOf('rir')).toBe('rir')
    expect(effortScaleOf(null)).toBe('rir')
    expect(effortScaleOf(undefined)).toBe('rir')
  })

  it('RIR = 10 − RPE; RPE is unchanged', () => {
    expect(inScale(8, 'rir')).toBe(2)
    expect(inScale(8, 'rpe')).toBe(8)
    expect(formatEffort(8.7, 'rir')).toBe('1.3')
    expect(formatEffort(null, 'rir')).toBe('–')
    expect(effortLabel('rir')).toBe('RIR')
    expect(labelledEffort(8, 'rpe')).toBe('RPE 8.0')
    expect(labelledEffort(8, 'rir')).toBe('RIR 2.0')
    expect(noteEffort(8, 'rpe')).toBe('8.0')
    expect(noteEffort(8, 'rir')).toBe('RIR 2.0')
    expect(hardSetsText(30, '2 sets', 'rpe')).toBe('30% of sets at 9+ · 2 sets at 10')
  })

  it('Session rating follows the setting: a session rated RPE 7 reads RIR 3', () => {
    expect(labelledEffort(7, 'rir')).toBe('RIR 3.0')
  })
})
