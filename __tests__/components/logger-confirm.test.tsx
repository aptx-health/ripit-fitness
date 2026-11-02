/**
 * L1: the shared `LoggerConfirm`. Behaviour: features/ui-audit/logger-confirm.feature
 * ("A confirmation is a real dialog", "Escape cancels a confirmation").
 * Spec: initiatives/ui-audit/spec.md ("L1", item 1).
 *
 * PINNED INTERFACE (implementers build to this; do not edit these tests)
 *
 *   components/workout-logging/LoggerConfirm.tsx, default export
 *
 *   props {
 *     open: boolean                       false renders nothing
 *     onOpenChange: (open: boolean) => void
 *                                         called with false by Cancel and Escape
 *     title: string                       the dialog's accessible name
 *     body: ReactNode                     the dialog's accessible description
 *     confirmLabel: string                the one filled action
 *     onConfirm: () => void               called once by the action
 *     destructive?: boolean               filled action is `bg-error`; nothing
 *                                         else in the dialog is
 *     cancelLabel?: string                defaults to "Cancel"
 *     secondaryLabel?: string             an optional third button (Exit's
 *     onSecondary?: () => void            "Discard"); an outline button with
 *                                         error text, never filled
 *     busy?: boolean                      disables Cancel and the confirm
 *                                         action (not the secondary); their
 *                                         clicks do nothing
 *   }
 *   (`tone?: 'mine' | 'next' | 'quiet'` for the PaperTabTitle is allowed, not tested)
 *
 *   Built on Radix AlertDialog: role="alertdialog" labelled by the title and
 *   described by the body; Escape = Cancel (onConfirm is never called by it);
 *   focus moves in, stays in, and returns to the opener; every button is a
 *   48px target; no `doom-corners`.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const load = (spec: string) => import(/* @vite-ignore */ spec)
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  destructive?: boolean
  cancelLabel?: string
  secondaryLabel?: string
  onSecondary?: () => void
  busy?: boolean
}
const LoggerConfirm = async () =>
  ((await load('@/components/workout-logging/LoggerConfirm')) as { default: (p: Props) => ReactNode }).default

afterEach(cleanup)

const base = (over: Partial<Props> = {}): Props => ({
  open: true,
  onOpenChange: vi.fn(),
  title: 'Delete Barbell Squat?',
  body: 'This removes it from the workout.',
  confirmLabel: 'Delete',
  onConfirm: vi.fn(),
  ...over,
})

async function show(over: Partial<Props> = {}) {
  const C = await LoggerConfirm()
  const props = base(over)
  render(<C {...props} />)
  return props
}

const dialog = () => screen.getByRole('alertdialog')
const describedBy = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
const TARGET_48 = /(^|\s)(min-h-12|h-12|min-h-\[48px\]|h-\[48px\])(\s|$)/

/** A page with an opener button that toggles a real LoggerConfirm. */
function Page({ C, onConfirm }: { C: (p: Props) => ReactNode; onConfirm: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open it
      </button>
      <button type="button">Elsewhere</button>
      <C open={open} onOpenChange={setOpen} title="Delete the only set?" body="Gone for good." confirmLabel="Delete set" onConfirm={onConfirm} />
    </>
  )
}
async function renderPage(onConfirm: () => void = vi.fn()) {
  const C = await LoggerConfirm()
  render(<Page C={C} onConfirm={onConfirm} />)
}

