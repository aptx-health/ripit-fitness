/**
 * L3 as the loggers wire it: the plan opener ("Plan 2/6"), the plan sheet fed with progress, the one-Finish
 * rule, and the 090 carry-over in the logger itself (the intensity tip's dismiss). The programmed logger
 * (ExerciseLoggingModal, including follow-along) and the freestyle logger (AdHocLoggerView) are rendered with
 * the same stubs as logger-bottom-bar-loggers.test.tsx (copied); the header, the real WorkoutPlanEditor and the
 * LoggerBottomBar are the real ones. The sheet and tabs on their own: logger-plan-sheet / logger-plan-tabs.
 * Behaviour: features/ui-audit/logger-plan.feature. Spec: initiatives/ui-audit/spec.md ("L3").
 *
 * PINNED
 *   - Header opener: button named "Plan <n>/<total>" (programmed: current index + 1 of totalExercises;
 *     freestyle: of the exercises added so far). Tapping it opens the real plan sheet, a dialog "Workout plan"
 *     with the chip "<n>/<total>".
 *   - Programmed logger sheet data: GET /api/workouts/<workoutId>/exercises (as today; the response's
 *     exercises each carry prescribedSets) gives each row setsPlanned = prescribedSets.length; setsDone is the
 *     count of that exercise's entries in the workout's logged sets. The summary is the sums, then the clock
 *     ("6 of 12 sets · 00:00"-style: "<done> of <planned> sets · <mm:ss>"). Rows: done / now / upcoming as in the sheet tests.
 *   - Freestyle logger sheet data: every exercise added so far, setsDone from the logged sets, no setsPlanned:
 *     rows read "2 sets", the summary "<n> sets · <mm:ss>".
 *   - Jump: tapping a row calls the progressive-exercises goToExercise(index) and closes the sheet (freestyle: shows that
 *     exercise). Add, Swap and Delete (after the row menu's own confirm) behave as today: the sheet closes and
 *     the add / swap / delete wizard (or the freestyle picker) opens for that exercise.
 *   - One Finish: with the bar offering "Finish" (programmed or follow-along, last exercise, all planned sets
 *     logged), the header's FINISH is not rendered, so exactly one button named Finish is on screen, in the bar.
 *     Whenever the bar does not offer Finish (mid-set on the last exercise, any other exercise, the freestyle
 *     logger) the header's FINISH stays: exactly one Finish, in the header. Tapping the one Finish opens the Complete confirmation.
 *   - The intensity tip's "Dismiss intensity tip" button is a 48x48 target and still dismisses the tip.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
const prog = vi.hoisted(() => ({
  exercise: {
    id: 'ex1',
    name: 'Barbell Squat',
    notes: null,
    prescribedSets: [] as Array<Record<string, unknown>>,
    exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [], isSystem: false },
  },
  index: 0,
  total: 3,
  goToExercise: vi.fn(),
  goToNext: vi.fn(),
  goToPrevious: vi.fn(),
}))
const draft = vi.hoisted(() => ({
  loggedSets: [] as Array<Record<string, unknown>>,
  logSet: vi.fn(),
}))
const api = vi.hoisted(() => ({
  logAdHocSet: vi.fn(),
  completeDraft: vi.fn(),
  fetchExerciseHistory: vi.fn(),
}))
const picker = vi.hoisted(() => ({ opened: vi.fn() }))
const intensity = vi.hoisted(() => ({ on: false }))
const plan = vi.hoisted(() => ({ exercises: [] as Array<Record<string, unknown>>, fetch: vi.fn() }))

vi.mock('@/components/ToastProvider', () => ({ useToast: () => toast, ToastProvider: ({ children }: { children: unknown }) => children }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/useImagePrefetch', () => ({ useImagePrefetch: () => {} }))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: intensity.on, isLoading: false }) }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: { completedTours: '[]', loggingMode: 'full' }, isLoading: false, updateSettings: async () => {} }),
}))
vi.mock('@/hooks/useProgressiveExercises', () => ({
  useProgressiveExercises: () => ({
    currentExercise: prog.exercise,
    currentExerciseState: 'loaded',
    currentIndex: prog.index,
    totalExercises: prog.total,
    goToExercise: prog.goToExercise,
    goToNext: prog.goToNext,
    goToPrevious: prog.goToPrevious,
    loadedExercises: [prog.exercise],
    currentExerciseHistory: null,
    currentExerciseSessions: [],
    currentHistoryState: 'loaded',
    hasHistoryForCurrentExercise: false,
    refreshExercises: vi.fn(),
  }),
}))
vi.mock('@/hooks/useWorkoutDraft', () => ({
  useWorkoutDraft: () => ({
    loggedSets: draft.loggedSets,
    isHydrating: false,
    failedSetCount: 0,
    startedAt: null,
    logSet: draft.logSet,
    deleteSet: vi.fn(),
    flushFailedSets: vi.fn(async () => {}),
    clearCache: vi.fn(),
  }),
}))
vi.mock('@/lib/api/workout-sets', () => ({ completeDraft: api.completeDraft, discardDraft: vi.fn() }))
vi.mock('@/lib/api/adhoc-workout', () => ({
  addAdHocExercises: vi.fn(),
  completeAdHocWorkout: vi.fn(),
  deleteAdHocExercise: vi.fn(),
  deleteAdHocSet: vi.fn(),
  discardAdHocWorkout: vi.fn(),
  fetchExerciseHistory: api.fetchExerciseHistory,
  logAdHocSet: api.logAdHocSet,
  reorderAdHocExercises: vi.fn(),
  swapAdHocExercise: vi.fn(),
}))

// The tabs stub shows the exercise name, the REAL banner (fed the props the tabs get) and the form.
vi.mock('@/components/workout-logging/ExerciseDisplayTabs', async () => {
  const { default: Banner } = await import('@/components/workout-logging/DrawerContextBanner')
  return {
    default: (p: {
      exercise: { name: string }
      currentSetNumber: number
      totalSets?: number
      loggingForm?: unknown
    }) => (
      <div>
        <div data-testid="shown-exercise">{p.exercise.name}</div>
        <Banner exerciseName={p.exercise.name} currentSet={p.currentSetNumber} totalSets={p.totalSets} />
        {p.loggingForm as never}
      </div>
    ),
  }
})
// The form stub drives the logger's current-set state with canned entries.
vi.mock('@/components/workout-logging/SetLoggingForm', () => ({
  default: (p: {
    currentSet: { reps: string; weight: string; weightUnit: 'lbs' | 'kg'; rpe: string; rir: string }
    onSetChange: (s: unknown) => void
    onExpandedInputChange: (i: string | null) => void
  }) => {
    const put = (reps: string, weight: string, weightUnit: 'lbs' | 'kg') => () =>
      p.onSetChange({ ...p.currentSet, reps, weight, weightUnit })
    return (
      <div>
        <button type="button" onClick={put('8', '135', 'lbs')}>form: 8 at 135 lbs</button>
        <button type="button" onClick={put('10', '140', 'lbs')}>form: 10 at 140 lbs</button>
        <button type="button" onClick={put('8', '60', 'kg')}>form: 8 at 60 kg</button>
        <button type="button" onClick={put('1', '135', 'lbs')}>form: 1 at 135 lbs</button>
        <button type="button" onClick={put('8', '', 'lbs')}>form: 8 bodyweight</button>
        <button type="button" onClick={put('8', '0', 'lbs')}>form: 8 at zero</button>
        <button type="button" onClick={put('', '', 'lbs')}>form: clear</button>
        <button type="button" onClick={() => p.onExpandedInputChange('weight')}>form: expand weight</button>
      </div>
    )
  },
}))
vi.mock('@/components/workout-logging/FollowAlongTabs', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/wizards/AddExerciseWizard', () => ({ AddExerciseWizard: () => <div>add wizard open</div> }))
vi.mock('@/components/workout-logging/wizards/SwapExerciseWizard', () => ({ SwapExerciseWizard: (p: { currentExerciseName: string }) => <div>swap wizard open for {p.currentExerciseName}</div> }))
vi.mock('@/components/workout-logging/wizards/EditExerciseWizard', () => ({ EditExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/DeleteExerciseWizard', () => ({ DeleteExerciseWizard: (p: { exerciseName: string }) => <div>delete wizard open for {p.exerciseName}</div> }))
vi.mock('@/components/features/exercise-definition/ExerciseDefinitionEditorModal', () => ({ default: () => null }))
vi.mock('@/components/features/exercise-definition/QuickEditExerciseSheet', () => ({ default: () => null }))
vi.mock('@/components/adhoc/AdHocExercisePickerModal', () => ({
  AdHocEmptyState: () => null,
  AdHocExercisePickerModal: (p: { mode: { kind: string } }) => {
    picker.opened(p.mode.kind)
    return <div>picker open: {p.mode.kind}</div>
  },
}))
vi.mock('@/components/features/training/WorkoutRollupModal', () => ({ WorkoutRollupModal: () => null }))

import AdHocLoggerView from '@/components/adhoc/AdHocLoggerView'
import ExerciseLoggingModal from '@/components/ExerciseLoggingModal'

beforeAll(() => {
  const g = globalThis as Record<string, unknown>
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

beforeEach(() => {
  vi.clearAllMocks()
  window.alert = vi.fn()
  prog.index = 0
  prog.total = 3
  prog.exercise.prescribedSets = []
  draft.loggedSets = []
  api.fetchExerciseHistory.mockResolvedValue({ history: null, sessions: [] })
  api.completeDraft.mockResolvedValue({ completionId: 'c1', rollup: null })
  api.logAdHocSet.mockImplementation(async (_id: string, s: Record<string, unknown>) => ({
    id: 'srv1',
    isWarmup: false,
    ...s,
  }))
})
afterEach(cleanup)

const prescribed = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, setNumber: i + 1, reps: '5', weight: '100', rpe: null, rir: null }))
const logged = (n: number, exerciseId = 'ex1') =>
  Array.from({ length: n }, (_, i) => ({
    id: `l${exerciseId}${i + 1}`,
    exerciseId,
    setNumber: i + 1,
    reps: 5,
    weight: 100,
    weightUnit: 'lbs',
    rpe: null,
    rir: null,
    isWarmup: false,
  }))

const bar = () => screen.getByTestId('logger-bottom-bar')
const inBar = (name: string | RegExp) => within(bar()).getByRole('button', { name })

function programmed(over: Partial<Parameters<typeof ExerciseLoggingModal>[0]> = {}) {
  render(
    <ExerciseLoggingModal
      {...({
        isOpen: true,
        onClose: vi.fn(),
        workoutId: 'w1',
        workoutName: 'Leg Day',
        exerciseCount: prog.total,
        onComplete: vi.fn(async () => {}),
        ...over,
      } as Parameters<typeof ExerciseLoggingModal>[0])}
    />
  )
}

/** A programmed workout at exercise `index` of `total` with `p` prescribed and `l` logged sets. */
function setup(p: number, l: number, index = 1, total = 3) {
  prog.exercise.prescribedSets = prescribed(p)
  draft.loggedSets = logged(l)
  prog.index = index
  prog.total = total
  programmed()
}

