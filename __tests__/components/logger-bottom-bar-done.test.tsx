/**
 * L2 fixes from review 095 (bb-a-done, direction A): after the last planned
 * set, moving on ("Next exercise ›" / "Finish") is the filled main action and
 * "+ Extra set" the outline one; the inputs wait behind a quiet "All planned
 * sets logged" strip until "+ Extra set" reopens the form. Off buttons read as
 * off: fainter outline and icon, and an off main button has no fill.
 * The harness (mocks and helpers) is copied from logger-bottom-bar-loggers.test.tsx.
 * Spec: initiatives/ui-audit/spec.md ("L2").
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

const cls = (el: Element) => el.getAttribute('class') ?? ''
const FILLED = /(^|\s)bg-(accent|primary)(\s|$)/

describe('Done state: moving on is the filled action (bb-a-done)', () => {
  it('not the last exercise: "Next exercise" is the filled main button, "+ Extra set" an outline', () => {
    setup(3, 3)
    const next = inBar('Next exercise')
    const extra = inBar(/extra set/i)
    expect(cls(next)).toMatch(/(^|\s)bg-primary(\s|$)/)
    expect(cls(extra)).not.toMatch(FILLED)
    expect(cls(extra)).toMatch(/(^|\s)border-2(\s|$)/)
  })

  it('the last exercise: "Finish" is the filled main button', () => {
    setup(3, 3, 2, 3)
    expect(cls(inBar(/^finish$/i))).toMatch(/(^|\s)bg-primary(\s|$)/)
    expect(cls(inBar(/extra set/i))).not.toMatch(FILLED)
  })

  it('reads Previous, "+ Extra set", then the main action, left to right', () => {
    setup(3, 3)
    const prev = inBar('Previous exercise')
    const extra = inBar(/extra set/i)
    const next = inBar('Next exercise')
    expect(prev.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(extra.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('only one filled button in the done bar', () => {
    setup(3, 3)
    expect(within(bar()).getAllByRole('button').filter((b) => FILLED.test(cls(b)))).toHaveLength(1)
  })

  it('mid-exercise "Log set" is still the filled accent main button', () => {
    setup(3, 1)
    expect(cls(inBar(/log set/i))).toMatch(/(^|\s)bg-accent(\s|$)/)
  })
})

describe('Done state: the inputs wait behind a strip', () => {
  it('shows "All planned sets logged" and not the form', () => {
    setup(3, 3)
    expect(screen.getByText(/all planned sets logged/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'form: 8 at 135 lbs' })).toBeNull()
  })

  it('"+ Extra set" opens the form for one more set and the strip goes', () => {
    setup(3, 3)
    fireEvent.click(inBar(/extra set/i))
    expect(screen.queryByText(/all planned sets logged/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'form: 8 at 135 lbs' })).toBeTruthy()
  })

  it('mid-exercise there is no strip and the form shows', () => {
    setup(3, 2)
    expect(screen.queryByText(/all planned sets logged/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'form: 8 at 135 lbs' })).toBeTruthy()
  })
})

describe('Off buttons read as off', () => {
  it('an off Previous has a fainter border and a faint icon', () => {
    setup(4, 1, 0, 3)
    const prev = inBar('Previous exercise')
    expect(cls(prev)).toMatch(/(^|\s)border-border\/50(\s|$)/)
    expect(cls(prev)).not.toMatch(/(^|\s)border-border(\s|$)/)
    expect(prev.querySelector('svg')?.getAttribute('class') ?? '').toMatch(/text-muted-foreground\/60/)
  })

  it('an on Previous keeps the full border', () => {
    setup(4, 1, 1, 3)
    expect(cls(inBar('Previous exercise'))).toMatch(/(^|\s)border-border(\s|$)/)
  })

  it('an off main button has no fill: muted, dashed outline', () => {
    setup(4, 1)
    form('clear')
    const main = inBar(/log set/i)
    expect(isDisabled(main)).toBe(true)
    expect(cls(main)).not.toMatch(FILLED)
    expect(cls(main)).toMatch(/(^|\s)border-dashed(\s|$)/)
    expect(cls(main)).toMatch(/(^|\s)text-muted-foreground(\s|$)/)
    expect(cls(main)).not.toMatch(/saturate-50|opacity-/)
  })
})
