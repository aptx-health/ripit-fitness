/**
 * Work 153: saved workout rows expand like program rows; quick Send
 * (features/workout-library/row-panel.feature).
 *
 *   SavedWorkoutsList({ trainees? }): every row is one button (aria-expanded)
 *     with the name, "Pinned" when pinned, a summary and a chevron. Tapping it
 *     opens a panel under it; one row is open at a time. The panel has View,
 *     Start, Pin/Unpin (aria-pressed), Rename, Archive, Delete, Dismiss in New,
 *     and with trainees "Send to <name>". No pin star or ⋯ menu on the row.
 *   MyProgramsList({ trainees? }): the program panel gains Send.
 *   Trainees come from the Library page; neither list asks for them.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const h = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/library',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: h.toastSuccess, error: h.toastError, info: vi.fn(), warning: vi.fn() }),
  ToastProvider: ({ children }: { children: unknown }) => children,
}))

const DAY = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()

type Item = {
  id: string
  name: string
  notes: null
  exerciseCount: number
  lastUsedAt: string | null
  createdAt: string
  pinnedAt: string | null
  origin: string
  archivedAt: string | null
  dismissedAt: string | null
  source?: string | null
}
const item = (id: string, name: string, over: Partial<Item> = {}): Item => ({
  id,
  name,
  notes: null,
  exerciseCount: 3,
  lastUsedAt: null,
  createdAt: ago(2),
  pinnedAt: null,
  origin: 'session',
  archivedAt: null,
  dismissedAt: null,
  ...over,
})
const ITEMS = (): Item[] => [
  item('p', 'Mobility', { pinnedAt: ago(1) }),
  item('n', 'Machine Upper', { origin: 'agent', source: 'Claude' }),
  item('r', 'Upper Body'),
  item('o', 'Old Legs', { createdAt: ago(90) }),
]
const SAM = [{ linkId: 'link-sam', name: 'Sam' }]

let items: Item[]
let calls: Array<{ url: string; method: string; body?: string }>

beforeEach(() => {
  h.push.mockClear()
  h.refresh.mockClear()
  h.toastError.mockClear()
  h.toastSuccess.mockClear()
  items = ITEMS()
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body })
      const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
      if (url.endsWith('/start')) return json({ completionId: 'c-new' })
      const one = /^\/api\/workouts\/saved\/([^/?]+)$/.exec(url)
      if (one && method === 'PATCH') {
        const body = JSON.parse(init?.body ?? '{}') as { pinned?: boolean; archived?: boolean; dismissed?: boolean }
        const found = items.find((x) => x.id === one[1]) as Item
        if (body.pinned !== undefined) return json({ saved: { id: found.id, pinnedAt: body.pinned ? ago(0) : null } })
        const now = ago(0)
        return json({
          saved: { archivedAt: now, pinnedAt: null, dismissedAt: body.dismissed ? now : null },
          previous: { pinnedAt: found.pinnedAt, dismissedAt: found.dismissedAt },
        })
      }
      if (one) return json({ saved: { ...items.find((x) => x.id === one[1]), workoutData: [] }, trainees: [] })
      if (url === '/api/workouts/saved') return json({ saved: items })
      return json({ error: 'unexpected' }, 500)
    })
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function renderWorkouts(trainees?: typeof SAM) {
  const mod = (await load('@/components/features/saved-workouts/SavedWorkoutsList')) as {
    default: ComponentType<{ trainees?: typeof SAM }>
  }
  render(createElement(mod.default, { trainees }))
  await screen.findByText('Upper Body')
  // The Older fold, so every group's rows are on screen.
  fireEvent.click(screen.getByRole('button', { name: /^older/i }))
  await screen.findByText('Old Legs')
}

const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement
/** The row's own button: the one with aria-expanded. */
const headerOf = (name: string) =>
  within(rowOf(name))
    .getAllByRole('button')
    .find((b) => b.hasAttribute('aria-expanded')) as HTMLElement
const open = (name: string) => fireEvent.click(headerOf(name))
const panelButtons = (name: string) =>
  within(rowOf(name))
    .getAllByRole('button')
    .filter((b) => b !== headerOf(name))
const panelLabels = (name: string) => panelButtons(name).map((b) => (b.textContent ?? '').trim())
const NAMES = ['Mobility', 'Machine Upper', 'Upper Body', 'Old Legs']

describe('row panel: collapsed rows', () => {
  it('every row shows its name, a Pinned label when pinned, its summary and a right chevron', async () => {
    await renderWorkouts()
    for (const name of NAMES) {
      const header = headerOf(name)
      expect(header.getAttribute('aria-expanded')).toBe('false')
      expect(header.textContent).toContain(name)
      expect(header.textContent).toMatch(/3 exercises/)
      expect(header.querySelector('svg.lucide-chevron-right')).not.toBeNull()
      expect(panelButtons(name)).toEqual([])
    }
    expect(within(headerOf('Mobility')).getByText(/^pinned$/i)).toBeTruthy()
    expect(within(headerOf('Upper Body')).queryByText(/^pinned$/i)).toBeNull()
    expect(headerOf('Machine Upper').textContent).toMatch(/From Claude/)
  })

  it('no row shows a pin star or a ⋯ menu', async () => {
    await renderWorkouts()
    expect(screen.queryAllByRole('button', { name: /^(un)?pin\b/i })).toEqual([])
    expect(screen.queryAllByRole('button', { name: /^actions for/i })).toEqual([])
    expect(document.querySelector('svg.lucide-pin, svg.lucide-ellipsis-vertical, svg.lucide-more-vertical')).toBeNull()
  })
})

