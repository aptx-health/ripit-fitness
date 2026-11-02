/**
 * L3: the exercise tabs as paper tabs over a folder box (tab-bar A), and the 48px carry-overs
 * from review 090 that live in the exercise area ("Exercise options", "Delete set N").
 * The real ExerciseDisplayTabs, DrawerContextBanner, SetList and PaperTabs are rendered; the
 * info and history bodies are stubs. Behaviour: features/ui-audit/logger-plan.feature.
 * Spec: initiatives/ui-audit/spec.md ("L3", items 1 to 3).
 *
 * PINNED (ExerciseDisplayTabs keeps its props; nothing new is passed in)
 *
 *   - A PaperTabs tablist (tone mine) named "Exercise" holds the tabs, in this order:
 *       Log · Info · Notes · History        ("Log", no longer "Log Sets")
 *     Notes exists only when the exercise has notes. Log is selected first.
 *   - Count chips on the tab, named by PaperTabs' countLabel (role img):
 *       Notes: 1, "1 note"        History: the number of past sessions, "3 sessions" / "1 session"
 *     (the `sessions` prop, else the single `exerciseHistory`). No History chip while history is
 *     loading or pending, in error, or when there are no sessions. The old unlabelled 8px squares
 *     are gone.
 *   - The selected panel (role tabpanel, aria-labelledby the selected tab) sits in a folder box:
 *     an ancestor with classes folder-box, border-2, border-secondary. The tablist is above that box,
 *     not inside it. No doom-corners.
 *   - The exercise name appears once on every tab, in the box under the tabs: exactly one visible
 *     element carries it (so Info, Notes and History no longer repeat it). On Info, Notes and History
 *     it is not a doom-heading. A superset label (exercise.exerciseGroup) still shows on Info.
 *   - 48px targets: the banner menu button "Exercise options" and the set list's "Delete set N"
 *     (h-12 / min-h-12 and w-12 / min-w-12 style classes, or the [48px] forms, or size-12).
 *   - Everything else is as before: the same bodies, the same loading / error / first-time history
 *     messages, notes tab falls back to Log when the next exercise has no notes.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/workout-logging/ExerciseHistoryPanel', () => ({
  default: (p: { sessions: unknown[] }) => <div>history panel with {p.sessions.length} sessions</div>,
}))
vi.mock('@/components/workout-logging/ExerciseInfoContent', () => ({ default: () => <div>info body</div> }))
vi.mock('@/components/workout-logging/LastSessionReference', () => ({ default: () => null }))

import ExerciseDisplayTabs from '@/components/workout-logging/ExerciseDisplayTabs'

type Props = Parameters<typeof ExerciseDisplayTabs>[0]

beforeAll(() => {
  const g = globalThis as Record<string, unknown>
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})
afterEach(cleanup)

const session = (n: number) => ({
  completedAt: new Date(2026, 9, n),
  workoutName: `Leg Day ${n}`,
  sets: [{ setNumber: 1, reps: 5, weight: 100, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false }],
})
const exercise = (over: Record<string, unknown> = {}) => ({
  id: 'ex1',
  name: 'Barbell Squat',
  notes: 'Keep your chest up',
  exerciseGroup: null,
  exerciseDefinition: { primaryFAUs: [], secondaryFAUs: [], equipment: [] },
  ...over,
})

function renderTabs(over: Partial<Props> = {}) {
  const props = {
    exercise: exercise(),
    prescribedSets: [],
    loggedSets: [],
    exerciseHistory: session(1),
    sessions: [session(3), session(2), session(1)],
    historyState: 'loaded',
    onDeleteSet: vi.fn(),
    loggingForm: <div>the set form</div>,
    currentSetNumber: 1,
    totalSets: 4,
    ...over,
  } as unknown as Props
  const view = render(<ExerciseDisplayTabs {...props} />)
  return { props, ...view }
}

const tab = (name: string | RegExp) => screen.getByRole('tab', { name })
// Radix triggers act on mousedown, PaperTabs on click: a real tap sends both.
const go = (name: string | RegExp) => {
  const t = tab(name)
  fireEvent.mouseDown(t)
  fireEvent.click(t)
}
const cls = (el: Element | null) => el?.getAttribute('class') ?? ''
const H48 = /(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|size-12)(\s|$)/
const W48 = /(^|\s)(w-12|min-w-12|w-\[48px\]|min-w-\[48px\]|size-12)(\s|$)/
/** Elements, not hidden from view, with a text node of their own that matches. */
const visible = (re: RegExp) =>
  Array.from(document.body.querySelectorAll('*')).filter(
    (el) =>
      Array.from(el.childNodes).some((n) => n.nodeType === 3 && re.test(n.textContent ?? '')) &&
      !el.closest('[hidden], [aria-hidden="true"]')
  )

