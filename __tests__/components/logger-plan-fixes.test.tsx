/**
 * L3 fixes from review 099 (work item 100), in both loggers:
 *   1. The plan sheet lists exercises added during the workout: the programmed
 *      logger asks for them with the session's id (?completionId=), so the
 *      chip, rows and summary match the header's "Plan n/m" and an added
 *      exercise can be jumped to.
 *   2. A reorder keeps you on the exercise you were on (by id): after moving
 *      the NOW row, the logger goes to that exercise's new position.
 *   4. The summary clock ticks while the sheet is open.
 * The 097 files stay as they are; this file reuses their harness.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
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
  startedAt: null as string | null,
}))
const api = vi.hoisted(() => ({
  logAdHocSet: vi.fn(),
  completeDraft: vi.fn(),
  fetchExerciseHistory: vi.fn(),
}))
const picker = vi.hoisted(() => ({ opened: vi.fn() }))
const intensity = vi.hoisted(() => ({ on: false }))
const plan = vi.hoisted(() => ({ exercises: [] as Array<Record<string, unknown>>, fetch: vi.fn() }))
const dnd = vi.hoisted(() => ({ onDragEnd: null as null | ((e: unknown) => void) }))

// DndContext as a pass-through that hands the test its onDragEnd (no pointer geometry in jsdom).
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...real,
    DndContext: (p: { children: ReactNode; onDragEnd: (e: unknown) => void }) => {
      dnd.onDragEnd = p.onDragEnd
      return p.children
    },
  }
})

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
    startedAt: draft.startedAt,
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

const opener = (n: number, total: number) => screen.getByRole('button', { name: `Plan ${n}/${total}` })
const sheet = () => screen.getByRole('dialog', { name: 'Workout plan' })
const noSheet = () => expect(screen.queryByRole('dialog', { name: 'Workout plan' })).toBeNull()
const planRow = (name: string) => {
  const li = within(sheet()).getAllByRole('listitem').find((r) => (r.textContent ?? '').includes(name))
  if (!li) throw new Error(`no row for ${name}`)
  return li
}

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


afterEach(() => {
  dnd.onDragEnd = null
  draft.startedAt = null
  vi.useRealTimers()
})

/** Program exercises e1..e3 plus a one-off "Added Curl" (x1) the session added. */
function withAddedExercise(currentId = 'e2', index = 1) {
  plan.exercises = [
    { id: 'e1', name: 'Barbell Squat', prescribedSets: [{ id: 'p1' }, { id: 'p2' }] },
    { id: 'e2', name: 'Bench Press', prescribedSets: [{ id: 'p3' }, { id: 'p4' }] },
    { id: 'e3', name: 'Cable Row', prescribedSets: [{ id: 'p5' }, { id: 'p6' }] },
    { id: 'x1', name: 'Added Curl', prescribedSets: [{ id: 'p7' }, { id: 'p8' }, { id: 'p9' }] },
  ]
  prog.exercise.id = currentId
  prog.exercise.name = plan.exercises.find((e) => e.id === currentId)?.name as string
  prog.exercise.prescribedSets = prescribed(2)
  draft.loggedSets = [...logged(2, 'e1'), ...logged(1, 'x1')]
  prog.index = index
  prog.total = 4
  programmed({ exerciseCount: 4, workoutCompletionId: 'cmp9' })
}

describe('Fix 1: exercises added during the workout show in the plan', () => {
  it('asks for the list with the session id, so one-offs come back too', async () => {
    withAddedExercise()
    fireEvent.click(opener(2, 4))
    await within(sheet()).findByText('Added Curl')
    expect(plan.fetch).toHaveBeenCalledWith('/api/workouts/w1/exercises?completionId=cmp9')
  })

  it('the chip, rows and summary match the header (2/4, 4 rows, the added sets counted)', async () => {
    withAddedExercise()
    fireEvent.click(opener(2, 4))
    await within(sheet()).findByText('Added Curl')
    expect((within(sheet()).getByRole('img', { name: /exercise 2 of 4/i }).textContent ?? '').trim()).toBe('2/4')
    expect(within(sheet()).getAllByRole('listitem')).toHaveLength(4)
    expect(within(planRow('Added Curl')).getByText(/^1 of 3 sets/)).toBeTruthy()
    expect(within(sheet()).getByText(/^3 of 9 sets · \d{2}:\d{2}$/)).toBeTruthy()
  })

  it('tapping the added exercise goes to it and closes the plan', async () => {
    withAddedExercise()
    fireEvent.click(opener(2, 4))
    await within(sheet()).findByText('Added Curl')
    fireEvent.click(within(planRow('Added Curl')).getByRole('button', { name: /^Added Curl/ }))
    expect(prog.goToExercise).toHaveBeenCalledWith(3)
    noSheet()
  })

  it('without a session id it asks for the plain list (no query)', async () => {
    planWorkout()
    fireEvent.click(opener(2, 6))
    await within(sheet()).findByText('Plank')
    expect(plan.fetch).toHaveBeenCalledWith('/api/workouts/w1/exercises')
  })
})