const ex = (id: string, name: string) => ({
  id,
  name,
  notes: null,
  exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [] },
})
function adhocWith(exercises: ReturnType<typeof ex>[], loggedSets = [] as never[]) {
  render(
    <AdHocLoggerView
      {...({
        completionId: 'cmp1',
        completionName: 'Freestyle',
        startedAt: null,
        initialExercises: exercises,
        initialLoggedSets: loggedSets,
        muscleBalanceSnapshot: {},
      } as unknown as Parameters<typeof AdHocLoggerView>[0])}
    />
  )
}

const finishes = () => screen.queryAllByRole('button', { name: /^finish$/i })
const opener = (n: number, total: number) => screen.getByRole('button', { name: `Plan ${n}/${total}` })
const sheet = () => screen.getByRole('dialog', { name: 'Workout plan' })
const noSheet = () => expect(screen.queryByRole('dialog', { name: 'Workout plan' })).toBeNull()
const planRow = (name: string) => {
  const li = within(sheet()).getAllByRole('listitem').find((r) => (r.textContent ?? '').includes(name))
  if (!li) throw new Error(`no row for ${name}`)
  return li
}
const H48 = /(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|size-12)(\s|$)/
const W48 = /(^|\s)(w-12|min-w-12|w-\[48px\]|min-w-\[48px\]|size-12)(\s|$)/