describe('Scenario: Exercise tabs are paper tabs with counts', () => {
  it('the tabs are Log, Info, Notes and History, in that order', () => {
    renderTabs()
    const names = screen.getAllByRole('tab').map((t) => (t.textContent ?? '').trim())
    expect(names).toHaveLength(4)
    expect(names[0]).toMatch(/^Log$/)
    expect(names[1]).toMatch(/^Info$/)
    expect(names[2]).toMatch(/^Notes\b/)
    expect(names[3]).toMatch(/^History\b/)
  })

  it('"Log Sets" is gone', () => {
    renderTabs()
    expect(screen.queryByRole('tab', { name: /log sets/i })).toBeNull()
  })

  it('the tabs are in a tablist named "Exercise"', () => {
    renderTabs()
    expect(screen.getByRole('tablist', { name: 'Exercise' })).toBeTruthy()
  })

  it('Notes shows a count of 1, spoken as "1 note"', () => {
    renderTabs()
    const chip = within(tab(/^notes/i)).getByRole('img', { name: '1 note' })
    expect((chip.textContent ?? '').trim()).toBe('1')
  })

  it('History shows a count of 3, spoken as "3 sessions"', () => {
    renderTabs()
    const chip = within(tab(/^history/i)).getByRole('img', { name: '3 sessions' })
    expect((chip.textContent ?? '').trim()).toBe('3')
  })

  it('one session is "1 session"', () => {
    renderTabs({ sessions: [session(1)] })
    expect(within(tab(/^history/i)).getByRole('img', { name: '1 session' })).toBeTruthy()
  })

  it('the count is the number of sessions given, not a fixed one', () => {
    renderTabs({ sessions: [session(5), session(4), session(3), session(2), session(1)] })
    expect(within(tab(/^history/i)).getByRole('img', { name: '5 sessions' })).toBeTruthy()
  })

  it('with only exerciseHistory (no sessions list) it counts that one session', () => {
    renderTabs({ sessions: undefined })
    expect(within(tab(/^history/i)).getByRole('img', { name: '1 session' })).toBeTruthy()
  })

  it('no past sessions: History has no count chip', () => {
    renderTabs({ sessions: [], exerciseHistory: null })
    expect(within(tab(/^history/i)).queryByRole('img')).toBeNull()
  })

  it('history still loading: no count chip yet', () => {
    renderTabs({ historyState: 'loading', sessions: [], exerciseHistory: null })
    expect(within(tab(/^history/i)).queryByRole('img')).toBeNull()
  })

  it('no notes: there is no Notes tab, and Log, Info and History remain', () => {
    renderTabs({ exercise: exercise({ notes: null }) })
    expect(screen.queryByRole('tab', { name: /^notes/i })).toBeNull()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('the old unlabelled 8px squares are gone from the tabs', () => {
    renderTabs()
    for (const t of screen.getAllByRole('tab')) {
      expect(t.querySelector('.w-2.h-2')).toBeNull()
    }
  })

  it('Log is selected first, in the "mine" tone', () => {
    renderTabs()
    expect(tab(/^log$/i).getAttribute('aria-selected')).toBe('true')
    expect(cls(tab(/^log$/i))).toMatch(/bg-secondary/)
    expect(tab(/^info$/i).getAttribute('aria-selected')).toBe('false')
  })
})

describe('Scenario: Exercise tabs switch panels', () => {
  it('Log shows the banner and the set form, and not the other bodies', () => {
    renderTabs()
    expect(screen.getByText('the set form')).toBeTruthy()
    expect(screen.queryByText('info body')).toBeNull()
    expect(screen.queryByText('Keep your chest up')).toBeNull()
  })

  it('Info shows the info body', () => {
    renderTabs()
    go(/^info$/i)
    expect(screen.getByText('info body')).toBeTruthy()
    expect(screen.queryByText('the set form')).toBeNull()
  })

  it('Notes shows the notes', () => {
    renderTabs()
    go(/^notes/i)
    expect(screen.getByText('Keep your chest up')).toBeTruthy()
  })

  it('History shows the sessions panel', () => {
    renderTabs()
    go(/^history/i)
    expect(screen.getByText('history panel with 3 sessions')).toBeTruthy()
  })

  it('going back to Log shows the set form again', () => {
    renderTabs()
    go(/^info$/i)
    go(/^log$/i)
    expect(screen.getByText('the set form')).toBeTruthy()
  })

  it('the arrow keys move between tabs', () => {
    renderTabs()
    fireEvent.keyDown(tab(/^log$/i), { key: 'ArrowRight' })
    expect(tab(/^info$/i).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('info body')).toBeTruthy()
  })

  it('the visible panel is labelled by the selected tab', () => {
    renderTabs()
    go(/^info$/i)
    const panel = screen.getByRole('tabpanel')
    expect(panel.getAttribute('aria-labelledby')).toBe(tab(/^info$/i).id)
  })

  it('history messages are as before: loading, failed, and first time', () => {
    renderTabs({ historyState: 'loading', sessions: [], exerciseHistory: null })
    go(/^history/i)
    expect(screen.getByText(/loading history/i)).toBeTruthy()
    cleanup()
    renderTabs({ historyState: 'error', sessions: [], exerciseHistory: null })
    go(/^history/i)
    expect(screen.getByText(/failed to load history/i)).toBeTruthy()
    cleanup()
    renderTabs({ sessions: [], exerciseHistory: null })
    go(/^history/i)
    expect(screen.getByText(/first time doing this one/i)).toBeTruthy()
  })

  it('when the next exercise has no notes, the Notes tab falls back to Log', () => {
    const { rerender, props } = renderTabs()
    go(/^notes/i)
    rerender(<ExerciseDisplayTabs {...props} exercise={exercise({ id: 'ex2', name: 'Leg Press', notes: null }) as Props['exercise']} />)
    expect(tab(/^log$/i).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('the set form')).toBeTruthy()
  })
})

describe('The tabs sit over a folder box', () => {
  it('the panel is inside a folder-box with a 2px secondary border, on every tab', () => {
    renderTabs()
    for (const name of [/^log$/i, /^info$/i, /^notes/i, /^history/i]) {
      go(name)
      const box = screen.getByRole('tabpanel').closest('.folder-box')
      expect(box).toBeTruthy()
      expect(cls(box)).toMatch(/(^|\s)border-2(\s|$)/)
      expect(cls(box)).toMatch(/(^|\s)border-secondary(\s|$)/)
    }
  })

  it('the tab strip is above the box, not inside it', () => {
    renderTabs()
    const list = screen.getByRole('tablist', { name: 'Exercise' })
    const box = screen.getByRole('tabpanel').closest('.folder-box') as HTMLElement
    expect(box.contains(list)).toBe(false)
    expect(list.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('no doom-corners on the tabs or the box', () => {
    const { container } = renderTabs()
    expect(container.querySelector('.doom-corners')).toBeNull()
  })
})

describe('Scenario: the exercise name appears once', () => {
  it.each([[/^log$/i], [/^info$/i], [/^notes/i], [/^history/i]])('on tab %s exactly one visible element carries the name', (name) => {
    renderTabs()
    go(name)
    expect(visible(/barbell squat/i)).toHaveLength(1)
  })

  it('it is in the box under the tabs', () => {
    renderTabs()
    go(/^info$/i)
    const box = screen.getByRole('tabpanel').closest('.folder-box') as HTMLElement
    expect(box.contains(visible(/barbell squat/i)[0])).toBe(true)
  })

  it.each([[/^info$/i], [/^notes/i], [/^history/i]])('on tab %s the name is not a doom-heading', (name) => {
    renderTabs()
    go(name)
    const [el] = visible(/barbell squat/i)
    expect(el.closest('.doom-heading')).toBeNull()
  })

  it('a superset label still shows on Info', () => {
    renderTabs({ exercise: exercise({ exerciseGroup: 'B' }) as Props['exercise'] })
    go(/^info$/i)
    expect(screen.getByText(/superset b/i)).toBeTruthy()
  })

  it('the name follows the exercise', () => {
    const { rerender, props } = renderTabs()
    rerender(<ExerciseDisplayTabs {...props} exercise={exercise({ name: 'Leg Press' }) as Props['exercise']} />)
    go(/^info$/i)
    expect(visible(/leg press/i)).toHaveLength(1)
    expect(visible(/barbell squat/i)).toHaveLength(0)
  })
})

describe('Carry-overs from review 090: 48px targets in the exercise area', () => {
  const actions = [{ label: 'Swap this exercise', icon: () => null, onClick: vi.fn() }]

  it('"Exercise options" is a 48x48 target', () => {
    renderTabs({ menuActions: actions as unknown as Props['menuActions'] })
    const b = screen.getByRole('button', { name: 'Exercise options' })
    expect(cls(b)).toMatch(H48)
    expect(cls(b)).toMatch(W48)
  })

  it('"Exercise options" still opens the menu', () => {
    renderTabs({ menuActions: actions as unknown as Props['menuActions'] })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Exercise options' }), { key: 'Enter' })
    expect(screen.getByRole('menuitem', { name: /swap this exercise/i })).toBeTruthy()
  })

  const logged = [
    { id: 'l1', exerciseId: 'ex1', setNumber: 1, reps: 5, weight: 100, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false },
    { id: 'l2', exerciseId: 'ex1', setNumber: 2, reps: 5, weight: 105, weightUnit: 'lbs', rpe: null, rir: null, isWarmup: false },
  ]

  it('"Delete set N" is a 48x48 target for each logged set', () => {
    renderTabs({ loggedSets: logged as unknown as Props['loggedSets'] })
    for (const n of [1, 2]) {
      const b = screen.getByRole('button', { name: `Delete set ${n}` })
      expect(cls(b)).toMatch(H48)
      expect(cls(b)).toMatch(W48)
    }
  })

  it('"Delete set 2" still deletes set 2', () => {
    const { props } = renderTabs({ loggedSets: logged as unknown as Props['loggedSets'] })
    fireEvent.click(screen.getByRole('button', { name: 'Delete set 2' }))
    expect(props.onDeleteSet).toHaveBeenCalledTimes(1)
    expect(props.onDeleteSet).toHaveBeenCalledWith(2)
  })
})