describe('Fix 2: a reorder keeps you on your exercise', () => {
  const reorderCalls = () => plan.fetch.mock.calls.filter(([url]) => String(url).endsWith('/exercises/reorder'))

  it('moving the NOW row (Bench Press, 2nd) to last goes to its new position', async () => {
    withAddedExercise('e2', 1)
    fireEvent.click(opener(2, 4))
    await within(sheet()).findByText('Added Curl')
    await act(async () => {
      dnd.onDragEnd?.({ active: { id: 'e2' }, over: { id: 'x1' } })
    })
    await waitFor(() => expect(prog.goToExercise).toHaveBeenCalledWith(3))
    const body = JSON.parse(String((reorderCalls()[0]?.[1] as RequestInit).body))
    expect(body.exercises.map((e: { exerciseId: string }) => e.exerciseId)).toEqual(['e1', 'e3', 'x1', 'e2'])
  })

  it('moving another row above the NOW row shifts you down with it', async () => {
    withAddedExercise('e2', 1)
    fireEvent.click(opener(2, 4))
    await within(sheet()).findByText('Added Curl')
    await act(async () => {
      dnd.onDragEnd?.({ active: { id: 'x1' }, over: { id: 'e1' } })
    })
    await waitFor(() => expect(prog.goToExercise).toHaveBeenCalledWith(2))
  })

  it('a move that leaves the NOW row in place does not navigate', async () => {
    withAddedExercise('e2', 1)
    fireEvent.click(opener(2, 4))
    await within(sheet()).findByText('Added Curl')
    await act(async () => {
      dnd.onDragEnd?.({ active: { id: 'e3' }, over: { id: 'x1' } })
    })
    await waitFor(() => expect(reorderCalls()).toHaveLength(1))
    expect(prog.goToExercise).not.toHaveBeenCalled()
  })

  it('freestyle: moving the current exercise keeps it shown and moves the count', () => {
    adhocWith([ex('a1', 'Pull Up'), ex('a2', 'Dips'), ex('a3', 'Curl')])
    fireEvent.click(opener(1, 3))
    act(() => {
      dnd.onDragEnd?.({ active: { id: 'a1' }, over: { id: 'a3' } })
    })
    expect(opener(3, 3)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /pull up/i })).toBeTruthy()
  })
})

describe('Fix 4: the summary clock ticks while the sheet is open', () => {
  it('programmed: 00:05 becomes 00:08 three seconds later', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-11-01T12:00:05Z'))
    draft.startedAt = '2026-11-01T12:00:00Z'
    planWorkout()
    fireEvent.click(opener(2, 6))
    await within(sheet()).findByText('Plank')
    expect(within(sheet()).getByText('6 of 21 sets · 00:05')).toBeTruthy()
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(within(sheet()).getByText('6 of 21 sets · 00:08')).toBeTruthy()
  })

  it('freestyle: the clock moves on too', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T12:01:00Z'))
    render(
      <AdHocLoggerView
        {...({
          completionId: 'cmp1',
          completionName: 'Freestyle',
          startedAt: '2026-11-01T12:00:00Z',
          initialExercises: [ex('a1', 'Pull Up')],
          initialLoggedSets: [],
          muscleBalanceSnapshot: {},
        } as unknown as Parameters<typeof AdHocLoggerView>[0])}
      />
    )
    fireEvent.click(opener(1, 1))
    expect(within(sheet()).getByText('0 sets · 01:00')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(within(sheet()).getByText('0 sets · 01:02')).toBeTruthy()
  })
})
