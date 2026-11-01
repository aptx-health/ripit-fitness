/**
 * UI6 Settings sub-pages: Save in the header turns primary while there are
 * unsaved changes, Target movements open as rows, Muscle balance toggles are
 * whole rows, and every sub-page has the shared "← Settings" header.
 * Spec: initiatives/ui-audit/spec.md ("UI6").
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EquipmentChecklistEditor from '@/components/features/equipment/EquipmentChecklistEditor'
import MuscleBalanceSettingsEditor from '@/components/features/muscle-balance/MuscleBalanceSettingsEditor'
import TargetMovementsEditor from '@/components/features/target-movements/TargetMovementsEditor'
import ProgramBackLink from '@/components/programs/ProgramBackLink'
import SaveButton from '@/components/settings/SaveButton'
import { calculateMuscleBalanceSnapshot, normalizeMuscleBalanceSettings } from '@/lib/muscle-balance'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/exercise-selection/ExerciseSearchInterface', () => ({ ExerciseSearchInterface: () => null }))
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const snapshot = () => calculateMuscleBalanceSnapshot(normalizeMuscleBalanceSettings(null), [])
/** The header's Save (the unsaved-changes bar adds a second one while dirty). */
const save = () => screen.getAllByRole('button', { name: /^save/i })[0]
const bar = () => screen.queryByRole('region', { name: 'Unsaved changes' })
const isDirty = () => save().getAttribute('data-dirty') === 'true'

