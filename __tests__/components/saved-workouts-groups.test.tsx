/**
 * Workout library slice 1 (work 142): Library → Workouts shows Pinned, then
 * Recent, then a closed "Older (n)" fold. Spec:
 * features/workout-library/order-older.feature.
 *
 * Each group is a region named after it ("Pinned", "Recent", "Older"); the
 * fold header is a button with aria-expanded. Found by role and text only.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SavedWorkoutsList from '@/components/features/saved-workouts/SavedWorkoutsList'

const h = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/library',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: vi.fn(), error: h.toastError, info: vi.fn(), warning: vi.fn() }),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const NOW = new Date('2026-11-06T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

type Item = {
  id: string
  name: string
  exerciseCount: number
  lastUsedAt: string | null
  createdAt: string
  pinnedAt: string | null
}
const item = (id: string, name: string, over: Partial<Item> = {}): Item => ({
  id,
  name,
  exerciseCount: 4,
  lastUsedAt: null,
  createdAt: daysAgo(120),
  pinnedAt: null,
  ...over,
})

let items: Item[]
let calls: Array<{ url: string; method: string; body?: string }>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  calls = []
  h.toastError.mockClear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body })
      if (method === 'PATCH') {
        const id = url.split('/').pop()
        const pinned = JSON.parse(init?.body ?? '{}').pinned as boolean
        return { ok: true, status: 200, json: async () => ({ saved: { id, pinnedAt: pinned ? NOW.toISOString() : null } }) }
      }
      return { ok: true, status: 200, json: async () => ({ saved: items }) }
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const group = (name: string) => screen.queryByRole('region', { name })
// work 153: View moved into each row's panel, so rows are found by their name.
const namesIn = (region: HTMLElement) =>
  within(region)
    .getAllByRole('listitem')
    .map((li) => items.map((x) => x.name).find((n) => within(li).queryByText(n, { exact: true })))
const rowOf = (name: string, scope: HTMLElement = document.body) =>
  within(scope).getByText(name, { exact: true }).closest('li') as HTMLElement
// work 153: tap the row to open its panel (Pin/Unpin is there now).
const openRow = (row: HTMLElement) => {
  const header = within(row)
    .getAllByRole('button')
    .find((b) => b.hasAttribute('aria-expanded')) as HTMLElement
  if (header.getAttribute('aria-expanded') !== 'true') fireEvent.click(header)
  return row
}
const fold = () => screen.getByRole('button', { name: /^older \(\d+\)/i })

async function renderList() {
  render(<SavedWorkoutsList />)
  await screen.findAllByRole('listitem') // work 153
}

describe('Library → Workouts groups', () => {
  beforeEach(() => {
    items = [
      // The API's order (lastUsedAt desc nulls last), so never-started rows come last.
      item('r1', 'Leg Day', { lastUsedAt: daysAgo(2) }),
      item('p1', 'Upper A', { lastUsedAt: daysAgo(60), pinnedAt: daysAgo(10) }),
      item('r2', 'Push', { lastUsedAt: daysAgo(12) }),
      item('o1', 'Old Pull', { lastUsedAt: daysAgo(40) }),
      item('o2', 'Older Arms', { lastUsedAt: daysAgo(90) }),
      item('ai', 'AI Full Body', { createdAt: daysAgo(0) }),
    ]
  })

  it('shows Pinned, then Recent, then the Older fold, in that order', async () => {
    await renderList()
    const pinned = group('Pinned') as HTMLElement
    const recent = group('Recent') as HTMLElement
    expect(pinned.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(recent.compareDocumentPosition(fold()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a pinned workout last used 60 days ago is under Pinned, not Older', async () => {
    await renderList()
    expect(namesIn(group('Pinned') as HTMLElement)).toEqual(['Upper A'])
  })

  it('Recent is last used first, with a just-saved, never-started workout at the top', async () => {
    await renderList()
    expect(namesIn(group('Recent') as HTMLElement)).toEqual(['AI Full Body', 'Leg Day', 'Push'])
  })

  it('the Older fold is closed by default, shows its count and is a 48px button', async () => {
    await renderList()
    expect(fold().getAttribute('aria-label')).toBe('Older (2)') // work 154: the count is a chip; the name says it
    expect(fold().getAttribute('aria-expanded')).toBe('false')
    expect(fold().className).toContain('min-h-12')
    expect(screen.queryByText('Old Pull')).toBeNull() // work 153
  })

  it('opening the fold shows the older workouts, last used first', async () => {
    await renderList()
    fireEvent.click(fold())
    expect(fold().getAttribute('aria-expanded')).toBe('true')
    expect(namesIn(group('Older') as HTMLElement)).toEqual(['Old Pull', 'Older Arms'])
  })

  it('pinning a workout in Older moves it to Pinned without a reload; unpinning puts it back', async () => {
    await renderList()
    fireEvent.click(fold())
    const older = group('Older') as HTMLElement
    const oldPull = openRow(rowOf('Old Pull')) // work 153
    fireEvent.click(within(oldPull).getByRole('button', { name: /^pin\b/i }))
    await waitFor(() => expect(namesIn(group('Pinned') as HTMLElement)).toContain('Old Pull'))
    expect(namesIn(older)).toEqual(['Older Arms'])
    expect(fold().getAttribute('aria-label')).toBe('Older (1)') // work 154: the count is a chip; the name says it

    const pinnedRow = openRow(rowOf('Old Pull', group('Pinned') as HTMLElement)) // work 153
    fireEvent.click(within(pinnedRow).getByRole('button', { name: /^unpin\b/i }))
    await waitFor(() => expect(namesIn(group('Older') as HTMLElement)).toEqual(['Old Pull', 'Older Arms']))
    expect(namesIn(group('Pinned') as HTMLElement)).toEqual(['Upper A'])

    const listGets = calls.filter((c) => c.method === 'GET')
    expect(listGets).toHaveLength(1)
    expect(calls.filter((c) => c.method !== 'GET' && c.method !== 'PATCH')).toEqual([])
  })
})

describe('empty groups are not shown', () => {
  it('only Recent: no Pinned heading and no Older fold', async () => {
    items = [item('r1', 'Leg Day', { lastUsedAt: daysAgo(2) })]
    await renderList()
    expect(group('Recent')).toBeTruthy()
    expect(group('Pinned')).toBeNull()
    expect(screen.queryByRole('button', { name: /^older/i })).toBeNull()
  })

  it('only Older: just the fold, with its count', async () => {
    items = [item('o1', 'Old Pull', { lastUsedAt: daysAgo(40) }), item('o2', 'Older Arms', { lastUsedAt: daysAgo(90) })]
    render(<SavedWorkoutsList />)
    expect(await screen.findByRole('button', { name: /^older \(2\)/i })).toBeTruthy()
    expect(group('Pinned')).toBeNull()
    expect(group('Recent')).toBeNull()
  })
})