describe('row panel: tap to expand', () => {
  it('opens a panel under the row with the chevron turned down, in the program panel style', async () => {
    await renderWorkouts()
    open('Upper Body')
    const header = headerOf('Upper Body')
    expect(header.getAttribute('aria-expanded')).toBe('true')
    expect(header.querySelector('svg.lucide-chevron-down')).not.toBeNull()
    const panel = panelButtons('Upper Body')[0].closest('.bg-muted\\/20') as HTMLElement
    expect(panel).not.toBeNull()
    expect(header.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('tapping the same row again closes it', async () => {
    await renderWorkouts()
    open('Upper Body')
    open('Upper Body')
    expect(headerOf('Upper Body').getAttribute('aria-expanded')).toBe('false')
    expect(panelButtons('Upper Body')).toEqual([])
  })

  it('opening another row closes the first, across groups', async () => {
    await renderWorkouts()
    open('Upper Body')
    open('Mobility')
    expect(panelButtons('Upper Body')).toEqual([])
    expect(headerOf('Mobility').getAttribute('aria-expanded')).toBe('true')
    open('Old Legs')
    expect(panelButtons('Mobility')).toEqual([])
    expect(panelButtons('Old Legs').length).toBeGreaterThan(0)
  })

  it('opening a row sends no request', async () => {
    await renderWorkouts(SAM)
    const before = calls.length
    open('Upper Body')
    open('Mobility')
    expect(calls.length).toBe(before)
  })
})

describe('row panel: buttons', () => {
  it('shows View, Start, Pin, Rename, Archive and Delete; Unpin when pinned', async () => {
    await renderWorkouts()
    open('Upper Body')
    expect(panelLabels('Upper Body')).toEqual(['View', 'Start', 'Pin', 'Rename', 'Archive', 'Delete'])
    open('Mobility')
    expect(panelLabels('Mobility')).toEqual(['View', 'Start', 'Unpin', 'Rename', 'Archive', 'Delete'])
  })

  it('each button is at least 48px tall and they wrap like the program panel', async () => {
    await renderWorkouts(SAM)
    open('Upper Body')
    const buttons = panelButtons('Upper Body')
    for (const b of buttons) expect(b.className).toMatch(/\bmin-h-12\b/)
    expect(buttons[0].parentElement?.className).toMatch(/\bflex-wrap\b/)
  })
})

describe('row panel: the buttons do what the old controls did', () => {
  it('View opens the workout detail', async () => {
    await renderWorkouts()
    open('Upper Body')
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: 'View Upper Body' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Upper Body')).toBeTruthy()
  })

  it('Start starts it and opens the logger', async () => {
    await renderWorkouts()
    open('Upper Body')
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: 'Start Upper Body' }))
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/training/adhoc/c-new'))
    expect(calls.some((c) => c.url === '/api/workouts/saved/r/start' && c.method === 'POST')).toBe(true)
  })

  it('Pin/Unpin toggles the pin, and the panel stays open on the moved row', async () => {
    await renderWorkouts()
    open('Upper Body')
    const pin = within(rowOf('Upper Body')).getByRole('button', { name: 'Pin Upper Body' })
    expect(pin.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(pin)
    await waitFor(() => expect(within(headerOf('Upper Body')).getByText(/^pinned$/i)).toBeTruthy())
    expect(calls.filter((c) => c.method === 'PATCH')).toEqual([
      { url: '/api/workouts/saved/r', method: 'PATCH', body: JSON.stringify({ pinned: true }) },
    ])
    const unpin = within(rowOf('Upper Body')).getByRole('button', { name: 'Unpin Upper Body' })
    expect(unpin.getAttribute('aria-pressed')).toBe('true')
  })

  it('Rename opens the rename dialog', async () => {
    await renderWorkouts()
    open('Upper Body')
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: 'Rename Upper Body' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('textbox')).toBeTruthy()
  })

  it('Archive archives it with an Undo toast', async () => {
    await renderWorkouts()
    open('Upper Body')
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: 'Archive Upper Body' }))
    await waitFor(() => expect(h.toastSuccess).toHaveBeenCalled())
    expect(calls.filter((c) => c.method === 'PATCH')[0].body).toBe(JSON.stringify({ archived: true }))
    const [title, , action] = h.toastSuccess.mock.calls[0]
    expect(title).toBe('Archived Upper Body')
    expect(action.label).toBe('Undo')
  })

  it('Delete asks to confirm first', async () => {
    await renderWorkouts()
    open('Upper Body')
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: 'Delete Upper Body' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/delete/i, { selector: 'h2' })).toBeTruthy()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })
})

