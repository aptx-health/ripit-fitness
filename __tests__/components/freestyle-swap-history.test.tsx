/**
 * Freestyle swap refreshes the History tab. The swapped row keeps its id and only its definition
 * changes, so history cached by row id has to be dropped or the old exercise's sessions stay on screen
 * until the workout is reopened. Stubs copied from quick-swap-loggers.test.tsx.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import * as adhocApi from '@/lib/api/adhoc-workout'

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
// The tabs stub shows the exercise name, the History panel's sessions, and the Edit-menu actions.
vi.mock('@/components/workout-logging/ExerciseDisplayTabs', () => ({
  default: (p: { exercise: { name: string }; sessions?: Array<{ workoutName: string }>; menuActions?: Array<{ label: string; onClick: () => void }> }) => (
    <div>
      <div data-testid="shown-exercise">{p.exercise.name}</div>
      <div data-testid="history">{(p.sessions ?? []).map((s) => s.workoutName).join(', ')}</div>
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
  AdHocExercisePickerModal: (p: { onConfirm: (defs: Array<{ id: string }>) => void }) => (
    <button type="button" onClick={() => p.onConfirm([{ id: 'def-lunge' }])}>pick Dumbbell Lunge</button>
  ),
}))
vi.mock('@/components/features/training/WorkoutRollupModal', () => ({ WorkoutRollupModal: () => null }))

import AdHocLoggerView from '@/components/adhoc/AdHocLoggerView'

beforeAll(() => {
  const g = globalThis as Record<string, unknown>
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.scrollIntoView ??= () => {}
})
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

const session = (workoutName: string) => ({ completedAt: new Date('2026-11-01'), workoutName, sets: [] })

it('after a swap, History shows the new exercise, not the old one', async () => {
  // The server answers by the row's current definition: goblet before the swap, lunge after.
  const history = vi.mocked(adhocApi.fetchExerciseHistory)
  history
    .mockResolvedValueOnce({ history: null, sessions: [session('Goblet day')] } as never)
    .mockResolvedValueOnce({ history: null, sessions: [session('Lunge day')] } as never)
  vi.mocked(adhocApi.swapAdHocExercise).mockResolvedValue({
    name: 'Dumbbell Lunge',
    exerciseDefinition: { id: 'def-lunge', primaryFAUs: ['quads'], secondaryFAUs: [], equipment: ['dumbbell'], imageUrls: [] },
  } as never)

  render(
    <AdHocLoggerView
      {...({
        completionId: 'cmp1',
        completionName: 'Freestyle',
        startedAt: null,
        initialExercises: [{ id: 'a1', name: 'Dumbbell Goblet Squat', notes: null, exerciseDefinition: { id: 'def-goblet', primaryFAUs: ['quads'], secondaryFAUs: [], equipment: [] } }],
        initialLoggedSets: [],
        muscleBalanceSnapshot: {},
      } as unknown as Parameters<typeof AdHocLoggerView>[0])}
    />
  )
  await waitFor(() => expect(screen.getByTestId('history').textContent).toBe('Goblet day'))

  fireEvent.click(screen.getByRole('button', { name: 'Swap this exercise' }))
  fireEvent.click(screen.getByRole('button', { name: 'pick Dumbbell Lunge' }))

  await waitFor(() => expect(screen.getByTestId('shown-exercise').textContent).toBe('Dumbbell Lunge'))
  await waitFor(() => expect(screen.getByTestId('history').textContent).toBe('Lunge day'))
  expect(history).toHaveBeenCalledTimes(2)
})
