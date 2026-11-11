/**
 * Work 156: deleting from the Workout plan sheet froze the logger. The row's
 * "Delete <name>?" confirmation (LoggerConfirm, a Radix AlertDialog) opened at
 * z-[60] while the sheet sits at z-[90], so it was drawn behind the sheet. Being
 * modal, it still took every tap (body pointer-events: none), and with no
 * visible way to confirm or cancel the app looked frozen until a hard refresh.
 *
 * The confirmation opened from the sheet, its overlay and its box, must stack
 * above the sheet. jsdom has no layout, so this reads the z-index each element
 * gets from its Tailwind class (z-50, z-[90]) or inline style.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkoutPlanEditor from '@/components/workout-logging/WorkoutPlanEditor'

vi.mock('@/lib/nav/app-scroll', () => ({ lockAppScroll: () => () => {} }))

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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

function openDeleteConfirm() {
  const noop = vi.fn()
  render(
    <WorkoutPlanEditor
      open
      onClose={noop}
      exercises={[
        { id: 'e1', name: 'Back Squat', setsDone: 1, setsPlanned: 3 },
        { id: 'e2', name: 'Cable Row', setsDone: 0, setsPlanned: 3 },
      ]}
      currentExerciseId="e1"
      onReorder={noop}
      onJump={noop}
      onAdd={noop}
      onSwap={noop}
      onDelete={noop}
    />,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: 'Edit options for Cable Row' }), { key: 'Enter' })
  fireEvent.click(screen.getByRole('menuitem', { name: /delete exercise/i }))
  return screen.getByRole('alertdialog', { name: 'Delete Cable Row?' })
}

describe('the plan sheet\'s Delete confirmation', () => {
  it('stacks above the sheet, box and overlay, so it can be seen and tapped', () => {
    const confirm = openDeleteConfirm()
    const sheet = zOf(screen.getByRole('dialog', { name: 'Workout plan' }))
    expect(sheet).toBeGreaterThan(0)
    expect(zOf(confirm), 'the confirmation box').toBeGreaterThan(sheet)
    // The overlay is the Radix sibling before the content in the same portal.
    const overlay = confirm.previousElementSibling
    expect(overlay, 'the confirmation overlay').not.toBeNull()
    expect(zOf(overlay), 'the confirmation overlay').toBeGreaterThan(sheet)
  })

  it('still offers Delete and Cancel', () => {
    const confirm = openDeleteConfirm()
    expect(within(confirm).getByRole('button', { name: 'Delete' })).toBeTruthy()
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })
})
