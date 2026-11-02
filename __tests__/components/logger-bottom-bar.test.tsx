/**
 * L2: the one bottom bar, as a component, plus the three small pieces around it
 * (the banner's "N of N done", the form's removed "All prescribed sets logged" box,
 * the follow-along 48px controls).
 * Behaviour: features/ui-audit/logger-bottom-bar.feature. Spec: initiatives/ui-audit/spec.md ("L2").
 * The bar as the three loggers wire it: logger-bottom-bar-loggers.test.tsx.
 *
 * PINNED INTERFACE
 *
 *   components/workout-logging/LoggerBottomBar.tsx, default export. It replaces
 *   ExerciseActionsFooter, FollowAlongFooter and the freestyle footer.
 *
 *     interface LoggerBottomBarProps {
 *       // Left slot: a 48x48 outline square, aria-label "Previous exercise".
 *       previous?: { onClick: () => void; disabled?: boolean }
 *       // Main slot: the one filled accent button. `label` is the visible text
 *       // ("Log set", "+ Extra set", "Next exercise", "Finish", "Add exercise").
 *       // `detail` is an optional second line inside the same button.
 *       main: { label: string; detail?: string; onClick: () => void; disabled?: boolean }
 *       // Right slot. Without `label`: a 48x48 outline square, aria-label "Next exercise".
 *       // With `label`: a 48px-high outline button whose text is that label.
 *       next?: { onClick: () => void; disabled?: boolean; label?: string }
 *     }
 *
 *   - Root carries data-testid="logger-bottom-bar" (the loggers' tests find the bar by it)
 *     and the classes bg-card, border-t-2, border-secondary. Flat: no inline rgba(), no doom-corners.
 *   - Buttons: native <button type="button">. Previous/next squares: border-2 border-border,
 *     48px both ways (w-12 h-12 or size-12 or the [48px] forms). A disabled one is still an
 *     outline, text-muted-foreground, NOT opacity-50, and is announced as disabled (the native
 *     `disabled` attribute or aria-disabled="true"); its onClick never runs.
 *   - Main button: bg-accent text-accent-foreground, at least 48px high, with the "0 3px 0"
 *     press edge (inline boxShadow containing "0 3px 0", or a shadow-[0_3px_0...] class).
 *     The label and the detail are separate elements, so the label reads exactly "Log set".
 *   - Left, main, right appear in that order in the DOM.
 *
 *   DrawerContextBanner: currentSet = totalSets + 1 reads "N of N done" (not "Set N+1 of N").
 *   SetLoggingForm: the in-content "All prescribed sets logged!" box (Extra Sets / Next Exercise /
 *   Complete Workout buttons) is gone; the inputs always render.
 *   FollowAlongHeader: "Close workout" and the "Switch to logging" strip are 48px targets.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: { defaultWeightUnit: 'lbs' }, isLoading: false, updateSettings: vi.fn() }),
}))

import DrawerContextBanner from '@/components/workout-logging/DrawerContextBanner'
import FollowAlongHeader from '@/components/workout-logging/FollowAlongHeader'
import SetLoggingForm from '@/components/workout-logging/SetLoggingForm'

// Not there yet (red): loaded lazily so a missing file fails each test, not the whole file.
const load = (spec: string) => import(/* @vite-ignore */ spec)
type BarProps = {
  previous?: { onClick: () => void; disabled?: boolean }
  main: { label: string; detail?: string; onClick: () => void; disabled?: boolean }
  next?: { onClick: () => void; disabled?: boolean; label?: string }
}
async function renderBar(props: BarProps) {
  const mod = await load('@/components/workout-logging/LoggerBottomBar')
  const Bar = mod.default as (p: BarProps) => React.ReactElement
  render(<Bar {...props} />)
  return screen.getByTestId('logger-bottom-bar')
}

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.scrollIntoView ??= () => {}
})
afterEach(cleanup)

