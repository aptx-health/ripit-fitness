/**
 * TL5a Coach Suggestions: the views, rendered. Companion to
 * __tests__/features/training-library/coach-suggestions.steps.ts, which lists
 * the API, loader and data seams.
 *
 * Seams:
 *   components/training/TrainingHome.tsx   home.suggestions = { count, items }
 *     (items: newest first, at most 3, { id, kind, title, summary, rationale,
 *     createdAt }). Users see `title`, never `summary`.
 *     When count > 0 a section headed "Coach Suggestions · <count>" is the first
 *     section, above Up Next. The newest item is prominent: its kind label
 *     (Workout, Workout change, Program, Anchor lifts, Training targets), its
 *     summary, its rationale and a "Review" link to /suggestions/<id>. The other
 *     items (up to 2) are listed by title only, each a link to its review
 *     screen. A "View Suggestions" link goes to /suggestions. Suggestions alone
 *     suppress the empty-home screen.
 *   components/suggestions/SuggestionsList.tsx   props { suggestions: items }
 *     every suggestion's title (not its summary) is a link to /suggestions/<id>, newest first;
 *     none: "No suggestions right now" and a link to /training.
 *   components/suggestions/SuggestionReview.tsx   props { suggestion: SuggestionDetail }
 *     (see the steps file). Shows the title (not the summary) as the heading, the kind label, the
 *     rationale and the created date, then the body for the kind. While pending:
 *     "Accept" and "Reject" buttons. Otherwise the outcome text and no buttons.
 *     Accept POSTs /api/suggestions/<id>/accept.
 *       workout kinds: confirms, with a link to /library?type=workouts
 *       program: "Make it active?" with "Make active" and "Not now"
 *         (Make active POSTs /api/programs/<programId>/activate, then both go to
 *         /library/programs/<programId>)
 *       anchors and targets: "Updated"
 *       a failure shows a role=alert message and leaves it pending; a 409 with
 *         code "conflict" says "This suggestion no longer applies"
 *     Reject POSTs .../reject, then GET /api/suggestions: if none are left it
 *     goes to /training, otherwise /suggestions.
 *   The UI never says "proposal".
 *
 * Markup is not tested; everything is found by role and visible text.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const h = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/suggestions',
  useSearchParams: () => new URLSearchParams(),
}))

type Item = { id: string; kind: string; title: string; summary: string; rationale: string; createdAt: Date }
type Home = {
  upNext: unknown
  pinned: unknown[]
  suggestions: { count: number; items: Item[] }
  recent: unknown[]
  currentProgram: unknown
}

const at = (d: string) => new Date(`${d}T12:00:00Z`)
const WORKOUT: Item = { id: 'g1', kind: 'saved_workout.create', title: 'Short Full-Body Workout', summary: 'New saved workout: Short Full-Body Workout (5 exercises)', rationale: 'You have 30 minutes on busy days', createdAt: at('2026-10-30') }
const PROGRAM: Item = { id: 'g2', kind: 'program.create', title: 'New 3-Day Strength Program', summary: 'New program: New 3-Day Strength Program', rationale: 'A simple block for your schedule', createdAt: at('2026-10-29') }
const ANCHORS: Item = { id: 'g3', kind: 'anchors.update', title: 'Hinge, Horizontal Push', summary: 'Anchor lifts: hinge', rationale: 'These fit your setup', createdAt: at('2026-10-28') }
const TARGETS: Item = { id: 'g4', kind: 'balance_targets.update', title: 'Quads 1 → 1.3', summary: 'Targets: quads', rationale: 'Your quads lag', createdAt: at('2026-10-27') }
const UPDATE: Item = { id: 'g5', kind: 'saved_workout.update', title: 'Push day: name', summary: 'Update saved workout Push day: name', rationale: 'Clearer name', createdAt: at('2026-10-26') }
const UP_NEXT = { programId: 'p1', programName: 'Machine Starter', workoutId: 'w2', workoutName: 'Full Body A', weekNumber: 2, dayNumber: 1, exerciseCount: 5, hasDraft: false, href: '/library/programs/p1?week=2&resume=w2' }
const home = (items: Item[], over: Partial<Home> = {}, count = items.length): Home => ({
  upNext: null,
  pinned: [],
  suggestions: { count, items },
  recent: [],
  currentProgram: null,
  ...over,
})
async function renderHome(data: Home) {
  const mod = (await load('@/components/training/TrainingHome')) as { default: ComponentType<{ home: Home }> }
  return render(createElement(mod.default, { home: data }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  h.push.mockClear()
})

// ---------------------------------------------------------------------------
describe('training home view: Coach Suggestions', () => {
  it('is the first section, above Up Next', async () => {
    await renderHome(home([WORKOUT], { upNext: UP_NEXT, currentProgram: { programId: 'p1', programName: 'Machine Starter', weekNumber: 2, totalWeeks: 5, workoutsDone: 3, workoutsTotal: 10 } }))
    const first = screen.getByText(/^coach suggestions/i)
    const upNext = screen.getByText(/^up next$/i)
    expect(first.compareDocumentPosition(upNext) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 })[0].textContent).toBe('Coach Suggestions · 1')
  })

  it('the heading counts every pending suggestion, not just the ones listed', async () => {
    await renderHome(home([WORKOUT, PROGRAM, ANCHORS], {}, 5))
    expect(screen.getAllByRole('heading', { level: 2 })[0].textContent).toBe('Coach Suggestions · 5')
  })

  it('is hidden with no suggestions, including its View Suggestions link', async () => {
    await renderHome(home([], { upNext: UP_NEXT }))
    expect(screen.queryByText(/coach suggestions/i)).toBeNull()
    expect(screen.queryByText(/view suggestions/i)).toBeNull()
  })

  it('shows the newest prominently: kind label, summary, rationale and Review', async () => {
    await renderHome(home([WORKOUT, PROGRAM]))
    expect(screen.getByText('Workout')).toBeTruthy()
    expect(screen.getByText(WORKOUT.title)).toBeTruthy()
    expect(screen.queryByText(WORKOUT.summary)).toBeNull()
    expect(screen.getByText(WORKOUT.rationale)).toBeTruthy()
    expect(screen.getByText(/^review$/i).closest('a')?.getAttribute('href')).toBe('/suggestions/g1')
  })

  it('lists the others by summary only, as links, below the newest', async () => {
    await renderHome(home([WORKOUT, PROGRAM, ANCHORS]))
    for (const [item, href] of [[PROGRAM, '/suggestions/g2'], [ANCHORS, '/suggestions/g3']] as const) {
      expect(screen.getByText(item.title).closest('a')?.getAttribute('href')).toBe(href)
      expect(screen.queryByText(item.summary)).toBeNull()
      expect(screen.queryByText(item.rationale)).toBeNull()
    }
    const newest = screen.getByText(WORKOUT.title)
    expect(newest.compareDocumentPosition(screen.getByText(PROGRAM.title)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByText(/^review$/i)).toHaveLength(1)
  })

  it('shows a single suggestion without a list below it', async () => {
    await renderHome(home([WORKOUT]))
    expect(screen.getAllByRole('link', { name: /suggestions\/|review/i }).length).toBeGreaterThan(0)
    expect(screen.queryByText(PROGRAM.title)).toBeNull()
  })

  it('has View Suggestions, to the list', async () => {
    await renderHome(home([WORKOUT, PROGRAM]))
    expect(screen.getByText(/view suggestions/i).closest('a')?.getAttribute('href')).toBe('/suggestions')
  })

  it.each([
    [WORKOUT, 'Workout'],
    [UPDATE, 'Workout change'],
    [PROGRAM, 'Program'],
    [ANCHORS, 'Anchor lifts'],
    [TARGETS, 'Training targets'],
  ])('labels a %s suggestion %s', async (item, label) => {
    await renderHome(home([item]))
    expect(screen.getByText(label)).toBeTruthy()
  })

  it('suggestions alone are enough: no empty-home start screen', async () => {
    await renderHome(home([WORKOUT]))
    expect(screen.queryByText(/find a program/i)).toBeNull()
    expect(screen.queryByText(/nothing planned yet/i)).toBeNull()
  })

  it('the empty home still shows with nothing at all', async () => {
    await renderHome(home([]))
    expect(screen.getByText(/find a program/i)).toBeTruthy()
  })

  it('never says "proposal"', async () => {
    await renderHome(home([WORKOUT, PROGRAM, ANCHORS]))
    expect(document.body.textContent).not.toMatch(/proposal/i)
  })
})

// ---------------------------------------------------------------------------
describe('suggestions list view', () => {
  async function renderList(items: Item[]) {
    const mod = (await load('@/components/suggestions/SuggestionsList')) as { default: ComponentType<{ suggestions: Item[] }> }
    return render(createElement(mod.default, { suggestions: items }))
  }

  it('lists every suggestion, newest first, each linking to its review screen', async () => {
    await renderList([WORKOUT, PROGRAM, ANCHORS, TARGETS])
    const links = [WORKOUT, PROGRAM, ANCHORS, TARGETS].map((i) => screen.getByText(i.title).closest('a'))
    for (const i of [WORKOUT, PROGRAM, ANCHORS, TARGETS]) expect(screen.queryByText(i.summary)).toBeNull()
    expect(links.map((a) => a?.getAttribute('href'))).toEqual(['/suggestions/g1', '/suggestions/g2', '/suggestions/g3', '/suggestions/g4'])
    for (let i = 0; i < links.length - 1; i++) {
      expect((links[i] as Node).compareDocumentPosition(links[i + 1] as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('shows each one\'s kind label', async () => {
    await renderList([WORKOUT, PROGRAM])
    expect(screen.getByText('Workout')).toBeTruthy()
    expect(screen.getByText('Program')).toBeTruthy()
  })

  it('says "No suggestions right now" with a link back to Training', async () => {
    await renderList([])
    expect(screen.getByText(/no suggestions right now/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /training/i }).getAttribute('href')).toBe('/training')
  })

  it('never says "proposal"', async () => {
    await renderList([WORKOUT])
    expect(document.body.textContent).not.toMatch(/proposal/i)
  })
})

// ---------------------------------------------------------------------------
type Detail = {
  id: string
  title: string
  kind: string
  kindLabel: string
  status: string
  outcome: string | null
  summary: string
  rationale: string
  createdAt: Date
  programId: string | null
  body: Record<string, unknown>
}
const detail = (over: Partial<Detail> = {}): Detail => ({
  id: 'g1',
  kind: 'saved_workout.create',
  kindLabel: 'Workout',
  status: 'pending',
  outcome: null,
  title: 'Push day',
  summary: 'New saved workout: Push day (2 exercises)',
  rationale: 'Your pressing volume is low',
  createdAt: at('2026-10-28'),
  programId: null,
  body: {
    type: 'saved_workout_create',
    name: 'Push day',
    notes: 'Heavy first',
    exercises: [
      { name: 'Barbell Bench Press', notes: null, sets: [{ reps: '8', rir: 2 }, { reps: '8', rir: 2 }] },
      { name: 'Overhead Press', notes: 'Strict', sets: [{ reps: '5' }] },
    ],
  },
  ...over,
})
const PROGRAM_DETAIL = detail({
  id: 'g2',
  kind: 'program.create',
  kindLabel: 'Program',
  title: '3-Day Strength',
  summary: 'New program: 3-Day Strength',
  body: {
    type: 'program',
    program: {
      name: '3-Day Strength',
      description: 'A simple block',
      weeks: [{ name: 'Week One', workouts: [{ name: 'Push', exercises: [{ exerciseDefinitionId: 'd1', prescribedSets: [{ reps: '5' }] }] }] }],
    },
    definitionNames: { d1: 'Barbell Bench Press' },
  },
})
const TARGET_DETAIL = detail({
  id: 'g4',
  kind: 'balance_targets.update',
  kindLabel: 'Training targets',
  title: 'Quads 1 → 1.3',
  summary: 'Targets: Quads',
  body: { type: 'diff', rows: [{ field: 'Quads', before: '1', after: '1.3' }] },
})
const ANCHOR_DETAIL = detail({
  id: 'g3',
  kind: 'anchors.update',
  kindLabel: 'Anchor lifts',
  title: 'Hinge',
  summary: 'Anchors: Hinge',
  body: { type: 'diff', rows: [{ field: 'Hinge', before: ['Deadlift'], after: ['Romanian Deadlift'] }] },
})
const UPDATE_DETAIL = detail({
  id: 'g5',
  kind: 'saved_workout.update',
  kindLabel: 'Workout change',
  title: 'Push day: name',
  summary: 'Update saved workout Push day: name',
  body: { type: 'saved_workout_update', rows: [{ field: 'Name', before: 'Push day', after: 'Push Day A' }] },
})

type Reply = { status: number; body: unknown }
let calls: Array<{ url: string; method: string }>
let replies: Record<string, Reply | (() => Promise<Reply>)>

async function renderReview(suggestion: Detail) {
  const mod = (await load('@/components/suggestions/SuggestionReview')) as { default: ComponentType<{ suggestion: Detail }> }
  return render(createElement(mod.default, { suggestion }))
}
const accept = () => screen.getByRole('button', { name: /^accept$/i })
const rejectBtn = () => screen.getByRole('button', { name: /^reject$/i })

describe('suggestion review: what is shown', () => {
  beforeEach(() => {
    calls = []
    replies = {}
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))
  })

  it('shows the title, kind label, rationale and created date', async () => {
    await renderReview(detail())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Push day')
    expect(document.body.textContent).not.toContain('New saved workout')
    expect(screen.getByText('Workout')).toBeTruthy()
    expect(screen.getByText('Your pressing volume is low')).toBeTruthy()
    expect(screen.getByText(/oct 28/i)).toBeTruthy()
  })

  it('a workout create shows its exercises and sets', async () => {
    await renderReview(detail())
    expect(screen.getByText(/barbell bench press/i)).toBeTruthy()
    expect(screen.getByText(/overhead press/i)).toBeTruthy()
    expect(screen.getByText(/2 × 8/)).toBeTruthy()
    expect(screen.getByText('Strict')).toBeTruthy()
  })

  it('a workout change shows each field before and after', async () => {
    await renderReview(UPDATE_DETAIL)
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Push day', { selector: ':not(h1)' })).toBeTruthy()
    expect(screen.getByText('Push Day A')).toBeTruthy()
  })

  it('a program shows weeks, workouts and exercises with names', async () => {
    await renderReview(PROGRAM_DETAIL)
    expect(screen.getAllByText(/3-Day Strength/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Week One/)).toBeTruthy()
    expect(screen.getByText(/Push/)).toBeTruthy()
    expect(screen.getByText(/Barbell Bench Press/)).toBeTruthy()
  })

  it('targets show the display name and both values', async () => {
    await renderReview(TARGET_DETAIL)
    expect(screen.getByText('Quads')).toBeTruthy()
    expect(screen.getByText('1.3')).toBeTruthy()
    expect(screen.queryByText('quads')).toBeNull()
  })

  it('anchors show the pattern name and exercise names', async () => {
    await renderReview(ANCHOR_DETAIL)
    // the title and the row's pattern name
    expect(screen.getAllByText('Hinge')).toHaveLength(2)
    expect(screen.getByText(/Romanian Deadlift/)).toBeTruthy()
    expect(screen.getByText(/^Deadlift$/)).toBeTruthy()
  })

  it('a pending suggestion has Accept and Reject', async () => {
    await renderReview(detail())
    expect(accept()).toBeTruthy()
    expect(rejectBtn()).toBeTruthy()
  })

  it.each([
    ['applied', 'Accepted'],
    ['rejected', 'Rejected'],
    ['conflict', 'No longer applies'],
  ])('a %s suggestion shows "%s" and no buttons', async (status, outcome) => {
    await renderReview(detail({ status, outcome }))
    expect(screen.getByText(outcome)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^accept$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^reject$/i })).toBeNull()
  })

  it('never says "proposal", for any kind or status', async () => {
    for (const d of [detail(), PROGRAM_DETAIL, TARGET_DETAIL, ANCHOR_DETAIL, UPDATE_DETAIL, detail({ status: 'applied', outcome: 'Accepted' })]) {
      cleanup()
      await renderReview(d)
      expect(document.body.textContent).not.toMatch(/proposal/i)
    }
  })
})

describe('suggestion review: deciding', () => {
  beforeEach(() => {
    calls = []
    replies = {
      'POST /api/suggestions/g1/accept': { status: 200, body: { success: true, data: {}, programId: null } },
      'POST /api/suggestions/g2/accept': { status: 200, body: { success: true, data: {}, programId: 'prog-9' } },
      'POST /api/suggestions/g3/accept': { status: 200, body: { success: true, data: {}, programId: null } },
      'POST /api/suggestions/g4/accept': { status: 200, body: { success: true, data: {}, programId: null } },
      'POST /api/programs/prog-9/activate': { status: 200, body: { success: true } },
      'POST /api/suggestions/g1/reject': { status: 200, body: { success: true, data: {} } },
      'GET /api/suggestions': { status: 200, body: { suggestions: [] } },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: { method?: string }) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        calls.push({ url, method })
        const r = replies[`${method} ${url}`]
        const reply = typeof r === 'function' ? await r() : (r ?? { status: 200, body: {} })
        return { ok: reply.status < 400, status: reply.status, json: async () => reply.body }
      })
    )
  })

  const writes = () => calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.url}`)

  it('accepting a workout confirms and links to My Workouts', async () => {
    await renderReview(detail())
    fireEvent.click(accept())
    const link = await screen.findByRole('link', { name: /my workouts|library/i })
    const url = new URL(link.getAttribute('href') as string, 'http://x')
    expect([url.pathname, url.searchParams.get('type')]).toEqual(['/library', 'workouts'])
    expect(writes()).toEqual(['POST /api/suggestions/g1/accept'])
    expect(screen.queryByRole('button', { name: /^accept$/i })).toBeNull()
  })

  it('accepting a workout change confirms the same way', async () => {
    replies['POST /api/suggestions/g5/accept'] = { status: 200, body: { success: true, data: {}, programId: null } }
    await renderReview(UPDATE_DETAIL)
    fireEvent.click(accept())
    expect(await screen.findByRole('link', { name: /my workouts|library/i })).toBeTruthy()
  })

  it('accepting a program asks "Make it active?" and does not activate on its own', async () => {
    await renderReview(PROGRAM_DETAIL)
    fireEvent.click(accept())
    expect(await screen.findByText(/make it active\?/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /^make active$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^not now$/i })).toBeTruthy()
    expect(writes()).toEqual(['POST /api/suggestions/g2/accept'])
    expect(h.push).not.toHaveBeenCalled()
  })

  it('Make active activates the new program and goes to its detail page', async () => {
    await renderReview(PROGRAM_DETAIL)
    fireEvent.click(accept())
    fireEvent.click(await screen.findByRole('button', { name: /^make active$/i }))
    await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1))
    expect(writes()).toEqual(['POST /api/suggestions/g2/accept', 'POST /api/programs/prog-9/activate'])
    expect(new URL(h.push.mock.calls[0][0], 'http://x').pathname).toBe('/library/programs/prog-9')
  })

  it('Not now goes to the detail page without activating', async () => {
    await renderReview(PROGRAM_DETAIL)
    fireEvent.click(accept())
    fireEvent.click(await screen.findByRole('button', { name: /^not now$/i }))
    await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1))
    expect(writes()).toEqual(['POST /api/suggestions/g2/accept'])
    expect(new URL(h.push.mock.calls[0][0], 'http://x').pathname).toBe('/library/programs/prog-9')
  })

  it('if activation fails it says so and stays on the question', async () => {
    replies['POST /api/programs/prog-9/activate'] = { status: 500, body: { error: 'Internal server error' } }
    await renderReview(PROGRAM_DETAIL)
    fireEvent.click(accept())
    fireEvent.click(await screen.findByRole('button', { name: /^make active$/i }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^not now$/i })).toBeTruthy()
  })

  it.each([
    [TARGET_DETAIL, 'g4'],
    [ANCHOR_DETAIL, 'g3'],
  ])('accepting targets or anchors confirms "Updated" (%#)', async (d) => {
    await renderReview(d)
    fireEvent.click(accept())
    expect(await screen.findByText(/^updated$/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^accept$/i })).toBeNull()
  })

  it('a failed accept shows the error and leaves it pending', async () => {
    replies['POST /api/suggestions/g1/accept'] = { status: 500, body: { error: 'Internal server error' } }
    await renderReview(detail())
    fireEvent.click(accept())
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(accept()).toBeTruthy()
    expect(rejectBtn()).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
  })

  it('a dropped connection on accept shows an error and leaves it pending', async () => {
    replies['POST /api/suggestions/g1/accept'] = async () => {
      throw new Error('offline')
    }
    await renderReview(detail())
    fireEvent.click(accept())
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(accept()).toBeTruthy()
  })

  it('a conflict says "This suggestion no longer applies"', async () => {
    replies['POST /api/suggestions/g1/accept'] = { status: 409, body: { error: 'Saved workout changed', code: 'conflict' } }
    await renderReview(detail())
    fireEvent.click(accept())
    expect(await screen.findByText(/this suggestion no longer applies/i)).toBeTruthy()
    expect(screen.queryByText(/updated/i)).toBeNull()
  })

  it('a suggestion that was already decided says the server\'s message and not "no longer applies"', async () => {
    replies['POST /api/suggestions/g1/accept'] = { status: 409, body: { error: 'This suggestion was already decided.', code: 'not_pending' } }
    await renderReview(detail())
    fireEvent.click(accept())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('This suggestion was already decided.')
    expect(alert.textContent).not.toMatch(/no longer applies/i)
    expect(alert.textContent).not.toMatch(/proposal/i)
  })

  it('only one request runs at a time', async () => {
    let release: () => void = () => {}
    replies['POST /api/suggestions/g1/accept'] = () =>
      new Promise((resolve) => {
        release = () => resolve({ status: 200, body: { success: true, data: {}, programId: null } })
      })
    await renderReview(detail())
    fireEvent.click(accept())
    fireEvent.click(accept())
    fireEvent.click(rejectBtn())
    await waitFor(() => expect(writes()).toHaveLength(1))
    release()
    await screen.findByRole('link', { name: /my workouts|library/i })
    expect(writes()).toEqual(['POST /api/suggestions/g1/accept'])
  })

  it('rejecting goes back to Training when none are left', async () => {
    await renderReview(detail())
    fireEvent.click(rejectBtn())
    await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1))
    expect(h.push).toHaveBeenCalledWith('/training')
    expect(writes()).toEqual(['POST /api/suggestions/g1/reject'])
  })

  it('rejecting goes back to the list when others are pending', async () => {
    replies['GET /api/suggestions'] = { status: 200, body: { suggestions: [{ id: 'g2', kind: 'program.create', title: 'x', summary: 'x', rationale: 'y', createdAt: '2026-10-29T12:00:00Z' }] } }
    await renderReview(detail())
    fireEvent.click(rejectBtn())
    await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1))
    expect(h.push).toHaveBeenCalledWith('/suggestions')
  })

  it('a failed reject shows the error and leaves it pending', async () => {
    replies['POST /api/suggestions/g1/reject'] = { status: 500, body: { error: 'Internal server error' } }
    await renderReview(detail())
    fireEvent.click(rejectBtn())
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(within(document.body).getByRole('button', { name: /^accept$/i })).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
  })
})
