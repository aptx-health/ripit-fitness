/**
 * TL2 Training home: the home view, rendered. Companion to
 * __tests__/features/training-library/training-home.steps.ts.
 *
 * Seam: components/training/TrainingHome.tsx, default export, a client
 * component with one prop, `home`, the TrainingHomeData that
 * lib/training/home.ts getTrainingHome(userId) returns:
 *   upNext         { programId, programName, workoutId, workoutName,
 *                    weekNumber, dayNumber, exerciseCount, hasDraft, href } | null
 *   recent         [{ id, name, completedAt: Date, durationSeconds | null, canRepeat }]
 *   currentProgram { programId, programName, weekNumber, totalWeeks,
 *                    workoutsDone, workoutsTotal } | null
 * Section headings read "Up Next", "Recent Workouts", "Current Program" (any
 * case). Order is fixed: Up Next, Recent Workouts, Current Program.
 *
 *   Up Next        text "Week W · Day D", the workout name, "N exercises";
 *                  a link "Start Workout" (or "Continue" when hasDraft) to href.
 *   Recent         a row per session: name, date ("Oct 28"), duration
 *                  ("45 min", "1h 05m", omitted when null) and a "Repeat"
 *                  button when canRepeat. Repeat POSTs
 *                  /api/workouts/completions/<id>/repeat; on 200 { completionId }
 *                  it goes to /training/adhoc/<completionId>; on 409 it shows the
 *                  response's message and stays.
 *   Current        "Week X of Y", "N of M workouts done", a progressbar with
 *                  aria-valuenow=N and aria-valuemax=M, and a "View Program"
 *                  link to /library/programs/<programId>.
 *   Empty          with no section: "Start a workout" and a "Find a program"
 *                  link to /programs.
 *
 * Markup is not tested. Everything is found by role and visible text.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const h = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))

interface Home {
  upNext: null | {
    programId: string
    programName: string
    workoutId: string
    workoutName: string
    weekNumber: number
    dayNumber: number
    exerciseCount: number
    hasDraft: boolean
    href: string
  }
  recent: Array<{ id: string; name: string; completedAt: Date; durationSeconds: number | null; canRepeat: boolean }>
  currentProgram: null | {
    programId: string
    programName: string
    weekNumber: number
    totalWeeks: number
    workoutsDone: number
    workoutsTotal: number
  }
}

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
  { id: 'c1', name: 'Upper Body', completedAt: new Date('2026-10-28T12:00:00Z'), durationSeconds: 2700, canRepeat: true },
  { id: 'c2', name: 'Leg Day', completedAt: new Date('2026-10-26T12:00:00Z'), durationSeconds: 3900, canRepeat: true },
  { id: 'c3', name: 'Quick Arms', completedAt: new Date('2026-10-24T12:00:00Z'), durationSeconds: null, canRepeat: false },
]
const CURRENT = {
  programId: 'p1',
  programName: 'Machine Starter',
  weekNumber: 2,
  totalWeeks: 5,
  workoutsDone: 3,
  workoutsTotal: 10,
}
const FULL: Home = { upNext: UP_NEXT, recent: RECENT, currentProgram: CURRENT }
const EMPTY: Home = { upNext: null, recent: [], currentProgram: null }

async function renderHome(home: Home) {
  const mod = (await load('@/components/training/TrainingHome')) as { default: ComponentType<{ home: Home }> }
  return render(createElement(mod.default, { home }))
}

type Call = { url: string; method: string }
let calls: Call[]
let reply: () => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

beforeEach(() => {
  h.push.mockClear()
  calls = []
  reply = async () => ({ ok: true, status: 200, json: async () => ({ completionId: 'new1' }) })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string }) => {
      calls.push({ url: String(url), method: init?.method ?? 'GET' })
      return reply()
    })
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const rowOf = (name: string) => {
  const el = screen.getByText(name).closest('li, tr, article, [role="listitem"], div[data-row]') ?? screen.getByText(name).parentElement
  return el as HTMLElement
}

describe('training home view: sections', () => {
  it('shows the three sections in a fixed order', async () => {
    await renderHome(FULL)
    const up = screen.getByText(/up next/i)
    const recent = screen.getByText(/recent workouts/i)
    const current = screen.getByText(/current program/i)
    expect(up.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(recent.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/start a workout/i)).toBeNull()
  })

  it('leaves out a section that has nothing to show', async () => {
    await renderHome({ ...FULL, upNext: null })
    expect(screen.queryByText(/up next/i)).toBeNull()
    expect(screen.getByText(/recent workouts/i)).toBeTruthy()
    expect(screen.getByText(/current program/i)).toBeTruthy()
  })

  it('works with sessions only: no program sections and no empty state', async () => {
    await renderHome({ upNext: null, recent: RECENT, currentProgram: null })
    expect(screen.getByText(/recent workouts/i)).toBeTruthy()
    expect(screen.queryByText(/up next/i)).toBeNull()
    expect(screen.queryByText(/current program/i)).toBeNull()
    expect(screen.queryByText(/find a program/i)).toBeNull()
  })

  it('works with a program only: no Recent Workouts', async () => {
    await renderHome({ upNext: UP_NEXT, recent: [], currentProgram: CURRENT })
    expect(screen.queryByText(/recent workouts/i)).toBeNull()
    expect(screen.getByText(/up next/i)).toBeTruthy()
  })

  it('shows a simple start when there is nothing at all', async () => {
    await renderHome(EMPTY)
    expect(screen.getByText(/start a workout/i)).toBeTruthy()
    expect(screen.getByText(/find a program/i).closest('a')?.getAttribute('href')).toBe('/programs')
    expect(screen.queryByText(/up next|recent workouts|current program/i)).toBeNull()
  })
})

describe('training home view: Up Next', () => {
  it('names the program, week and day, workout and exercise count', async () => {
    await renderHome(FULL)
    expect(screen.getAllByText('Machine Starter').length).toBeGreaterThan(0)
    expect(screen.getByText(/week 2\s*·\s*day 1/i)).toBeTruthy()
    expect(screen.getByText('Full Body A')).toBeTruthy()
    expect(screen.getByText(/5 exercises/i)).toBeTruthy()
  })

  it('Start Workout goes to the detail page with the workout resumed', async () => {
    await renderHome(FULL)
    expect(screen.getByText(/start workout/i).closest('a')?.getAttribute('href')).toBe(UP_NEXT.href)
    expect(screen.queryByText(/^continue$/i)).toBeNull()
  })

  it('says Continue, to the same place, when a draft exists', async () => {
    await renderHome({ ...FULL, upNext: { ...UP_NEXT, hasDraft: true } })
    expect(screen.getByText(/continue/i).closest('a')?.getAttribute('href')).toBe(UP_NEXT.href)
    expect(screen.queryByText(/start workout/i)).toBeNull()
  })

  it('says "1 exercise" for one', async () => {
    await renderHome({ ...FULL, upNext: { ...UP_NEXT, exerciseCount: 1 } })
    expect(screen.getByText(/\b1 exercise\b(?!s)/i)).toBeTruthy()
  })
})

describe('training home view: Recent Workouts', () => {
  it('shows each session\'s name, date and duration, in the order given', async () => {
    await renderHome(FULL)
    const names = ['Upper Body', 'Leg Day', 'Quick Arms'].map((n) => screen.getByText(n))
    for (let i = 0; i < names.length - 1; i++) {
      expect(names[i].compareDocumentPosition(names[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    const date = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    expect(screen.getByText(date(RECENT[0].completedAt))).toBeTruthy()
    expect(screen.getByText('45 min')).toBeTruthy()
    expect(screen.getByText('1h 05m')).toBeTruthy()
  })

  it('omits the duration when it is unknown', async () => {
    await renderHome({ upNext: null, currentProgram: null, recent: [RECENT[2]] })
    expect(screen.queryByText(/\bmin\b|\d+h \d+m/)).toBeNull()
  })

  it('offers Repeat only on rows that can be repeated', async () => {
    await renderHome(FULL)
    expect(screen.getAllByRole('button', { name: /repeat/i })).toHaveLength(2)
    expect(within(rowOf('Quick Arms')).queryByRole('button', { name: /repeat/i })).toBeNull()
    expect(within(rowOf('Upper Body')).getByRole('button', { name: /repeat/i })).toBeTruthy()
  })

  it('Repeat starts a session and opens it', async () => {
    await renderHome(FULL)
    fireEvent.click(within(rowOf('Leg Day')).getByRole('button', { name: /repeat/i }))
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/training/adhoc/new1'))
    expect(calls).toEqual([{ url: '/api/workouts/completions/c2/repeat', method: 'POST' }])
  })

  it('shows the server\'s message and stays put when a session is already in progress', async () => {
    reply = async () => ({
      ok: false,
      status: 409,
      json: async () => ({ error: 'DRAFT_EXISTS', message: 'Finish your current workout before starting a new one.', draft: { completionId: 'd1' } }),
    })
    await renderHome(FULL)
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: /repeat/i }))
    expect(await screen.findByText(/finish your current workout before starting a new one/i)).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
    expect((within(rowOf('Upper Body')).getByRole('button', { name: /repeat/i }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('a second tap while the first is in flight does not start two', async () => {
    let release: () => void = () => {}
    reply = () =>
      new Promise((resolve) => {
        release = () => resolve({ ok: true, status: 200, json: async () => ({ completionId: 'new1' }) })
      })
    await renderHome(FULL)
    const button = within(rowOf('Upper Body')).getByRole('button', { name: /repeat/i })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(calls).toHaveLength(1))
    release()
    await waitFor(() => expect(h.push).toHaveBeenCalledTimes(1))
    expect(calls).toHaveLength(1)
  })

  it('shows an error and stays when Repeat fails', async () => {
    reply = async () => ({ ok: false, status: 500, json: async () => ({ error: 'Internal server error' }) })
    await renderHome(FULL)
    fireEvent.click(within(rowOf('Upper Body')).getByRole('button', { name: /repeat/i }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(h.push).not.toHaveBeenCalled()
  })
})

describe('training home view: Current Program', () => {
  it('shows the week, the count and a progress bar', async () => {
    await renderHome(FULL)
    expect(screen.getByText(/week 2 of 5/i)).toBeTruthy()
    expect(screen.getByText(/3 of 10 workouts done/i)).toBeTruthy()
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe('10')
  })

  it('View Program opens the detail page', async () => {
    await renderHome(FULL)
    expect(screen.getByText(/view program/i).closest('a')?.getAttribute('href')).toBe('/library/programs/p1')
  })

  it('shows a full bar when every workout is done', async () => {
    await renderHome({ ...FULL, upNext: null, currentProgram: { ...CURRENT, weekNumber: 5, workoutsDone: 10 } })
    expect(screen.getByText(/10 of 10 workouts done/i)).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('10')
  })
})