describe('Scenario: A confirmation is a real dialog', () => {
  it('is announced as an alert dialog, named by its title', async () => {
    await show()
    expect(screen.getByRole('alertdialog', { name: 'Delete Barbell Squat?' })).toBeTruthy()
  })

  it('is described by its message', async () => {
    await show({ body: 'This removes it from the workout.' })
    expect(describedBy(dialog())).toContain('This removes it from the workout.')
  })

  it('a node body is the description too (summary line)', async () => {
    await show({ title: 'Complete this workout?', body: <span>18 sets · 42 min</span> })
    expect(describedBy(dialog())).toContain('18 sets · 42 min')
  })

  it('renders nothing while closed', async () => {
    await show({ open: false })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByText('Delete Barbell Squat?')).toBeNull()
  })

  it('shows the title once and the confirm and cancel actions by their labels', async () => {
    await show({ confirmLabel: 'Delete', cancelLabel: undefined })
    expect(within(dialog()).getAllByText('Delete Barbell Squat?')).toHaveLength(1)
    expect(within(dialog()).getByRole('button', { name: 'Delete' })).toBeTruthy()
    expect(within(dialog()).getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('cancelLabel renames Cancel', async () => {
    await show({ cancelLabel: 'Keep it' })
    expect(within(dialog()).getByRole('button', { name: 'Keep it' })).toBeTruthy()
    expect(within(dialog()).queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  it('focus moves into the dialog when it opens', async () => {
    await renderPage()
    const opener = screen.getByRole('button', { name: 'Open it' })
    opener.focus()
    fireEvent.click(opener)
    expect(dialog().contains(document.activeElement)).toBe(true)
  })

  it('focus stays inside: Tab from the last control does not leave', async () => {
    await renderPage()
    const opener = screen.getByRole('button', { name: 'Open it' })
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    opener.focus()
    fireEvent.click(opener)
    const buttons = within(dialog()).getAllByRole('button')
    buttons[buttons.length - 1].focus()
    fireEvent.keyDown(document.activeElement as Element, { key: 'Tab' })
    expect(dialog().contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(elsewhere)
  })

  it('focus returns to what opened it, after Cancel', async () => {
    await renderPage()
    const opener = screen.getByRole('button', { name: 'Open it' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('focus returns to what opened it, after Escape', async () => {
    await renderPage()
    const opener = screen.getByRole('button', { name: 'Open it' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('every button in it is a 48px target', async () => {
    await show({ secondaryLabel: 'Discard', onSecondary: vi.fn() })
    const buttons = within(dialog()).getAllByRole('button')
    expect(buttons.length).toBe(3)
    for (const b of buttons) expect(b.className, `button "${b.textContent}"`).toMatch(TARGET_48)
  })

  it('has no doom-corners', async () => {
    await show()
    expect(document.querySelector('.doom-corners')).toBeNull()
  })
})

describe('Scenario: Escape cancels a confirmation', () => {
  it('Escape closes it (onOpenChange(false)) and does not confirm', async () => {
    const p = await show()
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(p.onOpenChange).toHaveBeenCalledWith(false)
    expect(p.onOpenChange).not.toHaveBeenCalledWith(true)
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('Escape does not run the secondary action either', async () => {
    const onSecondary = vi.fn()
    const p = await show({ secondaryLabel: 'Discard', onSecondary })
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(onSecondary).not.toHaveBeenCalled()
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('Cancel is the same as Escape', async () => {
    const p = await show()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    expect(p.onOpenChange).toHaveBeenCalledWith(false)
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('a closed-by-Escape dialog is gone when the caller sets open to false', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }))
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByText('Delete the only set?')).toBeNull()
  })
})

describe('The action', () => {
  it('runs onConfirm exactly once', async () => {
    const p = await show()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete' }))
    expect(p.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('never reports the dialog as opening', async () => {
    const p = await show()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete' }))
    expect(p.onOpenChange).not.toHaveBeenCalledWith(true)
  })

  it('destructive: the action is filled bg-error and Cancel is not', async () => {
    await show({ destructive: true })
    expect(within(dialog()).getByRole('button', { name: 'Delete' }).className).toMatch(/(^|\s)bg-error(\s|$)/)
    expect(within(dialog()).getByRole('button', { name: 'Cancel' }).className).not.toMatch(/bg-error/)
  })

  it('not destructive: nothing in the dialog is bg-error', async () => {
    await show({ destructive: false, confirmLabel: 'Confirm' })
    expect(dialog().innerHTML).not.toMatch(/bg-error/)
    expect(dialog().querySelector('[class*="bg-error"]')).toBeNull()
  })

  it('destructive defaults to off', async () => {
    await show({ confirmLabel: 'Confirm' })
    expect(dialog().querySelector('[class*="bg-error"]')).toBeNull()
  })

  it('Cancel is an outline button (border-2, not filled)', async () => {
    await show()
    const cancel = within(dialog()).getByRole('button', { name: 'Cancel' })
    expect(cancel.className).toMatch(/(^|\s)border-2(\s|$)/)
    expect(cancel.className).not.toMatch(/(^|\s)bg-(primary|error|success)(\s|$)/)
  })
})

describe('A secondary action (Exit: Discard)', () => {
  it('is a third button that runs only onSecondary', async () => {
    const onSecondary = vi.fn()
    const p = await show({ secondaryLabel: 'Discard', onSecondary })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Discard' }))
    expect(onSecondary).toHaveBeenCalledTimes(1)
    expect(p.onConfirm).not.toHaveBeenCalled()
  })

  it('is outline with error text, never filled', async () => {
    await show({ secondaryLabel: 'Discard', onSecondary: vi.fn(), destructive: false })
    const b = within(dialog()).getByRole('button', { name: 'Discard' })
    expect(b.className).toMatch(/(^|\s)text-error(\s|$)/)
    expect(b.className).not.toMatch(/(^|\s)bg-error(\s|$)/)
  })

  it('is absent unless asked for', async () => {
    await show()
    expect(within(dialog()).getAllByRole('button')).toHaveLength(2)
  })
})

describe('While busy (Exit: discarding)', () => {
  it('Cancel and the action are disabled and do nothing; the secondary is not', async () => {
    const onSecondary = vi.fn()
    const p = await show({ busy: true, secondaryLabel: 'Discarding…', onSecondary })
    const cancel = within(dialog()).getByRole('button', { name: 'Cancel' }) as HTMLButtonElement
    const action = within(dialog()).getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    const secondary = within(dialog()).getByRole('button', { name: 'Discarding…' }) as HTMLButtonElement
    expect(cancel.disabled).toBe(true)
    expect(action.disabled).toBe(true)
    expect(secondary.disabled).toBe(false)
    fireEvent.click(cancel)
    fireEvent.click(action)
    expect(p.onConfirm).not.toHaveBeenCalled()
    expect(p.onOpenChange).not.toHaveBeenCalled()
  })

  it('is off by default', async () => {
    await show()
    for (const b of within(dialog()).getAllByRole('button')) expect((b as HTMLButtonElement).disabled).toBe(false)
  })
})
