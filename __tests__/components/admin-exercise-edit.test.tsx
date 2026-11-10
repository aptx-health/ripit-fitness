/**
 * Work 157: editors and admins edit the exercise definition from either
 * logger's Edit menu. Behaviour: features/workout-logging/admin-exercise-edit.feature.
 *
 * Both loggers render with their heavy children stubbed. The menu, the quick
 * editor, the full editor, the confirms and useProgressiveExercises are real;
 * fetch is a router over the admin exercise API.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
const draft = vi.hoisted(() => ({ loggedSets: [] as Array<Record<string, unknown>> }))

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
vi.mock('@/hooks/useWorkoutDraft', () => ({
  useWorkoutDraft: () => ({
    loggedSets: draft.loggedSets,
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

// The tabs stub shows the exercise name, the set number, the logged-set count,
// the real quick-actions menu and the logging form.
vi.mock('@/components/workout-logging/ExerciseDisplayTabs', async () => {
  const { default: Menu } = await import('@/components/workout-logging/ExerciseQuickActionsMenu')
  return {
    default: (p: {
      exercise: { name: string }
      currentSetNumber: number
      loggedSets: unknown[]
      menuActions?: never[]
      loggingForm?: unknown
    }) => (
      <div>
        <div data-testid="shown-exercise">{p.exercise.name}</div>
        <div data-testid="shown-set">set {p.currentSetNumber}</div>
        <div data-testid="shown-logged">{p.loggedSets.length} logged</div>
        {p.menuActions && <Menu actions={p.menuActions} />}
        {p.loggingForm as never}
      </div>
    ),
  }
})
// The form stub shows the entered values and fills them in on a tap.
vi.mock('@/components/workout-logging/SetLoggingForm', () => ({
  default: (p: { currentSet: { reps: string; weight: string }; onSetChange: (s: unknown) => void }) => (
    <div>
      <div data-testid="entered">
        {p.currentSet.reps || '-'} x {p.currentSet.weight || '-'}
      </div>
      <button type="button" onClick={() => p.onSetChange({ ...p.currentSet, reps: '8', weight: '135' })}>
        form: 8 at 135
      </button>
    </div>
  ),
}))
vi.mock('@/components/workout-logging/FollowAlongTabs', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/WorkoutPlanEditor', () => ({ default: () => null, elapsedSince: () => undefined }))
vi.mock('@/components/workout-logging/wizards/AddExerciseWizard', () => ({ AddExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/SwapExerciseWizard', () => ({ SwapExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/EditExerciseWizard', () => ({ EditExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/DeleteExerciseWizard', () => ({ DeleteExerciseWizard: () => null }))
vi.mock('@/components/adhoc/AdHocExercisePickerModal', () => ({
  AdHocEmptyState: () => null,
  AdHocExercisePickerModal: () => null,
}))
vi.mock('@/components/features/training/WorkoutRollupModal', () => ({ WorkoutRollupModal: () => null }))

import AdHocLoggerView, { type AdHocExercise } from '@/components/adhoc/AdHocLoggerView'
import ExerciseLoggingModal from '@/components/ExerciseLoggingModal'

const MENU_ITEM = 'Edit exercise definition (Admin)'

const definition = {
  id: 'def1',
  name: 'Barbell Squat',
  instructions: 'Sit back and down.',
  notes: 'Brace first.',
  primaryFAUs: ['chest'],
  secondaryFAUs: ['triceps'],
  equipment: ['barbell'],
  category: '',
  aliases: [],
  imageUrls: [],
  usageCount: 12,
}

const fetchMock = vi.fn()
const patches = () =>
  fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

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
  draft.loggedSets = []
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url.startsWith('/api/admin/exercise-definitions/def1')) {
      if (init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body))
        return json({ success: true, data: { ...definition, ...body } })
      }
      return json({ success: true, data: definition })
    }
    if (url.startsWith('/api/exercise-definitions/check-duplicate')) return json({ success: true, data: { exists: false } })
    if (url.includes('/history')) return json({ history: null, sessions: [] })
    return json({})
  })
  vi.stubGlobal('fetch', fetchMock)
  // The full editor's muscle picker reads it.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const programExercise = {
  id: 'ex1',
  name: 'Barbell Squat',
  order: 1,
  exerciseGroup: null,
  notes: null,
  prescribedSets: [{ id: 'p1', setNumber: 1, reps: '5', weight: null, rpe: null, rir: null }],
  exerciseDefinitionId: 'def1',
  exerciseDefinition: {
    id: 'def1',
    name: 'Barbell Squat',
    primaryFAUs: ['chest'],
    secondaryFAUs: ['triceps'],
    equipment: ['barbell'],
    isSystem: true,
    createdBy: null,
  },
}

function programLogger(isEditorRole: boolean) {
  render(
    <ExerciseLoggingModal
      isOpen
      onClose={vi.fn()}
      workoutId="w1"
      workoutName="Leg Day"
      exerciseCount={1}
      initialExercise={programExercise}
      initialHistory={null}
      onComplete={vi.fn(async () => {})}
      isEditorRole={isEditorRole}
    />,
  )
}

const adhocExercises: AdHocExercise[] = [
  {
    id: 'ax1',
    name: 'Barbell Squat',
    notes: null,
    exerciseDefinition: { id: 'def1', primaryFAUs: ['chest'], secondaryFAUs: ['triceps'], equipment: ['barbell'] },
  },
  {
    id: 'ax2',
    name: 'Cable Row',
    notes: null,
    exerciseDefinition: { id: 'def2', primaryFAUs: [], secondaryFAUs: [], equipment: [] },
  },
]

function freestyleLogger(isEditorRole: boolean) {
  render(
    <AdHocLoggerView
      completionId="c1"
      completionName="Open Workout"
      startedAt={null}
      initialExercises={adhocExercises}
      initialLoggedSets={[
        { id: 's1', exerciseId: 'ax1', setNumber: 1, reps: 5, weight: 100, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false },
      ]}
      muscleBalanceSnapshot={{} as never}
      isEditorRole={isEditorRole}
    />,
  )
}

const loggers = [
  { name: 'program logger', open: programLogger },
  { name: 'freestyle logger', open: freestyleLogger },
] as const

async function openEditMenu() {
  await screen.findByTestId('shown-exercise')
  fireEvent.keyDown(screen.getByRole('button', { name: /edit workout/i }), { key: 'Enter' })
}

async function openQuickEditor(open: (editor: boolean) => void) {
  open(true)
  await openEditMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: MENU_ITEM }))
  return screen.findByDisplayValue('Barbell Squat')
}

/** The z-index of the nearest element from `el` upwards that sets one. */
function zOf(el: Element | null): number {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    const inline = (node as HTMLElement).style?.zIndex
    if (inline) return Number(inline)
    const match = (node.getAttribute('class') ?? '').match(/(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?:\s|$)/)
    if (match) return Number(match[1] ?? match[2])
  }
  return 0
}

