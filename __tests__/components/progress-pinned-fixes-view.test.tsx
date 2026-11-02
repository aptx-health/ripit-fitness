/**
 * Pinned lifts fixes from review 118 (work item 119), the page: the pin-limit message sits under
 * the row that was tapped, not at the bottom of the list; the editor's Cancel and Save are 48px
 * targets, its header is in the folder's coach (accent) tone, and its search field has one focus
 * ring and no native clear button. Classes stand in for the look; the screenshots in
 * initiatives/analytics/docs/assets/119/ show it.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProgressView from '@/components/features/progress/ProgressView'

vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const h = vi.hoisted(() => ({ puts: 0, pins: [] as Array<{ id: string; name: string }>, lifts: [] as unknown[] }))

const lift = (id: string, name: string) => ({
  exerciseDefinitionId: id,
  name,
  workingSets: 3,
  bestSet: { weight: 100, reps: 5 },
  e1rm: 116.7,
  previousE1rm: null,
  bestE1rm: 116.7,
  sessionsBelowBest: 0,
})
const stats = (weekStart: string) => ({ weekStart, workouts: 3, workingSets: 40, durationSeconds: 0, cardioMinutes: 0, effort: null })

beforeEach(() => {
  h.puts = 0
  h.pins = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `Pinned ${i}` }))
  h.lifts = [lift('leg', 'Leg Press'), lift('row', 'Row')]
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      if (String(input).startsWith('/api/progress/pins')) {
        h.puts++
        return { ok: true, status: 200, json: async () => ({ success: true }) }
      }
      const weeks = Array.from({ length: 8 }, () => stats('2026-10-26'))
      const report = {
        weekStart: '2026-10-26',
        isCurrentWeek: true,
        target: 3,
        programWeek: null,
        current: weeks[7],
        normal: { workouts: 3, workingSets: 40, durationSeconds: 0, cardioMinutes: 0, avgRpe: null },
        normalWeeks: 8,
        streak: 0,
        weeks,
        weightUnit: 'lbs',
        records: [],
        lifts: h.lifts,
        trend: null,
        pinned: h.pins.map((p) => ({ exerciseDefinitionId: p.id, name: p.name, lift: null, last: null })),
      }
      return { ok: true, status: 200, json: async () => ({ success: true, report }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function openLifts() {
  render(<ProgressView />)
  await screen.findByText(/^week of /i)
  fireEvent.click(screen.getByRole('tab', { name: /^Lifts/ }))
}

describe('Pin limit message next to the tapped row', () => {
  it('shows directly under the row whose pin was tapped', async () => {
    await openLifts()
    fireEvent.click(screen.getByRole('button', { name: 'Also this week (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin Row' }))
    const message = await screen.findByText('You can track up to 12 lifts')
    expect(message.previousElementSibling?.getAttribute('data-lift')).toBe('row')
    expect(h.puts).toBe(0)
  })

  it('moves to the other row when that one is tapped, and there is only one', async () => {
    await openLifts()
    fireEvent.click(screen.getByRole('button', { name: 'Also this week (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin Row' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin Leg Press' }))
    const messages = await screen.findAllByText('You can track up to 12 lifts')
    expect(messages).toHaveLength(1)
    expect(messages[0].previousElementSibling?.getAttribute('data-lift')).toBe('leg')
  })

  it('is not at the bottom of the list, by the editor button', async () => {
    await openLifts()
    fireEvent.click(screen.getByRole('button', { name: 'Also this week (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin Leg Press' }))
    await screen.findByText('You can track up to 12 lifts')
    const edit = screen.getByRole('button', { name: 'Edit tracked lifts' })
    expect(edit.previousElementSibling?.textContent).not.toContain('You can track up to 12 lifts')
  })
})

describe('the editor', () => {
  async function openEditor() {
    h.pins = h.pins.slice(0, 2)
    await openLifts()
    fireEvent.click(screen.getByRole('button', { name: 'Edit tracked lifts' }))
    return screen.findByRole('dialog', { name: 'Edit tracked lifts' })
  }

  it('Cancel and Save are 48px targets', async () => {
    const dialog = await openEditor()
    for (const name of ['Cancel', 'Save']) {
      expect(within(dialog).getByRole('button', { name }).className, name).toMatch(/(^|\s)(min-h-12|h-12)(\s|$)/)
    }
  })

  it('the header is in the coach (accent) tone, not primary', async () => {
    const dialog = await openEditor()
    const header = within(dialog).getByText('Edit tracked lifts').parentElement as HTMLElement
    expect(header.className).toMatch(/(^|\s)bg-accent(\s|$)/)
    expect(header.className).not.toMatch(/(^|\s)bg-primary(\s|$)/)
  })

  it('the search field has one focus ring (the box) and hides the native clear button', async () => {
    const dialog = await openEditor()
    const input = within(dialog).getByRole('searchbox')
    expect(input.className).toMatch(/focus-visible:!outline-none/)
    expect(input.className).toMatch(/focus-visible:!shadow-none/)
    expect(input.className).toMatch(/\[&::-webkit-search-cancel-button\]:hidden/)
    expect((input.closest('label') as HTMLElement).className).toMatch(/focus-within:border-accent/)
  })
})
