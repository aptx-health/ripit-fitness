/**
 * Planned sets, fixes from review 122 (work item 123). Spec: features/workout-logging/adhoc-planned-sets.feature,
 * "One effort picker per planned exercise", "Extra sets don't carry a hidden effort"; and the review's finding 4:
 * removing a logged set refills the form from the plan when the form is untouched.
 *
 * Interface as in adhoc-plan-view.test.tsx (the real AdHocLoggerView; hooks, toast, router and API stubbed):
 *   - Intensity on, an exercise whose plan has RPE targets: only the RPE picker, before and after the plan is
 *     done. Any other exercise (RIR plan, reps-only plan, no plan): only the RIR picker, as today.
 *   - A logged set carries only the effort of the picker shown; the other is null.
 *   - "Delete set <n>" (or a failed delete restoring the set) moves the form to the plan's new next set when
 *     its reps and effort are still what the plan filled in; a form the user changed is left alone.
 *   - The line reads "Target <summary>".
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdHocLoggerView from '@/components/adhoc/AdHocLoggerView'

const h = vi.hoisted(() => ({
  logCalls: [] as Array<Record<string, unknown>>,
  logFails: false,
  deleteFails: false,
  deletes: 0,
  history: null as unknown,
}))

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
  deleteAdHocSet: async () => {
    h.deletes++
    if (h.deleteFails) throw new Error('offline')
    return { renumbered: [] }
  },
  discardAdHocWorkout: vi.fn(),
  fetchExerciseHistory: async () => ({ history: h.history, sessions: [] }),
  logAdHocSet: async (_completionId: string, body: Record<string, unknown>) => {
    h.logCalls.push(body)
    if (h.logFails) throw new Error('offline')
    return { id: `saved-${h.logCalls.length}`, isWarmup: false, ...body }
  },
  reorderAdHocExercises: vi.fn(),
  swapAdHocExercise: vi.fn(),
}))

type Plan = { setNumber: number; reps: string; rpe: number | null; rir: number | null; isWarmup: boolean }
type Logged = { exerciseId: string; setNumber: number; reps: number; weight: number; rpe?: number | null; rir?: number | null }
const plan = (reps: string[], o: { rpe?: number; rir?: number } = {}): Plan[] =>
  reps.map((r, i) => ({ setNumber: i + 1, reps: r, rpe: o.rpe ?? null, rir: o.rir ?? null, isWarmup: false }))
const SQUAT = { id: 'squat', name: 'Back Squat', plan: plan(['8', '8', '8'], { rpe: 8 }) }
const LADDER = { id: 'ladder', name: 'Bench Press', plan: plan(['10', '8', '6'], { rpe: 8 }) }
const LEG = { id: 'leg', name: 'Leg Press', plan: plan(['12', '12'], { rir: 2 }) }
const PLANK = { id: 'plank', name: 'Plank', plan: plan(['60', '60']) }
const LATERAL = { id: 'lateral', name: 'Lateral Raise', plan: [] as Plan[] }

beforeEach(() => {
  h.logCalls = []
  h.logFails = false
  h.deleteFails = false
  h.deletes = 0
  h.history = null
  try {
    localStorage.clear()
  } catch {}
})
afterEach(() => cleanup())

async function mount(exercises: Array<{ id: string; name: string; plan: Plan[] }>, logged: Logged[] = []) {
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
      initialLoggedSets: logged.map((s, i) => ({ id: `L${i}`, weightUnit: 'lbs', isWarmup: false, rpe: null, rir: null, ...s })),
      muscleBalanceSnapshot: { fauScores: [], fauNeeds: [] } as never,
    }),
  )
  await screen.findByRole('button', { name: /^Log set/ })
  await act(async () => {})
}
const flat = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const line = () => document.querySelector('[data-plan-line]')
const repsValue = () => flat(screen.getByRole('button', { name: 'Edit reps with keypad' }))
const selector = (label: 'RPE' | 'RIR') => {
  const span = Array.from(document.querySelectorAll('span')).find((s) => flat(s) === label)
  return span ? flat(span.nextElementSibling) : null
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
async function logSet() {
  const before = h.logCalls.length
  fireEvent.click(screen.getByRole('button', { name: /^Log set/ }))
  await waitFor(() => expect(h.logCalls.length).toBe(before + 1))
  await act(async () => {})
}
async function deleteSet(n: number) {
  click(`Delete set ${n}`)
  await act(async () => {})
}
const squatDone = [1, 2, 3].map((n) => ({ exerciseId: 'squat', setNumber: n, reps: 8, weight: 135, rpe: 8 }))

// =====================================================================================
describe('One effort picker per planned exercise', () => {
  it('an RPE plan shows only the RPE picker, filled from the plan', async () => {
    await mount([SQUAT])
    expect(selector('RPE')).toBe('8')
    expect(selector('RIR')).toBeNull()
  })

  it('the picker stays after the plan is done in this session: nothing jumps', async () => {
    await mount([SQUAT])
    for (let i = 0; i < 3; i++) await logSet()
    expect(flat(line())).toContain('done')
    expect(selector('RPE')).not.toBeNull()
    expect(selector('RIR')).toBeNull()
  })

  it('and on a reopened session whose plan is done', async () => {
    await mount([SQUAT], squatDone)
    expect(selector('RPE')).not.toBeNull()
    expect(selector('RIR')).toBeNull()
  })

  it('RIR plans, reps-only plans and exercises without a plan keep the RIR picker as today', async () => {
    await mount([LEG, PLANK, LATERAL])
    expect(selector('RIR')).toBe('2')
    expect(selector('RPE')).toBeNull()
    click('Next exercise')
    await act(async () => new Promise((r) => setTimeout(r, 200)))
    expect(selector('RIR')).toBe('--')
    expect(selector('RPE')).toBeNull()
    click('Next exercise')
    await act(async () => new Promise((r) => setTimeout(r, 200)))
    expect(selector('RIR')).toBe('--')
    expect(selector('RPE')).toBeNull()
  })

  it('an RIR plan keeps the RIR picker once done', async () => {
    await mount([LEG], [1, 2].map((n) => ({ exerciseId: 'leg', setNumber: n, reps: 12, weight: 200, rir: 2 })))
    expect(selector('RIR')).not.toBeNull()
    expect(selector('RPE')).toBeNull()
  })
})

describe("Extra sets don't carry a hidden effort", () => {
  it('a 4th set of an RPE plan saves the RPE the form shows, and no RIR', async () => {
    await mount([SQUAT])
    for (let i = 0; i < 3; i++) await logSet()
    const shown = selector('RPE')
    await logSet()
    expect(h.logCalls[3]).toMatchObject({ setNumber: 4, rpe: shown === '--' ? null : Number(shown), rir: null })
  })

  it('every set of an RPE plan logs rir null; every set of an RIR plan logs rpe null', async () => {
    await mount([SQUAT, LEG])
    await logSet()
    click('Next exercise')
    await act(async () => new Promise((r) => setTimeout(r, 200)))
    await logSet()
    await logSet()
    await logSet() // past the plan
    expect(h.logCalls[0]).toMatchObject({ rpe: 8, rir: null })
    expect(h.logCalls.slice(1).map((c) => [c.rpe, c.rir])).toEqual([
      [null, 2],
      [null, 2],
      [null, 2],
    ])
  })

  it('an exercise without a plan: an RPE from history is not shown, so it is not logged either', async () => {
    h.history = { completedAt: new Date('2026-10-20'), workoutName: 'Old', sets: [{ setNumber: 1, reps: 15, weight: 20, weightUnit: 'lbs', rpe: 7, rir: null, isWarmup: false }] }
    await mount([LATERAL])
    await waitFor(() => expect(repsValue()).toContain('15'))
    expect(selector('RPE')).toBeNull()
    await logSet()
    expect(h.logCalls[0]).toMatchObject({ reps: 15, rpe: null })
  })
})

describe('Refill after a set is removed', () => {
  it('deleting the last logged set puts the form back on that planned set', async () => {
    await mount([LADDER])
    await logSet()
    await logSet()
    expect(repsValue()).toContain('6')
    await deleteSet(2)
    await waitFor(() => expect(repsValue()).toContain('8'))
    expect(flat(line())).toContain('set 2 next')
    expect(selector('RPE')).toBe('8')
  })

  it('a form the user changed is left alone', async () => {
    await mount([LADDER])
    await logSet()
    await logSet()
    click('Increase reps')
    expect(repsValue()).toContain('7')
    await deleteSet(2)
    expect(repsValue()).toContain('7')
  })

  it('a failed delete restores the set, and the form goes back with it', async () => {
    await mount([LADDER])
    await logSet()
    await logSet()
    h.deleteFails = true
    await deleteSet(2)
    await waitFor(() => expect(h.deletes).toBe(1))
    await act(async () => {})
    expect(flat(line())).toContain('set 3 next')
    expect(repsValue()).toContain('6')
  })

  it('a failed log: removing the unsaved set puts the form back on it', async () => {
    await mount([LADDER])
    h.logFails = true
    await logSet()
    await waitFor(() => expect(repsValue()).toContain('8'))
    await deleteSet(1)
    expect(h.deletes).toBe(0) // never reached the server, dropped locally
    await waitFor(() => expect(repsValue()).toContain('10'))
    expect(flat(line())).toContain('set 1 next')
  })

  it('an exercise without a plan is as today: deleting leaves the form', async () => {
    await mount([LATERAL])
    click('Increase reps')
    const before = repsValue()
    await logSet()
    await deleteSet(1)
    expect(repsValue()).toBe(before)
  })
})

describe('The Target line', () => {
  it('reads "Target" and the summary', async () => {
    await mount([SQUAT])
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · set 1 next')
  })
})
