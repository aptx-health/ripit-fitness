/**
 * Planned sets in the workout logger: the Plan line, expand and remember, and the pre-filled form (work item 120).
 * Spec: features/workout-logging/adhoc-planned-sets.feature. Text, structure and behaviour only: the 390px /
 * dark look is the reviewer's job. The real AdHocLoggerView, tabs, form and bottom bar are rendered; only
 * the hooks, the toast, the router and the API calls are stubbed.
 *
 * Pinned interface:
 *   - Each entry of AdHocLoggerView's `initialExercises` may carry `prescribedSets` (shape in
 *     adhoc-page-plans.test.ts); missing or [] is no plan.
 *   - The Plan line: a button with the attribute data-plan-line, in the Log tab under the exercise, only for
 *     an exercise with a plan (working sets; warm-ups are not part of it). aria-expanded; at least 48px
 *     (class h-12 / min-h-12). Its text is "Target" (renamed from "Plan" by Dustin 2026-11-02, lead amendment, work 123) and the summary of lib/workout-logging/plan-summary
 *     (plan-summary.test.ts) for the number of working sets logged so far: "Plan 3 × 8 @ RPE 8 · set 1 next".
 *     Collapsed: the per-set list is not shown. Expanded: a list named "Planned sets" with one listitem
 *     per planned set, in order: it starts with "Set <n>" and reads the target as "8 @ RPE 8", "12 @ 2 RIR"
 *     or "60"; a logged set's item says "done" and what was logged (reps and weight); the next set's item
 *     says "next"; the others say neither. The choice (expanded or not) is one setting for all
 *     exercises, kept in localStorage (read and write guarded: if the storage throws, the line still works
 *     for the session).
 *   - The ad-hoc layout does not change for a planned exercise: the logged-sets list stays the ad-hoc one
 *     (no "Sets" header, no rows for planned sets that are not logged).
 *   - Pre-fill: the form's reps and effort come from the next planned set when the form is untouched, i.e.
 *     on opening the exercise and after each logged set (logging a set finishes what the user typed for
 *     it). The plan wins over the previous workout's reps and effort; the weight is as today (the previous
 *     workout's last set, or the carried weight). A field the user changed since is not overwritten (not by
 *     the history arriving late either). With the plan done, or no plan, the form is as today.
 *   - Effort fields only when intensity is on (useIntensityAccess): then the RIR selector is there as today,
 *     and an RPE selector (same markup: the label "RPE" and the value button) is shown when the next planned set
 *     has an RPE target. Intensity off: no RPE or RIR selector, nothing pre-filled and nothing logged for
 *     effort (rpe and rir null in the logged set); the Plan line still shows the target.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)

const h = vi.hoisted(() => ({
  intensity: true,
  history: {} as Record<string, unknown>,
  gate: null as null | Promise<void>,
  logCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/useImagePrefetch', () => ({ useImagePrefetch: () => {} }))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: h.intensity, isLoading: false }) }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: { completedTours: '[]', loggingMode: 'full', defaultWeightUnit: 'lbs' },
    isLoading: false,
    updateSettings: async () => {},
  }),
}))
vi.mock('@/lib/api/adhoc-workout', () => ({
  addAdHocExercises: vi.fn(),
  completeAdHocWorkout: vi.fn(),
  deleteAdHocExercise: vi.fn(),
  deleteAdHocSet: vi.fn(),
  discardAdHocWorkout: vi.fn(),
  fetchExerciseHistory: async (id: string) => {
    if (h.gate) await h.gate
    return { history: h.history[id] ?? null, sessions: [] }
  },
  logAdHocSet: async (_completionId: string, body: Record<string, unknown>) => {
    h.logCalls.push(body)
    return { id: `saved-${h.logCalls.length}`, isWarmup: false, ...body }
  },
  reorderAdHocExercises: vi.fn(),
  swapAdHocExercise: vi.fn(),
}))

type Plan = { setNumber: number; reps: string; rpe: number | null; rir: number | null; isWarmup: boolean }
type Ex = { id: string; name: string; plan?: Plan[] }
type Logged = { exerciseId: string; setNumber: number; reps: number; weight: number; rpe?: number | null; rir?: number | null }

const plan = (reps: string[], o: { rpe?: number; rir?: number } = {}): Plan[] =>
  reps.map((r, i) => ({ setNumber: i + 1, reps: r, rpe: o.rpe ?? null, rir: o.rir ?? null, isWarmup: false }))
const SQUAT: Ex = { id: 'squat', name: 'Back Squat', plan: plan(['8', '8', '8'], { rpe: 8 }) }
const BENCH: Ex = { id: 'bench', name: 'Bench Press', plan: plan(['5', '5', '8'], { rpe: 8 }) }
const LEG: Ex = { id: 'leg', name: 'Leg Press', plan: plan(['12', '12', '12'], { rir: 2 }) }
const PLANK: Ex = { id: 'plank', name: 'Plank', plan: plan(['60', '60', '60']) }
const LATERAL: Ex = { id: 'lateral', name: 'Lateral Raise', plan: [] }

beforeEach(() => {
  h.intensity = true
  h.history = {}
  h.gate = null
  h.logCalls = []
  try {
    localStorage.clear()
  } catch {}
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function mount(exercises: Ex[], o: { logged?: Logged[] } = {}) {
  const View = (await load('@/components/adhoc/AdHocLoggerView')) as { default: unknown }
  const props = {
    completionId: 'c1',
    completionName: 'Leg day',
    startedAt: null,
    initialExercises: exercises.map((e) => ({
      id: e.id,
      name: e.name,
      notes: null,
      exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [] },
      ...(e.plan ? { prescribedSets: e.plan } : {}),
    })),
    initialLoggedSets: (o.logged ?? []).map((s, i) => ({
      id: `L${i}`,
      weightUnit: 'lbs',
      rpe: null,
      rir: null,
      isWarmup: false,
      ...s,
    })),
    muscleBalanceSnapshot: { fauScores: [], fauNeeds: [] },
  }
  const view = render(createElement(View.default as never, props as never))
  await screen.findByRole('button', { name: /^Log set/ })
  await act(async () => {})
  return view
}
const flat = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
const line = () => document.querySelector('[data-plan-line]') as HTMLButtonElement | null
const repsValue = () => flat(screen.getByRole('button', { name: 'Edit reps with keypad' }))
const weightValue = () => flat(screen.getByRole('button', { name: /^\d+(\.\d+)?\s*(lbs|kg)/ }))
const selector = (label: 'RPE' | 'RIR') => {
  const span = Array.from(document.querySelectorAll('span')).find((s) => flat(s) === label)
  return span ? flat(span.nextElementSibling) : null
}
const next = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Next exercise' }))
  await act(async () => {
    await new Promise((r) => setTimeout(r, 200))
  })
}
const logSet = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Log set/ }))
  await waitFor(() => expect(h.logCalls.length).toBeGreaterThan(0))
  await act(async () => {})
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const items = () => within(screen.getByRole('list', { name: 'Planned sets' })).getAllByRole('listitem')

// =====================================================================================
describe('Summary line', () => {
  it('Collapsed summary under the exercise: a "Plan" line reads "3 × 8 @ RPE 8 · set 1 next", the per-set plan hidden', async () => {
    await mount([SQUAT])
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · set 1 next')
    expect(line()?.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('list', { name: 'Planned sets' })).toBeNull()
  })

  it('the line is a button of at least 48px', async () => {
    await mount([SQUAT])
    expect(line()?.tagName).toBe('BUTTON')
    expect(line()?.className).toMatch(/(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\])(\s|$)/)
  })

  it('Mixed sets summarize honestly; RIR plans; reps only (one exercise after another)', async () => {
    await mount([BENCH, LEG, PLANK])
    expect(flat(line())).toBe('Target 3 sets · 5, 5, 8 reps @ RPE 8 · set 1 next')
    await next()
    expect(flat(line())).toBe('Target 3 × 12 @ 2 RIR · set 1 next')
    await next()
    expect(flat(line())).toBe('Target 3 × 60 · set 1 next')
  })

  it('Progress through the plan: 1 set of Back Squat logged reads "set 2 next"', async () => {
    await mount([SQUAT], { logged: [{ exerciseId: 'squat', setNumber: 1, reps: 8, weight: 135, rpe: 8 }] })
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · set 2 next')
  })

  it('Plan done: 3 sets logged reads "done"', async () => {
    const logged = [1, 2, 3].map((n) => ({ exerciseId: 'squat', setNumber: n, reps: 8, weight: 135, rpe: 8 }))
    await mount([SQUAT], { logged })
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · done')
  })

  it('Extra sets beyond the plan: 4 sets logged reads "done" and logging more is still allowed', async () => {
    const logged = [1, 2, 3, 4].map((n) => ({ exerciseId: 'squat', setNumber: n, reps: 8, weight: 135, rpe: 8 }))
    await mount([SQUAT], { logged })
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · done')
    click('Increase reps')
    await logSet()
    expect(h.logCalls[0]).toMatchObject({ exerciseId: 'squat', setNumber: 5 })
  })

  it('logging a set in the logger moves the line on', async () => {
    await mount([SQUAT])
    await logSet()
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · set 2 next')
  })

  it('only the logged sets of this exercise count', async () => {
    await mount([SQUAT, BENCH], { logged: [{ exerciseId: 'bench', setNumber: 1, reps: 5, weight: 185, rpe: 8 }] })
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · set 1 next')
  })

  it('warm-ups are not part of the plan', async () => {
    const warm: Plan = { setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true }
    await mount([{ ...SQUAT, plan: [warm, ...plan(['8', '8'], { rpe: 8 }).map((s) => ({ ...s, setNumber: s.setNumber + 1 }))] }])
    expect(flat(line())).toBe('Target 2 × 8 @ RPE 8 · set 1 next')
    expect(repsValue()).toContain('8')
  })

  it('Intensity off: the Plan line still shows the target', async () => {
    h.intensity = false
    await mount([SQUAT, LEG])
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · set 1 next')
    await next()
    expect(flat(line())).toBe('Target 3 × 12 @ 2 RIR · set 1 next')
  })
})

describe('Expand the plan', () => {
  it('tapping the line lists each planned set with its reps and effort', async () => {
    await mount([SQUAT])
    fireEvent.click(line() as HTMLElement)
    expect(line()?.getAttribute('aria-expanded')).toBe('true')
    const rows = items()
    expect(rows).toHaveLength(3)
    rows.forEach((r, i) => {
      expect(flat(r)).toMatch(new RegExp(`^Set ${i + 1}\\b`))
      expect(flat(r)).toContain('8 @ RPE 8')
    })
  })

  it('a mixed plan lists each set\'s own reps; RIR and reps-only targets read as in the summary', async () => {
    await mount([BENCH, LEG, PLANK])
    fireEvent.click(line() as HTMLElement)
    expect(items().map((r) => /\d+ @ RPE 8/.exec(flat(r))?.[0])).toEqual(['5 @ RPE 8', '5 @ RPE 8', '8 @ RPE 8'])
    await next()
    expect(items().map((r) => /\d+ @ 2 RIR/.exec(flat(r))?.[0])).toEqual(['12 @ 2 RIR', '12 @ 2 RIR', '12 @ 2 RIR'])
    await next()
    expect(items().map((r) => flat(r))).toEqual([expect.stringMatching(/^Set 1\b.*\b60\b/), expect.stringMatching(/^Set 2\b.*\b60\b/), expect.stringMatching(/^Set 3\b.*\b60\b/)])
    expect(items().every((r) => !/RPE|RIR/.test(flat(r)))).toBe(true)
  })

  it('logged sets are marked done with what was logged, and the next set is marked "next"', async () => {
    await mount([SQUAT], { logged: [{ exerciseId: 'squat', setNumber: 1, reps: 8, weight: 135, rpe: 8 }] })
    fireEvent.click(line() as HTMLElement)
    const [one, two, three] = items().map(flat)
    expect(one).toContain('done')
    expect(one).toMatch(/\b8\b/)
    expect(one).toContain('135')
    expect(one).not.toContain('next')
    expect(two).toContain('next')
    expect(two).not.toContain('done')
    expect(three).not.toMatch(/done|next/)
  })

  it('what was logged is shown even when it differs from the plan', async () => {
    await mount([SQUAT], { logged: [{ exerciseId: 'squat', setNumber: 1, reps: 6, weight: 225, rpe: 9 }] })
    fireEvent.click(line() as HTMLElement)
    const one = flat(items()[0])
    expect(one).toContain('done')
    expect(one).toContain('225')
    expect(one).toMatch(/\b6\b/)
  })

  it('with a warm-up in the plan, the rows are the working sets and the marks follow them', async () => {
    const warm: Plan = { setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true }
    const work = plan(['6', '6', '6'], { rpe: 7 }).map((s) => ({ ...s, setNumber: s.setNumber + 1 }))
    await mount([{ ...SQUAT, plan: [warm, ...work] }], { logged: [{ exerciseId: 'squat', setNumber: 1, reps: 6, weight: 185, rpe: 7 }] })
    fireEvent.click(line() as HTMLElement)
    const rows = items().map(flat)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain('done')
    expect(rows[1]).toContain('next')
    expect(rows[2]).not.toMatch(/done|next/)
  })

  it('the marks follow a set logged now', async () => {
    await mount([SQUAT])
    fireEvent.click(line() as HTMLElement)
    expect(flat(items()[0])).toContain('next')
    await logSet()
    expect(flat(items()[0])).toContain('done')
    expect(flat(items()[1])).toContain('next')
  })

  it('a finished plan has no "next", and extra sets add no rows', async () => {
    const logged = [1, 2, 3, 4].map((n) => ({ exerciseId: 'squat', setNumber: n, reps: 8, weight: 135, rpe: 8 }))
    await mount([SQUAT], { logged })
    fireEvent.click(line() as HTMLElement)
    expect(items()).toHaveLength(3)
    expect(items().every((r) => /done/.test(flat(r)) && !/next/.test(flat(r)))).toBe(true)
  })

  it('tapping again hides the list', async () => {
    await mount([SQUAT])
    fireEvent.click(line() as HTMLElement)
    fireEvent.click(line() as HTMLElement)
    expect(line()?.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('list', { name: 'Planned sets' })).toBeNull()
  })
})

describe('The choice is remembered', () => {
  it('plans stay expanded when the user moves to another exercise', async () => {
    await mount([SQUAT, BENCH])
    fireEvent.click(line() as HTMLElement)
    await next()
    expect(line()?.getAttribute('aria-expanded')).toBe('true')
    expect(items()).toHaveLength(3)
  })

  it('plans stay expanded when the logger is reopened', async () => {
    const first = await mount([SQUAT])
    fireEvent.click(line() as HTMLElement)
    first.unmount()
    await mount([SQUAT])
    expect(line()?.getAttribute('aria-expanded')).toBe('true')
    expect(items()).toHaveLength(3)
  })

  it('until the user collapses one: then they are collapsed everywhere, and after a reopen', async () => {
    const first = await mount([SQUAT, BENCH])
    fireEvent.click(line() as HTMLElement)
    await next()
    fireEvent.click(line() as HTMLElement)
    expect(line()?.getAttribute('aria-expanded')).toBe('false')
    first.unmount()
    await mount([SQUAT, BENCH])
    expect(line()?.getAttribute('aria-expanded')).toBe('false')
  })

  it('the choice is not per exercise: reopened on a different exercise, it is still expanded', async () => {
    const first = await mount([SQUAT, BENCH])
    fireEvent.click(line() as HTMLElement)
    await next()
    first.unmount()
    await mount([BENCH, SQUAT])
    expect(line()?.getAttribute('aria-expanded')).toBe('true')
    expect(items()).toHaveLength(3)
  })

  it('collapsed is the start when nothing was ever chosen', async () => {
    await mount([SQUAT, BENCH])
    await next()
    expect(line()?.getAttribute('aria-expanded')).toBe('false')
  })

  it('storage that throws does not break the line: it still expands and collapses for the session', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await mount([SQUAT])
    expect(flat(line())).toBe('Target 3 × 8 @ RPE 8 · set 1 next')
    fireEvent.click(line() as HTMLElement)
    expect(items()).toHaveLength(3)
    fireEvent.click(line() as HTMLElement)
    expect(screen.queryByRole('list', { name: 'Planned sets' })).toBeNull()
  })
})

describe('No plan', () => {
  it('Exercises without a plan: Lateral Raise added during the session shows no Plan line', async () => {
    await mount([SQUAT, LATERAL])
    expect(line()).not.toBeNull()
    await next()
    expect(line()).toBeNull()
    expect(screen.queryByRole('list', { name: 'Planned sets' })).toBeNull()
  })

  it('an exercise with no prescribedSets field at all shows no Plan line either', async () => {
    await mount([{ id: 'x', name: 'Cable Fly' }])
    expect(line()).toBeNull()
  })

  it('Fresh ad-hoc sessions: no exercise shows a Plan line', async () => {
    await mount([{ id: 'a', name: 'Cable Fly', plan: [] }, { id: 'b', name: 'Dips', plan: [] }])
    expect(line()).toBeNull()
    await next()
    expect(line()).toBeNull()
  })

  it('an exercise whose plan is only warm-ups shows no Plan line', async () => {
    await mount([{ id: 'x', name: 'Deadlift', plan: [{ setNumber: 1, reps: '10', rpe: null, rir: null, isWarmup: true }] }])
    expect(line()).toBeNull()
  })

  it('the form of a planless exercise is as today: nothing pre-filled, history still fills it', async () => {
    h.history = { lateral: { completedAt: new Date('2026-10-20'), workoutName: 'Old', sets: [{ setNumber: 1, reps: 12, weight: 15, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false }] } }
    await mount([LATERAL])
    await waitFor(() => expect(repsValue()).toContain('12'))
    expect(weightValue()).toContain('15')
  })

  it('a planned exercise keeps the ad-hoc logged-sets list: no "Sets" header and no rows for sets not yet logged', async () => {
    await mount([SQUAT])
    expect(screen.queryByText('Sets')).toBeNull()
    await logSet()
    expect(screen.queryByText('Sets')).toBeNull()
  })
})

// =====================================================================================
describe('The form pre-fills the next planned set', () => {
  it('opening Back Squat: reps 8 and RPE 8', async () => {
    await mount([SQUAT])
    expect(repsValue()).toContain('8')
    expect(selector('RPE')).toBe('8')
  })

  it('after 1 set logged (as the session was reopened): reps 8 and RPE 8 for set 2', async () => {
    await mount([SQUAT], { logged: [{ exerciseId: 'squat', setNumber: 1, reps: 6, weight: 135, rpe: 9 }] })
    expect(repsValue()).toContain('8')
    expect(selector('RPE')).toBe('8')
  })

  it('RIR plan: reps 12 and RIR 2, and no RPE selector', async () => {
    await mount([LEG])
    expect(repsValue()).toContain('12')
    expect(selector('RIR')).toBe('2')
    expect(selector('RPE')).toBeNull()
  })

  it('reps-only plan: reps filled, effort empty', async () => {
    await mount([PLANK])
    expect(repsValue()).toContain('60')
    expect(selector('RIR')).toBe('--')
    expect(selector('RPE')).toBeNull()
  })

  it('an RPE plan with RIR also shown: RIR stays empty', async () => {
    await mount([SQUAT])
    // lead amendment 2026-11-02 (Dustin: one effort picker), work 123
    expect(selector('RIR')).toBeNull()
  })

  it('the plan moves on with each set logged here: 5, then 5, then 8', async () => {
    await mount([BENCH])
    expect(repsValue()).toContain('5')
    await logSet()
    expect(repsValue()).toContain('5')
    expect(flat(line())).toContain('set 2 next')
    await logSet()
    expect(repsValue()).toContain('8')
    expect(flat(line())).toContain('set 3 next')
    expect(h.logCalls.map((c) => c.reps)).toEqual([5, 5])
  })

  it('what the plan filled in is what gets logged: reps and effort', async () => {
    await mount([SQUAT])
    await logSet()
    expect(h.logCalls[0]).toMatchObject({ exerciseId: 'squat', setNumber: 1, reps: 8, rpe: 8, rir: null })
  })

  it('an RIR plan logs its RIR', async () => {
    await mount([LEG])
    await logSet()
    expect(h.logCalls[0]).toMatchObject({ reps: 12, rir: 2, rpe: null })
  })

  it('the weight is pre-filled as today: the previous workout\'s last set, and the plan does not touch it', async () => {
    h.history = { squat: { completedAt: new Date('2026-10-20'), workoutName: 'Old', sets: [{ setNumber: 1, reps: 5, weight: 135, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false }] } }
    await mount([SQUAT])
    await waitFor(() => expect(weightValue()).toContain('135'))
    expect(repsValue()).toContain('8') // the plan's reps, not the old 5
    expect(selector('RPE')).toBe('8')
  })

  it('the weight carries from the set just logged', async () => {
    h.history = { squat: { completedAt: new Date('2026-10-20'), workoutName: 'Old', sets: [{ setNumber: 1, reps: 5, weight: 135, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false }] } }
    await mount([SQUAT])
    await waitFor(() => expect(weightValue()).toContain('135'))
    await logSet()
    expect(weightValue()).toContain('135')
    expect(h.logCalls[0]).toMatchObject({ weight: 135, reps: 8 })
  })

  it('moving to another exercise pre-fills that one\'s plan, and coming back pre-fills this one\'s again', async () => {
    await mount([SQUAT, LEG])
    await next()
    expect(repsValue()).toContain('12')
    expect(selector('RIR')).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Previous exercise' }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })
    expect(repsValue()).toContain('8')
    expect(selector('RPE')).toBe('8')
  })

  it('sets logged on another exercise do not move this exercise\'s plan', async () => {
    const logged = [1, 2].map((n) => ({ exerciseId: 'squat', setNumber: n, reps: 8, weight: 185, rpe: 8 }))
    await mount([SQUAT, BENCH], { logged })
    await next()
    expect(flat(line())).toBe('Target 3 sets · 5, 5, 8 reps @ RPE 8 · set 1 next')
    expect(repsValue()).toContain('5')
    expect(repsValue()).not.toContain('8')
  })

  it('Plan done: nothing is pre-filled, as today', async () => {
    const logged = [1, 2, 3].map((n) => ({ exerciseId: 'squat', setNumber: n, reps: 8, weight: 135, rpe: 8 }))
    await mount([{ ...SQUAT, plan: undefined }], { logged })
    const today = repsValue()
    cleanup()
    await mount([SQUAT], { logged })
    expect(repsValue()).toBe(today)
    // lead amendment 2026-11-02 (Dustin: one effort picker), work 123
    expect(selector('RIR')).toBeNull()
  })

  it('warm-ups in the plan are skipped: the first working set\'s reps are filled', async () => {
    const warm: Plan = { setNumber: 1, reps: '15', rpe: null, rir: null, isWarmup: true }
    const work = plan(['6', '6'], { rpe: 7 }).map((s) => ({ ...s, setNumber: s.setNumber + 1 }))
    await mount([{ ...SQUAT, plan: [warm, ...work] }])
    expect(repsValue()).toContain('6')
    expect(selector('RPE')).toBe('7')
  })
})

describe('Pre-fill doesn\'t overwrite typing', () => {
  it('the user typed 6 into reps: the plan does not replace it, not even when the history arrives late', async () => {
    let release = () => {}
    h.gate = new Promise<void>((r) => {
      release = r
    })
    h.history = { squat: { completedAt: new Date('2026-10-20'), workoutName: 'Old', sets: [{ setNumber: 1, reps: 5, weight: 135, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false }] } }
    await mount([SQUAT])
    click('Decrease reps')
    click('Decrease reps')
    expect(repsValue()).toContain('6')
    await act(async () => {
      release()
    })
    await waitFor(() => expect(weightValue()).toContain('135'))
    expect(repsValue()).toContain('6')
  })

  it('expanding and collapsing the Plan line leaves typed reps alone', async () => {
    await mount([SQUAT])
    click('Decrease reps')
    expect(repsValue()).toContain('7')
    fireEvent.click(line() as HTMLElement)
    fireEvent.click(line() as HTMLElement)
    expect(repsValue()).toContain('7')
  })

  it('what the user typed is logged', async () => {
    await mount([SQUAT])
    click('Decrease reps')
    click('Decrease reps')
    await logSet()
    expect(h.logCalls[0]).toMatchObject({ reps: 6, rpe: 8 })
  })

  it('but once that set is logged, the next set gets the plan again', async () => {
    await mount([BENCH])
    click('Decrease reps')
    expect(repsValue()).toContain('4')
    await logSet()
    expect(h.logCalls[0]).toMatchObject({ reps: 4 })
    expect(repsValue()).toContain('5')
    expect(repsValue()).not.toContain('4')
  })

  it('and a set logged lighter or heavier does not move the plan: set 3 still asks for 8', async () => {
    await mount([BENCH])
    click('Increase reps')
    click('Increase reps')
    await logSet()
    await logSet()
    expect(repsValue()).toContain('8')
  })
})

describe('Effort fields only when enabled', () => {
  it('intensity off: no RPE or RIR in the form, whatever the plan', async () => {
    h.intensity = false
    await mount([SQUAT, LEG])
    expect(selector('RPE')).toBeNull()
    expect(selector('RIR')).toBeNull()
    await next()
    expect(selector('RPE')).toBeNull()
    expect(selector('RIR')).toBeNull()
  })

  it('intensity off: reps are still pre-filled', async () => {
    h.intensity = false
    await mount([SQUAT])
    expect(repsValue()).toContain('8')
  })

  it('intensity off: no effort is logged, though the plan has a target', async () => {
    h.intensity = false
    await mount([SQUAT, LEG])
    await logSet()
    expect(h.logCalls[0]).toMatchObject({ reps: 8, rpe: null, rir: null })
    await next()
    await logSet()
    expect(h.logCalls[1]).toMatchObject({ reps: 12, rpe: null, rir: null })
  })

  it('intensity on, an exercise with no plan: the RIR selector as today and no RPE selector', async () => {
    await mount([LATERAL])
    expect(selector('RIR')).toBe('--')
    expect(selector('RPE')).toBeNull()
  })
})