/** A six-exercise workout: 4 logged of 4 on e1 (done), 2 of 4 on e2 (now), nothing on the rest. */
function planWorkout() {
  const names = ['Barbell Squat', 'Bench Press', 'Dumbbell Romanian Deadlift', 'Cable Row', 'Face Pull', 'Plank']
  const planned = [4, 4, 3, 4, 3, 3]
  plan.exercises = names.map((name, i) => ({
    id: `e${i + 1}`,
    name,
    prescribedSets: Array.from({ length: planned[i] }, (_, k) => ({ id: `p${i}${k}`, setNumber: k + 1 })),
  }))
  prog.exercise.id = 'e2'
  prog.exercise.name = 'Bench Press'
  prog.exercise.prescribedSets = prescribed(4)
  draft.loggedSets = [...logged(4, 'e1'), ...logged(2, 'e2')]
  prog.index = 1
  prog.total = 6
  programmed({ exerciseCount: 6 })
}

beforeEach(() => {
  intensity.on = false
  prog.exercise.id = 'ex1'
  prog.exercise.name = 'Barbell Squat'
  plan.exercises = []
  plan.fetch.mockReset()
  plan.fetch.mockImplementation(async () => ({ ok: true, json: async () => ({ exercises: plan.exercises }) }))
  vi.stubGlobal('fetch', plan.fetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('Scenario: The plan opener says what it is (loggers)', () => {
  it('programmed logger on exercise 2 of 6: the header button reads "Plan 2/6"', () => {
    setup(4, 1, 1, 6)
    expect(opener(2, 6)).toBeTruthy()
  })

  it('on the first of three it reads "Plan 1/3"', () => {
    setup(4, 1, 0, 3)
    expect(opener(1, 3)).toBeTruthy()
  })

  it('the freestyle logger reads "Plan 1/2", and "Plan 2/2" after Next', () => {
    adhocWith([ex('a1', 'Pull Up'), ex('a2', 'Dips')])
    expect(opener(1, 2)).toBeTruthy()
    fireEvent.click(inBar('Next exercise'))
    expect(opener(2, 2)).toBeTruthy()
  })

  it('freestyle with nothing added has no plan to open', () => {
    adhocWith([])
    expect(screen.queryByRole('button', { name: /^plan\b/i })).toBeNull()
  })
})

describe('Scenario: The plan sheet shows progress (programmed logger)', () => {
  it('opening the plan fetches the workout\'s exercises and shows the sheet "Workout plan" with 2/6', async () => {
    planWorkout()
    fireEvent.click(opener(2, 6))
    await screen.findByRole('dialog', { name: 'Workout plan' })
    expect(plan.fetch).toHaveBeenCalledWith('/api/workouts/w1/exercises')
    expect((within(sheet()).getByRole('img', { name: /exercise 2 of 6/i }).textContent ?? '').trim()).toBe('2/6')
  })

  it('exercise 1 is done, exercise 2 is now with "2 of 4 sets", the rest show their number', async () => {
    planWorkout()
    fireEvent.click(opener(2, 6))
    await within(await screen.findByRole('dialog', { name: 'Workout plan' })).findByText('Cable Row')
    expect(planRow('Barbell Squat').getAttribute('data-status')).toBe('done')
    expect(planRow('Bench Press').getAttribute('data-status')).toBe('now')
    expect(planRow('Bench Press').textContent).toContain('2 of 4 sets')
    expect(planRow('Cable Row').getAttribute('data-status')).toBe('upcoming')
    expect(within(planRow('Cable Row')).getByText('4')).toBeTruthy()
  })

  it('the summary counts the whole workout: 6 of 21 sets, then the clock', async () => {
    planWorkout()
    fireEvent.click(opener(2, 6))
    await within(await screen.findByRole('dialog', { name: 'Workout plan' })).findByText('Cable Row')
    // 4 + 2 logged of 4+4+3+4+3+3 planned
    expect(within(sheet()).getByText(/^6 of 21 sets · \d{2}:\d{2}$/)).toBeTruthy()
  })

  it('a long name is shown in full', async () => {
    planWorkout()
    fireEvent.click(opener(2, 6))
    expect(await within(await screen.findByRole('dialog', { name: 'Workout plan' })).findByText('Dumbbell Romanian Deadlift')).toBeTruthy()
  })
})

describe('Scenario: Jumping, adding, swapping and deleting from the plan (programmed logger)', () => {
  async function openPlan() {
    planWorkout()
    fireEvent.click(opener(2, 6))
    await within(await screen.findByRole('dialog', { name: 'Workout plan' })).findByText('Cable Row')
  }

  it('tapping exercise 4 shows exercise 4 and closes the plan', async () => {
    await openPlan()
    const jump = within(planRow('Cable Row')).getAllByRole('button').find((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().startsWith('Cable Row'))
    fireEvent.click(jump as HTMLElement)
    expect(prog.goToExercise).toHaveBeenCalledTimes(1)
    expect(prog.goToExercise).toHaveBeenCalledWith(3)
    noSheet()
  })

  it('+ Add exercise closes the plan and opens the add wizard', async () => {
    await openPlan()
    fireEvent.click(within(sheet()).getByRole('button', { name: /add exercise/i }))
    noSheet()
    expect(screen.getByText('add wizard open')).toBeTruthy()
  })

  it('Swap exercise from a row\'s menu closes the plan and opens the swap wizard for that exercise', async () => {
    await openPlan()
    fireEvent.keyDown(within(planRow('Cable Row')).getByRole('button', { name: 'Edit options for Cable Row' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: /swap exercise/i }))
    noSheet()
    expect(screen.getByText('swap wizard open for Cable Row')).toBeTruthy()
  })

  it('Delete exercise asks, then opens the delete wizard for that exercise', async () => {
    await openPlan()
    fireEvent.keyDown(within(planRow('Cable Row')).getByRole('button', { name: 'Edit options for Cable Row' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: /delete exercise/i }))
    expect(screen.getByRole('alertdialog', { name: 'Delete Cable Row?' })).toBeTruthy()
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    noSheet()
    expect(screen.getByText('delete wizard open for Cable Row')).toBeTruthy()
  })

  it('Escape closes the plan and leaves the workout as it was', async () => {
    await openPlan()
    fireEvent.keyDown(sheet(), { key: 'Escape' })
    noSheet()
    expect(prog.goToExercise).not.toHaveBeenCalled()
  })
})

describe('Plan sheet in the freestyle logger', () => {
  const sets = [
    ...logged(2, 'a1'),
    ...logged(1, 'a2'),
  ].map((s) => ({ ...s, id: `${s.id}-x` }))

  it('rows say how many sets, without a planned total', () => {
    adhocWith([ex('a1', 'Pull Up'), ex('a2', 'Dips'), ex('a3', 'Curl')], sets as never[])
    fireEvent.click(opener(1, 3))
    expect(within(planRow('Pull Up')).getByText('2 sets')).toBeTruthy()
    expect(within(planRow('Dips')).getByText('1 set')).toBeTruthy()
    expect(within(sheet()).getByText(/^3 sets · \d{2}:\d{2}$/)).toBeTruthy()
  })

  it('the sheet is titled "Workout plan" with 1/3', () => {
    adhocWith([ex('a1', 'Pull Up'), ex('a2', 'Dips'), ex('a3', 'Curl')])
    fireEvent.click(opener(1, 3))
    expect((within(sheet()).getByRole('img', { name: /exercise 1 of 3/i }).textContent ?? '').trim()).toBe('1/3')
  })

  it('tapping a row shows that exercise and closes the plan', () => {
    adhocWith([ex('a1', 'Pull Up'), ex('a2', 'Dips'), ex('a3', 'Curl')])
    fireEvent.click(opener(1, 3))
    const jump = within(planRow('Curl')).getAllByRole('button').find((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().startsWith('Curl'))
    fireEvent.click(jump as HTMLElement)
    noSheet()
    expect(screen.getByTestId('shown-exercise').textContent).toBe('Curl')
  })

  it('+ Add exercise opens the picker in add mode', () => {
    adhocWith([ex('a1', 'Pull Up'), ex('a2', 'Dips')])
    fireEvent.click(opener(1, 2))
    fireEvent.click(within(sheet()).getByRole('button', { name: /add exercise/i }))
    noSheet()
    expect(screen.getByText('picker open: add')).toBeTruthy()
  })
})

describe('Scenario: One Finish on the last exercise', () => {
  it('last exercise, every planned set logged, the bar offers Finish: only one Finish on screen, and it is in the bar', () => {
    setup(3, 3, 2, 3)
    expect(within(bar()).getByRole('button', { name: /^finish$/i })).toBeTruthy()
    expect(finishes()).toHaveLength(1)
  })

  it('that one Finish opens the Complete confirmation', () => {
    setup(3, 3, 2, 3)
    fireEvent.click(finishes()[0])
    expect(screen.getByRole('alertdialog', { name: /complete this workout/i })).toBeTruthy()
  })

  it('last exercise but sets still to log: the bar has no Finish, so the header keeps its FINISH (one on screen, in the header)', () => {
    setup(4, 1, 2, 3)
    expect(within(bar()).queryByRole('button', { name: /^finish$/i })).toBeNull()
    expect(finishes()).toHaveLength(1)
    fireEvent.click(finishes()[0])
    expect(screen.getByRole('alertdialog', { name: /complete this workout/i })).toBeTruthy()
  })

  it('an exercise that is not the last: the header FINISH is the only Finish', () => {
    setup(3, 3, 1, 3)
    expect(finishes()).toHaveLength(1)
    expect(within(bar()).queryByRole('button', { name: /^finish$/i })).toBeNull()
  })

  it('a one-exercise workout that is done: one Finish, in the bar', () => {
    setup(2, 2, 0, 1)
    expect(finishes()).toHaveLength(1)
    expect(within(bar()).getByRole('button', { name: /^finish$/i })).toBeTruthy()
  })

  it('after "+ Extra set" on the last exercise the bar still offers Finish: still one Finish, in the bar', () => {
    setup(3, 3, 2, 3)
    fireEvent.click(inBar(/extra set/i))
    expect(within(bar()).getByRole('button', { name: /^finish$/i })).toBeTruthy()
    expect(finishes()).toHaveLength(1)
  })

  it('with an input expanded the bar is hidden, so the header FINISH is back: one Finish, in the header', () => {
    setup(3, 3, 2, 3)
    fireEvent.click(inBar(/extra set/i))
    fireEvent.click(screen.getByRole('button', { name: 'form: expand weight' }))
    expect(screen.queryByTestId('logger-bottom-bar')).toBeNull()
    expect(finishes()).toHaveLength(1)
  })

  it('follow-along on the last exercise: one Finish, in the bar', () => {
    prog.index = 2
    prog.total = 3
    programmed({ loggingMode: 'follow_along', exerciseCount: 3 })
    expect(finishes()).toHaveLength(1)
    expect(within(bar()).getByRole('button', { name: /^finish$/i })).toBeTruthy()
  })

  it('the freestyle logger\'s bar never offers Finish, so its header FINISH stays: one Finish, in the header', () => {
    adhocWith([ex('a1', 'Pull Up'), ex('a2', 'Dips')])
    fireEvent.click(inBar('Next exercise'))
    expect(finishes()).toHaveLength(1)
    expect(within(bar()).queryByRole('button', { name: /^finish$/i })).toBeNull()
  })
})

describe('Carry-over from review 090: the intensity tip\'s dismiss is a 48px target', () => {
  it('the tip shows when intensity is on and it has not been dismissed', () => {
    intensity.on = true
    setup(4, 1, 1, 3)
    expect(screen.getByRole('button', { name: 'Dismiss intensity tip' })).toBeTruthy()
  })

  it('its dismiss button is 48x48', () => {
    intensity.on = true
    setup(4, 1, 1, 3)
    const b = screen.getByRole('button', { name: 'Dismiss intensity tip' })
    expect(b.getAttribute('class') ?? '').toMatch(H48)
    expect(b.getAttribute('class') ?? '').toMatch(W48)
  })

  it('tapping it dismisses the tip, as before', () => {
    intensity.on = true
    setup(4, 1, 1, 3)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss intensity tip' }))
    expect(screen.queryByRole('button', { name: 'Dismiss intensity tip' })).toBeNull()
    expect(screen.queryByText(/intensity tracking is on/i)).toBeNull()
  })

  it('no tip when intensity is off', () => {
    setup(4, 1, 1, 3)
    expect(screen.queryByRole('button', { name: 'Dismiss intensity tip' })).toBeNull()
  })
})
