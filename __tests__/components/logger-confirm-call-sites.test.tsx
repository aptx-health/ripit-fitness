/**
 * L1: the five confirms that live in their own components, each rendered on its
 * own: Complete, Exit, Delete set, Delete exercise (the quick-actions menu) and
 * Switch to logging (FollowAlongHeader). The sixth (ad-hoc Complete) and the
 * programmed / ad-hoc loggers as a whole are in logger-confirm-loggers.test.tsx.
 * Behaviour: features/ui-audit/logger-confirm.feature. Spec: initiatives/ui-audit/spec.md ("L1", items 2 and 3).
 *
 * PINNED INTERFACE (the existing props stay; these are the changes)
 *
 *   components/workout-logging/CompleteWorkoutConfirm.tsx   default export
 *     props now also take   setCount: number       sets logged so far
 *                           durationMinutes: number whole minutes since start
 *     the body carries the summary line `${setCount} sets · ${durationMinutes} min`
 *     (middle dot U+00B7). Other props unchanged: isFollowAlong, isSubmitting, onCancel, onConfirm.
 *   components/workout-logging/ExitWorkoutConfirm.tsx       props unchanged
 *     with unsaved work: "Save as draft" (filled), "Discard" (outline, error text), "Cancel"
 *     without: "Cancel" and "Exit"
 *   components/workout-logging/DeleteSetConfirm.tsx          props unchanged
 *     title "Delete the only set?", destructive action "Delete set"
 *   components/workout-logging/ExerciseQuickActionsMenu.tsx
 *     QuickAction gains   confirmationTitle?: string
 *     a requiresConfirmation action opens an alertdialog titled confirmationTitle (fallback
 *     "Confirm action"), body confirmationMessage, a "Confirm" action (any label with
 *     "delete" or "confirm" in it passes), destructive (bg-error) when variant is 'danger'.
 *     Menu surface: `folder-box border-secondary`, no `doom-corners`, `divide-y` item list,
 *     every item at least 48px tall, a plain muted heading row.
 *   components/workout-logging/FollowAlongHeader.tsx         props unchanged
 *     tapping the banner opens an alertdialog "Switch to logging mode?", actions "Switch" / "Cancel"
 *
 * Every one is a LoggerConfirm (role="alertdialog", labelled, Escape = Cancel, focus returned,
 * no `doom-corners`); the callbacks and labels behave as they did before.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Trash2 } from 'lucide-react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import CompleteWorkoutConfirm from '@/components/workout-logging/CompleteWorkoutConfirm'
import DeleteSetConfirm from '@/components/workout-logging/DeleteSetConfirm'
import ExerciseQuickActionsMenu, { type QuickAction as BaseAction } from '@/components/workout-logging/ExerciseQuickActionsMenu'
import ExitWorkoutConfirm from '@/components/workout-logging/ExitWorkoutConfirm'
import FollowAlongHeader from '@/components/workout-logging/FollowAlongHeader'

/** QuickAction plus the new `confirmationTitle` (see the pinned interface above). */
type QuickAction = BaseAction & { confirmationTitle?: string }

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

const dialog = () => screen.getByRole('alertdialog')
const noDialog = () => expect(screen.queryByRole('alertdialog')).toBeNull()
const describedBy = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
const btn = (name: string | RegExp) => within(dialog()).getByRole('button', { name })
const pressEscape = () => fireEvent.keyDown(dialog(), { key: 'Escape' })
const FILLED_ERROR = /(^|\s)bg-error(\s|$)/
const NOT_A_DIALOG_BOX = () => expect(document.querySelector('.doom-corners')).toBeNull()

