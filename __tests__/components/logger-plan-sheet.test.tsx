/**
 * L3: the plan as a folder bottom sheet (plan-drawer A). The real WorkoutPlanEditor and
 * WorkoutPlanEditorRow are rendered; dnd-kit's DndContext is replaced by a pass-through that
 * hands the test its onDragEnd, so reordering is driven without pointer geometry.
 * Behaviour: features/ui-audit/logger-plan.feature. Spec: initiatives/ui-audit/spec.md ("L3", items 4 to 6).
 * The sheet as the programmed and freestyle loggers wire it: logger-plan-loggers.test.tsx.
 *
 * PINNED INTERFACE
 *
 *   components/workout-logging/WorkoutPlanEditor.tsx stays the sheet (same default export, same props:
 *   open, onClose, exercises, currentExerciseId, isReordering, onReorder, onJump, onAdd, onSwap, onDelete)
 *   with one new prop and richer rows:
 *     elapsed?: string                    the workout clock, e.g. "24:10"
 *     WorkoutPlanEditorExercise = {
 *       id: string; name: string
 *       setsDone: number                  logged sets for this exercise
 *       setsPlanned?: number              prescribed sets; omitted for a freestyle exercise
 *       detail?: string                   the sub-line's tail, e.g. "50 lbs"
 *     }
 *
 *   The sheet
 *   - is a dialog named "Workout plan" (aria-labelledby the title, an h2 "Workout plan" on a
 *     PaperTabTitle, tone mine) with a count chip reading "2/6" (current position / total),
 *     role="img" aria-label "exercise 2 of 6". A close button named "Close", 48x48, is on the same
 *     row as the title. Escape closes. App scroll is locked while it is open.
 *   - is a folder bottom sheet: the dialog is bg-card, border-2 border-secondary, folder-box,
 *     anchored to the bottom (a bottom-/items-end/slide-in-from-bottom class on it or its wrapper),
 *     no side drawer (no slide-in-from-left, no border-r-2), no doom-corners, no fixed rgba().
 *   - shows a one-line summary: "9 of 23 sets · 24:10" (sum of setsDone of sum of setsPlanned, then
 *     elapsed); no elapsed: "9 of 23 sets". All freestyle (no setsPlanned): "12 sets · 24:10" ("1 set").
 *   - lists rows as plain rows in one box: the list has divide-y; a row (li) carries no border-2 of
 *     its own. Each row li has data-status="done" | "now" | "upcoming":
 *       done      = setsPlanned set and setsDone >= setsPlanned, and not the current exercise;
 *                   its status square is an element role="img" aria-label "Done" (the check)
 *       now       = the current exercise: its square shows its 1-based number, plus ONE chip "NOW"
 *       upcoming  = the rest: the square shows the 1-based number
 *     The name is as given (not upper-cased), may wrap (no truncate / whitespace-nowrap), no chevron.
 *     Sub-line: "2 of 4 sets · 50 lbs" (setsDone of setsPlanned, then " · " + detail); no detail: "2 of 4 sets";
 *     freestyle: "2 sets" / "1 set". Set squares: setsPlanned elements [data-set-square], the first
 *     setsDone with data-set-square="done", the rest "todo" (none when freestyle).
 *     The current row alone has data-current and a primary cue class (inset primary left bar).
 *     The row's jump button is the button whose name starts with the exercise name; it calls
 *     onJump(id) then onClose(). The row's menu button, 48x48 "Edit options for <name>", opens the
 *     L1 menu: "Swap exercise" -> onSwap(id); "Delete exercise" -> a "Delete <name>?" alert dialog,
 *     confirm -> onDelete(id).
 *   - footer: a "Reorder" toggle button (aria-pressed, false by default) next to "+ Add exercise"
 *     (name /add exercise/i -> onAdd). Drag grips ("Drag to reorder <name>") exist only while
 *     Reorder is on. Dropping row A on row B calls onReorder(ids in the new order), and the list shows
 *     the new order at once.
 *   - nothing exercised yet: "No exercises yet" with an "Add exercise" button (as today).
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const dnd = vi.hoisted(() => ({ onDragEnd: null as null | ((e: unknown) => void) }))
const scroll = vi.hoisted(() => ({ unlock: vi.fn(), lock: vi.fn() }))

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...real,
    DndContext: (p: { children: ReactNode; onDragEnd: (e: unknown) => void }) => {
      dnd.onDragEnd = p.onDragEnd
      return <>{p.children}</>
    },
  }
})
vi.mock('@/lib/nav/app-scroll', () => ({ lockAppScroll: scroll.lock }))

import WorkoutPlanEditor from '@/components/workout-logging/WorkoutPlanEditor'

type Row = { id: string; name: string; setsDone: number; setsPlanned?: number; detail?: string }
type SheetProps = {
  open: boolean
  onClose: () => void
  exercises: Row[]
  currentExerciseId?: string | null
  isReordering?: boolean
  elapsed?: string
  onReorder: (ids: string[]) => void | Promise<void>
  onJump: (id: string) => void
  onAdd: () => void
  onSwap: (id: string) => void
  onDelete: (id: string) => void
}
const Sheet = WorkoutPlanEditor as unknown as (p: SheetProps) => React.ReactElement

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
  scroll.lock.mockReset()
  scroll.unlock.mockReset()
  scroll.lock.mockReturnValue(scroll.unlock)
  dnd.onDragEnd = null
})
afterEach(cleanup)

const WORKOUT: Row[] = [
  { id: 'e1', name: 'Barbell Squat', setsDone: 4, setsPlanned: 4 },
  { id: 'e2', name: 'Bench Press', setsDone: 2, setsPlanned: 4, detail: '50 lbs' },
  { id: 'e3', name: 'Dumbbell Romanian Deadlift', setsDone: 0, setsPlanned: 3 },
  { id: 'e4', name: 'Cable Row', setsDone: 0, setsPlanned: 4 },
  { id: 'e5', name: 'Face Pull', setsDone: 0, setsPlanned: 3 },
  { id: 'e6', name: 'Plank', setsDone: 0, setsPlanned: 3 },
]

function open(over: Partial<SheetProps> = {}) {
  const props: SheetProps = {
    open: true,
    onClose: vi.fn(),
    exercises: WORKOUT,
    currentExerciseId: 'e2',
    elapsed: '24:10',
    onReorder: vi.fn(),
    onJump: vi.fn(),
    onAdd: vi.fn(),
    onSwap: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  }
  const view = render(<Sheet {...props} />)
  return { props, ...view }
}
const dialog = () => screen.getByRole('dialog', { name: 'Workout plan' })
const rows = () => within(dialog()).getAllByRole('listitem')
const row = (name: string) => {
  const li = rows().find((r) => (r.textContent ?? '').includes(name))
  if (!li) throw new Error(`no row for ${name}`)
  return li
}
const cls = (el: Element | null | undefined) => el?.getAttribute('class') ?? ''
const H48 = /(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|size-12)(\s|$)/
const W48 = /(^|\s)(w-12|min-w-12|w-\[48px\]|min-w-\[48px\]|size-12)(\s|$)/
const jumpButton = (li: HTMLElement, name: string) =>
  within(li).getAllByRole('button').find((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().startsWith(name))
const rowNames = () => rows().map((r) => WORKOUT.find((e) => (r.textContent ?? '').includes(e.name))?.name)
const drop = (a: string, b: string | null) =>
  act(() => {
    dnd.onDragEnd?.({ active: { id: a }, over: b ? { id: b } : null })
  })
const reorderBtn = () => within(dialog()).getByRole('button', { name: 'Reorder' })
const openMenu = (li: HTMLElement, name: string) =>
  fireEvent.keyDown(within(li).getByRole('button', { name: `Edit options for ${name}` }), { key: 'Enter' })

describe('Scenario: The plan sheet shows progress', () => {
  it('opens as a dialog titled "Workout plan" with an h2 title', () => {
    open()
    expect(dialog()).toBeTruthy()
    expect(within(dialog()).getByRole('heading', { level: 2, name: 'Workout plan' })).toBeTruthy()
  })

  it('the title carries the count chip "2/6", spoken as "exercise 2 of 6"', () => {
    open()
    const chip = within(dialog()).getByRole('img', { name: /exercise 2 of 6/i })
    expect((chip.textContent ?? '').trim()).toBe('2/6')
  })

  it('the chip follows the current exercise: on exercise 5 it reads "5/6"', () => {
    open({ currentExerciseId: 'e5' })
    expect((within(dialog()).getByRole('img', { name: /exercise 5 of 6/i }).textContent ?? '').trim()).toBe('5/6')
  })

  it('exercise 1 is done, exercise 2 is now with "2 of 4 sets", the rest show their number', () => {
    open()
    expect(row('Barbell Squat').getAttribute('data-status')).toBe('done')
    expect(within(row('Barbell Squat')).getByRole('img', { name: 'Done' })).toBeTruthy()
    expect(row('Bench Press').getAttribute('data-status')).toBe('now')
    expect(row('Bench Press').textContent).toContain('2 of 4 sets')
    expect(within(row('Bench Press')).getByText('2')).toBeTruthy()
    for (const [n, name] of [[3, 'Dumbbell Romanian Deadlift'], [4, 'Cable Row'], [5, 'Face Pull'], [6, 'Plank']] as const) {
      expect(row(name).getAttribute('data-status')).toBe('upcoming')
      expect(within(row(name)).getByText(String(n))).toBeTruthy()
    }
  })

  it('a done row shows a check, not its number', () => {
    open()
    expect(within(row('Barbell Squat')).queryByText('1')).toBeNull()
  })

  it('the sub-line is "2 of 4 sets · 50 lbs" with the detail, "2 of 4 sets" without', () => {
    open()
    expect(within(row('Bench Press')).getByText('2 of 4 sets · 50 lbs')).toBeTruthy()
    expect(within(row('Cable Row')).getByText('0 of 4 sets')).toBeTruthy()
  })

  it('set squares: as many as planned, the first ones filled', () => {
    open()
    const squares = Array.from(row('Bench Press').querySelectorAll('[data-set-square]'))
    expect(squares.map((s) => s.getAttribute('data-set-square'))).toEqual(['done', 'done', 'todo', 'todo'])
    expect(row('Dumbbell Romanian Deadlift').querySelectorAll('[data-set-square]').length).toBe(3)
  })

  it('exactly one NOW chip, on the current row', () => {
    open()
    const chips = within(dialog()).getAllByText(/^now$/i)
    expect(chips.length).toBe(1)
    expect(row('Bench Press').contains(chips[0])).toBe(true)
  })

  it('the current row alone carries the current cue (data-current and a primary class)', () => {
    open()
    const current = rows().filter((r) => r.hasAttribute('data-current'))
    expect(current).toEqual([row('Bench Press')])
    expect(cls(row('Bench Press'))).toMatch(/primary/)
    for (const li of rows().filter((r) => r !== row('Bench Press'))) expect(cls(li)).not.toMatch(/primary/)
  })

  it('the cue moves when the current exercise changes', () => {
    open({ currentExerciseId: 'e4' })
    expect(row('Cable Row').getAttribute('data-status')).toBe('now')
    expect(row('Bench Press').getAttribute('data-status')).toBe('upcoming')
  })

  it('the exercise you are on is "now" even when all its sets are logged', () => {
    open({ exercises: WORKOUT.map((e) => (e.id === 'e2' ? { ...e, setsDone: 4 } : e)) })
    expect(row('Bench Press').getAttribute('data-status')).toBe('now')
  })

  it('an earlier exercise with sets left is not done', () => {
    open({ currentExerciseId: 'e3', exercises: WORKOUT.map((e) => (e.id === 'e1' ? { ...e, setsDone: 1 } : e)) })
    expect(row('Barbell Squat').getAttribute('data-status')).toBe('upcoming')
  })

  it('the summary: sets done of the whole workout, then the clock', () => {
    open()
    // 4 + 2 of 4 + 4 + 3 + 4 + 3 + 3 = 6 of 21
    expect(within(dialog()).getByText('6 of 21 sets · 24:10')).toBeTruthy()
  })

  it('without a clock the summary is just the sets', () => {
    open({ elapsed: undefined })
    expect(within(dialog()).getByText('6 of 21 sets')).toBeTruthy()
  })

  it('the summary follows the numbers', () => {
    open({ exercises: WORKOUT.map((e) => (e.id === 'e3' ? { ...e, setsDone: 3 } : e)) })
    expect(within(dialog()).getByText('9 of 21 sets · 24:10')).toBeTruthy()
  })
})

describe('Freestyle rows (no planned sets)', () => {
  const FREE: Row[] = [
    { id: 'f1', name: 'Pull Up', setsDone: 3 },
    { id: 'f2', name: 'Dips', setsDone: 1 },
    { id: 'f3', name: 'Curl', setsDone: 0 },
  ]
  it('rows say "3 sets", "1 set"', () => {
    open({ exercises: FREE, currentExerciseId: 'f2' })
    expect(within(row('Pull Up')).getByText('3 sets')).toBeTruthy()
    expect(within(row('Dips')).getByText('1 set')).toBeTruthy()
  })

  it('no set squares and never done', () => {
    open({ exercises: FREE, currentExerciseId: 'f2' })
    expect(row('Pull Up').querySelectorAll('[data-set-square]').length).toBe(0)
    expect(row('Pull Up').getAttribute('data-status')).toBe('upcoming')
  })

  it('the summary counts sets: "4 sets · 24:10"', () => {
    open({ exercises: FREE, currentExerciseId: 'f2' })
    expect(within(dialog()).getByText('4 sets · 24:10')).toBeTruthy()
  })
})

describe('Scenario: Long names wrap instead of being cut off', () => {
  it('"Dumbbell Romanian Deadlift" is shown in full, in normal case', () => {
    open()
    expect(within(row('Dumbbell Romanian Deadlift')).getByText('Dumbbell Romanian Deadlift')).toBeTruthy()
  })

  it('the name element and its ancestors up to the row do not truncate or refuse to wrap', () => {
    open()
    const li = row('Dumbbell Romanian Deadlift')
    let el: HTMLElement | null = within(li).getByText('Dumbbell Romanian Deadlift')
    while (el && el !== li) {
      expect(cls(el)).not.toMatch(/(^|\s)(truncate|whitespace-nowrap|text-ellipsis|line-clamp-1)(\s|$)/)
      el = el.parentElement
    }
  })

  it('the name is not upper-cased by a class', () => {
    open()
    expect(cls(within(row('Cable Row')).getByText('Cable Row'))).not.toMatch(/(^|\s)uppercase(\s|$)/)
  })

  it('there is no chevron on a row', () => {
    open()
    for (const li of rows()) expect(li.querySelector('.lucide-chevron-right')).toBeNull()
  })
})

describe('Scenario: Jumping to an exercise', () => {
  it('tapping exercise 4 jumps to it and closes the plan, once each', () => {
    const { props } = open()
    fireEvent.click(jumpButton(row('Cable Row'), 'Cable Row') as HTMLElement)
    expect(props.onJump).toHaveBeenCalledTimes(1)
    expect(props.onJump).toHaveBeenCalledWith('e4')
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('jumping runs before closing', () => {
    const order: string[] = []
    open({ onJump: () => order.push('jump'), onClose: () => order.push('close') })
    fireEvent.click(jumpButton(row('Face Pull'), 'Face Pull') as HTMLElement)
    expect(order).toEqual(['jump', 'close'])
  })

  it('the row\'s jump button is named after the exercise', () => {
    open()
    for (const e of WORKOUT) expect(jumpButton(row(e.name), e.name)).toBeTruthy()
  })
})

describe('Scenario: Reordering is a mode', () => {
  it('opening the plan shows no drag handles', () => {
    open()
    expect(within(dialog()).queryAllByRole('button', { name: /^drag to reorder/i }).length).toBe(0)
  })

  it('"Reorder" is a toggle button, off by default', () => {
    open()
    expect(reorderBtn().getAttribute('aria-pressed')).toBe('false')
  })

  it('tapping Reorder shows a drag handle on every row', () => {
    open()
    fireEvent.click(reorderBtn())
    for (const e of WORKOUT) expect(within(dialog()).getByRole('button', { name: `Drag to reorder ${e.name}` })).toBeTruthy()
    expect(reorderBtn().getAttribute('aria-pressed')).toBe('true')
  })

  it('tapping it again turns the handles off', () => {
    open()
    fireEvent.click(reorderBtn())
    fireEvent.click(reorderBtn())
    expect(within(dialog()).queryAllByRole('button', { name: /^drag to reorder/i }).length).toBe(0)
    expect(reorderBtn().getAttribute('aria-pressed')).toBe('false')
  })

  it('reordering works as before: dropping the first row on the third calls onReorder with the new order', () => {
    const { props } = open()
    fireEvent.click(reorderBtn())
    drop('e1', 'e3')
    expect(props.onReorder).toHaveBeenCalledTimes(1)
    expect(props.onReorder).toHaveBeenCalledWith(['e2', 'e3', 'e1', 'e4', 'e5', 'e6'])
  })

  it('and the list shows the new order straight away', () => {
    open()
    fireEvent.click(reorderBtn())
    drop('e1', 'e3')
    expect(rowNames()).toEqual(['Bench Press', 'Dumbbell Romanian Deadlift', 'Barbell Squat', 'Cable Row', 'Face Pull', 'Plank'])
  })

  it('dropping a row on itself, or nowhere, reorders nothing', () => {
    const { props } = open()
    fireEvent.click(reorderBtn())
    drop('e2', 'e2')
    drop('e2', null)
    expect(props.onReorder).not.toHaveBeenCalled()
  })

  it('dragging the last row up to the first', () => {
    const { props } = open()
    fireEvent.click(reorderBtn())
    drop('e6', 'e1')
    expect(props.onReorder).toHaveBeenCalledWith(['e6', 'e1', 'e2', 'e3', 'e4', 'e5'])
  })

  it('jumping still works while Reorder is on', () => {
    const { props } = open()
    fireEvent.click(reorderBtn())
    fireEvent.click(jumpButton(row('Plank'), 'Plank') as HTMLElement)
    expect(props.onJump).toHaveBeenCalledWith('e6')
  })
})

describe('Scenario: Exercise actions still work from the plan', () => {
  it('each row has a 48x48 menu button "Edit options for <name>"', () => {
    open()
    for (const e of WORKOUT) {
      const b = within(row(e.name)).getByRole('button', { name: `Edit options for ${e.name}` })
      expect(cls(b)).toMatch(H48)
      expect(cls(b)).toMatch(W48)
    }
  })

  it('Swap exercise swaps that row\'s exercise', () => {
    const { props } = open()
    openMenu(row('Cable Row'), 'Cable Row')
    fireEvent.click(screen.getByRole('menuitem', { name: /swap exercise/i }))
    expect(props.onSwap).toHaveBeenCalledTimes(1)
    expect(props.onSwap).toHaveBeenCalledWith('e4')
  })

  it('Delete exercise asks first, "Delete Cable Row?", and nothing is deleted yet', () => {
    const { props } = open()
    openMenu(row('Cable Row'), 'Cable Row')
    fireEvent.click(screen.getByRole('menuitem', { name: /delete exercise/i }))
    expect(screen.getByRole('alertdialog', { name: 'Delete Cable Row?' })).toBeTruthy()
    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it('confirming deletes that exercise', () => {
    const { props } = open()
    openMenu(row('Cable Row'), 'Cable Row')
    fireEvent.click(screen.getByRole('menuitem', { name: /delete exercise/i }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    expect(props.onDelete).toHaveBeenCalledTimes(1)
    expect(props.onDelete).toHaveBeenCalledWith('e4')
  })

  it('cancelling deletes nothing', () => {
    const { props } = open()
    openMenu(row('Cable Row'), 'Cable Row')
    fireEvent.click(screen.getByRole('menuitem', { name: /delete exercise/i }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it('"+ Add exercise" in the sheet adds an exercise', () => {
    const { props } = open()
    fireEvent.click(within(dialog()).getByRole('button', { name: /add exercise/i }))
    expect(props.onAdd).toHaveBeenCalledTimes(1)
  })

  it('Add sits next to Reorder in the footer', () => {
    open()
    const add = within(dialog()).getByRole('button', { name: /add exercise/i })
    expect(add.parentElement?.contains(reorderBtn())).toBe(true)
  })

  it('Escape in a row menu closes only the menu, not the plan', () => {
    const { props } = open()
    openMenu(row('Cable Row'), 'Cable Row')
    const item = screen.getByRole('menuitem', { name: /swap exercise/i })
    fireEvent.keyDown(item, { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: /swap exercise/i })).toBeNull()
    expect(props.onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Workout plan' })).toBeTruthy()
  })
})

describe('Scenario: Open, close', () => {
  it('closed, it renders nothing', () => {
    open({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Escape closes it', () => {
    const { props } = open()
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('the close box closes it, and is 48x48 on the title\'s row', () => {
    const { props } = open()
    const close = within(dialog()).getByRole('button', { name: 'Close' })
    expect(cls(close)).toMatch(H48)
    expect(cls(close)).toMatch(W48)
    expect(close.parentElement?.contains(within(dialog()).getByRole('heading', { name: 'Workout plan' }))).toBe(true)
    fireEvent.click(close)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('app scroll is locked while open and released on close', () => {
    const { rerender, props } = open()
    expect(scroll.lock).toHaveBeenCalledTimes(1)
    expect(scroll.unlock).not.toHaveBeenCalled()
    rerender(<Sheet {...props} open={false} />)
    expect(scroll.unlock).toHaveBeenCalledTimes(1)
  })

  it('no exercises yet: the empty state offers Add exercise', () => {
    const { props } = open({ exercises: [], currentExerciseId: null })
    expect(within(dialog()).getByText(/no exercises yet/i)).toBeTruthy()
    fireEvent.click(within(dialog()).getByRole('button', { name: /add exercise/i }))
    expect(props.onAdd).toHaveBeenCalledTimes(1)
  })
})

describe('The look: a folder bottom sheet', () => {
  // Amended by the lead (2026-11-01, Dustin): the paper tab sits on a clear row
  // above the box, like Quick actions, so the box is inside the dialog.
  it('the plan list sits in a bg-card folder box with a 2px secondary border', () => {
    open()
    const box = dialog().querySelector('ul')?.closest('.folder-box') as HTMLElement | null
    expect(box).not.toBeNull()
    const c = cls(box as HTMLElement)
    expect(c).toMatch(/(^|\s)bg-card(\s|$)/)
    expect(c).toMatch(/(^|\s)border-2(\s|$)/)
    expect(c).toMatch(/(^|\s)border-secondary(\s|$)/)
    expect(c).toMatch(/(^|\s)folder-box(\s|$)/)
  })

  it('it sits at the bottom, not as a side drawer', () => {
    open()
    const chain = [dialog(), dialog().parentElement, dialog().parentElement?.parentElement].map(cls).join(' ')
    expect(chain).toMatch(/bottom-|items-end|slide-in-from-bottom|mt-auto/)
    expect(chain).not.toMatch(/slide-in-from-left|border-r-2/)
  })

  it('the rows are plain rows in one box: a divide-y list, no border on each row', () => {
    open()
    const list = rows()[0].parentElement as HTMLElement
    expect(cls(list)).toMatch(/divide-y/)
    for (const li of rows()) expect(cls(li)).not.toMatch(/(^|\s)border-2(\s|$)/)
  })

  it('no doom-corners and no fixed rgba() colour or shadow anywhere in the sheet', () => {
    open()
    const wrap = dialog().parentElement?.parentElement ?? document.body
    for (const el of [wrap, ...Array.from(wrap.querySelectorAll('*'))]) {
      expect(cls(el)).not.toMatch(/doom-corners/)
      expect(cls(el)).not.toMatch(/rgba\(/)
      expect(el.getAttribute('style') ?? '').not.toMatch(/rgba?\(/i)
    }
  })

  it('the footer buttons are 48px high', () => {
    open()
    expect(cls(reorderBtn())).toMatch(H48)
    expect(cls(within(dialog()).getByRole('button', { name: /add exercise/i }))).toMatch(H48)
  })
})