describe.each(loggers)('$name', ({ open }) => {
  describe('Scenario Outline: The Edit menu offers the definition editor', () => {
    it(`an editor sees "${MENU_ITEM}"`, async () => {
      open(true)
      await openEditMenu()
      expect(screen.getByRole('menuitem', { name: MENU_ITEM })).toBeTruthy()
    })
  })

  describe("Scenario: Regular users don't see it", () => {
    it(`there is no "${MENU_ITEM}" item`, async () => {
      open(false)
      await openEditMenu()
      expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0)
      expect(screen.queryByRole('menuitem', { name: MENU_ITEM })).toBeNull()
    })
  })

  describe('Scenario: Opens the quick editor for this exercise', () => {
    it("shows this exercise's name, instructions, notes, muscles and equipment, and links to the full editor", async () => {
      await openQuickEditor(open)
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/exercise-definitions/def1')
      expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Barbell Squat')
      expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Sit back and down.')
      expect(screen.getByLabelText('Cues')).toHaveProperty('value', 'Brace first.')
      expect(screen.getByText('Chest')).toBeTruthy()
      expect(screen.getByText('Triceps')).toBeTruthy()
      expect(screen.getByText('Barbell')).toBeTruthy()
      expect(screen.getByRole('button', { name: /edit all fields/i })).toBeTruthy()
    })
  })

  describe('Scenario: Saving asks first and shows the impact', () => {
    it('says the change applies for every user and how many workouts use it, with "Save for everyone" and "Keep editing"', async () => {
      await openQuickEditor(open)
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Back Squat' } })
      fireEvent.click(screen.getByRole('button', { name: /save & return to workout/i }))
      const confirm = screen.getByRole('alertdialog', { name: 'Save for everyone?' })
      expect(confirm.textContent).toContain('for every user')
      expect(confirm.textContent).toContain('used in 12 workouts')
      expect(confirm.textContent).toContain('Workouts still named Barbell Squat are renamed too')
      expect(within(confirm).getByRole('button', { name: 'Save for everyone' })).toBeTruthy()
      expect(within(confirm).getByRole('button', { name: 'Keep editing' })).toBeTruthy()
      expect(patches()).toHaveLength(0)
    })
  })

  describe('Scenario: Saving asks first (name unchanged)', () => {
    it('says nothing about renaming workouts when the name did not change', async () => {
      await openQuickEditor(open)
      fireEvent.change(screen.getByLabelText('Cues'), { target: { value: 'Knees out.' } })
      fireEvent.click(screen.getByRole('button', { name: /save & return to workout/i }))
      const confirm = screen.getByRole('alertdialog', { name: 'Save for everyone?' })
      expect(confirm.textContent).toContain('for every user')
      expect(confirm.textContent).not.toContain('renamed')
    })
  })

  describe('Instructions limit', () => {
    it('the quick editor and the full editor allow 4000 characters of instructions', async () => {
      await openQuickEditor(open)
      expect(screen.getByLabelText('Description').getAttribute('maxlength')).toBe('4000')
      fireEvent.click(screen.getByRole('button', { name: /edit all fields/i }))
      await screen.findByLabelText(/exercise name/i)
      const instructions = document.getElementById('exercise-instructions')
      expect(instructions?.getAttribute('maxlength')).toBe('4000')
      expect(screen.getByText(/\/ 4000/)).toBeTruthy()
    })
  })

  describe('Scenario: Confirmed save returns to the workout', () => {
    it('saves, closes the editor and shows the new name with the same exercise, set and entered values', async () => {
      open(true)
      await screen.findByTestId('shown-exercise')
      fireEvent.click(screen.getByRole('button', { name: 'form: 8 at 135' }))
      const setBefore = screen.getByTestId('shown-set').textContent
      const loggedBefore = screen.getByTestId('shown-logged').textContent
      fireEvent.keyDown(screen.getByRole('button', { name: /edit workout/i }), { key: 'Enter' })
      fireEvent.click(screen.getByRole('menuitem', { name: MENU_ITEM }))
      await screen.findByDisplayValue('Barbell Squat')

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Back Squat' } })
      fireEvent.click(screen.getByRole('button', { name: /save & return to workout/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Save for everyone' }))

      await waitFor(() => expect(screen.getByTestId('shown-exercise').textContent).toBe('Back Squat'))
      expect(patches()).toHaveLength(1)
      const [url, init] = patches()[0]
      expect(url).toBe('/api/admin/exercise-definitions/def1')
      expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ name: 'Back Squat' })
      expect(screen.queryByLabelText('Name')).toBeNull()
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(screen.getByTestId('shown-set').textContent).toBe(setBefore)
      expect(screen.getByTestId('shown-logged').textContent).toBe(loggedBefore)
      expect(screen.getByTestId('entered').textContent).toBe('8 x 135')
    })
  })

  describe('Scenario: Keep editing', () => {
    it('saves nothing and keeps the edits in the editor', async () => {
      await openQuickEditor(open)
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Back Squat' } })
      fireEvent.change(screen.getByLabelText('Cues'), { target: { value: 'Knees out.' } })
      fireEvent.click(screen.getByRole('button', { name: /save & return to workout/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(patches()).toHaveLength(0)
      expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Back Squat')
      expect(screen.getByLabelText('Cues')).toHaveProperty('value', 'Knees out.')
    })
  })

  describe('Scenario: Leaving with unsaved changes asks', () => {
    it('closing after a change asks to discard or keep editing', async () => {
      await openQuickEditor(open)
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New text' } })
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      const confirm = screen.getByRole('alertdialog', { name: 'Discard changes?' })
      expect(within(confirm).getByRole('button', { name: 'Discard' })).toBeTruthy()
      fireEvent.click(within(confirm).getByRole('button', { name: 'Keep editing' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(screen.getByLabelText('Description')).toHaveProperty('value', 'New text')

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
      await waitFor(() => expect(screen.queryByLabelText('Description')).toBeNull())
      expect(patches()).toHaveLength(0)
      expect(screen.getByTestId('shown-exercise').textContent).toBe('Barbell Squat')
    })

    it('closing with no changes just closes', async () => {
      await openQuickEditor(open)
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(screen.queryByLabelText('Name')).toBeNull()
    })
  })

  describe('Scenario: The full editor confirms the same way', () => {
    async function openFullEditor() {
      await openQuickEditor(open)
      fireEvent.click(screen.getByRole('button', { name: /edit all fields/i }))
      await screen.findByLabelText(/exercise name/i)
      await waitFor(() => expect(screen.getByLabelText(/exercise name/i)).toHaveProperty('value', 'Barbell Squat'))
    }

    it('saving a change asks "Save for everyone?" first, then saves and returns to the workout', async () => {
      await openFullEditor()
      fireEvent.change(screen.getByLabelText(/exercise name/i), { target: { value: 'Back Squat' } })
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
      const confirm = screen.getByRole('alertdialog', { name: 'Save for everyone?' })
      expect(confirm.textContent).toContain('for every user')
      expect(confirm.textContent).toContain('used in 12 workouts')
      expect(patches()).toHaveLength(0)

      fireEvent.click(within(confirm).getByRole('button', { name: 'Save for everyone' }))
      await waitFor(() => expect(screen.getByTestId('shown-exercise').textContent).toBe('Back Squat'))
      expect(patches()).toHaveLength(1)
      expect(screen.queryByLabelText(/exercise name/i)).toBeNull()
      expect(screen.queryByLabelText('Name')).toBeNull()
    })

    it('closing it with unsaved changes asks to discard', async () => {
      await openFullEditor()
      fireEvent.change(screen.getByLabelText(/exercise name/i), { target: { value: 'Back Squat' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.getByRole('alertdialog', { name: 'Discard changes?' })).toBeTruthy()
      expect(screen.getByLabelText(/exercise name/i)).toHaveProperty('value', 'Back Squat')
    })
  })

  describe('Scenario: Dialogs sit above the logger', () => {
    it('the quick editor, full editor and their confirms stack above the logger and its sheets (z-90) and its confirms (z-95)', async () => {
      await openQuickEditor(open)
      const quick = zOf(screen.getByLabelText('Name'))
      expect(quick).toBeGreaterThan(95)

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Back Squat' } })
      fireEvent.click(screen.getByRole('button', { name: /save & return to workout/i }))
      const quickConfirm = screen.getByRole('alertdialog', { name: 'Save for everyone?' })
      expect(zOf(quickConfirm)).toBeGreaterThan(quick)
      fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

      fireEvent.click(screen.getByRole('button', { name: /edit all fields/i }))
      const fullName = await screen.findByLabelText(/exercise name/i)
      const full = zOf(fullName)
      expect(full).toBeGreaterThan(quick)

      await waitFor(() => expect(fullName).toHaveProperty('value', 'Barbell Squat'))
      fireEvent.change(fullName, { target: { value: 'Back Squat' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      const fullConfirm = screen.getByRole('alertdialog', { name: 'Discard changes?' })
      expect(zOf(fullConfirm)).toBeGreaterThan(full)
      // Toasts and menus stay on top.
      expect(zOf(fullConfirm)).toBeLessThan(100)
    })
  })
})

describe('Rename keeps exercises renamed on purpose', () => {
  async function renameFromQuickEditor() {
    await screen.findByTestId('shown-exercise')
    fireEvent.keyDown(screen.getByRole('button', { name: /edit workout/i }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: MENU_ITEM }))
    await screen.findByDisplayValue('Barbell Squat')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Back Squat' } })
    fireEvent.click(screen.getByRole('button', { name: /save & return to workout/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Save for everyone' }))
    await waitFor(() => expect(patches()).toHaveLength(1))
    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull())
  }

  it('program logger: an exercise named differently from the definition keeps its name', async () => {
    render(
      <ExerciseLoggingModal
        isOpen
        onClose={vi.fn()}
        workoutId="w1"
        workoutName="Leg Day"
        exerciseCount={1}
        initialExercise={{ ...programExercise, name: 'My Squat' }}
        initialHistory={null}
        onComplete={vi.fn(async () => {})}
        isEditorRole
      />,
    )
    await renameFromQuickEditor()
    expect(screen.getByTestId('shown-exercise').textContent).toBe('My Squat')
  })

  it('freestyle logger: an exercise named differently from the definition keeps its name', async () => {
    render(
      <AdHocLoggerView
        completionId="c1"
        completionName="Open Workout"
        startedAt={null}
        initialExercises={[{ ...adhocExercises[0], name: 'My Squat' }]}
        initialLoggedSets={[]}
        muscleBalanceSnapshot={{} as never}
        isEditorRole
      />,
    )
    await renameFromQuickEditor()
    expect(screen.getByTestId('shown-exercise').textContent).toBe('My Squat')
  })
})
