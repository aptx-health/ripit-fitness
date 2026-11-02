/**
 * L3: the plan opener in the logger header. Behaviour: features/ui-audit/logger-plan.feature
 * ("The plan opener says what it is"). Spec: initiatives/ui-audit/spec.md ("L3", item 7).
 *
 * PINNED (ExerciseLoggingHeader keeps its props)
 *   - With onOpenPlanEditor, the header has ONE opener button whose accessible name is exactly
 *     "Plan 2/6" for the third argument pair (currentExerciseIndex 1, totalExercises 6): "Plan
 *     <current>/<total>", 1-based. The text is visible at every width: neither the button's text
 *     nor any of its ancestors up to the button carry a `hidden` class (so no "sm:inline" only).
 *   - No unlabelled hamburger: no lucide Menu icon in the opener.
 *   - No leftover bevels: no inline style with rgba()/box-shadow on the opener, and no inset shadow class.
 *   - It stays a 48px-high target and calls onOpenPlanEditor once when tapped.
 *   - Without onOpenPlanEditor there is no opener button.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ExerciseLoggingHeader from '@/components/workout-logging/ExerciseLoggingHeader'

afterEach(cleanup)

function header(over: Partial<Parameters<typeof ExerciseLoggingHeader>[0]> = {}) {
  const props = {
    currentExerciseIndex: 1,
    totalExercises: 6,
    startedAt: null,
    onCompleteWorkout: vi.fn(),
    onClose: vi.fn(),
    onOpenPlanEditor: vi.fn(),
    ...over,
  }
  render(<ExerciseLoggingHeader {...props} />)
  return props
}
const cls = (el: Element | null) => el?.getAttribute('class') ?? ''
const opener = (name: string | RegExp = 'Plan 2/6') => screen.getByRole('button', { name })

describe('Scenario: The plan opener says what it is', () => {
  it('on exercise 2 of 6 the header button reads "Plan 2/6"', () => {
    header()
    expect(opener()).toBeTruthy()
    expect((opener().textContent ?? '').replace(/\s+/g, ' ').trim()).toMatch(/plan\s*2\/6/i)
  })

  it('the numbers follow the exercise: "Plan 5/9"', () => {
    header({ currentExerciseIndex: 4, totalExercises: 9 })
    expect(opener('Plan 5/9')).toBeTruthy()
  })

  it('the old name "Edit workout plan" is gone', () => {
    header()
    expect(screen.queryByRole('button', { name: /edit workout plan/i })).toBeNull()
  })

  it('there is exactly one opener', () => {
    header()
    expect(screen.getAllByRole('button', { name: /^plan\b/i })).toHaveLength(1)
  })

  it('the label shows at every width: nothing between the button and its text is hidden', () => {
    header()
    const label = Array.from(opener().querySelectorAll('*')).find((e) => /plan/i.test(e.textContent ?? '') && e.children.length === 0) ?? opener()
    expect(label).toBeTruthy()
    const HIDDEN = /(^|\s)(\S+:)*hidden(\s|$)/
    for (let el: Element | null = label as Element; el; el = el.parentElement) {
      expect(cls(el)).not.toMatch(HIDDEN)
      expect(cls(el)).not.toMatch(/(^|\s)\S*:?(sm|md|lg):inline(\s|$)/)
      if (el === opener()) break
    }
  })

  it('the plan text is not aria-hidden (it is the accessible name)', () => {
    header()
    expect(opener().querySelector('[aria-hidden="true"]:not(svg)')?.textContent ?? '').not.toMatch(/plan/i)
  })

  it('no hamburger icon', () => {
    header()
    expect(opener().querySelector('.lucide-menu')).toBeNull()
  })

  it('no leftover bevels on the opener', () => {
    header()
    for (const el of [opener(), ...Array.from(opener().querySelectorAll('*'))]) {
      expect(el.getAttribute('style') ?? '').not.toMatch(/rgba?\(|box-shadow/i)
      expect(cls(el)).not.toMatch(/shadow-\[inset|rgba\(/)
    }
  })

  it('it is a 48px-high target and opens the plan once when tapped', () => {
    const p = header()
    expect(cls(opener())).toMatch(/(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\])(\s|$)/)
    fireEvent.click(opener())
    expect(p.onOpenPlanEditor).toHaveBeenCalledTimes(1)
  })

  it('without a plan to open there is no opener', () => {
    header({ onOpenPlanEditor: undefined })
    expect(screen.queryByRole('button', { name: /^plan\b/i })).toBeNull()
  })
})

describe('The rest of the header is as before', () => {
  it('Exit workout still exits', () => {
    const p = header()
    fireEvent.click(screen.getByRole('button', { name: 'Exit workout' }))
    expect(p.onClose).toHaveBeenCalledTimes(1)
  })

  it('FINISH is in the header by default and completes', () => {
    const p = header()
    fireEvent.click(screen.getByRole('button', { name: /^finish$/i }))
    expect(p.onCompleteWorkout).toHaveBeenCalledTimes(1)
  })

  it('shows the unsaved-sets note', () => {
    header({ failedSetCount: 2 })
    expect(screen.getByText('2 unsaved')).toBeTruthy()
  })
})