const H48 = /(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|size-12)(\s|$)/
const W48 = /(^|\s)(w-12|min-w-12|w-\[48px\]|min-w-\[48px\]|size-12)(\s|$)/
const cls = (el: Element) => el.getAttribute('class') ?? ''
const isDisabled = (el: HTMLElement) =>
  (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true'
const all = (root: Element) => [root, ...Array.from(root.querySelectorAll('*'))]

const base = (over: Partial<BarProps> = {}): BarProps => ({
  previous: { onClick: vi.fn() },
  main: { label: 'Log set', onClick: vi.fn() },
  next: { onClick: vi.fn() },
  ...over,
})

describe('LoggerBottomBar: the look (direction A, flat folder bar)', () => {
  it('is a flat bg-card bar with a 2px secondary top border', async () => {
    const bar = await renderBar(base())
    expect(cls(bar)).toMatch(/(^|\s)bg-card(\s|$)/)
    expect(cls(bar)).toMatch(/(^|\s)border-t-2(\s|$)/)
    expect(cls(bar)).toMatch(/(^|\s)border-secondary(\s|$)/)
  })

  it('has no fixed rgba() colour or shadow anywhere in it, and no doom-corners', async () => {
    const bar = await renderBar(base({ main: { label: 'Log set', detail: '8 reps × 135 lbs', onClick: vi.fn() } }))
    for (const el of all(bar)) {
      expect(el.getAttribute('style') ?? '').not.toMatch(/rgba?\(/i)
      expect(cls(el)).not.toMatch(/doom-corners/)
    }
  })

  it('previous and next are 48x48 outline squares (border-2 border-border)', async () => {
    const bar = await renderBar(base())
    for (const name of ['Previous exercise', 'Next exercise']) {
      const b = within(bar).getByRole('button', { name })
      expect(cls(b)).toMatch(H48)
      expect(cls(b)).toMatch(W48)
      expect(cls(b)).toMatch(/(^|\s)border-2(\s|$)/)
      expect(cls(b)).toMatch(/(^|\s)border-border(\s|$)/)
    }
  })

  it('the main button is filled accent, at least 48px high, with the 0 3px 0 press edge', async () => {
    const bar = await renderBar(base())
    const main = within(bar).getByRole('button', { name: /log set/i })
    expect(cls(main)).toMatch(/(^|\s)bg-accent(\s|$)/)
    expect(cls(main)).toMatch(/(^|\s)text-accent-foreground(\s|$)/)
    expect(cls(main)).toMatch(/(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|h-14|min-h-14)(\s|$)|min-h-\[(4[89]|[5-9]\d)px\]/)
    const edge = main.style.boxShadow.includes('0 3px 0') || /0_3px_0/.test(cls(main))
    expect(edge).toBe(true)
  })

  it('a labelled next button (e.g. "Next exercise", "Finish") is an outline button, 48px high', async () => {
    const bar = await renderBar(base({ next: { label: 'Next exercise', onClick: vi.fn() } }))
    const b = within(bar).getByRole('button', { name: 'Next exercise' })
    expect(b.textContent).toContain('Next exercise')
    expect(cls(b)).toMatch(H48)
    expect(cls(b)).toMatch(/(^|\s)border-2(\s|$)/)
    expect(cls(b)).toMatch(/(^|\s)border-border(\s|$)/)
  })
})

describe('LoggerBottomBar: contents and clicks', () => {
  it('left, main, right in that order', async () => {
    const bar = await renderBar(base())
    const prev = within(bar).getByRole('button', { name: 'Previous exercise' })
    const main = within(bar).getByRole('button', { name: /log set/i })
    const next = within(bar).getByRole('button', { name: 'Next exercise' })
    expect(prev.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(main.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the main button has the label on one line and the detail under it, both inside the button', async () => {
    const bar = await renderBar(base({ main: { label: 'Log set', detail: '8 reps × 135 lbs', onClick: vi.fn() } }))
    const main = within(bar).getByRole('button', { name: /log set/i })
    const label = within(main).getByText('Log set')
    const detail = within(main).getByText('8 reps × 135 lbs')
    expect(label).not.toBe(detail)
    expect(label.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('without a detail the main button holds only its label', async () => {
    const bar = await renderBar(base())
    const main = within(bar).getByRole('button', { name: /log set/i })
    expect((main.textContent ?? '').trim()).toBe('Log set')
  })

  it('each button runs its own handler once and no other', async () => {
    const p = base({ next: { label: 'Next exercise', onClick: vi.fn() } })
    const bar = await renderBar(p)
    fireEvent.click(within(bar).getByRole('button', { name: 'Previous exercise' }))
    expect(p.previous?.onClick).toHaveBeenCalledTimes(1)
    expect(p.main.onClick).not.toHaveBeenCalled()
    expect(p.next?.onClick).not.toHaveBeenCalled()
    fireEvent.click(within(bar).getByRole('button', { name: /log set/i }))
    expect(p.main.onClick).toHaveBeenCalledTimes(1)
    fireEvent.click(within(bar).getByRole('button', { name: 'Next exercise' }))
    expect(p.next?.onClick).toHaveBeenCalledTimes(1)
    expect(p.previous?.onClick).toHaveBeenCalledTimes(1)
  })

  it('omitting previous or next leaves no such button', async () => {
    const bar = await renderBar({ main: { label: 'Add exercise', onClick: vi.fn() } })
    expect(within(bar).queryByRole('button', { name: 'Previous exercise' })).toBeNull()
    expect(within(bar).queryByRole('button', { name: 'Next exercise' })).toBeNull()
    expect(within(bar).getByRole('button', { name: 'Add exercise' })).toBeTruthy()
  })
})

describe('Scenario: Previous and next are clearly off at the ends', () => {
  it('a disabled Previous is announced as disabled and does not fire', async () => {
    const p = base({ previous: { onClick: vi.fn(), disabled: true } })
    const bar = await renderBar(p)
    const prev = within(bar).getByRole('button', { name: 'Previous exercise' })
    expect(isDisabled(prev)).toBe(true)
    fireEvent.click(prev)
    expect(p.previous?.onClick).not.toHaveBeenCalled()
  })

  it('disabled looks like an outline with muted text, not a faded button', async () => {
    const bar = await renderBar(base({ previous: { onClick: vi.fn(), disabled: true } }))
    const prev = within(bar).getByRole('button', { name: 'Previous exercise' })
    expect(cls(prev)).toMatch(/(^|\s)text-muted-foreground(\s|$)/)
    expect(cls(prev)).not.toMatch(/opacity-/)
    expect(cls(prev)).toMatch(/(^|\s)border-2(\s|$)/)
  })

  it('an enabled Previous is not marked disabled and is not muted', async () => {
    const bar = await renderBar(base())
    const prev = within(bar).getByRole('button', { name: 'Previous exercise' })
    expect(isDisabled(prev)).toBe(false)
    expect(cls(prev)).not.toMatch(/(^|\s)text-muted-foreground(\s|$)/)
  })

  it('a disabled next square is announced as disabled too, and does not fire', async () => {
    const p = base({ next: { onClick: vi.fn(), disabled: true } })
    const bar = await renderBar(p)
    const next = within(bar).getByRole('button', { name: 'Next exercise' })
    expect(isDisabled(next)).toBe(true)
    expect(cls(next)).not.toMatch(/opacity-/)
    fireEvent.click(next)
    expect(p.next?.onClick).not.toHaveBeenCalled()
  })

  it('a disabled main button is announced as disabled and does not fire', async () => {
    const p = base({ main: { label: 'Log set', onClick: vi.fn(), disabled: true } })
    const bar = await renderBar(p)
    const main = within(bar).getByRole('button', { name: /log set/i })
    expect(isDisabled(main)).toBe(true)
    fireEvent.click(main)
    expect(p.main.onClick).not.toHaveBeenCalled()
  })
})

describe('Scenario: The banner counts sets done', () => {
  const banner = (currentSet: number, totalSets?: number) =>
    render(<DrawerContextBanner exerciseName="Barbell Squat" currentSet={currentSet} totalSets={totalSets} />)
  const text = () => document.body.textContent ?? ''

  it('7 planned, all 7 logged (next would be set 8): "7 of 7 done"', () => {
    banner(8, 7)
    expect(text()).toMatch(/7 of 7 done/i)
    expect(text()).not.toMatch(/set 8/i)
  })

  it('it counts the planned sets: 4 planned and logged reads "4 of 4 done"', () => {
    banner(5, 4)
    expect(text()).toMatch(/4 of 4 done/i)
  })

  it('one planned set, logged: "1 of 1 done"', () => {
    banner(2, 1)
    expect(text()).toMatch(/1 of 1 done/i)
  })

  it('mid-exercise is unchanged: "Set 3 of 7", not done', () => {
    banner(3, 7)
    expect(text()).toMatch(/set 3 of 7/i)
    expect(text()).not.toMatch(/done/i)
  })

  it('on the last planned set it is still "Set 7 of 7", not done yet', () => {
    banner(7, 7)
    expect(text()).toMatch(/set 7 of 7/i)
    expect(text()).not.toMatch(/done/i)
  })

  it('freestyle (no planned total) is unchanged: "Set 4"', () => {
    banner(4)
    expect(text()).toMatch(/set 4/i)
    expect(text()).not.toMatch(/done/i)
  })
})

describe('SetLoggingForm no longer carries the "all logged" box', () => {
  const noop = () => {}
  function form(over: Record<string, unknown> = {}) {
    const props = {
      prescribedSet: undefined,
      hasLoggedAllPrescribed: true,
      extraSetsMode: false,
      hasRpe: false,
      hasRir: false,
      currentSet: { reps: '', weight: '', weightUnit: 'lbs', rpe: '', rir: '' },
      onSetChange: noop,
      expandedInput: null,
      onExpandedInputChange: noop,
      onExtraSets: noop,
      onNextExercise: noop,
      onCompleteWorkout: noop,
      isLastExercise: false,
      ...over,
    }
    return render(<SetLoggingForm {...(props as unknown as React.ComponentProps<typeof SetLoggingForm>)} />)
  }

  it('all prescribed sets logged: no "All prescribed sets logged" box', () => {
    form()
    expect(document.body.textContent ?? '').not.toMatch(/all prescribed sets logged/i)
  })

  it('and none of its buttons (Extra Sets, Next Exercise, Complete Workout) are in the content', () => {
    form()
    for (const name of [/extra sets?/i, /next exercise/i, /complete workout/i]) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
    cleanup()
    form({ isLastExercise: true })
    for (const name of [/extra sets?/i, /next exercise/i, /complete workout/i]) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('the inputs still render when all are logged (the form is not replaced by anything)', () => {
    form()
    expect(document.body.textContent ?? '').toMatch(/reps/i)
  })

  it('while sets remain, the inputs render as before', () => {
    form({ hasLoggedAllPrescribed: false })
    expect(document.body.textContent ?? '').toMatch(/reps/i)
  })
})

describe('Carry-overs from review 090: follow-along controls are 48px targets', () => {
  const header = () =>
    render(
      <FollowAlongHeader currentExerciseIndex={0} totalExercises={3} onClose={vi.fn()} onSwitchToLogging={vi.fn()} />
    )

  it('"Close workout" is 48x48', () => {
    header()
    const b = screen.getByRole('button', { name: 'Close workout' })
    expect(cls(b)).toMatch(H48)
    expect(cls(b)).toMatch(W48)
  })

  it('the "Switch to logging" strip is at least 48px high', () => {
    header()
    const b = screen.getByRole('button', { name: /switch to logging/i })
    expect(cls(b)).toMatch(/(^|\s)(h-12|min-h-12|h-\[48px\]|min-h-\[48px\]|h-14|min-h-14)(\s|$)/)
  })

  it('"Close workout" still closes', () => {
    const onClose = vi.fn()
    render(<FollowAlongHeader currentExerciseIndex={0} totalExercises={3} onClose={onClose} onSwitchToLogging={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close workout' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the strip still opens the switch confirmation', () => {
    header()
    fireEvent.click(screen.getByRole('button', { name: /switch to logging/i }))
    expect(screen.getByRole('alertdialog', { name: /switch to logging mode/i })).toBeTruthy()
  })
})
