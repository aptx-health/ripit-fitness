/**
 * Quick swap review fixes (work 214).
 * F1: with "Keep original sets" off, the edited swap keeps each original set's prescribed weight
 *     (the set editor has no weight column; a set the user adds has none).
 * F2: the "Similar" list hides while a muscle or equipment filter, or the Anchors view, is active,
 *     as it does while typing, and comes back when they are cleared. Run in both layouts; the swap
 *     layout (work 216) keeps the triggers behind its "Filters" button.
 * Fetch is stubbed; the route's storage of weight is in __tests__/api/exercise-replace-weight.test.ts.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: true, isLoading: false }) }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: { defaultIntensityRating: 'rir' }, isLoading: false, updateSettings: async () => {} }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))

import { ExerciseSearchInterface } from '@/components/exercise-selection/ExerciseSearchInterface'
import { SwapExerciseWizard } from '@/components/workout-logging/wizards/SwapExerciseWizard'

const def = (id: string, name: string, primaryFAUs: string[], equipment: string[]) => ({
  id,
  name,
  primaryFAUs,
  secondaryFAUs: [],
  equipment,
  isSystem: true,
  createdBy: null,
})
const LUNGE = def('def-lunge', 'Dumbbell Lunge', ['quads', 'glutes'], ['dumbbell'])
const CURL = def('def-curl', 'Dumbbell Curl', ['biceps'], ['dumbbell'])

type Call = { path: string; method: string; body?: Record<string, unknown> }
let calls: Call[]

beforeAll(() => {
  const g = globalThis as Record<string, unknown>
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

beforeEach(() => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const path = String(input).split('?')[0]
      const method = (init?.method ?? 'GET').toUpperCase()
      calls.push({ path, method, body: init?.body ? JSON.parse(init.body) : undefined })
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
      if (path === '/api/exercises/similar') return json({ similar: [LUNGE] })
      if (path === '/api/exercises/search') return json({ exercises: [LUNGE, CURL] })
      return json({ success: true })
    })
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const similarList = () => screen.queryByRole('list', { name: 'Similar' })

describe('F1: an edited swap keeps the prescribed weight', () => {
  it('Keep off, add a set, swap: the original sets carry their weight, the added one none', async () => {
    const onComplete = vi.fn(async () => {})
    const onOpenChange = vi.fn()
    render(
      <SwapExerciseWizard
        open
        onOpenChange={onOpenChange}
        currentExerciseId="ex1"
        currentExerciseName="Dumbbell Goblet Squat"
        currentExerciseDefinitionId="def-goblet"
        currentPrescribedSets={[
          { setNumber: 1, reps: '8', rir: 2, rpe: null, weight: '50 lbs' },
          { setNumber: 2, reps: '8', rir: 2, rpe: null, weight: '55 lbs' },
        ]}
        onComplete={onComplete}
      />
    )
    const list = await screen.findByRole('list', { name: 'Similar' })
    fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
    fireEvent.click(screen.getByRole('switch', { name: /keep original sets/i }))
    fireEvent.click(within(list).getByText('Dumbbell Lunge'))
    fireEvent.click(await screen.findByText(/add set/i))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '8' })).toHaveLength(3))
    fireEvent.click(screen.getByRole('button', { name: /^swap exercise$/i }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    const replace = calls.find((c) => c.method === 'POST' && c.path === '/api/exercises/ex1/replace')
    const sets = (replace?.body?.prescribedSets ?? []) as Array<Record<string, unknown>>
    expect(sets.map((s) => [s.setNumber, s.reps, s.intensityValue, s.weight ?? null])).toEqual([
      [1, '8', 2, '50 lbs'],
      [2, '8', 2, '55 lbs'],
      [3, '8', 2, null],
    ])
  })
})

describe.each(['default', 'swap'] as const)('F2: filters hide the Similar list like typing does (%s layout)', (layout) => {
  function picker(extra: Record<string, unknown> = {}) {
    render(
      <ExerciseSearchInterface
        onExerciseSelect={vi.fn()}
        preloadExercises
        similarToDefinitionId="def-goblet"
        layout={layout}
        {...extra}
      />
    )
    if (layout === 'swap') fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
  }
  async function pick(trigger: string, option: string) {
    fireEvent.click(screen.getByRole('button', { name: trigger }))
    const sheet = await screen.findByRole('dialog')
    fireEvent.click(within(sheet).getByRole('button', { name: option }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  }

  it('a muscle filter hides it; "All Muscle Groups" brings it back', async () => {
    picker()
    await screen.findByRole('list', { name: 'Similar' })
    await pick('All Muscle Groups', 'Quads')
    await waitFor(() => expect(similarList()).toBeNull())
    await pick('Quads', 'All Muscle Groups')
    expect(await screen.findByRole('list', { name: 'Similar' })).toBeTruthy()
  })

  it('an equipment filter hides it; "All Equipment" brings it back', async () => {
    picker()
    await screen.findByRole('list', { name: 'Similar' })
    await pick('All Equipment', 'Dumbbell')
    await waitFor(() => expect(similarList()).toBeNull())
    await pick('Dumbbell', 'All Equipment')
    expect(await screen.findByRole('list', { name: 'Similar' })).toBeTruthy()
  })

  it('the Anchors view hides it; switching back to A-Z brings it back', async () => {
    picker({ anchors: [] })
    await screen.findByRole('list', { name: 'Similar' })
    fireEvent.click(screen.getByRole('button', { name: 'All Muscle Groups' }))
    let sheet = await screen.findByRole('dialog')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Anchors' }))
    // Close the sheet before looking: an open dialog hides the page from role queries.
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'All configured movements' })).toBeTruthy()
    expect(similarList()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'All configured movements' }))
    sheet = await screen.findByRole('dialog')
    fireEvent.click(within(sheet).getByRole('button', { name: 'A-Z' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByRole('list', { name: 'Similar' })).toBeTruthy()
  })

  it('with no filter and nothing typed it shows', async () => {
    picker()
    const list = await screen.findByRole('list', { name: 'Similar' })
    expect(within(list).getByText('Dumbbell Lunge')).toBeTruthy()
  })
})
