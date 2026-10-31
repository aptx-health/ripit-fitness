/**
 * TL1 Program Detail: the week view, rendered. Companion to
 * __tests__/features/training-library/program-detail.steps.ts.
 *
 * Seam: components/StrengthWeekView.tsx (default export) gains two optional
 * props, both false by default so the active program behaves as today:
 *   readOnly     no way to start, log, skip or unskip a workout, no Complete
 *                Week, and ?resume= does not open the logger
 *   canActivate  with readOnly, shows a "Make active to train" button that
 *                opens StrengthActivationModal
 * Week links and the restart redirect point at
 * /library/programs/<programId>[?week=N], not /training.
 * components/StrengthActivationModal.tsx sends the user to
 * /library/programs/<programId> after activating.
 *
 * Markup is not tested. Everything is found by role and visible text.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  search: '',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(h.search),
  usePathname: () => '/library/programs/p1',
}))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: { loggingMode: 'full', dismissedMessageIds: '[]', seenMessageIds: '[]' },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    updateSettings: vi.fn(),
  }),
}))
vi.mock('@/hooks/usePwaPrompt', () => ({
  usePwaPrompt: () => ({
    showPrompt: false,
    triggerAfterWorkout: vi.fn(),
    triggerOnPageLoad: vi.fn(),
    handleClose: vi.fn(),
    handleInstalled: vi.fn(),
  }),
}))
vi.mock('@/hooks/useBeforeInstallPrompt', () => ({ useBeforeInstallPrompt: () => ({ deferredPrompt: null }) }))
vi.mock('@/lib/contexts/DraftWorkoutContext', () => ({
  useDraftWorkout: () => ({ activeDraft: null, refreshDraft: vi.fn(), clearDraft: vi.fn() }),
}))
vi.mock('@/components/ExerciseLoggingModal', () => ({ default: () => null }))
vi.mock('@/components/features/training/WorkoutRollupModal', () => ({ WorkoutRollupModal: () => null }))
vi.mock('@/components/features/training/PwaInstallPrompt', () => ({ PwaInstallPrompt: () => null }))
vi.mock('@/components/WorkoutHistoryList', () => ({ default: () => null }))

type Completion = { id: string; status: string; completedAt: Date }
type WorkoutProp = {
  id: string
  dayNumber: number
  name: string
  completions: Completion[]
  _count: { exercises: number }
}
type ViewProps = {
  programId: string
  programName: string
  week: { id: string; weekNumber: number; description: string | null; workouts: WorkoutProp[] }
  totalWeeks: number
  historyCount: number
  readOnly?: boolean
  canActivate?: boolean
}

const done = (status: string): Completion[] => [{ id: `c-${status}`, status, completedAt: new Date('2026-01-05') }]

function workout(id: string, day: number, name: string, completions: Completion[] = []): WorkoutProp {
  return { id, dayNumber: day, name, completions, _count: { exercises: 3 } }
}

function props(over: Partial<ViewProps> = {}): ViewProps {
  return {
    programId: 'p1',
    programName: 'Old Split',
    week: {
      id: 'wk2',
      weekNumber: 2,
      description: null,
      workouts: [
        workout('w-done', 1, 'Push', done('completed')),
        workout('w-skip', 2, 'Pull', done('skipped')),
        workout('w-open', 3, 'Legs'),
      ],
    },
    totalWeeks: 4,
    historyCount: 0,
    ...over,
  }
}

async function loadView() {
  const mod = (await import('@/components/StrengthWeekView')) as { default: ComponentType<ViewProps> }
  return mod.default
}

async function renderView(over: Partial<ViewProps> = {}) {
  const View = await loadView()
  return render(createElement(View, props(over)))
}

type FetchCall = { url: string; method: string }
let calls: FetchCall[]
let programComplete: boolean

function installFetch() {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string }) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })
      const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
      if (url.includes('/completion-status')) return ok({ data: { isComplete: programComplete } })
      if (url.includes('/completion-stats'))
        return ok({
          data: {
            programName: 'Old Split',
            startDate: '2026-01-01',
            endDate: '2026-02-01',
            totalDays: 30,
            totalWorkouts: 12,
            completedWorkouts: 12,
            skippedWorkouts: 0,
          },
        })
      if (url.includes('/restart')) return ok({ archivedCompletions: 12 })
      if (url.includes('/activate')) return ok({ success: true })
      if (url.includes('/metadata'))
        return ok({ workout: { id: 'w-open', name: 'Legs', dayNumber: 3, programId: 'p1' }, exerciseCount: 0 })
      if (url.includes('/api/messages')) return ok({ data: [] })
      return ok({})
    })
  )
}

const writes = () => calls.filter((c) => c.method !== 'GET')
const metadataCalls = () => calls.filter((c) => c.url.includes('/metadata'))

beforeEach(() => {
  h.push.mockClear()
  h.refresh.mockClear()
  h.search = ''
  programComplete = false
  installFetch()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('program detail view: active program (as /training is today)', () => {
  it('shows the week, its workouts and Complete Week', async () => {
    await renderView({ readOnly: false })
    expect(screen.getByText(/week 2 of 4/i)).toBeTruthy()
    expect(screen.getByText(/Push/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /complete week/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /make active to train/i })).toBeNull()
  })

  it('works with no readOnly prop at all', async () => {
    await renderView()
    expect(screen.getByRole('button', { name: /complete week/i })).toBeTruthy()
  })

  it('opens a workout to start it', async () => {
    await renderView()
    fireEvent.click(screen.getByRole('button', { name: /expand actions: day 3 legs/i }))
    expect(await screen.findByRole('button', { name: /start workout/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^skip$/i })).toBeTruthy()
  })

  it('reopens a skipped workout on tap', async () => {
    await renderView()
    fireEvent.click(screen.getByRole('button', { name: /unskip workout: day 2 pull/i }))
    await waitFor(() => expect(writes().length).toBeGreaterThan(0))
  })

  it('resumes the workout named in ?resume=', async () => {
    h.search = 'resume=w-open'
    await renderView()
    await waitFor(() => expect(metadataCalls().map((c) => c.url)).toEqual(['/api/workouts/w-open/metadata']))
  })

  it('week arrows stay on this program\'s detail page', async () => {
    await renderView()
    expect(screen.getByRole('link', { name: /previous week/i }).getAttribute('href')).toBe('/library/programs/p1?week=1')
    expect(screen.getByRole('link', { name: /next week/i }).getAttribute('href')).toBe('/library/programs/p1?week=3')
  })

  it('restart goes to week 1 of the detail page', async () => {
    programComplete = true
    await renderView()
    fireEvent.click(await screen.findByTitle(/view completion stats and restart program/i))
    fireEvent.click(await screen.findByRole('button', { name: /restart program/i }))
    await waitFor(() => expect(h.push).toHaveBeenCalled())
    expect(h.push).toHaveBeenCalledWith('/library/programs/p1?week=1')
    expect(h.push).not.toHaveBeenCalledWith(expect.stringContaining('/training'))
    expect(writes().map((c) => `${c.method} ${c.url}`)).toContain('POST /api/programs/p1/restart')
  })
})

describe('program detail view: not the active program', () => {
  it('shows the week and its workouts, finished ones included', async () => {
    await renderView({ readOnly: true, canActivate: true })
    expect(screen.getByText(/week 2 of 4/i)).toBeTruthy()
    expect(screen.getByText(/Push/)).toBeTruthy()
    expect(screen.getByText(/Pull/)).toBeTruthy()
    expect(screen.getByText(/Legs/)).toBeTruthy()
  })

  it('has no Complete Week', async () => {
    await renderView({ readOnly: true, canActivate: true })
    expect(screen.queryByRole('button', { name: /complete week/i })).toBeNull()
  })

  it('tapping an unfinished workout offers no Start, Continue or Skip', async () => {
    await renderView({ readOnly: true, canActivate: true })
    for (const b of screen.getAllByRole('button')) fireEvent.click(b)
    expect(screen.queryByRole('button', { name: /start workout|continue workout/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^skip$/i })).toBeNull()
  })

  it('tapping a skipped workout does not unskip it', async () => {
    await renderView({ readOnly: true, canActivate: true })
    const before = calls.length
    for (const b of screen.getAllByRole('button')) fireEvent.click(b)
    await new Promise((r) => setTimeout(r, 20))
    expect(writes()).toEqual([])
    expect(calls.slice(before).filter((c) => c.method !== 'GET')).toEqual([])
  })

  it('does not open the logger for ?resume=', async () => {
    h.search = 'resume=w-open'
    await renderView({ readOnly: true, canActivate: true })
    await new Promise((r) => setTimeout(r, 30))
    expect(metadataCalls()).toEqual([])
  })

  it('week arrows stay on this program\'s detail page', async () => {
    await renderView({ readOnly: true, canActivate: true })
    expect(screen.getByRole('link', { name: /next week/i }).getAttribute('href')).toBe('/library/programs/p1?week=3')
  })

  it('shows "Make active to train"', async () => {
    await renderView({ readOnly: true, canActivate: true })
    expect(screen.getByRole('button', { name: /make active to train/i })).toBeTruthy()
  })

  it('an archived program is read-only without the button', async () => {
    await renderView({ readOnly: true, canActivate: false })
    expect(screen.queryByRole('button', { name: /make active to train/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /complete week/i })).toBeNull()
    expect(screen.getByText(/Push/)).toBeTruthy()
  })

  it('the button asks first, and nothing is activated until confirmed', async () => {
    await renderView({ readOnly: true, canActivate: true })
    fireEvent.click(screen.getByRole('button', { name: /make active to train/i }))
    expect(await screen.findByRole('button', { name: /yes, activate/i })).toBeTruthy()
    expect(writes()).toEqual([])
  })

  it('confirming activates this program and lands on its detail page', async () => {
    await renderView({ readOnly: true, canActivate: true })
    fireEvent.click(screen.getByRole('button', { name: /make active to train/i }))
    fireEvent.click(await screen.findByRole('button', { name: /yes, activate/i }))
    await waitFor(() => expect(h.push).toHaveBeenCalled())
    expect(writes().map((c) => `${c.method} ${c.url}`)).toEqual(['POST /api/programs/p1/activate'])
    expect(h.push).toHaveBeenCalledWith('/library/programs/p1')
    expect(h.push).not.toHaveBeenCalledWith('/training')
  })

  it('declining closes the question and stays on the page', async () => {
    await renderView({ readOnly: true, canActivate: true })
    fireEvent.click(screen.getByRole('button', { name: /make active to train/i }))
    fireEvent.click(await screen.findByRole('button', { name: /no, keep inactive/i }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /yes, activate/i })).toBeNull())
    expect(writes()).toEqual([])
    expect(h.push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /make active to train/i })).toBeTruthy()
  })
})

describe('activation modal: No, keep inactive', () => {
  async function renderModal(extra: { onSkip?: () => void } = {}) {
    const mod = (await import('@/components/StrengthActivationModal')) as {
      default: ComponentType<{ programId: string; onClose: () => void; onSkip?: () => void }>
    }
    const onClose = vi.fn()
    render(createElement(mod.default, { programId: 'p1', onClose, ...extra }))
    return { onClose }
  }

  it('with onSkip, only calls onSkip', async () => {
    const onSkip = vi.fn()
    const { onClose } = await renderModal({ onSkip })
    fireEvent.click(screen.getByRole('button', { name: /no, keep inactive/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(h.push).not.toHaveBeenCalled()
    expect(writes()).toEqual([])
  })

  it('without onSkip, closes and goes to the programs list', async () => {
    const { onClose } = await renderModal()
    fireEvent.click(screen.getByRole('button', { name: /no, keep inactive/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(h.push).toHaveBeenCalledWith('/programs')
    expect(writes()).toEqual([])
  })
})
