/**
 * L1: the confirms as the two loggers wire them. The programmed logger
 * (ExerciseLoggingModal) and the ad-hoc logger (AdHocLoggerView) are rendered
 * with their data hooks and heavy children stubbed; the header, the confirm
 * components and the quick-actions menu are the real ones.
 * Behaviour: features/ui-audit/logger-confirm.feature. Spec: initiatives/ui-audit/spec.md ("L1").
 *
 * PINNED (see logger-confirm-call-sites.test.tsx for the component props)
 *
 *   - ExerciseLoggingModal passes CompleteWorkoutConfirm  setCount = all logged sets of the
 *     workout (useWorkoutDraft().loggedSets.length) and durationMinutes = whole minutes since
 *     useWorkoutDraft().startedAt. AdHocLoggerView passes the same from its own loggedSets
 *     and `startedAt` prop. (Follow-along does not show a summary here; not tested.)
 *   - The ad-hoc "Complete this workout?" confirm is the same CompleteWorkoutConfirm
 *     (a real alert dialog), no longer an inline div.
 *   - The Delete-exercise action passed to the menu carries confirmationTitle
 *     `Delete ${exercise.name}?`.
 *   - ExerciseLoggingModal reports a failed completion (offline or not, guided or not) with
 *     useToast().error(...) from '@/components/ToastProvider', and never calls window.alert.
 *
 * Mocked here: useToast, next/navigation, the data hooks, '@/lib/api/*', and the
 * wizards/tabs/forms/footers/plan editor/pickers (stubs below).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
const draft = vi.hoisted(() => ({
  loggedSets: [] as Array<Record<string, unknown>>,
  startedAt: null as string | null,
  deleteSet: vi.fn(),
  clearCache: vi.fn(),
  flushFailedSets: vi.fn(async () => {}),
}))
const api = vi.hoisted(() => ({
  completeDraft: vi.fn(),
  discardDraft: vi.fn(),
  completeAdHocWorkout: vi.fn(),
  discardAdHocWorkout: vi.fn(),
  fetchExerciseHistory: vi.fn(),
}))
const prog = vi.hoisted(() => ({ total: 2 }))
const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }))

vi.mock('@/components/ToastProvider', () => ({ useToast: () => toast, ToastProvider: ({ children }: { children: unknown }) => children }))
vi.mock('next/navigation', () => ({ useRouter: () => nav, usePathname: () => '/training', useSearchParams: () => new URLSearchParams() }))
vi.mock('@/hooks/useImagePrefetch', () => ({ useImagePrefetch: () => {} }))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: false, isLoading: false }) }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: { completedTours: '[]', loggingMode: 'full' }, isLoading: false, updateSettings: vi.fn() }),
}))
vi.mock('@/hooks/useProgressiveExercises', () => {
  const exercise = {
    id: 'ex1',
    name: 'Barbell Squat',
    notes: null,
    prescribedSets: [],
    exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [], isSystem: false },
  }
  return {
    useProgressiveExercises: () => ({
      currentExercise: exercise,
      currentExerciseState: 'loaded',
      currentIndex: 0,
      totalExercises: prog.total,
      goToExercise: vi.fn(),
      goToNext: vi.fn(),
      goToPrevious: vi.fn(),
      loadedExercises: [exercise],
      currentExerciseHistory: null,
      currentExerciseSessions: [],
      currentHistoryState: 'loaded',
      hasHistoryForCurrentExercise: false,
      refreshExercises: vi.fn(),
    }),
  }
})
vi.mock('@/hooks/useWorkoutDraft', () => ({
  useWorkoutDraft: () => ({
    loggedSets: draft.loggedSets,
    isHydrating: false,
    failedSetCount: 0,
    startedAt: draft.startedAt,
    logSet: vi.fn(),
    deleteSet: draft.deleteSet,
    flushFailedSets: draft.flushFailedSets,
    clearCache: draft.clearCache,
  }),
}))
vi.mock('@/lib/api/workout-sets', () => ({ completeDraft: api.completeDraft, discardDraft: api.discardDraft }))
vi.mock('@/lib/api/adhoc-workout', () => ({
  addAdHocExercises: vi.fn(),
  completeAdHocWorkout: api.completeAdHocWorkout,
  deleteAdHocExercise: vi.fn(),
  deleteAdHocSet: vi.fn(),
  discardAdHocWorkout: api.discardAdHocWorkout,
  fetchExerciseHistory: api.fetchExerciseHistory,
  logAdHocSet: vi.fn(),
  reorderAdHocExercises: vi.fn(),
  swapAdHocExercise: vi.fn(),
}))

// The tabs stub renders the real quick-actions menu and a "delete a set" button.
vi.mock('@/components/workout-logging/ExerciseDisplayTabs', async () => {
  const { default: Menu } = await import('@/components/workout-logging/ExerciseQuickActionsMenu')
  return {
    default: (p: { menuActions?: never[]; onDeleteSet: (n: number) => void }) => (
      <div>
        {p.menuActions && <Menu actions={p.menuActions} />}
        <button type="button" onClick={() => p.onDeleteSet(1)}>
          stub delete set 1
        </button>
      </div>
    ),
  }
})
vi.mock('@/components/workout-logging/FollowAlongTabs', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/FollowAlongFooter', () => ({
  default: (p: { onFinish: () => void }) => (
    <button type="button" onClick={p.onFinish}>
      stub finish guided
    </button>
  ),
}))
vi.mock('@/components/workout-logging/SetLoggingForm', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/ExerciseActionsFooter', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/WorkoutPlanEditor', () => ({ default: () => null }))
vi.mock('@/components/workout-logging/wizards/AddExerciseWizard', () => ({ AddExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/SwapExerciseWizard', () => ({ SwapExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/EditExerciseWizard', () => ({ EditExerciseWizard: () => null }))
vi.mock('@/components/workout-logging/wizards/DeleteExerciseWizard', () => ({
  DeleteExerciseWizard: (p: { exerciseName: string }) => <div>delete wizard for {p.exerciseName}</div>,
}))
vi.mock('@/components/features/exercise-definition/ExerciseDefinitionEditorModal', () => ({ default: () => null }))
vi.mock('@/components/features/exercise-definition/QuickEditExerciseSheet', () => ({ default: () => null }))
vi.mock('@/components/adhoc/AdHocExercisePickerModal', () => ({
  AdHocEmptyState: () => null,
  AdHocExercisePickerModal: () => null,
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

const alertSpy = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  window.alert = alertSpy
  prog.total = 2
  draft.loggedSets = []
  draft.startedAt = null
  api.completeDraft.mockResolvedValue({ completionId: 'c1', rollup: null })
  api.discardDraft.mockResolvedValue(undefined)
  api.completeAdHocWorkout.mockResolvedValue({ rollup: null })
  api.discardAdHocWorkout.mockResolvedValue(undefined)
  api.fetchExerciseHistory.mockResolvedValue({ history: null, sessions: [] })
})
afterEach(cleanup)

const set = (n: number, exerciseId = 'ex1') => ({
  id: `s${exerciseId}${n}`,
  exerciseId,
  setNumber: n,
  reps: 5,
  weight: 100,
  weightUnit: 'lbs',
  rpe: null,
  rir: null,
  isWarmup: false,
})
const sets = (count: number) => Array.from({ length: count }, (_, i) => set(i + 1))
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000 - 5_000).toISOString()

const dialog = () => screen.getByRole('alertdialog')
const describedBy = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
const btn = (name: string | RegExp) => within(dialog()).getByRole('button', { name })
const pressEscape = () => fireEvent.keyDown(dialog(), { key: 'Escape' })
const noDialog = () => expect(screen.queryByRole('alertdialog')).toBeNull()

function programmed(over: Partial<Parameters<typeof ExerciseLoggingModal>[0]> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    workoutId: 'w1',
    workoutName: 'Leg Day',
    exerciseCount: 2,
    onComplete: vi.fn(async () => {}),
    ...over,
  }
  render(<ExerciseLoggingModal {...props} />)
  return props
}
// Follow-along's Finish: the footer stub today, the bottom bar's "Finish" (last exercise) after L2.
const guidedFinish = () =>
  fireEvent.click(screen.queryByRole('button', { name: 'stub finish guided' }) ?? screen.getByRole('button', { name: /^finish$/i }))
const finish = () => fireEvent.click(screen.getByRole('button', { name: /^finish$/i }))

describe('Scenario: Completing a workout shows what will be saved (programmed logger)', () => {
  it('18 sets over 42 minutes: tapping Complete says "18 sets · 42 min"', () => {
    draft.loggedSets = sets(18)
    draft.startedAt = minutesAgo(42)
    programmed()
    finish()
    expect(screen.getByRole('alertdialog', { name: /complete this workout/i })).toBeTruthy()
    expect(describedBy(dialog())).toContain('18 sets · 42 min')
  })

  it('the summary uses this workout\'s numbers', () => {
    draft.loggedSets = sets(3)
    draft.startedAt = minutesAgo(7)
    programmed()
    finish()
    expect(describedBy(dialog())).toContain('3 sets · 7 min')
  })

  it('the summary counts every exercise\'s sets, not just the one on screen', () => {
    draft.loggedSets = [...sets(5), ...Array.from({ length: 4 }, (_, i) => set(i + 1, 'ex2'))]
    draft.startedAt = minutesAgo(30)
    programmed()
    finish()
    expect(describedBy(dialog())).toContain('9 sets · 30 min')
  })

  it('confirming completes the workout as before: completeDraft, then onComplete with its result', async () => {
    draft.loggedSets = sets(18)
    draft.startedAt = minutesAgo(42)
    const p = programmed()
    finish()
    fireEvent.click(btn('Confirm'))
    await waitFor(() => expect(p.onComplete).toHaveBeenCalledTimes(1))
    expect(api.completeDraft).toHaveBeenCalledTimes(1)
    expect(api.completeDraft.mock.calls[0][0]).toBe('w1')
    expect(p.onComplete).toHaveBeenCalledWith({ completionId: 'c1', rollup: null })
    expect(draft.clearCache).toHaveBeenCalled()
  })

  it('Cancel closes it and nothing is completed', () => {
    draft.loggedSets = sets(2)
    const p = programmed()
    finish()
    fireEvent.click(btn('Cancel'))
    noDialog()
    expect(api.completeDraft).not.toHaveBeenCalled()
    expect(p.onComplete).not.toHaveBeenCalled()
  })

  it('Escape cancels: it closes and nothing is completed', () => {
    draft.loggedSets = sets(2)
    const p = programmed()
    finish()
    pressEscape()
    noDialog()
    expect(api.completeDraft).not.toHaveBeenCalled()
    expect(p.onComplete).not.toHaveBeenCalled()
  })

  it('focus returns to the FINISH button after Escape', async () => {
    draft.loggedSets = sets(2)
    programmed()
    const fin = screen.getByRole('button', { name: /^finish$/i })
    fin.focus()
    fireEvent.click(fin)
    pressEscape()
    await waitFor(() => expect(document.activeElement).toBe(fin))
  })
})

describe('Scenario: A failed completion is shown in the app (programmed logger)', () => {
  it('completing fails online: an error toast, no browser alert, the confirmation closes', async () => {
    api.completeDraft.mockRejectedValue(new Error('boom'))
    draft.loggedSets = sets(4)
    const p = programmed()
    finish()
    fireEvent.click(btn('Confirm'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(alertSpy).not.toHaveBeenCalled()
    expect(p.onComplete).not.toHaveBeenCalled()
    await waitFor(() => noDialog())
  })

  it('the toast says what happened, not nothing', async () => {
    api.completeDraft.mockRejectedValue(new Error('boom'))
    draft.loggedSets = sets(4)
    programmed()
    finish()
    fireEvent.click(btn('Confirm'))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const shown = toast.error.mock.calls[0].filter((a) => typeof a === 'string').join(' ')
    expect(shown).toMatch(/workout/i)
    expect(shown).toMatch(/try again|couldn.t|failed|didn.t/i)
  })

  it('offline: the toast says so, and it is still a toast, not an alert', async () => {
    api.completeDraft.mockRejectedValue(new Error('offline'))
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    draft.loggedSets = sets(4)
    programmed()
    finish()
    fireEvent.click(btn('Confirm'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(toast.error.mock.calls[0].join(' ')).toMatch(/offline/i)
    expect(alertSpy).not.toHaveBeenCalled()
    online.mockRestore()
  })

  it('a successful completion shows no error toast', async () => {
    draft.loggedSets = sets(4)
    const p = programmed()
    finish()
    fireEvent.click(btn('Confirm'))
    await waitFor(() => expect(p.onComplete).toHaveBeenCalled())
    expect(toast.error).not.toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
  })
})

describe('Scenario: Switching from follow-along to logging, and completing a freestyle workout (follow-along)', () => {
  it('follow-along: Finish asks with the same kind of confirmation, and confirming completes it guided, as before', async () => {
    prog.total = 1
    const p = programmed({ loggingMode: 'follow_along' })
    guidedFinish()
    expect(screen.getByRole('alertdialog', { name: /mark this workout as done/i })).toBeTruthy()
    fireEvent.click(btn('Finish'))
    await waitFor(() => expect(p.onComplete).toHaveBeenCalledTimes(1))
    expect(api.completeDraft).toHaveBeenCalledWith('w1', undefined, true)
  })

  it('follow-along: Escape leaves the workout open and uncompleted', () => {
    prog.total = 1
    const p = programmed({ loggingMode: 'follow_along' })
    guidedFinish()
    pressEscape()
    noDialog()
    expect(api.completeDraft).not.toHaveBeenCalled()
    expect(p.onComplete).not.toHaveBeenCalled()
  })

  it('follow-along: a failed completion is a toast too, not an alert', async () => {
    api.completeDraft.mockRejectedValue(new Error('boom'))
    prog.total = 1
    programmed({ loggingMode: 'follow_along' })
    guidedFinish()
    fireEvent.click(btn('Finish'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('tapping the banner asks first; Switch then persists loggingMode=full as before', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    programmed({ loggingMode: 'follow_along' })
    fireEvent.click(screen.getByRole('button', { name: /switch to logging/i }))
    expect(screen.getByRole('alertdialog', { name: /switch to logging mode/i })).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
    fireEvent.click(btn('Switch'))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/settings')
    expect(JSON.parse(String(init.body))).toEqual({ loggingMode: 'full' })
    vi.unstubAllGlobals()
  })

  it('Escape on the switch question changes nothing', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    programmed({ loggingMode: 'follow_along' })
    fireEvent.click(screen.getByRole('button', { name: /switch to logging/i }))
    pressEscape()
    noDialog()
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('Scenario: Leaving a workout (programmed logger)', () => {
  const exitX = () => fireEvent.click(screen.getByRole('button', { name: /exit workout/i }))

  it('with sets logged I can save it as a draft, discard it, or cancel', () => {
    draft.loggedSets = sets(2)
    programmed()
    exitX()
    expect(screen.getByRole('alertdialog', { name: /exit workout/i })).toBeTruthy()
    expect(btn(/save as draft/i)).toBeTruthy()
    expect(btn(/discard/i)).toBeTruthy()
    expect(btn('Cancel')).toBeTruthy()
  })

  it('Save as draft closes the logger and keeps the draft (no discard call)', async () => {
    draft.loggedSets = sets(2)
    const p = programmed()
    exitX()
    fireEvent.click(btn(/save as draft/i))
    await waitFor(() => expect(p.onClose).toHaveBeenCalledWith(true))
    expect(api.discardDraft).not.toHaveBeenCalled()
  })

  it('Discard throws the draft away and closes the logger', async () => {
    draft.loggedSets = sets(2)
    const p = programmed()
    exitX()
    fireEvent.click(btn(/discard/i))
    await waitFor(() => expect(p.onClose).toHaveBeenCalledWith(true))
    expect(api.discardDraft).toHaveBeenCalledWith('w1')
    expect(draft.clearCache).toHaveBeenCalled()
  })

  it('Cancel stays in the workout: nothing saved, discarded or closed', () => {
    draft.loggedSets = sets(2)
    const p = programmed()
    exitX()
    fireEvent.click(btn('Cancel'))
    noDialog()
    expect(p.onClose).not.toHaveBeenCalled()
    expect(api.discardDraft).not.toHaveBeenCalled()
  })

  it('Escape is Cancel', () => {
    draft.loggedSets = sets(2)
    const p = programmed()
    exitX()
    pressEscape()
    noDialog()
    expect(p.onClose).not.toHaveBeenCalled()
    expect(api.discardDraft).not.toHaveBeenCalled()
  })

  it('focus returns to the exit button', async () => {
    draft.loggedSets = sets(2)
    programmed()
    const x = screen.getByRole('button', { name: /exit workout/i })
    x.focus()
    fireEvent.click(x)
    pressEscape()
    await waitFor(() => expect(document.activeElement).toBe(x))
  })
})

describe('Scenario: Deleting the only set (programmed logger)', () => {
  const deleteSetOne = () => fireEvent.click(screen.getByRole('button', { name: 'stub delete set 1' }))

  it('deleting the exercise\'s only logged set asks "Delete the only set?"', () => {
    draft.loggedSets = [set(1)]
    programmed()
    deleteSetOne()
    expect(screen.getByRole('alertdialog', { name: 'Delete the only set?' })).toBeTruthy()
    expect(draft.deleteSet).not.toHaveBeenCalled()
  })

  it('confirming deletes it as before', () => {
    draft.loggedSets = [set(1)]
    programmed()
    deleteSetOne()
    fireEvent.click(btn(/delete set/i))
    expect(draft.deleteSet).toHaveBeenCalledTimes(1)
    expect(draft.deleteSet).toHaveBeenCalledWith('sex11', 'ex1', 1)
    noDialog()
  })

  it('Escape keeps the set', () => {
    draft.loggedSets = [set(1)]
    programmed()
    deleteSetOne()
    pressEscape()
    noDialog()
    expect(draft.deleteSet).not.toHaveBeenCalled()
  })

  it('with two sets there is nothing to confirm: it deletes straight away', () => {
    draft.loggedSets = [set(1), set(2)]
    programmed()
    deleteSetOne()
    noDialog()
    expect(draft.deleteSet).toHaveBeenCalledTimes(1)
  })

  it('"only" is about this exercise: another exercise\'s sets do not count', () => {
    draft.loggedSets = [set(1), set(1, 'ex2'), set(2, 'ex2')]
    programmed()
    deleteSetOne()
    expect(screen.getByRole('alertdialog', { name: 'Delete the only set?' })).toBeTruthy()
  })
})

describe('Scenario: Deleting an exercise names it (programmed logger)', () => {
  function openDelete() {
    const trigger = screen.getByRole('button', { name: 'Edit workout' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: /delete this exercise/i }))
    return trigger
  }

  it('"Barbell Squat" is in my workout: Delete from its menu asks "Delete Barbell Squat?"', () => {
    programmed()
    openDelete()
    expect(screen.getByRole('alertdialog', { name: 'Delete Barbell Squat?' })).toBeTruthy()
  })

  it('confirming removes it as before: the delete wizard opens for that exercise', () => {
    programmed()
    openDelete()
    expect(screen.queryByText(/delete wizard for/)).toBeNull()
    fireEvent.click(btn(/delete|confirm/i))
    expect(screen.getByText('delete wizard for Barbell Squat')).toBeTruthy()
    noDialog()
  })

  it('Escape cancels: the wizard does not open', () => {
    programmed()
    openDelete()
    pressEscape()
    noDialog()
    expect(screen.queryByText(/delete wizard for/)).toBeNull()
  })

  it('the action is the filled bg-error one', () => {
    programmed()
    openDelete()
    expect(btn(/delete|confirm/i).className).toMatch(/(^|\s)bg-error(\s|$)/)
  })
})

describe('Scenario: Completing a freestyle workout (ad-hoc logger)', () => {
  function adhoc(over: Partial<Parameters<typeof AdHocLoggerView>[0]> = {}) {
    const props = {
      completionId: 'cmp1',
      completionName: 'Freestyle',
      startedAt: minutesAgo(42),
      initialExercises: [
        { id: 'ex1', name: 'Barbell Squat', notes: null, exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [] } },
      ],
      initialLoggedSets: sets(18),
      muscleBalanceSnapshot: {} as never,
      ...over,
    } as Parameters<typeof AdHocLoggerView>[0]
    render(<AdHocLoggerView {...props} />)
    return props
  }

  it('tapping Complete opens a real alert dialog, "Complete this workout?"', () => {
    adhoc()
    finish()
    expect(screen.getByRole('alertdialog', { name: /complete this workout/i })).toBeTruthy()
  })

  it('18 sets over 42 minutes: the confirmation says "18 sets · 42 min"', () => {
    adhoc()
    finish()
    expect(describedBy(dialog())).toContain('18 sets · 42 min')
  })

  it('confirming completes the workout as before', async () => {
    adhoc()
    finish()
    fireEvent.click(btn('Confirm'))
    await waitFor(() => expect(api.completeAdHocWorkout).toHaveBeenCalledTimes(1))
    expect(api.completeAdHocWorkout.mock.calls[0][0]).toBe('cmp1')
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/training'))
  })

  it('Escape cancels: nothing is completed', () => {
    adhoc()
    finish()
    pressEscape()
    noDialog()
    expect(api.completeAdHocWorkout).not.toHaveBeenCalled()
  })

  it('Cancel cancels too', () => {
    adhoc()
    finish()
    fireEvent.click(btn('Cancel'))
    noDialog()
    expect(api.completeAdHocWorkout).not.toHaveBeenCalled()
  })

  it('a failed completion is an error toast in the app, not a browser alert', async () => {
    api.completeAdHocWorkout.mockRejectedValue(new Error('boom'))
    adhoc()
    finish()
    fireEvent.click(btn('Confirm'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect(alertSpy).not.toHaveBeenCalled()
    await waitFor(() => noDialog())
  })

  it('the ad-hoc exit is the same real dialog, with its three choices', () => {
    adhoc()
    fireEvent.click(screen.getByRole('button', { name: /exit workout/i }))
    expect(screen.getByRole('alertdialog', { name: /exit workout/i })).toBeTruthy()
    expect(btn(/save as draft/i)).toBeTruthy()
    expect(btn(/discard/i)).toBeTruthy()
  })

  it('has no doom-corners on the confirmation', () => {
    adhoc()
    finish()
    expect(dialog().closest('.doom-corners')).toBeNull()
    expect(dialog().querySelector('.doom-corners')).toBeNull()
  })
})
