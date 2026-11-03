/**
 * Planned sets: celebrating the last planned set (work item 124). Spec: features/workout-logging/
 * adhoc-planned-sets.feature, "Plan complete" scenarios.
 *
 * Interface (the real AdHocLoggerView; hooks, toast, router and API stubbed):
 *   - A finished plan shows a check on the Target line: [data-plan-done] inside it.
 *   - The set that takes the exercise's saved working sets from below the plan to exactly the plan plays a
 *     flash: a [data-plan-flash] element (the app's .doom-set-logged animation). Each finish mounts a new
 *     element (a replay); no new element means no flash. Not on mount, on moving between exercises, or for
 *     extra sets; again after a delete drops below the plan and the user logs back up to it.
 *   - prefers-reduced-motion: the check, no flash element.
 *   - A set that failed to save doesn't finish the plan: no check.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdHocLoggerView from '@/components/adhoc/AdHocLoggerView'

const h = vi.hoisted(() => ({ logCalls: 0, logFails: false }))

vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/useImagePrefetch', () => ({ useImagePrefetch: () => {} }))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: true, isLoading: false }) }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: { completedTours: '[]', loggingMode: 'full', defaultWeightUnit: 'lbs' },
    isLoading: false,
    updateSettings: async () => {},
  }),
}))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api/adhoc-workout', () => ({
  addAdHocExercises: vi.fn(),
  completeAdHocWorkout: vi.fn(),
  deleteAdHocExercise: vi.fn(),
  deleteAdHocSet: async () => ({ renumbered: [] }),
  discardAdHocWorkout: vi.fn(),
  fetchExerciseHistory: async () => ({ history: null, sessions: [] }),
  logAdHocSet: async (_completionId: string, body: Record<string, unknown>) => {
    h.logCalls++
    if (h.logFails) throw new Error('offline')
    return { id: `saved-${h.logCalls}`, isWarmup: false, ...body }
  },
  reorderAdHocExercises: vi.fn(),
  swapAdHocExercise: vi.fn(),
}))

type Plan = { setNumber: number; reps: string; rpe: number | null; rir: number | null; isWarmup: boolean }
const plan = (n: number): Plan[] => Array.from({ length: n }, (_, i) => ({ setNumber: i + 1, reps: '8', rpe: 8, rir: null, isWarmup: false }))
const SQUAT = { id: 'squat', name: 'Back Squat', plan: plan(3) }
const BENCH = { id: 'bench', name: 'Bench Press', plan: plan(2) }
const done = (id: string, n: number) => Array.from({ length: n }, (_, i) => ({ exerciseId: id, setNumber: i + 1, reps: 8, weight: 135, rpe: 8 }))

let reducedMotion = false
beforeEach(() => {
  h.logCalls = 0
  h.logFails = false
  reducedMotion = false
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }))
  try {
    localStorage.clear()
  } catch {}
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function mount(exercises: Array<{ id: string; name: string; plan: Plan[] }>, logged: ReturnType<typeof done> = []) {
  render(
    createElement(AdHocLoggerView, {
      completionId: 'c1',
      completionName: 'Leg day',
      startedAt: null,
      initialExercises: exercises.map((e) => ({
        id: e.id,
        name: e.name,
        notes: null,
        exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [] },
        prescribedSets: e.plan,
      })),
      initialLoggedSets: logged.map((s, i) => ({ id: `L${i}`, weightUnit: 'lbs', isWarmup: false, rir: null, ...s })),
      muscleBalanceSnapshot: { fauScores: [], fauNeeds: [] } as never,
    }),
  )
  await screen.findByRole('button', { name: /^Log set/ })
  await act(async () => {})
}
const flat = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const line = () => document.querySelector('[data-plan-line]')
const check = () => document.querySelector('[data-plan-line] [data-plan-done]')
const flash = () => document.querySelector('[data-plan-flash]')
const flashes = () => document.querySelectorAll('[data-plan-flash]').length
async function logSet() {
  const before = h.logCalls
  fireEvent.click(screen.getByRole('button', { name: /^Log set/ }))
  await waitFor(() => expect(h.logCalls).toBe(before + 1))
  await act(async () => {})
}
async function go(name: 'Next exercise' | 'Previous exercise') {
  fireEvent.click(screen.getByRole('button', { name }))
  await act(async () => new Promise((r) => setTimeout(r, 200)))
}

describe('Finishing the plan', () => {
  it('the set that finishes the plan flashes the line once and shows the check', async () => {
    await mount([SQUAT])
    await logSet()
    await logSet()
    expect(flash()).toBeNull()
    expect(check()).toBeNull()
    await logSet()
    expect(flat(line())).toContain('done')
    expect(flashes()).toBe(1)
    expect(flash()?.className).toMatch(/doom-set-logged/)
    expect(check()).not.toBeNull()
  })

  it('the check sits on the Target line and adds no text to it', async () => {
    await mount([SQUAT], done('squat', 2))
    await logSet()
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · done')
  })

  it('a one-set plan flashes on its only set', async () => {
    await mount([{ id: 'one', name: 'Deadlift', plan: plan(1) }])
    await logSet()
    expect(flashes()).toBe(1)
  })
})

describe('Already done', () => {
  it('a line that is done on opening shows the check without the flash', async () => {
    await mount([SQUAT], done('squat', 3))
    expect(check()).not.toBeNull()
    expect(flash()).toBeNull()
  })

  it('more sets logged than planned on opening: the check, no flash', async () => {
    await mount([SQUAT], done('squat', 5))
    expect(check()).not.toBeNull()
    expect(flash()).toBeNull()
  })

  it('moving to a done exercise and back does not flash', async () => {
    await mount([SQUAT, BENCH], [...done('squat', 1), ...done('bench', 2)])
    await go('Next exercise')
    expect(check()).not.toBeNull()
    expect(flash()).toBeNull()
    await go('Previous exercise')
    expect(flash()).toBeNull()
    await go('Next exercise')
    expect(flash()).toBeNull()
  })

  it('a flash on one exercise does not follow to the next one', async () => {
    await mount([SQUAT, BENCH], [...done('squat', 2), ...done('bench', 2)])
    await logSet()
    expect(flashes()).toBe(1)
    await go('Next exercise')
    expect(flash()).toBeNull()
  })
})

describe('Extra sets', () => {
  it('a 4th set after finishing in the session does not replay the flash', async () => {
    await mount([SQUAT], done('squat', 2))
    await logSet()
    const first = flash()
    expect(first).not.toBeNull()
    await logSet()
    expect(flash()).toBe(first)
    expect(flashes()).toBe(1)
    expect(check()).not.toBeNull()
  })

  it('a 4th set on a plan done on opening does not flash', async () => {
    await mount([SQUAT], done('squat', 3))
    fireEvent.click(screen.getByRole('button', { name: 'Increase reps' })) // a done plan fills nothing
    await logSet()
    expect(flash()).toBeNull()
  })
})

describe('Deleting back below the plan, then finishing again', () => {
  it('deleting reads "set 3 next" with no check; logging the 3rd again replays the flash', async () => {
    await mount([SQUAT], done('squat', 2))
    await logSet()
    const first = flash()
    expect(first).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete set 3' }))
    await act(async () => {})
    expect(flat(line())).toContain('set 3 next')
    expect(check()).toBeNull()
    await logSet()
    expect(check()).not.toBeNull()
    expect(flashes()).toBe(1)
    expect(flash()).not.toBe(first) // a new element: the animation plays again
  })

  it('also from a plan that was done on opening', async () => {
    await mount([SQUAT], done('squat', 3))
    fireEvent.click(screen.getByRole('button', { name: 'Delete set 3' }))
    await act(async () => {})
    expect(check()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Increase reps' })) // the form was empty: nothing to refill
    await logSet()
    expect(flash()).not.toBeNull()
    expect(check()).not.toBeNull()
  })
})

describe('A set that fails to save', () => {
  it('does not leave the check showing', async () => {
    await mount([SQUAT], done('squat', 2))
    h.logFails = true
    await logSet()
    await waitFor(() => expect(check()).toBeNull())
  })
})

describe('Reduced motion', () => {
  it('the check mark appears without the flash', async () => {
    reducedMotion = true
    await mount([SQUAT], done('squat', 2))
    await logSet()
    expect(check()).not.toBeNull()
    expect(flash()).toBeNull()
  })
})
