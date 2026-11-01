/**
 * L1 fixes from review 090: Exit's Discard can't be pressed again while the
 * discard runs (LoggerConfirm `secondaryDisabled`; `busy` alone leaves the
 * secondary live, as pinned in logger-confirm.test.tsx), and the Complete
 * summary says "under 1 min" before the first minute is up.
 * Spec: initiatives/ui-audit/spec.md ("L1").
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CompleteWorkoutConfirm from '@/components/workout-logging/CompleteWorkoutConfirm'
import ExitWorkoutConfirm from '@/components/workout-logging/ExitWorkoutConfirm'
import LoggerConfirm from '@/components/workout-logging/LoggerConfirm'

afterEach(cleanup)

const dialog = () => screen.getByRole('alertdialog')
const describedBy = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')

describe('LoggerConfirm: secondaryDisabled', () => {
  const show = (secondaryDisabled: boolean) => {
    const onSecondary = vi.fn()
    render(
      <LoggerConfirm
        open
        onOpenChange={vi.fn()}
        title="Exit workout?"
        body="Save or discard."
        confirmLabel="Save as draft"
        onConfirm={vi.fn()}
        secondaryLabel="Discard"
        onSecondary={onSecondary}
        secondaryDisabled={secondaryDisabled}
      />
    )
    return onSecondary
  }

  it('disables the secondary and its click does nothing', () => {
    const onSecondary = show(true)
    const discard = within(dialog()).getByRole('button', { name: 'Discard' }) as HTMLButtonElement
    expect(discard.disabled).toBe(true)
    fireEvent.click(discard)
    expect(onSecondary).not.toHaveBeenCalled()
  })

  it('leaves it live by default', () => {
    const onSecondary = show(false)
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Discard' }))
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })
})

describe('Exit: while discarding, nothing can be pressed', () => {
  it('Discarding…, Save as draft and Cancel are all disabled; a second Discard does nothing', () => {
    const onDiscard = vi.fn()
    render(
      <ExitWorkoutConfirm hasUnsavedWork onSaveAsDraft={vi.fn()} onDiscard={onDiscard} onCancel={vi.fn()} isDiscarding />
    )
    for (const b of within(dialog()).getAllByRole('button')) expect((b as HTMLButtonElement).disabled, b.textContent ?? '').toBe(true)
    fireEvent.click(within(dialog()).getByRole('button', { name: /discarding/i }))
    expect(onDiscard).not.toHaveBeenCalled()
  })

  it('before discarding, Discard works', () => {
    const onDiscard = vi.fn()
    render(<ExitWorkoutConfirm hasUnsavedWork onSaveAsDraft={vi.fn()} onDiscard={onDiscard} onCancel={vi.fn()} />)
    fireEvent.click(within(dialog()).getByRole('button', { name: /^discard$/i }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })
})

describe('Complete: the summary under a minute', () => {
  const complete = (setCount: number, durationMinutes: number) =>
    render(
      <CompleteWorkoutConfirm
        isFollowAlong={false}
        isSubmitting={false}
        setCount={setCount}
        durationMinutes={durationMinutes}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

  it('0 minutes reads "under 1 min", not "0 min"', () => {
    complete(3, 0)
    expect(describedBy(dialog())).toContain('3 sets · under 1 min')
    expect(describedBy(dialog())).not.toMatch(/\b0 min\b/)
  })

  it('1 minute and up reads as minutes', () => {
    complete(3, 1)
    expect(describedBy(dialog())).toContain('3 sets · 1 min')
  })

  it('one set is "1 set"', () => {
    complete(1, 5)
    expect(describedBy(dialog())).toContain('1 set · 5 min')
  })
})