describe('Scenario: Completing a workout shows what will be saved', () => {
  type CompleteProps = Parameters<typeof CompleteWorkoutConfirm>[0] & { setCount: number; durationMinutes: number }
  const complete = (over: Partial<CompleteProps> = {}) => {
    const props = {
      isFollowAlong: false,
      isSubmitting: false,
      setCount: 18,
      durationMinutes: 42,
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
      ...over,
    }
    render(<CompleteWorkoutConfirm {...(props as Parameters<typeof CompleteWorkoutConfirm>[0])} />)
    return props
  }

  it('is an alert dialog named "Complete this workout?"', () => {
    complete()
    expect(screen.getByRole('alertdialog', { name: /complete this workout/i })).toBeTruthy()
  })

  it('the confirmation says "18 sets · 42 min"', () => {
    complete()
    expect(describedBy(dialog())).toContain('18 sets · 42 min')
  })

  it('the summary follows the numbers it is given', () => {
    complete({ setCount: 7, durationMinutes: 5 })
    expect(describedBy(dialog())).toContain('7 sets · 5 min')
    expect(describedBy(dialog())).not.toContain('18 sets')
  })

  it('confirming completes the workout as before: Confirm runs onConfirm once', () => {
    const p = complete()
    fireEvent.click(btn('Confirm'))
    expect(p.onConfirm).toHaveBeenCalledTimes(1)
    expect(p.onCancel).not.toHaveBeenCalled()
  })

  it('Cancel runs onCancel only', () => {
    const p = complete()
    fireEvent.click(btn('Cancel'))
    expect(p.onCancel).toHaveBeenCalledTimes(1)
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('Escape cancels and nothing is confirmed', () => {
    const p = complete()
    pressEscape()
    expect(p.onCancel).toHaveBeenCalled()
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('follow-along: the title is the "Mark this workout as done?" one and the action is Finish', () => {
    const p = complete({ isFollowAlong: true })
    expect(screen.getByRole('alertdialog', { name: /mark this workout as done/i })).toBeTruthy()
    fireEvent.click(btn('Finish'))
    expect(p.onConfirm).toHaveBeenCalledTimes(1)
    expect(within(dialog()).queryByRole('button', { name: 'Confirm' })).toBeNull()
  })

  it('completing is not destructive: no bg-error', () => {
    complete()
    expect(dialog().querySelector('[class*="bg-error"]')).toBeNull()
  })

  it('while submitting it says it is completing and there is no live Confirm to press twice', () => {
    const p = complete({ isSubmitting: true })
    expect(screen.getByText(/completing workout/i)).toBeTruthy()
    const live = screen.queryAllByRole('button', { name: /^(confirm|finish)$/i }).filter((b) => !(b as HTMLButtonElement).disabled)
    for (const b of live) fireEvent.click(b)
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('has no doom-corners', () => {
    complete()
    NOT_A_DIALOG_BOX()
  })
})

describe('Scenario: Leaving a workout', () => {
  const exit = (over: Partial<Parameters<typeof ExitWorkoutConfirm>[0]> = {}) => {
    const props = {
      hasUnsavedWork: true,
      onSaveAsDraft: vi.fn(),
      onDiscard: vi.fn(),
      onCancel: vi.fn(),
      ...over,
    }
    render(<ExitWorkoutConfirm {...props} />)
    return props
  }

  it('is an alert dialog named "Exit workout?"', () => {
    exit()
    expect(screen.getByRole('alertdialog', { name: /exit workout/i })).toBeTruthy()
  })

  it('with sets logged I can save it as a draft, discard it, or cancel', () => {
    exit()
    expect(btn(/save as draft/i)).toBeTruthy()
    expect(btn(/discard/i)).toBeTruthy()
    expect(btn('Cancel')).toBeTruthy()
    expect(within(dialog()).getAllByRole('button')).toHaveLength(3)
  })

  it('Save as draft runs onSaveAsDraft only', () => {
    const p = exit()
    fireEvent.click(btn(/save as draft/i))
    expect(p.onSaveAsDraft).toHaveBeenCalledTimes(1)
    expect(p.onDiscard).not.toHaveBeenCalled()
    expect(p.onCancel).not.toHaveBeenCalled()
  })

  it('Discard runs onDiscard only', () => {
    const p = exit()
    fireEvent.click(btn(/discard/i))
    expect(p.onDiscard).toHaveBeenCalledTimes(1)
    expect(p.onSaveAsDraft).not.toHaveBeenCalled()
    expect(p.onCancel).not.toHaveBeenCalled()
  })

  it('Cancel runs onCancel only', () => {
    const p = exit()
    fireEvent.click(btn('Cancel'))
    expect(p.onCancel).toHaveBeenCalledTimes(1)
    expect(p.onSaveAsDraft).not.toHaveBeenCalled()
    expect(p.onDiscard).not.toHaveBeenCalled()
  })

  it('Escape is Cancel: nothing is saved or discarded', () => {
    const p = exit()
    pressEscape()
    expect(p.onCancel).toHaveBeenCalled()
    expect(p.onSaveAsDraft).not.toHaveBeenCalled()
    expect(p.onDiscard).not.toHaveBeenCalled()
  })

  it('Save as draft is the one filled action; Discard is outline with error text', () => {
    exit()
    expect(btn(/save as draft/i).className).toMatch(/(^|\s)bg-primary(\s|$)/)
    const discard = btn(/discard/i)
    expect(discard.className).toMatch(/(^|\s)text-error(\s|$)/)
    expect(discard.className).toMatch(/(^|\s)border-2(\s|$)/)
    expect(discard.className).not.toMatch(FILLED_ERROR)
    expect(btn('Cancel').className).not.toMatch(/bg-(primary|error)/)
  })

  it('no sets: just Cancel and Exit, and Exit discards as before', () => {
    const p = exit({ hasUnsavedWork: false })
    expect(within(dialog()).getAllByRole('button')).toHaveLength(2)
    expect(within(dialog()).queryByRole('button', { name: /save as draft/i })).toBeNull()
    fireEvent.click(btn('Exit'))
    expect(p.onDiscard).toHaveBeenCalledTimes(1)
    expect(p.onSaveAsDraft).not.toHaveBeenCalled()
  })

  it('no sets: Escape still cancels', () => {
    const p = exit({ hasUnsavedWork: false })
    pressEscape()
    expect(p.onCancel).toHaveBeenCalled()
    expect(p.onDiscard).not.toHaveBeenCalled()
  })

  it('while discarding: it says so, and Save as draft and Cancel are off', () => {
    const p = exit({ isDiscarding: true })
    expect(screen.getByText(/discarding/i)).toBeTruthy()
    expect((btn(/save as draft/i) as HTMLButtonElement).disabled).toBe(true)
    expect((btn('Cancel') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(btn(/save as draft/i))
    fireEvent.click(btn('Cancel'))
    expect(p.onSaveAsDraft).not.toHaveBeenCalled()
    expect(p.onCancel).not.toHaveBeenCalled()
  })

  it('has no doom-corners', () => {
    exit()
    NOT_A_DIALOG_BOX()
  })
})

describe('Scenario: Deleting the only set', () => {
  const del = () => {
    const props = { onCancel: vi.fn(), onConfirm: vi.fn() }
    render(<DeleteSetConfirm {...props} />)
    return props
  }

  it('the confirmation is titled "Delete the only set?"', () => {
    del()
    expect(screen.getByRole('alertdialog', { name: 'Delete the only set?' })).toBeTruthy()
  })

  it('it explains in a message', () => {
    del()
    expect(describedBy(dialog()).trim().length).toBeGreaterThan(10)
  })

  it('the old "Delete Last Set?" title is gone', () => {
    del()
    expect(screen.queryByText(/delete last set/i)).toBeNull()
  })

  it('the action is a filled bg-error "Delete set" and it runs onConfirm once', () => {
    const p = del()
    expect(btn(/delete set/i).className).toMatch(FILLED_ERROR)
    fireEvent.click(btn(/delete set/i))
    expect(p.onConfirm).toHaveBeenCalledTimes(1)
    expect(p.onCancel).not.toHaveBeenCalled()
  })

  it('Cancel and Escape cancel without deleting', () => {
    const p = del()
    fireEvent.click(btn('Cancel'))
    expect(p.onCancel).toHaveBeenCalledTimes(1)
    pressEscape()
    expect(p.onCancel.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('has no doom-corners', () => {
    del()
    NOT_A_DIALOG_BOX()
  })
})

describe('Scenario: Deleting an exercise names it (the quick-actions menu)', () => {
  const deleteAction = (over: Partial<QuickAction> = {}): QuickAction => ({
    label: 'Delete this exercise',
    icon: Trash2,
    onClick: vi.fn(),
    variant: 'danger',
    requiresConfirmation: true,
    confirmationTitle: 'Delete Barbell Squat?',
    confirmationMessage: 'It will be removed from this workout.',
    ...over,
  })
  const plain = (): QuickAction => ({ label: 'Swap this exercise', icon: Trash2, onClick: vi.fn() })

  function open(actions: QuickAction[]) {
    render(<ExerciseQuickActionsMenu actions={actions as BaseAction[]} />)
    const trigger = screen.getByRole('button', { name: 'Edit workout' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'Enter' })
    return trigger
  }
  const choose = (name: string | RegExp) => fireEvent.click(screen.getByRole('menuitem', { name }))

  it('choosing Delete opens a confirmation titled "Delete Barbell Squat?"', () => {
    open([plain(), deleteAction()])
    choose(/delete this exercise/i)
    expect(screen.getByRole('alertdialog', { name: 'Delete Barbell Squat?' })).toBeTruthy()
  })

  it('its message is the action\'s confirmation message', () => {
    open([deleteAction()])
    choose(/delete this exercise/i)
    expect(describedBy(dialog())).toContain('It will be removed from this workout.')
  })

  it('the title follows the exercise: another name, another title', () => {
    open([deleteAction({ confirmationTitle: 'Delete Pull-up?' })])
    choose(/delete this exercise/i)
    expect(screen.getByRole('alertdialog', { name: 'Delete Pull-up?' })).toBeTruthy()
    expect(screen.queryByText('Delete Barbell Squat?')).toBeNull()
  })

  it('confirming removes it as before: the action\'s onClick runs once and the dialog closes', () => {
    const action = deleteAction()
    open([action])
    choose(/delete this exercise/i)
    expect(action.onClick).not.toHaveBeenCalled()
    fireEvent.click(btn(/delete|confirm/i))
    expect(action.onClick).toHaveBeenCalledTimes(1)
    noDialog()
  })

  it('a danger action\'s confirm is the filled bg-error one', () => {
    open([deleteAction()])
    choose(/delete this exercise/i)
    const filled = within(dialog()).getAllByRole('button').filter((b) => FILLED_ERROR.test(b.className))
    expect(filled).toHaveLength(1)
    expect(filled[0].textContent).not.toMatch(/cancel/i)
  })

  it('a non-danger action that needs confirming is not bg-error', () => {
    const swap = deleteAction({ variant: 'default', label: 'Swap this exercise', confirmationTitle: 'Swap Barbell Squat?' })
    open([swap])
    choose(/swap this exercise/i)
    expect(dialog().querySelector('[class*="bg-error"]')).toBeNull()
  })

  it('Cancel closes it and the action does not run', () => {
    const action = deleteAction()
    open([action])
    choose(/delete this exercise/i)
    fireEvent.click(btn('Cancel'))
    expect(action.onClick).not.toHaveBeenCalled()
    noDialog()
  })

  it('Escape cancels: the action does not run and nothing changes', () => {
    const action = deleteAction()
    open([action])
    choose(/delete this exercise/i)
    pressEscape()
    expect(action.onClick).not.toHaveBeenCalled()
    noDialog()
  })

  it('an action that needs no confirmation runs straight away, with no dialog', () => {
    const swap = plain()
    open([swap])
    choose(/swap this exercise/i)
    expect(swap.onClick).toHaveBeenCalledTimes(1)
    noDialog()
  })

  it('a disabled action does nothing', () => {
    const action = deleteAction({ disabled: true })
    open([action])
    choose(/delete this exercise/i)
    expect(action.onClick).not.toHaveBeenCalled()
    noDialog()
  })

  it('focus returns to the menu button after Cancel', async () => {
    const trigger = open([deleteAction()])
    choose(/delete this exercise/i)
    fireEvent.click(btn('Cancel'))
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('the confirmation has no doom-corners', () => {
    open([deleteAction()])
    choose(/delete this exercise/i)
    NOT_A_DIALOG_BOX()
  })
})

describe('The menu surface', () => {
  function openMenu(heading?: string) {
    render(
      <ExerciseQuickActionsMenu
        heading={heading}
        actions={[
          { label: 'Edit this exercise', icon: Trash2, onClick: vi.fn() },
          { label: 'Swap this exercise', icon: Trash2, onClick: vi.fn() },
          { label: 'Delete this exercise', icon: Trash2, onClick: vi.fn(), variant: 'danger' },
        ]}
      />
    )
    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit workout' }), { key: 'Enter' })
    return screen.getByRole('menu')
  }

  it('is a folder box: bg-card border-2 border-secondary folder-box, no doom-corners', () => {
    const menu = openMenu()
    for (const cls of ['bg-card', 'border-2', 'border-secondary', 'folder-box']) {
      expect(menu.className, cls).toMatch(new RegExp(`(^|\\s)${cls}(\\s|$)`))
    }
    expect(menu.className).not.toMatch(/doom-corners/)
    expect(menu.className).not.toMatch(/border-primary/)
  })

  it('has no fixed rgba() shadow', () => {
    expect(openMenu().className).not.toMatch(/rgba\(/)
  })

  it('the items are separated by dividers (divide-y) and each is at least 48px', () => {
    const menu = openMenu()
    const items = within(menu).getAllByRole('menuitem')
    expect(items).toHaveLength(3)
    const list = items[0].parentElement as HTMLElement
    expect(list.className).toMatch(/(^|\s)divide-y(\s|$)/)
    for (const item of items) expect(item.className, item.textContent ?? '').toMatch(/(^|\s)(min-h-12|h-12|min-h-\[48px\]|h-\[48px\])(\s|$)/)
  })

  it('the heading is a plain muted row (no tinted bg-primary band)', () => {
    const menu = openMenu('Edit Workout')
    const heading = within(menu).getByText('Edit Workout')
    const row = (heading.closest('div') ?? heading) as HTMLElement
    expect(`${heading.className} ${row.className}`).toMatch(/text-muted-foreground/)
    expect(`${heading.className} ${row.className}`).not.toMatch(/bg-primary/)
  })
})

describe('Scenario: Switching from follow-along to logging', () => {
  function header() {
    const props = { currentExerciseIndex: 0, totalExercises: 4, onClose: vi.fn(), onSwitchToLogging: vi.fn() }
    render(<FollowAlongHeader {...props} />)
    const banner = screen.getByRole('button', { name: /switch to logging/i })
    return { props, banner }
  }

  it('tapping the banner opens an alert dialog "Switch to logging mode?"', () => {
    const { banner } = header()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    fireEvent.click(banner)
    expect(screen.getByRole('alertdialog', { name: /switch to logging mode/i })).toBeTruthy()
    expect(describedBy(dialog()).trim().length).toBeGreaterThan(10)
  })

  it('Switch does what it did before: onSwitchToLogging once, dialog and banner gone', () => {
    const { props, banner } = header()
    fireEvent.click(banner)
    fireEvent.click(btn('Switch'))
    expect(props.onSwitchToLogging).toHaveBeenCalledTimes(1)
    noDialog()
    expect(screen.queryByRole('button', { name: /switch to logging/i })).toBeNull()
  })

  it('Cancel closes it and nothing switches', () => {
    const { props, banner } = header()
    fireEvent.click(banner)
    fireEvent.click(btn('Cancel'))
    expect(props.onSwitchToLogging).not.toHaveBeenCalled()
    noDialog()
    expect(screen.getByRole('button', { name: /switch to logging/i })).toBeTruthy()
  })

  it('Escape cancels the same way', () => {
    const { props, banner } = header()
    fireEvent.click(banner)
    pressEscape()
    expect(props.onSwitchToLogging).not.toHaveBeenCalled()
    noDialog()
  })

  it('focus returns to the banner that opened it', async () => {
    const { banner } = header()
    banner.focus()
    fireEvent.click(banner)
    pressEscape()
    await waitFor(() => expect(document.activeElement).toBe(banner))
  })

  it('the close X is untouched: it still calls onClose and opens no dialog', () => {
    const { props } = header()
    fireEvent.click(screen.getByRole('button', { name: /close workout/i }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    noDialog()
  })

  it('the dialog has no doom-corners and its action is not bg-error', () => {
    const { banner } = header()
    fireEvent.click(banner)
    NOT_A_DIALOG_BOX()
    expect(dialog().querySelector('[class*="bg-error"]')).toBeNull()
  })
})
