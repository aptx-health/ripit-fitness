/**
 * L2: the bottom bar as the three loggers wire it: the programmed logger and follow-along
 * (ExerciseLoggingModal) and the freestyle logger (AdHocLoggerView). Data hooks, '@/lib/api/*',
 * the tabs, the set form and the wizards are stubbed; the headers, the confirms and the
 * LoggerBottomBar (components/workout-logging/LoggerBottomBar.tsx) are the real ones.
 * Behaviour: features/ui-audit/logger-bottom-bar.feature. Spec: initiatives/ui-audit/spec.md ("L2").
 * The bar's own interface and look: logger-bottom-bar.test.tsx.
 *
 * PINNED (the bar is found by data-testid="logger-bottom-bar"; buttons by accessible name)
 *
 *   Programmed logger, prescribed sets P, logged sets L for the current exercise:
 *     - L < P (mid-exercise): Previous (aria-label "Previous exercise"), main "Log set" and a
 *       Next square ("Next exercise"). The main button's second line is what the form holds:
 *         "<reps> reps × <weight> <unit>"   e.g. "8 reps × 135 lbs", "8 reps × 60 kg"
 *         one rep reads "1 rep × 135 lbs"
 *         no weight (empty or 0): "<reps> reps" (bodyweight, freestyle only)
 *         nothing entered yet: no second line.
 *       The label is exactly "Log set" (no set number; the banner carries that). Tapping it
 *       logs the set exactly as before.
 *     - L >= P, not the last exercise: the bar stays, as Previous, "+ Extra set" (accessible name
 *       matches /extra set/i) and a labelled "Next exercise" button. No "Log set".
 *       "+ Extra set" switches the bar back to Log set for set P+1 (no "+ Extra set" then).
 *     - L >= P on the last exercise: Previous, "+ Extra set" and "Finish" (no "Next exercise").
 *       Finish opens the L1 Complete confirmation ("Complete this workout?").
 *     - The in-content "All prescribed sets logged" box is not rendered by the logger.
 *     - Previous is disabled (and announced so) on the first exercise.
 *     - The banner is the real DrawerContextBanner fed ExerciseDisplayTabs' props
 *       (currentSetNumber, totalSets): after 7 of 7, "7 of 7 done".
 *   Follow-along: Previous and a labelled "Next exercise" (main slot); on the last exercise
 *     "Finish" (not "Finish Workout") instead, which opens the L1 confirmation ("Mark this workout as done?").
 *   Freestyle (AdHocLoggerView): Previous, "Log set" with the same second line, Next square;
 *     never "+ Extra set" (every set is extra); no exercises yet: the bar's main button is
 *     "Add exercise", which opens the picker.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

vi.mock('@/components/ToastProvider', () => ({ useToast: () => toast, ToastProvider: ({ children }: { children: unknown }) => children }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/useImagePrefetch', () => ({ useImagePrefetch: () => {} }))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: false, isLoading: false }) }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: { completedTours: '[]', loggingMode: 'full' }, isLoading: false, updateSettings: vi.fn() }),
}))
vi.mock('@/hooks/useProgressiveExercises', () => ({
  useProgressiveExercises: () => ({
    currentExercise: prog.exercise,
    currentExerciseState: 'loaded',
    currentIndex: prog.index,
    totalExercises: prog.total,
    goToExercise: vi.fn(),
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
      </div>
    )
  },
}))
vi.mock('@/components/workout-logging/FollowAlongTabs', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/WorkoutPlanEditor', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/wizards/AddExerciseWizard', () => ({ AddExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/SwapExerciseWizard', () => ({ SwapExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/EditExerciseWizard', () => ({ EditExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/DeleteExerciseWizard', () => ({ DeleteExerciseWizard: () => null }))
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
const maybeInBar = (name: string | RegExp) => within(bar()).queryByRole('button', { name })
const form = (label: string) => fireEvent.click(screen.getByRole('button', { name: `form: ${label}` }))
const isDisabled = (el: HTMLElement) =>
  (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true'

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

describe('Scenario: Log set shows what will be saved (programmed logger)', () => {
  it('8 reps and 135 lbs entered: "Log set" with "8 reps × 135 lbs" under it', () => {
    setup(4, 1)
    form('8 at 135 lbs')
    const main = inBar(/log set/i)
    expect(within(main).getByText('Log set')).toBeTruthy()
    expect(within(main).getByText('8 reps × 135 lbs')).toBeTruthy()
  })

  it('the second line follows the form: 10 reps at 140 lbs', () => {
    setup(4, 1)
    form('8 at 135 lbs')
    form('10 at 140 lbs')
    const main = inBar(/log set/i)
    expect(within(main).getByText('10 reps × 140 lbs')).toBeTruthy()
    expect(within(main).queryByText('8 reps × 135 lbs')).toBeNull()
  })

  it('it uses the weight unit the form holds: kg', () => {
    setup(4, 1)
    form('8 at 60 kg')
    expect(within(inBar(/log set/i)).getByText('8 reps × 60 kg')).toBeTruthy()
  })

  it('one rep is "1 rep", not "1 reps"', () => {
    setup(4, 1)
    form('1 at 135 lbs')
    expect(within(inBar(/log set/i)).getByText('1 rep × 135 lbs')).toBeTruthy()
  })

  it('nothing entered: the button holds only "Log set", and it is disabled', () => {
    setup(4, 1)
    form('clear')
    const main = inBar(/log set/i)
    expect((main.textContent ?? '').trim()).toBe('Log set')
    expect(isDisabled(main)).toBe(true)
  })

  it('the label has no set number in it (the banner shows the set)', () => {
    setup(4, 1)
    form('8 at 135 lbs')
    expect(within(inBar(/log set/i)).getByText('Log set')).toBeTruthy()
    expect((inBar(/log set/i).textContent ?? '')).not.toMatch(/log set\s*2/i)
  })

  it('tapping it logs that set as before', () => {
    setup(4, 1)
    form('8 at 135 lbs')
    fireEvent.click(inBar(/log set/i))
    expect(draft.logSet).toHaveBeenCalledTimes(1)
    expect(draft.logSet).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: 'ex1', setNumber: 2, reps: 8, weight: 135, weightUnit: 'lbs' })
    )
  })

  it('with the form empty, tapping it logs nothing', () => {
    setup(4, 1)
    form('clear')
    fireEvent.click(inBar(/log set/i))
    expect(draft.logSet).not.toHaveBeenCalled()
  })

  it('mid-exercise the bar has Previous, Log set and a Next square, and no "+ Extra set"', () => {
    setup(4, 1)
    expect(inBar('Previous exercise')).toBeTruthy()
    expect(inBar(/log set/i)).toBeTruthy()
    expect(inBar('Next exercise')).toBeTruthy()
    expect(maybeInBar(/extra set/i)).toBeNull()
  })
})

describe('Scenario: The bar stays after the last planned set', () => {
  it('every planned set logged (not the last exercise): Previous, "+ Extra set" and "Next exercise"', () => {
    setup(3, 3)
    expect(inBar('Previous exercise')).toBeTruthy()
    expect(inBar(/extra set/i)).toBeTruthy()
    const next = inBar('Next exercise')
    expect(next.textContent).toContain('Next exercise')
    expect(maybeInBar(/log set/i)).toBeNull()
    expect(maybeInBar(/^finish/i)).toBeNull()
  })

  it('the bar is there before, and still there after, the last planned set', () => {
    setup(3, 2)
    expect(bar()).toBeTruthy()
    cleanup()
    setup(3, 3)
    expect(bar()).toBeTruthy()
  })

  it('the in-content "All prescribed sets logged" box is gone', () => {
    setup(3, 3)
    expect(document.body.textContent ?? '').not.toMatch(/all prescribed sets logged/i)
  })

  it('"Next exercise" moves to the next exercise', () => {
    setup(3, 3)
    fireEvent.click(inBar('Next exercise'))
    expect(prog.goToNext).toHaveBeenCalledTimes(1)
    expect(prog.goToPrevious).not.toHaveBeenCalled()
  })

  it('Previous still goes back', () => {
    setup(3, 3)
    fireEvent.click(inBar('Previous exercise'))
    expect(prog.goToPrevious).toHaveBeenCalledTimes(1)
    expect(prog.goToNext).not.toHaveBeenCalled()
  })

  it('"+ Extra set" lets me log one more set: the bar goes back to Log set', () => {
    setup(3, 3)
    fireEvent.click(inBar(/extra set/i))
    expect(inBar(/log set/i)).toBeTruthy()
    expect(maybeInBar(/extra set/i)).toBeNull()
    expect(draft.logSet).not.toHaveBeenCalled()
  })

  it('the extra set is logged as set 4, with what the form holds', () => {
    setup(3, 3)
    fireEvent.click(inBar(/extra set/i))
    form('8 at 135 lbs')
    expect(within(inBar(/log set/i)).getByText('8 reps × 135 lbs')).toBeTruthy()
    fireEvent.click(inBar(/log set/i))
    expect(draft.logSet).toHaveBeenCalledTimes(1)
    expect(draft.logSet).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: 'ex1', setNumber: 4, reps: 8, weight: 135 })
    )
  })

  it('while extra sets are being logged the bar still offers Next exercise', () => {
    setup(3, 3)
    fireEvent.click(inBar(/extra set/i))
    fireEvent.click(inBar('Next exercise'))
    expect(prog.goToNext).toHaveBeenCalledTimes(1)
  })

  it('"+ Extra set" is not offered while planned sets remain', () => {
    setup(3, 2)
    expect(maybeInBar(/extra set/i)).toBeNull()
  })
})

describe('Scenario: On the last exercise the bar offers Finish', () => {
  it('every planned set of the last exercise logged: Previous, "+ Extra set" and "Finish"', () => {
    setup(3, 3, 2, 3)
    expect(inBar('Previous exercise')).toBeTruthy()
    expect(inBar(/extra set/i)).toBeTruthy()
    expect(inBar(/^finish$/i)).toBeTruthy()
    expect(maybeInBar('Next exercise')).toBeNull()
  })

  it('"Finish" opens the Complete confirmation', () => {
    setup(3, 3, 2, 3)
    fireEvent.click(inBar(/^finish$/i))
    expect(screen.getByRole('alertdialog', { name: /complete this workout/i })).toBeTruthy()
  })

  it('cancelling that confirmation completes nothing', () => {
    setup(3, 3, 2, 3)
    fireEvent.click(inBar(/^finish$/i))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(api.completeDraft).not.toHaveBeenCalled()
  })

  it('confirming it completes the workout as before', async () => {
    setup(3, 3, 2, 3)
    fireEvent.click(inBar(/^finish$/i))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(api.completeDraft).toHaveBeenCalledTimes(1))
  })

  it('a single-exercise workout that is done also offers Finish, not Next exercise', () => {
    setup(2, 2, 0, 1)
    expect(inBar(/^finish$/i)).toBeTruthy()
    expect(maybeInBar('Next exercise')).toBeNull()
  })

  it('"+ Extra set" on the last exercise lets me log one more set', () => {
    setup(3, 3, 2, 3)
    fireEvent.click(inBar(/extra set/i))
    form('8 at 135 lbs')
    fireEvent.click(inBar(/log set/i))
    expect(draft.logSet).toHaveBeenCalledWith(expect.objectContaining({ setNumber: 4, reps: 8, weight: 135 }))
  })
})

describe('Scenario: The banner counts sets done (programmed logger)', () => {
  it('7 planned sets, all 7 logged: "7 of 7 done"', () => {
    setup(7, 7)
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/7 of 7 done/i)
    expect(text).not.toMatch(/set 8/i)
  })

  it('mid-exercise it still counts the next set: "Set 4 of 7"', () => {
    setup(7, 3)
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/set 4 of 7/i)
    expect(text).not.toMatch(/done/i)
  })

  it('3 planned and logged reads "3 of 3 done" (the planned count, not a fixed one)', () => {
    setup(3, 3)
    expect(document.body.textContent ?? '').toMatch(/3 of 3 done/i)
  })
})

describe('Scenario: Previous and next are clearly off at the ends (programmed logger)', () => {
  it('on the first exercise Previous is disabled and announced as disabled', () => {
    setup(4, 1, 0, 3)
    const prev = inBar('Previous exercise')
    expect(isDisabled(prev)).toBe(true)
    expect(prev.getAttribute('class') ?? '').toMatch(/text-muted-foreground/)
    expect(prev.getAttribute('class') ?? '').not.toMatch(/opacity-/)
    fireEvent.click(prev)
    expect(prog.goToPrevious).not.toHaveBeenCalled()
  })

  it('on the first exercise after the last set Previous is disabled too, and Next exercise works', () => {
    setup(3, 3, 0, 3)
    expect(isDisabled(inBar('Previous exercise'))).toBe(true)
    expect(isDisabled(inBar('Next exercise'))).toBe(false)
  })

  it('on a later exercise Previous is enabled', () => {
    setup(4, 1, 1, 3)
    expect(isDisabled(inBar('Previous exercise'))).toBe(false)
  })

  it('Previous is a 48x48 square', () => {
    setup(4, 1, 1, 3)
    const c = inBar('Previous exercise').getAttribute('class') ?? ''
    expect(c).toMatch(/(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|size-12)(\s|$)/)
    expect(c).toMatch(/(^|\s)(w-12|min-w-12|w-\[48px\]|min-w-\[48px\]|size-12)(\s|$)/)
  })
})

describe('Scenario: Follow-along uses the same bar', () => {
  const along = (index: number, total = 3) => {
    prog.index = index
    prog.total = total
    programmed({ loggingMode: 'follow_along', exerciseCount: total })
  }

  it('mid-workout: Previous and "Next exercise", no Log set, no Extra set', () => {
    along(1)
    expect(inBar('Previous exercise')).toBeTruthy()
    expect(inBar('Next exercise').textContent).toContain('Next exercise')
    expect(maybeInBar(/log set/i)).toBeNull()
    expect(maybeInBar(/extra set/i)).toBeNull()
    expect(maybeInBar(/^finish/i)).toBeNull()
  })

  it('"Next exercise" moves on, Previous goes back', () => {
    along(1)
    fireEvent.click(inBar('Next exercise'))
    expect(prog.goToNext).toHaveBeenCalledTimes(1)
    fireEvent.click(inBar('Previous exercise'))
    expect(prog.goToPrevious).toHaveBeenCalledTimes(1)
  })

  it('on the first exercise Previous is disabled', () => {
    along(0)
    expect(isDisabled(inBar('Previous exercise'))).toBe(true)
  })

  it('on the last exercise the bar shows "Finish" instead of Next exercise', () => {
    along(2)
    expect(inBar(/^finish$/i)).toBeTruthy()
    expect(maybeInBar('Next exercise')).toBeNull()
    expect(inBar('Previous exercise')).toBeTruthy()
  })

  it('"Finish" opens the Complete confirmation; confirming completes the guided workout', async () => {
    along(2)
    fireEvent.click(inBar(/^finish$/i))
    expect(screen.getByRole('alertdialog', { name: /mark this workout as done/i })).toBeTruthy()
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finish' }))
    await waitFor(() => expect(api.completeDraft).toHaveBeenCalledTimes(1))
  })

  it('the follow-along bar is the same bar: same look classes as the program logger\'s', () => {
    along(1)
    const c = bar().getAttribute('class') ?? ''
    expect(c).toMatch(/bg-card/)
    expect(c).toMatch(/border-t-2/)
    expect(c).toMatch(/border-secondary/)
  })

  it('the 48px carry-overs: Previous 48x48 here too', () => {
    along(1)
    const c = inBar('Previous exercise').getAttribute('class') ?? ''
    expect(c).toMatch(/(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|size-12)(\s|$)/)
    expect(c).toMatch(/(^|\s)(w-12|min-w-12|w-\[48px\]|min-w-\[48px\]|size-12)(\s|$)/)
  })
})

describe('the programmed bar is the flat folder bar', () => {
  it('bg-card, border-t-2 border-secondary, no rgba(), no doom-corners', () => {
    setup(4, 1)
    form('8 at 135 lbs')
    const c = bar().getAttribute('class') ?? ''
    expect(c).toMatch(/bg-card/)
    expect(c).toMatch(/border-t-2/)
    expect(c).toMatch(/border-secondary/)
    for (const el of [bar(), ...Array.from(bar().querySelectorAll('*'))]) {
      expect(el.getAttribute('style') ?? '').not.toMatch(/rgba?\(/i)
      expect(el.getAttribute('class') ?? '').not.toMatch(/doom-corners/)
    }
  })
})

describe('Freestyle logger (AdHocLoggerView)', () => {
  const ex = (id: string, name: string) => ({
    id,
    name,
    notes: null,
    exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [] },
  })
  function adhoc(exercises = [ex('ex1', 'Barbell Squat'), ex('ex2', 'Leg Press')], loggedSets = [] as never[]) {
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

  describe('Scenario: Freestyle with no exercises', () => {
    it('the bar\'s main button is "Add exercise"', () => {
      adhoc([])
      const main = inBar(/^add exercise$/i)
      expect(main.getAttribute('class') ?? '').toMatch(/bg-accent/)
    })

    it('it opens the exercise picker in add mode', () => {
      adhoc([])
      fireEvent.click(inBar(/^add exercise$/i))
      expect(screen.getByText('picker open: add')).toBeTruthy()
    })

    it('there is no Log set and no Extra set with nothing to log', () => {
      adhoc([])
      expect(maybeInBar(/log set/i)).toBeNull()
      expect(maybeInBar(/extra set/i)).toBeNull()
    })

    it('it is the same flat bar as the others (no old bevel or rgba)', () => {
      adhoc([])
      const c = bar().getAttribute('class') ?? ''
      expect(c).toMatch(/bg-card/)
      expect(c).toMatch(/border-t-2/)
      for (const el of [bar(), ...Array.from(bar().querySelectorAll('*'))]) {
        expect(el.getAttribute('style') ?? '').not.toMatch(/rgba?\(/i)
      }
    })
  })

  describe('Scenario: Log set shows what will be saved (freestyle)', () => {
    it('8 reps at 135 lbs: "Log set" with "8 reps × 135 lbs" under it', () => {
      adhoc()
      form('8 at 135 lbs')
      const main = inBar(/log set/i)
      expect(within(main).getByText('Log set')).toBeTruthy()
      expect(within(main).getByText('8 reps × 135 lbs')).toBeTruthy()
    })

    it('kg is shown as kg', () => {
      adhoc()
      form('8 at 60 kg')
      expect(within(inBar(/log set/i)).getByText('8 reps × 60 kg')).toBeTruthy()
    })

    it('a bodyweight set (no weight) reads "8 reps"', () => {
      adhoc()
      form('8 bodyweight')
      const main = inBar(/log set/i)
      expect(within(main).getByText('8 reps')).toBeTruthy()
      expect(main.textContent ?? '').not.toMatch(/×/)
    })

    it('a weight of 0 reads like bodyweight: "8 reps"', () => {
      adhoc()
      form('8 at zero')
      expect(within(inBar(/log set/i)).getByText('8 reps')).toBeTruthy()
      expect(inBar(/log set/i).textContent ?? '').not.toMatch(/×/)
    })

    it('nothing entered: only "Log set", and it is disabled', () => {
      adhoc()
      const main = inBar(/log set/i)
      expect((main.textContent ?? '').trim()).toBe('Log set')
      expect(isDisabled(main)).toBe(true)
    })

    it('tapping it logs the set as before (weight 135, reps 8, set 1)', async () => {
      adhoc()
      form('8 at 135 lbs')
      fireEvent.click(inBar(/log set/i))
      await waitFor(() => expect(api.logAdHocSet).toHaveBeenCalledTimes(1))
      expect(api.logAdHocSet.mock.calls[0][0]).toBe('cmp1')
      expect(api.logAdHocSet.mock.calls[0][1]).toEqual(
        expect.objectContaining({ exerciseId: 'ex1', setNumber: 1, reps: 8, weight: 135, weightUnit: 'lbs' })
      )
    })

    it('a bodyweight set logs with weight 0, as before', async () => {
      adhoc()
      form('8 bodyweight')
      fireEvent.click(inBar(/log set/i))
      await waitFor(() => expect(api.logAdHocSet).toHaveBeenCalledTimes(1))
      expect(api.logAdHocSet.mock.calls[0][1]).toEqual(expect.objectContaining({ reps: 8, weight: 0 }))
    })
  })

  describe('the freestyle bar mid-workout', () => {
    it('has Previous, Log set and Next, and never "+ Extra set"', async () => {
      adhoc()
      expect(inBar('Previous exercise')).toBeTruthy()
      expect(inBar('Next exercise')).toBeTruthy()
      expect(maybeInBar(/extra set/i)).toBeNull()
      form('8 at 135 lbs')
      fireEvent.click(inBar(/log set/i))
      await waitFor(() => expect(api.logAdHocSet).toHaveBeenCalled())
      expect(maybeInBar(/extra set/i)).toBeNull()
      expect(inBar(/log set/i)).toBeTruthy()
    })

    it('on the first exercise Previous is disabled and announced as disabled', () => {
      adhoc()
      const prev = inBar('Previous exercise')
      expect(isDisabled(prev)).toBe(true)
      expect(prev.getAttribute('class') ?? '').toMatch(/text-muted-foreground/)
      expect(prev.getAttribute('class') ?? '').not.toMatch(/opacity-/)
    })

    it('Next moves to the next exercise and Previous comes back', () => {
      adhoc()
      expect(screen.getByTestId('shown-exercise').textContent).toBe('Barbell Squat')
      fireEvent.click(inBar('Next exercise'))
      expect(screen.getByTestId('shown-exercise').textContent).toBe('Leg Press')
      expect(isDisabled(inBar('Previous exercise'))).toBe(false)
      fireEvent.click(inBar('Previous exercise'))
      expect(screen.getByTestId('shown-exercise').textContent).toBe('Barbell Squat')
    })

    it('the bar is the flat folder bar, 48px squares', () => {
      adhoc()
      const c = bar().getAttribute('class') ?? ''
      expect(c).toMatch(/bg-card/)
      expect(c).toMatch(/border-t-2/)
      expect(c).toMatch(/border-secondary/)
      const prev = inBar('Previous exercise').getAttribute('class') ?? ''
      expect(prev).toMatch(/(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|size-12)(\s|$)/)
      expect(prev).toMatch(/(^|\s)(w-12|min-w-12|w-\[48px\]|min-w-\[48px\]|size-12)(\s|$)/)
    })
  })
})
