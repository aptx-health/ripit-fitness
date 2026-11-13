/**
 * Quick swap as the loggers wire it (work 211): both ways into the swap picker, the Edit menu's
 * "Swap this exercise" and the plan sheet's row menu, hand the picker the exercise being swapped so it
 * can show the "Similar" list and the sets it will keep. The picker itself is tested in
 * __tests__/features/workout-logging/quick-swap.steps.ts. Stubs as in logger-plan-loggers.test.tsx (copied),
 * with the swap wizard and the freestyle picker replaced by stubs that record their props.
 * Behaviour: features/workout-logging/quick-swap.feature ("The swap picker opens with similar exercises").
 *
 * PINNED
 *   Program logger -> SwapExerciseWizard gets currentExerciseId, currentExerciseDefinitionId and
 *     currentPrescribedSets (the swapped exercise's prescribed sets, at least setNumber, reps, rir, rpe).
 *     From the Edit menu: the current exercise. From the plan sheet: that row's exercise, as the
 *     workout's exercises GET returns it (exerciseDefinitionId and prescribedSets, as today).
 *   Freestyle logger -> AdHocExercisePickerModal mode { kind: 'swap', replacingName, targetId?,
 *     currentDefinitionId } with the swapped exercise's exerciseDefinition.id.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
const prog = vi.hoisted(() => ({
  exercise: {
    id: 'ex1',
    name: 'Dumbbell Goblet Squat',
    notes: null,
    exerciseDefinitionId: 'def-goblet',
    prescribedSets: [] as Array<Record<string, unknown>>,
    exerciseDefinition: { id: 'def-goblet', primaryFAUs: ['quads', 'glutes'], secondaryFAUs: [], equipment: ['dumbbell'], isSystem: true },
  },
  index: 0,
  total: 3,
  goToExercise: vi.fn(),
}))
const seen = vi.hoisted(() => ({ wizard: [] as Array<Record<string, unknown>>, picker: [] as Array<Record<string, unknown>> }))
const plan = vi.hoisted(() => ({ exercises: [] as Array<Record<string, unknown>>, fetch: vi.fn() }))

vi.mock('@/components/ToastProvider', () => ({ useToast: () => toast, ToastProvider: ({ children }: { children: unknown }) => children }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/useImagePrefetch', () => ({ useImagePrefetch: () => {} }))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: true, isLoading: false }) }))
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
    goToNext: vi.fn(),
    goToPrevious: vi.fn(),
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
    loggedSets: [],
    isHydrating: false,
    failedSetCount: 0,
    startedAt: null,
    logSet: vi.fn(),
    deleteSet: vi.fn(),
    flushFailedSets: vi.fn(async () => {}),
    clearCache: vi.fn(),
  }),
}))
vi.mock('@/lib/api/workout-sets', () => ({ completeDraft: vi.fn(), discardDraft: vi.fn() }))
vi.mock('@/lib/api/adhoc-workout', () => ({
  addAdHocExercises: vi.fn(),
  completeAdHocWorkout: vi.fn(),
  deleteAdHocExercise: vi.fn(),
  deleteAdHocSet: vi.fn(),
  discardAdHocWorkout: vi.fn(),
  fetchExerciseHistory: vi.fn(async () => ({ history: null, sessions: [] })),
  logAdHocSet: vi.fn(),
  reorderAdHocExercises: vi.fn(),
  swapAdHocExercise: vi.fn(),
}))
// The tabs stub shows the exercise name and one button per Edit-menu action.
vi.mock('@/components/workout-logging/ExerciseDisplayTabs', () => ({
  default: (p: { exercise: { name: string }; menuActions?: Array<{ label: string; onClick: () => void }> }) => (
    <div>
      <div data-testid="shown-exercise">{p.exercise.name}</div>
      {(p.menuActions ?? []).map((a) => (
        <button key={a.label} type="button" onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/components/workout-logging/SetLoggingForm', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/FollowAlongTabs', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/wizards/AddExerciseWizard', () => ({ AddExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/SwapExerciseWizard', () => ({
  SwapExerciseWizard: (p: Record<string, unknown>) => {
    seen.wizard.push(p)
    return <div>swap wizard open for {p.currentExerciseName as string}</div>
  },
}))
vi.mock('@/components/workout-logging/wizards/EditExerciseWizard', () => ({ EditExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/DeleteExerciseWizard', () => ({ DeleteExerciseWizard: () => null }))
vi.mock('@/components/features/exercise-definition/ExerciseDefinitionEditorModal', () => ({ default: () => null }))
vi.mock('@/components/features/exercise-definition/QuickEditExerciseSheet', () => ({ default: () => null }))
vi.mock('@/components/adhoc/AdHocExercisePickerModal', () => ({
  AdHocEmptyState: () => null,
  AdHocExercisePickerModal: (p: { mode: Record<string, unknown> }) => {
    seen.picker.push(p.mode)
    return <div>picker open: {String(p.mode.kind)}</div>
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

const pset = (setNumber: number, reps: string, rir: number | null) => ({ id: `p${setNumber}-${reps}`, setNumber, reps, weight: null, rpe: null, rir, isWarmup: false })
const GOBLET_SETS = [pset(1, '8', 2), pset(2, '8', 2), pset(3, '8', 2)]
const ROW_SETS = [pset(1, '12', 1), pset(2, '12', 1)]

beforeEach(() => {
  vi.clearAllMocks()
  seen.wizard.length = 0
  seen.picker.length = 0
  prog.exercise.prescribedSets = GOBLET_SETS
  plan.exercises = [
    {
      id: 'ex1',
      name: 'Dumbbell Goblet Squat',
      exerciseDefinitionId: 'def-goblet',
      exerciseDefinition: { id: 'def-goblet', name: 'Dumbbell Goblet Squat', primaryFAUs: ['quads', 'glutes'], secondaryFAUs: [], equipment: ['dumbbell'] },
      prescribedSets: GOBLET_SETS,
    },
    {
      id: 'ex2',
      name: 'Cable Row',
      exerciseDefinitionId: 'def-row',
      exerciseDefinition: { id: 'def-row', name: 'Cable Row', primaryFAUs: ['mid-back', 'lats'], secondaryFAUs: [], equipment: ['cable'] },
      prescribedSets: ROW_SETS,
    },
  ]
  plan.fetch.mockImplementation(async () => ({ ok: true, json: async () => ({ exercises: plan.exercises }) }))
  vi.stubGlobal('fetch', plan.fetch)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function programmed() {
  render(
    <ExerciseLoggingModal
      {...({
        isOpen: true,
        onClose: vi.fn(),
        workoutId: 'w1',
        workoutName: 'Leg Day',
        exerciseCount: 2,
        onComplete: vi.fn(async () => {}),
      } as Parameters<typeof ExerciseLoggingModal>[0])}
    />
  )
}
const adhocEx = (id: string, name: string, defId: string) => ({
  id,
  name,
  notes: null,
  exerciseDefinition: { id: defId, primaryFAUs: ['quads'], secondaryFAUs: [], equipment: [] },
})
function freestyle() {
  render(
    <AdHocLoggerView
      {...({
        completionId: 'cmp1',
        completionName: 'Freestyle',
        startedAt: null,
        initialExercises: [adhocEx('a1', 'Dumbbell Goblet Squat', 'def-goblet'), adhocEx('a2', 'Cable Row', 'def-row')],
        initialLoggedSets: [],
        muscleBalanceSnapshot: {},
      } as unknown as Parameters<typeof AdHocLoggerView>[0])}
    />
  )
}

const lastWizard = () => seen.wizard[seen.wizard.length - 1]
const lastPicker = () => seen.picker[seen.picker.length - 1]
const setsOf = (v: unknown) =>
  (v as Array<Record<string, unknown>>).map((s) => ({ setNumber: s.setNumber, reps: s.reps, rir: s.rir ?? null, rpe: s.rpe ?? null }))
const expectedSets = (list: ReturnType<typeof pset>[]) => list.map((s) => ({ setNumber: s.setNumber, reps: s.reps, rir: s.rir, rpe: s.rpe }))

async function swapFromPlan(rowName: string) {
  fireEvent.click(screen.getByRole('button', { name: /^plan \d+\/\d+$/i }))
  const sheet = await screen.findByRole('dialog', { name: 'Workout plan' })
  await within(sheet).findByText(rowName)
  fireEvent.keyDown(within(sheet).getByRole('button', { name: `Edit options for ${rowName}` }), { key: 'Enter' })
  fireEvent.click(screen.getByRole('menuitem', { name: /swap exercise/i }))
}

describe('Program logger hands the swap picker the exercise being swapped', () => {
  it('Edit menu: the current exercise, its definition and its 3 x 8 @ RIR 2', () => {
    programmed()
    fireEvent.click(screen.getByRole('button', { name: 'Swap this exercise' }))
    expect(screen.getByText('swap wizard open for Dumbbell Goblet Squat')).toBeTruthy()
    const p = lastWizard()
    expect(p.currentExerciseId).toBe('ex1')
    expect(p.currentExerciseDefinitionId).toBe('def-goblet')
    expect(setsOf(p.currentPrescribedSets)).toEqual(expectedSets(GOBLET_SETS))
  })

  it('plan sheet: that row\'s exercise, not the current one', async () => {
    programmed()
    await swapFromPlan('Cable Row')
    expect(await screen.findByText('swap wizard open for Cable Row')).toBeTruthy()
    const p = lastWizard()
    expect(p.currentExerciseId).toBe('ex2')
    expect(p.currentExerciseDefinitionId).toBe('def-row')
    expect(setsOf(p.currentPrescribedSets)).toEqual(expectedSets(ROW_SETS))
  })
})

describe('Freestyle logger hands the swap picker the exercise being swapped', () => {
  it('Edit menu: the current exercise\'s definition', () => {
    freestyle()
    fireEvent.click(screen.getByRole('button', { name: 'Swap this exercise' }))
    expect(screen.getByText('picker open: swap')).toBeTruthy()
    expect(lastPicker()).toMatchObject({ kind: 'swap', replacingName: 'Dumbbell Goblet Squat', currentDefinitionId: 'def-goblet' })
  })

  it('plan sheet: that row\'s definition', async () => {
    freestyle()
    await swapFromPlan('Cable Row')
    expect(await screen.findByText('picker open: swap')).toBeTruthy()
    expect(lastPicker()).toMatchObject({ kind: 'swap', replacingName: 'Cable Row', targetId: 'a2', currentDefinitionId: 'def-row' })
  })
})