describe('row panel: New workouts', () => {
  it('the panel also shows Dismiss, which archives it as dismissed with an Undo toast', async () => {
    await renderWorkouts()
    open('Machine Upper')
    expect(panelLabels('Machine Upper')).toEqual(['View', 'Start', 'Pin', 'Dismiss', 'Rename', 'Archive', 'Delete'])
    fireEvent.click(within(rowOf('Machine Upper')).getByRole('button', { name: 'Dismiss Machine Upper' }))
    await waitFor(() => expect(h.toastSuccess).toHaveBeenCalled())
    expect(calls.filter((c) => c.method === 'PATCH')[0].body).toBe(JSON.stringify({ archived: true, dismissed: true }))
    expect(h.toastSuccess.mock.calls[0][0]).toBe('Dismissed Machine Upper')
  })

  it('Start from New starts it, as before', async () => {
    await renderWorkouts()
    open('Machine Upper')
    fireEvent.click(within(rowOf('Machine Upper')).getByRole('button', { name: 'Start Machine Upper' }))
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/training/adhoc/c-new'))
  })
})

describe('row panel: Send (coaches only)', () => {
  it('a workout panel shows Send, which opens the send-to-trainee flow', async () => {
    await renderWorkouts(SAM)
    open('Upper Body')
    expect(panelLabels('Upper Body')).toContain('Send to Sam')
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: 'Send to Sam' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Send to Sam')).toBeTruthy()
    expect(within(dialog).getByLabelText(/note/i)).toBeTruthy()
  })

  it('Send posts this workout to the trainee', async () => {
    await renderWorkouts(SAM)
    open('Upper Body')
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: 'Send to Sam' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(calls.some((c) => c.url === '/api/coaching/send')).toBe(true))
    expect(JSON.parse(calls.find((c) => c.url === '/api/coaching/send')?.body ?? '{}')).toEqual({
      linkId: 'link-sam',
      kind: 'saved_workout',
      sourceId: 'r',
    })
  })

  it('the list never asks for trainees itself', async () => {
    await renderWorkouts(SAM)
    open('Upper Body')
    await renderPrograms([])
    expect(calls.some((c) => c.url.startsWith('/api/coaching/trainees'))).toBe(false)
  })
})

// --- My Programs ---------------------------------------------------------------

const PROGRAM = {
  id: 'prog-1',
  name: 'Machine Starter',
  description: null,
  isActive: false,
  isUserCreated: true,
  createdAt: new Date('2026-10-01T12:00:00Z'),
  copyStatus: null,
  targetDaysPerWeek: 3,
  _count: { weeks: 4 },
}

async function renderPrograms(trainees?: typeof SAM) {
  const mod = (await load('@/components/programs/MyProgramsList')) as { default: ComponentType<Record<string, unknown>> }
  return render(
    createElement(mod.default, {
      programs: [PROGRAM],
      cloningProgress: {},
      localCopyStatuses: {},
      deletedPrograms: new Set(),
      activeProgram: null,
      programCount: 1,
      hasAccess: true,
      bypassLimit: false,
      maxPrograms: 3,
      trainees,
    })
  )
}
const programPanel = (container: HTMLElement) => {
  fireEvent.click(within(container).getByRole('button', { name: /machine starter/i }))
  const view = within(container).getByRole('link', { name: /view/i })
  return view.parentElement as HTMLElement
}
const controlLabels = (panel: HTMLElement) =>
  Array.from(panel.querySelectorAll('a, button')).map((el) => (el.textContent ?? '').trim().toUpperCase())

describe('row panel: Send on a program', () => {
  it('shows Send next to View, Activate, Edit, Duplicate and Delete, opening the same send flow', async () => {
    const { container } = await renderPrograms(SAM)
    const panel = programPanel(container)
    expect(controlLabels(panel)).toEqual(['VIEW', 'ACTIVATE', 'EDIT', 'DUPLICATE', 'DELETE', 'SEND TO SAM'])
    for (const el of panel.querySelectorAll('a, button')) expect(el.className).toMatch(/\bmin-h-12\b/)
    fireEvent.click(within(panel).getByRole('button', { name: 'Send to Sam' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(calls.some((c) => c.url === '/api/coaching/send')).toBe(true))
    expect(JSON.parse(calls.find((c) => c.url === '/api/coaching/send')?.body ?? '{}')).toMatchObject({
      kind: 'program',
      sourceId: 'prog-1',
    })
  })
})

describe('row panel: no trainees, no Send', () => {
  it('neither panel shows Send, and nothing asks for trainees', async () => {
    await renderWorkouts([])
    open('Upper Body')
    expect(panelLabels('Upper Body').some((l) => /send/i.test(l))).toBe(false)
    cleanup()
    const { container } = await renderPrograms()
    expect(controlLabels(programPanel(container)).some((l) => /SEND/.test(l))).toBe(false)
    expect(calls.some((c) => c.url.startsWith('/api/coaching/trainees'))).toBe(false)
  })
})
