/**
 * TL4 Pinned workouts: the views, rendered. Companion to
 * __tests__/features/training-library/pinned-workouts.steps.ts (which also
 * lists the schema and API seams).
 *
 * Seams:
 *   components/training/TrainingHome.tsx   home.pinned:
 *     [{ id, name, exerciseCount, pinnedAt: Date }] (at most 5, newest first,
 *     as the loader gives them). When non-empty, a section headed "Pinned
 *     Workouts" sits between Up Next and Recent Workouts. A row: the name,
 *     "N exercises" ("1 exercise"), a "Start" button. A "See all" link to
 *     /library?type=workouts is always in the section. Start POSTs
 *     /api/workouts/saved/<id>/start; on { completionId } it goes to
 *     /training/adhoc/<completionId>; on 409 it shows the response's message
 *     and stays; any other failure shows a role=alert message and stays; only
 *     one request at a time. The empty home is shown only when there is no
 *     Up Next, no pinned, no recent and no current program.
 *   components/features/saved-workouts/SavedWorkoutsList.tsx (rows) and
 *   SavedWorkoutDetailDialog.tsx: list items gain pinnedAt (ISO | null). Each
 *     row has a button named "Pin" or "Unpin" (the name may continue, e.g.
 *     "Pin Upper Body") with aria-pressed (false / true), and a pinned row shows
 *     the text "Pinned". The detail dialog has the same button. Tapping it sends
 *     PATCH /api/workouts/saved/<id> with body { pinned: boolean }, updates the
 *     row in place from the response's pinnedAt (no refetch of the list, no
 *     router.refresh), and on failure reverts and calls toast.error.
 *
 * Markup is not tested; everything is found by role and visible text.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const h = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: h.toastSuccess, error: h.toastError, info: vi.fn(), warning: vi.fn() }),
  ToastProvider: ({ children }: { children: unknown }) => children,
}))

type Pinned = { id: string; name: string; exerciseCount: number; pinnedAt: Date }
type Home = {
  suggestions: { count: number; items: unknown[] }
  upNext: unknown
  pinned: Pinned[]
  recent: unknown[]
  currentProgram: unknown
}

const PINS: Pinned[] = [
  { id: 's1', name: 'Quick Machines', exerciseCount: 3, pinnedAt: new Date('2026-10-30T12:00:00Z') },
  { id: 's2', name: 'Mobility', exerciseCount: 1, pinnedAt: new Date('2026-10-29T12:00:00Z') },
  { id: 's3', name: 'Upper Body', exerciseCount: 5, pinnedAt: new Date('2026-10-28T12:00:00Z') },
]
const UP_NEXT = {
  programId: 'p1',
  programName: 'Machine Starter',
  workoutId: 'w2',
  workoutName: 'Full Body A',
  weekNumber: 2,
  dayNumber: 1,
  exerciseCount: 5,
  hasDraft: false,
  href: '/library/programs/p1?week=2&resume=w2',
}
const RECENT = [
  { id: 'c1', name: 'Leg Day', completedAt: new Date('2026-10-28T12:00:00Z'), durationSeconds: 2700, canRepeat: true },
]
const CURRENT = { programId: 'p1', programName: 'Machine Starter', weekNumber: 2, totalWeeks: 5, workoutsDone: 3, workoutsTotal: 10 }
const home = (over: Partial<Home> = {}): Home => ({ upNext: null, pinned: PINS, suggestions: { count: 0, items: [] }, recent: [], currentProgram: null, ...over })

type Reply = () => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>
let calls: Array<{ url: string; method: string; body?: string }>
let reply: Reply

async function renderHome(data: Home) {
  const mod = (await load('@/components/training/TrainingHome')) as { default: ComponentType<{ home: Home }> }
  return render(createElement(mod.default, { home: data }))
}
const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement
const startOf = (name: string) => within(rowOf(name)).getByRole('button', { name: /start/i })
const ok = (body: unknown) => async () => ({ ok: true, status: 200, json: async () => body })
const fail = (status: number, body: unknown) => async () => ({ ok: false, status, json: async () => body })

beforeEach(() => {
  h.push.mockClear()
  h.refresh.mockClear()
  h.toastError.mockClear()
  h.toastSuccess.mockClear()
  calls = []
  reply = ok({ completionId: 'c-new' })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body })
      return reply()
    })
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
describe('training home view: Pinned Workouts', () => {
  it('sits between Up Next and Recent Workouts, before Current Program', async () => {
    await renderHome(home({ upNext: UP_NEXT, recent: RECENT, currentProgram: CURRENT }))
    const order = ['up next', 'pinned workouts', 'recent workouts', 'current program'].map((t) => screen.getByText(new RegExp(`^${t}$`, 'i')))
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i].compareDocumentPosition(order[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('is hidden when nothing is pinned, with no See all', async () => {
    await renderHome(home({ pinned: [], upNext: UP_NEXT }))
    expect(screen.queryByText(/pinned workouts/i)).toBeNull()
    expect(screen.queryByRole('link', { name: /see all/i })).toBeNull()
  })

  it('shows each pin in the order given, with its exercise count and a Start button', async () => {
    await renderHome(home())
    const names = ['Quick Machines', 'Mobility', 'Upper Body'].map((n) => screen.getByText(n))
    expect(names[0].compareDocumentPosition(names[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(names[1].compareDocumentPosition(names[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(rowOf('Quick Machines')).getByText('3 exercises')).toBeTruthy()
    expect(within(rowOf('Upper Body')).getByText('5 exercises')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /start/i })).toHaveLength(3)
  })

  it('says "1 exercise" in the singular', async () => {
    await renderHome(home())
    expect(within(rowOf('Mobility')).getByText('1 exercise')).toBeTruthy()
  })

  it('always has See all, to My Workouts, even for a single pin', async () => {
    await renderHome(home({ pinned: [PINS[0]] }))
    const url = new URL(screen.getByRole('link', { name: /see all/i }).getAttribute('href') as string, 'http://x')
    expect([url.pathname, url.searchParams.get('type')]).toEqual(['/library', 'workouts'])
  })

  it('a pinned workout alone is enough: no empty-home start screen', async () => {
    await renderHome(home())
    expect(screen.queryByText(/find a program/i)).toBeNull()
    expect(screen.queryByText(/nothing planned yet/i)).toBeNull()
  })

  it('with nothing at all the empty home still shows', async () => {
    await renderHome(home({ pinned: [] }))
    expect(screen.getByText(/find a program/i)).toBeTruthy()
  })

  it('Start begins that workout and opens the logger', async () => {
    await renderHome(home())
    fireEvent.click(startOf('Quick Machines'))
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/training/adhoc/c-new'))
    expect(calls).toEqual([{ url: '/api/workouts/saved/s1/start', method: 'POST', body: undefined }])
  })

  it('on 409 DRAFT_EXISTS it shows the server message and stays', async () => {
    reply = fail(409, { error: 'DRAFT_EXISTS', message: 'Finish your current workout before starting a new one.', draft: { completionId: 'd1' } })
    await renderHome(home())
    fireEvent.click(startOf('Quick Machines'))
    expect(await screen.findByText(/finish your current workout before starting a new one/i)).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
    await waitFor(() => expect((startOf('Quick Machines') as HTMLButtonElement).disabled).toBe(false))
  })

  it('shows the same 409 message the Repeat button shows', async () => {
    reply = fail(409, { error: 'DRAFT_EXISTS', message: 'Finish your current workout before starting a new one.' })
    await renderHome(home({ recent: RECENT }))
    fireEvent.click(startOf('Quick Machines'))
    const fromStart = (await screen.findByText(/finish your current workout/i)).textContent
    cleanup()
    await renderHome(home({ recent: RECENT }))
    fireEvent.click(screen.getByRole('button', { name: /repeat leg day/i }))
    expect((await screen.findByText(/finish your current workout/i)).textContent).toBe(fromStart)
  })

  it('any other failure shows an alert and stays', async () => {
    reply = fail(500, { error: 'Internal server error' })
    await renderHome(home())
    fireEvent.click(startOf('Mobility'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
  })

  it('a dropped connection shows an alert and stays', async () => {
    reply = async () => {
      throw new Error('network down')
    }
    await renderHome(home())
    fireEvent.click(startOf('Mobility'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
  })

  it('only one request runs at a time, across rows', async () => {
    let release: () => void = () => {}
    reply = () =>
      new Promise((resolve) => {
        release = () => resolve({ ok: true, status: 200, json: async () => ({ completionId: 'c-new' }) })
      })
    await renderHome(home())
    fireEvent.click(startOf('Quick Machines'))
    fireEvent.click(startOf('Quick Machines'))
    fireEvent.click(startOf('Mobility'))
    await waitFor(() => expect(calls).toHaveLength(1))
    release()
    await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1))
    expect(calls).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
type Item = { id: string; name: string; notes: null; exerciseCount: number; lastUsedAt: string | null; createdAt: string; pinnedAt: string | null }
const item = (id: string, name: string, pinnedAt: string | null = null): Item => ({
  id,
  name,
  notes: null,
  exerciseCount: 3,
  lastUsedAt: null,
  createdAt: '2026-10-01T12:00:00Z',
  pinnedAt,
})
const PIN_AT = '2026-10-30T12:00:00.000Z'
let items: Item[]
let patchReply: Reply

async function renderList() {
  const mod = (await load('@/components/features/saved-workouts/SavedWorkoutsList')) as { default: ComponentType }
  const result = render(createElement(mod.default))
  await screen.findByRole('button', { name: 'View Upper Body' })
  return result
}
const row = (name: string) => screen.getByRole('button', { name: `View ${name}` }).closest('li') as HTMLElement
const toggle = (name: string) => within(row(name)).getByRole('button', { name: /^(un)?pin\b/i })
const patches = () => calls.filter((c) => c.method === 'PATCH')
const listGets = () => calls.filter((c) => c.method === 'GET' && c.url.startsWith('/api/workouts/saved') && !/saved\/[^/?]+/.test(c.url))

describe('saved workouts list: pin toggle', () => {
  beforeEach(() => {
    items = [item('a', 'Upper Body'), item('b', 'Mobility', PIN_AT), item('c', 'Quick Machines')]
    patchReply = async () => ({ ok: true, status: 200, json: async () => ({ saved: { id: 'a', pinnedAt: PIN_AT } }) })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        calls.push({ url, method, body: init?.body })
        if (method === 'PATCH') return patchReply()
        const one = /^\/api\/workouts\/saved\/([^/?]+)$/.exec(url)
        if (one) {
          const found = items.find((x) => x.id === one[1])
          return { ok: true, status: 200, json: async () => ({ saved: { ...found, workoutData: [] } }) }
        }
        return { ok: true, status: 200, json: async () => ({ saved: items }) }
      })
    )
  })

  it('shows Pin (not pressed) for an unpinned row and Unpin (pressed) plus "Pinned" for a pinned one', async () => {
    await renderList()
    expect(toggle('Upper Body').getAttribute('aria-pressed')).toBe('false')
    expect(toggle('Upper Body').getAttribute('aria-label') ?? toggle('Upper Body').textContent).toMatch(/^pin\b/i)
    expect(within(row('Upper Body')).queryByText(/^pinned$/i)).toBeNull()
    expect(toggle('Mobility').getAttribute('aria-pressed')).toBe('true')
    expect(toggle('Mobility').getAttribute('aria-label') ?? toggle('Mobility').textContent).toMatch(/^unpin\b/i)
    expect(within(row('Mobility')).getByText(/^pinned$/i)).toBeTruthy()
  })

  it('pinning sends PATCH { pinned: true } and updates the row in place', async () => {
    await renderList()
    fireEvent.click(toggle('Upper Body'))
    await waitFor(() => expect(toggle('Upper Body').getAttribute('aria-pressed')).toBe('true'))
    expect(patches()).toEqual([{ url: '/api/workouts/saved/a', method: 'PATCH', body: JSON.stringify({ pinned: true }) }])
    expect(within(row('Upper Body')).getByText(/^pinned$/i)).toBeTruthy()
    expect(toggle('Upper Body').getAttribute('aria-label') ?? toggle('Upper Body').textContent).toMatch(/^unpin\b/i)
  })

  it('unpinning sends PATCH { pinned: false } and updates the row in place', async () => {
    patchReply = async () => ({ ok: true, status: 200, json: async () => ({ saved: { id: 'b', pinnedAt: null } }) })
    await renderList()
    fireEvent.click(toggle('Mobility'))
    await waitFor(() => expect(toggle('Mobility').getAttribute('aria-pressed')).toBe('false'))
    expect(patches()).toEqual([{ url: '/api/workouts/saved/b', method: 'PATCH', body: JSON.stringify({ pinned: false }) }])
    expect(within(row('Mobility')).queryByText(/^pinned$/i)).toBeNull()
  })

  it('does not reload the list, and leaves the other rows alone', async () => {
    await renderList()
    fireEvent.click(toggle('Upper Body'))
    await waitFor(() => expect(toggle('Upper Body').getAttribute('aria-pressed')).toBe('true'))
    expect(listGets()).toHaveLength(1)
    expect(h.refresh).not.toHaveBeenCalled()
    expect(toggle('Mobility').getAttribute('aria-pressed')).toBe('true')
    expect(toggle('Quick Machines').getAttribute('aria-pressed')).toBe('false')
  })

  it('tapping the toggle does not open the detail dialog', async () => {
    await renderList()
    fireEvent.click(toggle('Upper Body'))
    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('on failure it reverts and shows the list\'s usual error', async () => {
    patchReply = async () => ({ ok: false, status: 500, json: async () => ({ error: 'Internal server error' }) })
    await renderList()
    fireEvent.click(toggle('Upper Body'))
    await waitFor(() => expect(h.toastError).toHaveBeenCalled())
    expect(toggle('Upper Body').getAttribute('aria-pressed')).toBe('false')
    expect(within(row('Upper Body')).queryByText(/^pinned$/i)).toBeNull()
  })

  it('on a dropped connection it also reverts and shows the error', async () => {
    patchReply = async () => {
      throw new Error('network down')
    }
    await renderList()
    fireEvent.click(toggle('Mobility'))
    await waitFor(() => expect(h.toastError).toHaveBeenCalled())
    expect(toggle('Mobility').getAttribute('aria-pressed')).toBe('true')
  })

  it('the detail dialog has the same toggle, in the state of the row', async () => {
    await renderList()
    fireEvent.click(screen.getByRole('button', { name: 'View Mobility' }))
    const dialog = await screen.findByRole('dialog')
    const inDialog = within(dialog).getByRole('button', { name: /^(un)?pin\b/i })
    expect(inDialog.getAttribute('aria-pressed')).toBe('true')
  })

  it('pinning from the detail dialog is reflected on the row', async () => {
    await renderList()
    fireEvent.click(screen.getByRole('button', { name: 'View Upper Body' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^pin\b/i }))
    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0]).toEqual({ url: '/api/workouts/saved/a', method: 'PATCH', body: JSON.stringify({ pinned: true }) })
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /^unpin\b/i }).getAttribute('aria-pressed')).toBe('true'))
    fireEvent.click(within(dialog).getByRole('button', { name: /^close$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toggle('Upper Body').getAttribute('aria-pressed')).toBe('true')
    expect(within(row('Upper Body')).getByText(/^pinned$/i)).toBeTruthy()
  })
})