describe('SaveButton', () => {
  it('is a quiet outline button with nothing to save', () => {
    render(<SaveButton dirty={false} saving={false} onClick={vi.fn()} />)
    expect(save().className).toContain('border-border')
    expect(save().className).not.toContain('bg-primary ')
    expect(save().textContent).not.toMatch(/unsaved/i)
  })

  it('turns primary, and says so to screen readers, with unsaved changes', () => {
    render(<SaveButton dirty saving={false} onClick={vi.fn()} />)
    expect(save().className).toContain('bg-primary')
    expect(save().textContent).toMatch(/unsaved changes/i)
  })

  it('is disabled while saving', () => {
    render(<SaveButton dirty saving onClick={vi.fn()} />)
    expect((screen.getByRole('button', { name: /saving/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('Muscle balance', () => {
  it('has the shared header: a 48px back link to Settings and the title', () => {
    render(<MuscleBalanceSettingsEditor initialSnapshot={snapshot()} />)
    const back = screen.getByRole('link', { name: /settings/i })
    expect(back.getAttribute('href')).toBe('/settings')
    expect(back.className).toContain('min-h-12')
    expect(screen.getByRole('heading', { level: 1, name: /muscle balance/i })).toBeTruthy()
  })

  it('Save turns primary after a change, and back when the change is undone', () => {
    render(<MuscleBalanceSettingsEditor initialSnapshot={snapshot()} />)
    expect(isDirty()).toBe(false)
    const input = screen.getAllByRole('spinbutton', { name: /target ratio$/i })[0] as HTMLInputElement
    const before = input.value
    fireEvent.change(input, { target: { value: '1.5' } })
    expect(isDirty()).toBe(true)
    fireEvent.change(input, { target: { value: before } })
    expect(isDirty()).toBe(false)
  })

  it('the unsaved-changes bar appears with a change and goes when it is undone', () => {
    render(<MuscleBalanceSettingsEditor initialSnapshot={snapshot()} />)
    expect(bar()).toBeNull()
    const input = screen.getAllByRole('spinbutton', { name: /target ratio$/i })[0] as HTMLInputElement
    const before = input.value
    fireEvent.change(input, { target: { value: '1.5' } })
    expect(within(bar() as HTMLElement).getByRole('button', { name: /^save/i })).toBeTruthy()
    expect((bar() as HTMLElement).className).toContain('sticky')
    fireEvent.change(input, { target: { value: before } })
    expect(bar()).toBeNull()
  })

  it("the bar's Save saves, and the bar goes once saved", async () => {
    const saved = snapshot()
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      const settings = JSON.parse(init.body)
      return { ok: true, json: async () => ({ snapshot: { ...saved, settings } }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MuscleBalanceSettingsEditor initialSnapshot={saved} />)
    fireEvent.change(screen.getAllByRole('spinbutton', { name: /target ratio$/i })[0], { target: { value: '1.5' } })
    fireEvent.click(within(bar() as HTMLElement).getByRole('button', { name: /^save/i }))
    await screen.findByText(/muscle balance saved/i)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(bar()).toBeNull())
  })

  it('Save is quiet again once the change is saved', async () => {
    const saved = snapshot()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        const settings = JSON.parse(init.body)
        return { ok: true, json: async () => ({ snapshot: { ...saved, settings } }) }
      })
    )
    render(<MuscleBalanceSettingsEditor initialSnapshot={saved} />)
    fireEvent.change(screen.getAllByRole('spinbutton', { name: /target ratio$/i })[0], { target: { value: '1.5' } })
    expect(isDirty()).toBe(true)
    fireEvent.click(save())
    await screen.findByText(/muscle balance saved/i)
    await waitFor(() => expect(isDirty()).toBe(false))
  })

  it('a toggle row switches when its label is tapped', () => {
    render(<MuscleBalanceSettingsEditor initialSnapshot={snapshot()} />)
    const toggle = screen.getByRole('switch', { name: /ignore warmup sets/i })
    const before = toggle.getAttribute('aria-checked')
    fireEvent.click(within(toggle).getByText(/ignore warmup sets/i))
    expect(toggle.getAttribute('aria-checked')).not.toBe(before)
    expect(isDirty()).toBe(true)
  })

  it('has no doom-corners', () => {
    const { container } = render(<MuscleBalanceSettingsEditor initialSnapshot={snapshot()} />)
    expect(container.innerHTML).not.toContain('doom-corners')
  })
})

describe('Target movements', () => {
  const exercise = { id: 'ex1', name: 'Back Squat' } as never
  const open = () =>
    render(<TargetMovementsEditor initialTargetMovements={{ squat: ['ex1'] }} initialExercises={[exercise]} />)

  it('lists movements as rows in one box; opening a row shows its exercises', () => {
    open()
    const box = screen.getByRole('region', { name: 'Movements' })
    const squat = within(box).getByRole('button', { name: /^squat/i })
    expect(squat.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Back Squat')).toBeNull()
    fireEvent.click(squat)
    expect(squat.getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(squat.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(within(panel).getByText('Back Squat')).toBeTruthy()
    expect(within(panel).getByRole('button', { name: /edit exercises/i })).toBeTruthy()
  })

  it('shows the count on the row: "1 / 5" when set, "0 / 5" when empty (not "Off")', () => {
    open()
    expect(within(screen.getByRole('button', { name: /^squat/i })).getByText('1 / 5')).toBeTruthy()
    expect(within(screen.getByRole('button', { name: /^hinge/i })).getByText('0 / 5')).toBeTruthy()
    expect(screen.queryByText(/^off$/i)).toBeNull()
  })

  it('shows the unsaved-changes bar with its own Save after a change, and not before', () => {
    open()
    expect(bar()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^squat/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove back squat/i }))
    const b = bar() as HTMLElement
    expect(within(b).getByText(/^unsaved changes$/i)).toBeTruthy()
    expect(within(b).getByRole('button', { name: /^save/i }).className).toContain('bg-primary')
  })

  it('removing an exercise makes Save primary', () => {
    open()
    expect(isDirty()).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /^squat/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove back squat/i }))
    expect(isDirty()).toBe(true)
  })

  it('has no doom-corners', () => {
    const { container } = open()
    expect(container.innerHTML).not.toContain('doom-corners')
  })
})

describe('Equipment', () => {
  it('groups equipment in boxes of checkbox rows and saves on its own (no Save button)', () => {
    render(<EquipmentChecklistEditor initialEquipment={['barbell']} initialSet />)
    expect(screen.getByRole('link', { name: /settings/i }).getAttribute('href')).toBe('/settings')
    expect(screen.queryByRole('button', { name: /^save/i })).toBeNull()
    expect(screen.getAllByRole('region').length).toBeGreaterThan(1)
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(1)
  })
})

describe('Program detail back link', () => {
  it('is 48px tall', () => {
    render(<ProgramBackLink />)
    expect(screen.getByRole('link', { name: /library/i }).className).toContain('min-h-12')
  })
})
