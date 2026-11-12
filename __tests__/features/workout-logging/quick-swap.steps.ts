/**
 * Step definitions for features/workout-logging/quick-swap.feature (work 211).
 * Ranking: __tests__/lib/exercises/similar.test.ts. Routes: __tests__/api/exercise-similar.test.ts.
 * Logger wiring (Edit menu and plan sheet hand the picker the current exercise):
 * __tests__/components/quick-swap-loggers.test.tsx.
 *
 * The pickers are rendered on their own with fetch routed to the real routes and the test DB:
 * /api/exercises/search, /api/exercises/similar (new) and /api/exercises/<id>/replace.
 *
 * PINNED (new unless marked existing)
 *   GET /api/exercises/similar?definitionId=<id> -> { similar: [...] } (contract in the API test file).
 *   Similar list: before anything is typed, a list with the accessible name "Similar"
 *     (role list, e.g. <ul aria-label="Similar">) holds one listitem per similar exercise, showing its
 *     name; tapping the name picks it. Typing in the search box (placeholder "Search exercises...",
 *     existing) hides the list and shows the normal results; clearing it brings the list back. No
 *     "Similar" list at all when the API gives none (untagged current exercise); the normal search shows.
 *   components/workout-logging/wizards/SwapExerciseWizard.tsx (program logger), new props:
 *     currentExerciseDefinitionId: string
 *     currentPrescribedSets: Array<{ setNumber: number; reps: string; rir?: number | null; rpe?: number | null; weight?: string | null }>
 *     Opens on the picker. On it (work 216): a summary line with the prescription as text ("Keeps 3 × 8
 *     @ RIR 2 · This week only"; "x" also accepted) and a button named "Change" that reveals two
 *     switches (role switch): "Keep original sets" (on) and "Also swap in future weeks" (off); hidden
 *     from role queries until then. With Keep on, tapping an exercise POSTs the replace route at once (no set or
 *     scope step) keeping the sets, then calls onComplete() and onOpenChange(false). With Keep
 *     off, tapping opens the set editor (SetConfigurationInterface, existing) prefilled with the
 *     original sets; a button named "Save..." or "Swap..." swaps with the edited sets. "Also swap in
 *     future weeks" sends applyToFuture: true.
 *     A failed swap shows role="alert" text saying the swap didn't happen (e.g. "Swap didn't happen. Try
 *     again."), does not call onComplete, keeps the picker open (it must still be open 2.5 s later)
 *     and lets the user tap again.
 *   Both pickers (work 216): a button named "Cancel" in the header (the X); a button named "Filters"
 *     next to search that reveals the existing "All Muscle Groups" / "All Equipment" triggers (hidden
 *     from role queries until then); under Similar a "More like this" button that shows chips (buttons
 *     with aria-pressed, named by FAU/equipment display name, all pressed) and a list named "More like
 *     this" from the search route (muscles any AND equipment any), leaving out the Similar exercises.
 *   components/adhoc/AdHocExercisePickerModal.tsx (freestyle logger): PickerMode swap gains
 *     currentDefinitionId: string. The same Similar list; tapping one calls onConfirm([def]) once.
 *
 * Steps share state through `s`; the screen is kept between steps (testing-library/react/pure) and
 * cleared when each scenario starts.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react/pure'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement, useState } from 'react'
import { expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))
const ui = vi.hoisted(() => ({
  complete: vi.fn(async () => {}),
  openChange: vi.fn(),
  confirm: vi.fn(),
  close: vi.fn(),
  failReplace: 0,
  calls: [] as Array<{ path: string; method: string; body?: unknown }>,
}))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId
      ? { user: { id: auth.userId, role: 'user', email: `${auth.userId}@x.test` }, error: null }
      : { user: null, error: null },
}))
vi.mock('@/lib/logger', () => {
  const l = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() }
  return { logger: { ...l, child: () => l }, default: l }
})
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/rate-limit', async () =>
  new Proxy(
    {},
    {
      has: () => true,
      get: (_t, key) => {
        if (key === 'then' || key === '__esModule') return undefined
        if (key === 'getClientIp') return () => '203.0.113.7'
        if (key === 'checkRateLimit') return async () => null
        if (key === 'checkRateLimitWithHeaders') return async () => ({ response: null, headers: {} })
        return {}
      },
    }
  )
)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, prefetch: () => {} }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/useIntensityAccess', () => ({ useIntensityAccess: () => ({ hasAccess: true, isLoading: false }) }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: { defaultIntensityRating: 'rir', completedTours: '[]', loggingMode: 'full' },
    isLoading: false,
    updateSettings: async () => {},
  }),
}))
vi.mock('@/components/features/exercise-definition/ExerciseDefinitionEditorModal', () => ({ default: () => null }))

const feature = await loadFeature('features/workout-logging/quick-swap.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Handler = (r: NextRequest, c?: unknown) => Promise<Response>
type Json = Record<string, unknown>

interface State {
  prisma: PrismaClient
  me: string
  other: string
  d: Record<string, string>
  /** Goblet squat in weeks 1, 2 and 3; week 2's is the current exercise (3 x 8 @ RIR 2). */
  goblet: string[]
  legExtension: string
  current: { exerciseId: string; definitionName: string }
  logger: 'program logger' | 'freestyle logger'
  similar: string[]
  completionId?: string
}
let s: State

const WEEK_SETS = [
  { reps: '6', rir: 1, count: 4 },
  { reps: '8', rir: 2, count: 3 },
  { reps: '5', rir: 3, count: 5 },
]

async function makeDef(name: string, primaryFAUs: string[], equipment: string[], movementPattern: string | null, owner?: string) {
  const made = await createTestExerciseDefinition(s.prisma, {
    name,
    primaryFAUs,
    equipment,
    ...(owner ? { userId: owner, isSystem: false } : { isSystem: true }),
  })
  await s.prisma.exerciseDefinition.update({ where: { id: made.id }, data: { movementPattern } })
  s.d[name] = made.id
}

async function freshState() {
  cleanup()
  vi.unstubAllGlobals()
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const me = (await createTestUser()).id
  const other = (await createTestUser()).id
  s = { prisma, me, other, d: {}, goblet: [], legExtension: '', current: { exerciseId: '', definitionName: '' }, logger: 'program logger', similar: [] }
  auth.userId = me
  ui.complete.mockClear()
  ui.openChange.mockClear()
  ui.confirm.mockClear()
  ui.close.mockClear()
  ui.failReplace = 0
  ui.calls.length = 0
  await makeDef('Dumbbell Goblet Squat', ['quads', 'glutes'], ['dumbbell'], 'squat')
  await makeDef('Dumbbell Front Squat', ['quads', 'glutes'], ['dumbbell'], 'squat')
  await makeDef('Dumbbell Lunge', ['quads', 'glutes'], ['dumbbell'], 'lunge')
  await makeDef('Barbell Back Squat', ['quads', 'glutes'], ['barbell'], 'squat')
  await makeDef('Leg Extension', ['quads'], ['machine'], null)
  await makeDef('Hip Thrust', ['glutes'], ['barbell'], 'hinge')
  await makeDef('Dumbbell Step Up', ['glutes'], ['dumbbell'], null)
  await makeDef('Dumbbell Curl', ['biceps'], ['dumbbell'], null)
  await makeDef('Plank', [], ['bodyweight'], null)
  await makeDef('My Split Squat', ['quads', 'glutes'], ['dumbbell'], null, me)
  await makeDef('Their Goblet Variant', ['quads', 'glutes'], ['dumbbell'], 'squat', other)

  const program = await prisma.program.create({ data: { name: 'Legs', userId: me, isUserCreated: true } })
  for (const [i, spec] of WEEK_SETS.entries()) {
    const week = await prisma.week.create({ data: { weekNumber: i + 1, programId: program.id, userId: me } })
    const workout = await prisma.workout.create({ data: { name: 'Legs', dayNumber: 1, weekId: week.id, userId: me } })
    const ex = await prisma.exercise.create({
      data: {
        name: 'Dumbbell Goblet Squat',
        exerciseDefinitionId: s.d['Dumbbell Goblet Squat'],
        order: 1,
        workoutId: workout.id,
        userId: me,
        prescribedSets: {
          create: Array.from({ length: spec.count }, (_, k) => ({ setNumber: k + 1, reps: spec.reps, rir: spec.rir, userId: me })),
        },
      },
    })
    s.goblet.push(ex.id)
    if (i === 1) {
      s.legExtension = (
        await prisma.exercise.create({
          data: {
            name: 'Leg Extension',
            exerciseDefinitionId: s.d['Leg Extension'],
            order: 2,
            workoutId: workout.id,
            userId: me,
            prescribedSets: { create: [{ setNumber: 1, reps: '12', userId: me }] },
          },
        })
      ).id
    }
  }
  s.current = { exerciseId: s.goblet[1], definitionName: 'Dumbbell Goblet Squat' }
}

/** An untagged current exercise (Plank) in week 2. */
async function plankCurrent() {
  const workoutId = (await s.prisma.exercise.findUniqueOrThrow({ where: { id: s.goblet[1] } })).workoutId
  const ex = await s.prisma.exercise.create({
    data: {
      name: 'Plank',
      exerciseDefinitionId: s.d.Plank,
      order: 3,
      workoutId,
      userId: s.me,
      prescribedSets: { create: [{ setNumber: 1, reps: '30', userId: s.me }] },
    },
  })
  s.current = { exerciseId: ex.id, definitionName: 'Plank' }
}

async function shape(exerciseId: string) {
  return s.prisma.exercise.findUniqueOrThrow({
    where: { id: exerciseId },
    select: {
      exerciseDefinitionId: true,
      name: true,
      prescribedSets: { orderBy: { setNumber: 'asc' }, select: { setNumber: true, reps: true, rir: true, rpe: true } },
    },
  })
}
const sets = (count: number, reps: string, rir: number | null) =>
  Array.from({ length: count }, (_, k) => ({ setNumber: k + 1, reps, rir, rpe: null }))

// --- fetch → real routes -------------------------------------------------------------
function routedFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: { method?: string; body?: string }) => {
      const url = String(input instanceof Request ? input.url : input).replace(/^https?:\/\/[^/]+/, '')
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = url.split('?')[0]
      ui.calls.push({ path, method, body: init?.body ? JSON.parse(init.body) : undefined })
      const r = new NextRequest(`http://localhost${url}`, {
        method,
        ...(init?.body !== undefined && { headers: { 'content-type': 'application/json' }, body: init.body }),
      })
      if (path === '/api/exercises/search' && method === 'GET')
        return ((await load('@/app/api/exercises/search/route')) as { GET: Handler }).GET(r)
      if (path === '/api/exercises/similar' && method === 'GET')
        return ((await load('@/app/api/exercises/similar/route')) as { GET: Handler }).GET(r)
      const replaceId = /^\/api\/exercises\/([^/]+)\/replace$/.exec(path)?.[1]
      if (replaceId && method === 'POST') {
        if (ui.failReplace > 0) {
          ui.failReplace--
          return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'content-type': 'application/json' } })
        }
        return ((await load('@/app/api/exercises/[exerciseId]/replace/route')) as { POST: Handler }).POST(r, {
          params: Promise.resolve({ exerciseId: replaceId }),
        })
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    })
  )
}

function browserBits() {
  const g = globalThis as Record<string, unknown>
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  if (!window.matchMedia)
    window.matchMedia = ((q: string) => ({
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
  window.alert = vi.fn()
}

// --- the two pickers -----------------------------------------------------------------
async function openProgramPicker() {
  browserBits()
  routedFetch()
  const { SwapExerciseWizard } = (await load('@/components/workout-logging/wizards/SwapExerciseWizard')) as {
    SwapExerciseWizard: ComponentType<Json>
  }
  const ex = await s.prisma.exercise.findUniqueOrThrow({
    where: { id: s.current.exerciseId },
    select: {
      name: true,
      exerciseDefinitionId: true,
      prescribedSets: { orderBy: { setNumber: 'asc' }, select: { setNumber: true, reps: true, rir: true, rpe: true, weight: true } },
    },
  })
  function Host() {
    const [open, setOpen] = useState(true)
    if (!open) return createElement('div', null, 'logger')
    return createElement(SwapExerciseWizard, {
      open: true,
      onOpenChange: (o: boolean) => {
        ui.openChange(o)
        setOpen(o)
      },
      currentExerciseId: s.current.exerciseId,
      currentExerciseName: ex.name,
      currentExerciseDefinitionId: ex.exerciseDefinitionId,
      currentPrescribedSets: ex.prescribedSets,
      onComplete: ui.complete,
    })
  }
  render(createElement(Host))
}

async function openFreestylePicker() {
  browserBits()
  routedFetch()
  const { AdHocExercisePickerModal } = (await load('@/components/adhoc/AdHocExercisePickerModal')) as {
    AdHocExercisePickerModal: ComponentType<Json>
  }
  render(
    createElement(AdHocExercisePickerModal, {
      mode: {
        kind: 'swap',
        replacingName: s.current.definitionName,
        targetId: 'adhoc-1',
        currentDefinitionId: s.d[s.current.definitionName],
      },
      onClose: ui.close,
      onConfirm: ui.confirm,
      isBusy: false,
      muscleBalanceSnapshot: { items: [], settings: { includeSecondary: false, secondaryWeight: 0.5 }, lookback: { totalEffectiveSets: 0 } },
    })
  )
}
const openPicker = (logger: State['logger']) => (logger === 'program logger' ? openProgramPicker() : openFreestylePicker())

const similarList = () => screen.findByRole('list', { name: 'Similar' }, { timeout: 4000 })
const noSimilarList = () => expect(screen.queryByRole('list', { name: 'Similar' })).toBeNull()
async function similarNames() {
  const list = await similarList()
  await waitFor(() => expect(within(list).queryAllByRole('listitem').length).toBeGreaterThan(0))
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.textContent ?? '')
}
const searchBox = () => screen.getByPlaceholderText(/search exercises/i) as HTMLInputElement
async function tapSimilar(name: string) {
  const list = await similarList()
  fireEvent.click(await within(list).findByText(name))
}
const isChecked = (el: HTMLElement) => el.getAttribute('aria-checked') === 'true' || (el as HTMLInputElement).checked === true
// work 216: the switches sit behind the summary line's "Change" (was: visible checkboxes).
const keepBox = () => screen.getByRole('switch', { name: /keep original sets/i })
const futureBox = () => screen.getByRole('switch', { name: /also swap in future weeks/i })
const openChange = () => fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
// The line is the text the Change/Done button is described by.
const summaryLine = () => {
  const button = screen.getByRole('button', { name: /^(change|done)$/i })
  return document.getElementById(button.getAttribute('aria-describedby') ?? '') as HTMLElement
}
const replaceCalls = () => ui.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/replace'))
async function swappedTo(exerciseId: string, name: string) {
  await waitFor(async () => expect((await shape(exerciseId)).exerciseDefinitionId).toBe(s.d[name]), { timeout: 6000 })
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Scenario, ScenarioOutline }) => {
  Background(({ Given, And }) => {
    Given('I am signed in', async () => {
      await freshState()
    })
    And('a workout is open in the logger', () => {
      expect(s.current.exerciseId).toBeTruthy()
    })
  })

  // --- Similar exercises first ---

  ScenarioOutline('The swap picker opens with similar exercises', ({ Given, And, When, Then }, variables) => {
    Given('I am in the <logger>', () => {
      s.logger = variables.logger as State['logger']
    })
    And('the current exercise is "Dumbbell Goblet Squat" (primary quads and glutes, dumbbell)', () => {
      expect(s.current.definitionName).toBe('Dumbbell Goblet Squat')
    })
    When('I choose "Swap this exercise" from the Edit menu or the workout plan', async () => {
      await openPicker(s.logger)
      s.similar = await similarNames()
    })
    Then('before I type anything, a "Similar" list shows up to 8 exercises', () => {
      expect(searchBox().value).toBe('')
      expect(s.similar.length).toBeGreaterThan(0)
      expect(s.similar.length).toBeLessThanOrEqual(8)
    })
    And('"Dumbbell Lunge" is among them', () => {
      expect(s.similar.some((t) => t.includes('Dumbbell Lunge'))).toBe(true)
    })
    And('the current exercise is not in the list', () => {
      expect(s.similar.some((t) => t.includes('Dumbbell Goblet Squat'))).toBe(false)
    })
  })

  Scenario('Similar is ranked by muscles, then equipment', ({ Given, Then, And }) => {
    const pos = (name: string) => s.similar.findIndex((t) => t.includes(name))
    Given('candidates that share the current exercise\'s primary muscles', async () => {
      await openProgramPicker()
      s.similar = await similarNames()
    })
    Then('exercises sharing more primary muscles rank higher', () => {
      // Barbell Back Squat shares both muscles; Dumbbell Step Up (same equipment), Hip Thrust and Leg Extension one each.
      expect(pos('Barbell Back Squat')).toBeGreaterThanOrEqual(0)
      expect(pos('Barbell Back Squat')).toBeLessThan(pos('Dumbbell Step Up'))
      expect(pos('Barbell Back Squat')).toBeLessThan(pos('Hip Thrust'))
      expect(pos('Barbell Back Squat')).toBeLessThan(pos('Leg Extension'))
    })
    And('among equal muscle matches, ones sharing the current equipment rank higher', () => {
      expect(pos('Dumbbell Lunge')).toBeLessThan(pos('Barbell Back Squat'))
      expect(pos('My Split Squat')).toBeLessThan(pos('Barbell Back Squat'))
      expect(pos('Dumbbell Step Up')).toBeLessThan(pos('Hip Thrust'))
    })
    And('among those, ones with the same movement pattern rank higher when both are tagged', () => {
      expect(pos('Dumbbell Front Squat')).toBe(0)
    })
    And('exercises sharing no primary muscle are not in the list', () => {
      expect(pos('Dumbbell Curl')).toBe(-1)
      expect(pos('Plank')).toBe(-1)
    })
  })

  Scenario('Similar only offers exercises I can use', ({ Then, And }) => {
    Then('the list holds library exercises and my own custom exercises', async () => {
      await openProgramPicker()
      s.similar = await similarNames()
      expect(s.similar.some((t) => t.includes('Dumbbell Lunge'))).toBe(true)
      expect(s.similar.some((t) => t.includes('My Split Squat'))).toBe(true)
    })
    And('never another user\'s custom exercise', () => {
      expect(s.similar.some((t) => t.includes('Their Goblet Variant'))).toBe(false)
    })
  })

  Scenario('Typing switches to normal search', ({ Given, When, Then, And }) => {
    // The program picker steps through; the last step repeats the round trip in the freestyle picker.
    const typeCurl = async () => {
      fireEvent.change(searchBox(), { target: { value: 'curl' } })
      expect(await screen.findByText('Dumbbell Curl', {}, { timeout: 4000 })).toBeTruthy()
      await waitFor(noSimilarList)
    }
    const clearAndSeeSimilar = async () => {
      fireEvent.change(searchBox(), { target: { value: '' } })
      expect((await similarNames()).some((t) => t.includes('Dumbbell Lunge'))).toBe(true)
    }
    Given('the "Similar" list is showing', async () => {
      await openProgramPicker()
      await similarNames()
    })
    When('I type in the search box', () => {
      fireEvent.change(searchBox(), { target: { value: 'curl' } })
    })
    Then('the normal search results replace the list', async () => {
      expect(await screen.findByText('Dumbbell Curl', {}, { timeout: 4000 })).toBeTruthy()
      await waitFor(noSimilarList)
    })
    And('clearing the search brings the "Similar" list back', async () => {
      await clearAndSeeSimilar()
      cleanup()
      await openFreestylePicker()
      await similarNames()
      await typeCurl()
      await clearAndSeeSimilar()
    })
  })

  Scenario('An untagged exercise still opens a usable picker', ({ Given, When, Then, And }) => {
    Given('the current exercise has no primary muscles', async () => {
      await plankCurrent()
    })
    When('I open the swap picker', () => {})
    Then('there is no "Similar" list', async () => {
      for (const logger of ['program logger', 'freestyle logger'] as const) {
        cleanup()
        await openPicker(logger)
        // Let the search (and any similar request) settle before looking.
        await screen.findByText('Dumbbell Lunge', {}, { timeout: 4000 })
        await sleep(100)
        noSimilarList()
      }
    })
    And('the normal search shows as it does today', async () => {
      // The freestyle picker is on screen: the preloaded library list, nothing typed.
      expect(searchBox().value).toBe('')
      expect(screen.getByText('Hip Thrust')).toBeTruthy()
      expect(screen.getByText('Dumbbell Curl')).toBeTruthy()
    })
  })

  // --- Program swap: pick means done ---

  Scenario('Picking swaps right away and keeps the program\'s sets', ({ Given, And, When, Then }) => {
    Given('I am in the program logger', () => {
      s.logger = 'program logger'
    })
    And('the current exercise is prescribed 3 sets of 8 at RIR 2', async () => {
      expect((await shape(s.current.exerciseId)).prescribedSets).toEqual(sets(3, '8', 2))
    })
    When('I open the swap picker and tap "Dumbbell Lunge"', async () => {
      await openProgramPicker()
      await tapSimilar('Dumbbell Lunge')
    })
    Then('the exercise is replaced with "Dumbbell Lunge" without any further screen', async () => {
      // No further tap: the swap lands on its own.
      await swappedTo(s.current.exerciseId, 'Dumbbell Lunge')
      expect(replaceCalls()).toHaveLength(1)
      expect((await shape(s.current.exerciseId)).name).toBe('Dumbbell Lunge')
    })
    And('it keeps 3 sets of 8 at RIR 2', async () => {
      expect((await shape(s.current.exerciseId)).prescribedSets).toEqual(sets(3, '8', 2))
    })
    And('I am back in the logger on the new exercise', async () => {
      await waitFor(() => expect(ui.complete).toHaveBeenCalledTimes(1), { timeout: 6000 })
      await waitFor(() => expect(ui.openChange).toHaveBeenCalledWith(false), { timeout: 6000 })
      expect(screen.getByText('logger')).toBeTruthy()
      // Only this week changed.
      expect((await shape(s.goblet[2])).exerciseDefinitionId).toBe(s.d['Dumbbell Goblet Squat'])
    })
  })

  Scenario('The picker shows what will be kept in one line', ({ Given, When, Then, And }) => {
    Given('I am in the program logger', () => {
      s.logger = 'program logger'
    })
    When('I open the swap picker', async () => {
      await openProgramPicker()
      await similarList()
    })
    Then('one line reads "Keeps 3 × 8 @ RIR 2 · This week only" with a "Change" button', () => {
      expect(summaryLine().textContent ?? '').toMatch(/Keeps 3\s*[×x]\s*8\s*@\s*RIR\s*2\s*·\s*This week only/i)
      expect(screen.getByRole('button', { name: /^change$/i })).toBeTruthy()
      // Closed: the switches are not on offer yet.
      expect(screen.queryAllByRole('switch')).toHaveLength(0)
    })
    And('tapping "Change" shows "Keep original sets" (on) and "Also swap in future weeks" (off) as the app\'s switches', () => {
      openChange()
      expect(isChecked(keepBox())).toBe(true)
      expect(isChecked(futureBox())).toBe(false)
    })
    And('the line updates to match what I choose', () => {
      fireEvent.click(futureBox())
      expect(summaryLine().textContent ?? '').toMatch(/This and future weeks/i)
      fireEvent.click(keepBox())
      expect(summaryLine().textContent ?? '').not.toMatch(/Keeps 3/i)
      fireEvent.click(keepBox())
      fireEvent.click(futureBox())
      expect(summaryLine().textContent ?? '').toMatch(/Keeps 3\s*[×x]\s*8.*This week only/i)
    })
  })

  Scenario('The picker opens on similar exercises, not filters', ({ When, Then, And }) => {
    When('I open the swap picker', async () => {
      await openProgramPicker()
      await similarList()
    })
    Then('the muscle and equipment filters are collapsed behind one filter button next to search', async () => {
      for (const logger of ['program logger', 'freestyle logger'] as const) {
        if (logger === 'freestyle logger') {
          cleanup()
          await openFreestylePicker()
          await similarList()
        }
        const filters = screen.getByRole('button', { name: 'Filters' })
        expect(filters.getAttribute('aria-expanded')).toBe('false')
        expect(screen.queryByRole('button', { name: 'All Muscle Groups' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'All Equipment' })).toBeNull()
        // Next to search: the same row as the search box.
        expect(filters.parentElement?.contains(searchBox())).toBe(true)
        fireEvent.click(filters)
        expect(screen.getByRole('button', { name: 'All Muscle Groups' })).toBeTruthy()
        expect(screen.getByRole('button', { name: 'All Equipment' })).toBeTruthy()
      }
    })
    And('Cancel is an X in the header', async () => {
      // Freestyle is on screen: one Cancel, above the search box, and it closes the picker.
      const cancel = screen.getByRole('button', { name: 'Cancel' })
      expect(cancel.compareDocumentPosition(searchBox()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      fireEvent.click(cancel)
      expect(ui.close).toHaveBeenCalledTimes(1)
      cleanup()
      await openProgramPicker()
      await similarList()
      const programCancel = screen.getByRole('button', { name: 'Cancel' })
      expect(programCancel.compareDocumentPosition(searchBox()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      fireEvent.click(programCancel)
      expect(ui.openChange).toHaveBeenCalledWith(false)
    })
    And('at least 6 similar exercises fit on a phone screen', async () => {
      // jsdom has no layout; the phone-width screenshots (assets/216) show the rows. Here: above the
      // Similar list sit only the header, the summary line and the search row, nothing expanded.
      cleanup()
      await openProgramPicker()
      await similarList()
      expect(screen.queryAllByRole('switch')).toHaveLength(0)
      expect(screen.queryByRole('button', { name: 'All Muscle Groups' })).toBeNull()
      expect(screen.queryByRole('list', { name: 'More like this' })).toBeNull()
    })
  })

  Scenario('More like this', ({ Given, When, Then, And }) => {
    Given('the "Similar" list is showing', async () => {
      // Three more two-muscle dumbbell exercises and a glute bridge push Dumbbell Step Up out of the top 8.
      await makeDef('Dumbbell Split Squat', ['quads', 'glutes'], ['dumbbell'], null)
      await makeDef('Goblet Box Squat', ['quads', 'glutes'], ['dumbbell'], null)
      await makeDef('Dumbbell Reverse Lunge', ['quads', 'glutes'], ['dumbbell'], null)
      await makeDef('Dumbbell Glute Bridge', ['glutes'], ['dumbbell'], null)
      await openProgramPicker()
      s.similar = await similarNames()
      expect(s.similar).toHaveLength(8)
      expect(s.similar.some((t) => t.includes('Dumbbell Step Up'))).toBe(false)
    })
    When('I tap "More like this"', () => {
      fireEvent.click(screen.getByRole('button', { name: /more like this/i }))
    })
    Then('chips for the current exercise\'s muscles and equipment appear', () => {
      for (const name of ['Quads', 'Glutes', 'Dumbbell']) {
        expect(screen.getByRole('button', { name, pressed: true })).toBeTruthy()
      }
    })
    And('the list below shows more exercises matching the chips I leave on', async () => {
      const moreNames = async () => {
        const list = await screen.findByRole('list', { name: 'More like this' }, { timeout: 4000 })
        return within(list).getAllByRole('listitem').map((li) => li.textContent ?? '')
      }
      // All on: quads or glutes, with a dumbbell, not already in Similar.
      let names = await moreNames()
      expect(names.some((t) => t.includes('Dumbbell Step Up'))).toBe(true)
      expect(names.some((t) => t.includes('Leg Extension') || t.includes('Hip Thrust'))).toBe(false)
      expect(names.some((t) => t.includes('Dumbbell Curl'))).toBe(false)
      expect(names.some((t) => s.similar.some((sim) => t === sim))).toBe(false)
      // Dumbbell off: any equipment, still quads or glutes.
      fireEvent.click(screen.getByRole('button', { name: 'Dumbbell', pressed: true }))
      await waitFor(async () => {
        names = await moreNames()
        expect(names.some((t) => t.includes('Leg Extension'))).toBe(true)
      }, { timeout: 4000 })
      expect(names.some((t) => t.includes('Hip Thrust'))).toBe(true)
      expect(names.some((t) => t.includes('Dumbbell Step Up'))).toBe(true)
      expect(names.some((t) => t.includes('Dumbbell Curl') || t.includes('Plank'))).toBe(false)
      // A row there swaps like a Similar one.
      const list = await screen.findByRole('list', { name: 'More like this' })
      fireEvent.click(within(list).getByText('Leg Extension'))
      await swappedTo(s.current.exerciseId, 'Leg Extension')
      expect((await shape(s.current.exerciseId)).prescribedSets).toEqual(sets(3, '8', 2))
    })
  })

  Scenario('Unchecking "Keep original sets" opens the set editor', ({ Given, When, Then, And }) => {
    Given('I turned off "Keep original sets"', async () => {
      await openProgramPicker()
      await similarList()
      openChange()
      fireEvent.click(keepBox())
      expect(isChecked(keepBox())).toBe(false)
    })
    When('I tap an exercise', async () => {
      await tapSimilar('Dumbbell Lunge')
    })
    Then('the set editor opens prefilled with the original sets', async () => {
      expect(await screen.findByText(/add set/i, {}, { timeout: 4000 })).toBeTruthy()
      // Three set rows, each showing 8 reps; nothing has been swapped yet.
      expect(screen.getAllByRole('button', { name: '8' })).toHaveLength(3)
      expect(replaceCalls()).toHaveLength(0)
      expect((await shape(s.current.exerciseId)).exerciseDefinitionId).toBe(s.d['Dumbbell Goblet Squat'])
    })
    And('saving it swaps the exercise with the edited sets', async () => {
      fireEvent.click(screen.getByText(/add set/i))
      await waitFor(() => expect(screen.getAllByRole('button', { name: '8' })).toHaveLength(4))
      fireEvent.click(screen.getByRole('button', { name: /^(save|swap)\b/i }))
      await swappedTo(s.current.exerciseId, 'Dumbbell Lunge')
      expect((await shape(s.current.exerciseId)).prescribedSets).toEqual(sets(4, '8', 2))
      await waitFor(() => expect(ui.complete).toHaveBeenCalledTimes(1), { timeout: 6000 })
    })
  })

  Scenario('Also swap in future weeks', ({ Given, When, Then, And }) => {
    Given('I turned on "Also swap in future weeks"', async () => {
      await openProgramPicker()
      await similarList()
      openChange()
      fireEvent.click(futureBox())
      expect(isChecked(futureBox())).toBe(true)
      expect(isChecked(keepBox())).toBe(true)
    })
    When('I tap an exercise', async () => {
      await tapSimilar('Dumbbell Lunge')
    })
    Then('this exercise and the same exercise in later weeks of the program are replaced', async () => {
      await swappedTo(s.goblet[1], 'Dumbbell Lunge')
      await swappedTo(s.goblet[2], 'Dumbbell Lunge')
      // Earlier weeks and other exercises stay.
      expect((await shape(s.goblet[0])).exerciseDefinitionId).toBe(s.d['Dumbbell Goblet Squat'])
      expect((await shape(s.legExtension)).exerciseDefinitionId).toBe(s.d['Leg Extension'])
    })
    And('each keeps its own prescribed sets', async () => {
      expect((await shape(s.goblet[0])).prescribedSets).toEqual(sets(4, '6', 1))
      expect((await shape(s.goblet[1])).prescribedSets).toEqual(sets(3, '8', 2))
      expect((await shape(s.goblet[2])).prescribedSets).toEqual(sets(5, '5', 3))
    })
  })

  Scenario('Logged sets are kept', ({ Given, When, Then }) => {
    Given('I already logged sets on the current exercise', async () => {
      const ex = await s.prisma.exercise.findUniqueOrThrow({ where: { id: s.current.exerciseId }, select: { workoutId: true } })
      const completion = await s.prisma.workoutCompletion.create({ data: { workoutId: ex.workoutId, userId: s.me, status: 'draft' } })
      s.completionId = completion.id
      await s.prisma.loggedSet.createMany({
        data: [1, 2].map((setNumber) => ({ setNumber, reps: 8, weight: 50, exerciseId: s.current.exerciseId, completionId: completion.id, userId: s.me })),
      })
    })
    When('I swap it', async () => {
      await openProgramPicker()
      await tapSimilar('Dumbbell Lunge')
      await swappedTo(s.current.exerciseId, 'Dumbbell Lunge')
    })
    Then('the logged sets stay with the workout as today', async () => {
      const logged = await s.prisma.loggedSet.findMany({ where: { completionId: s.completionId }, orderBy: { setNumber: 'asc' } })
      expect(logged.map((l) => [l.setNumber, l.reps, l.weight, l.exerciseId])).toEqual([
        [1, 8, 50, s.current.exerciseId],
        [2, 8, 50, s.current.exerciseId],
      ])
    })
  })

  Scenario('A failed swap leaves the workout unchanged', ({ Given, When, Then, And }) => {
    Given('the swap request fails', () => {
      ui.failReplace = 1
    })
    When('I tap an exercise', async () => {
      await openProgramPicker()
      await tapSimilar('Dumbbell Lunge')
      await waitFor(() => expect(replaceCalls()).toHaveLength(1), { timeout: 4000 })
    })
    Then('I see an error that says the swap didn\'t happen', async () => {
      const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
      expect(alert.textContent ?? '').toMatch(/swap/i)
      expect(alert.textContent ?? '').toMatch(/(didn.?t|did not|wasn.?t|was not|couldn.?t|could not|failed)\b/i)
    })
    And('the original exercise is still there', async () => {
      expect(await shape(s.current.exerciseId)).toEqual({
        exerciseDefinitionId: s.d['Dumbbell Goblet Squat'],
        name: 'Dumbbell Goblet Squat',
        prescribedSets: sets(3, '8', 2),
      })
      expect(ui.complete).not.toHaveBeenCalled()
    })
    And('I can try again', async () => {
      // The picker does not close itself after a moment.
      await sleep(2500)
      expect(ui.openChange).not.toHaveBeenCalledWith(false)
      await tapSimilar('Dumbbell Lunge')
      await swappedTo(s.current.exerciseId, 'Dumbbell Lunge')
      expect((await shape(s.current.exerciseId)).prescribedSets).toEqual(sets(3, '8', 2))
      await waitFor(() => expect(ui.complete).toHaveBeenCalledTimes(1), { timeout: 6000 })
    })
  })

  // --- Freestyle ---

  Scenario('Freestyle swap stays one tap', ({ Given, When, Then }) => {
    Given('I am in the freestyle logger', () => {
      s.logger = 'freestyle logger'
    })
    When('I open the swap picker and tap a "Similar" exercise', async () => {
      await openFreestylePicker()
      await tapSimilar('Dumbbell Lunge')
    })
    Then('the exercise is swapped as today, with no extra step', async () => {
      await waitFor(() => expect(ui.confirm).toHaveBeenCalledTimes(1))
      const [defs] = ui.confirm.mock.calls[0] as unknown as [Array<{ id: string; name: string }>]
      expect(defs).toHaveLength(1)
      expect(defs[0]).toMatchObject({ id: s.d['Dumbbell Lunge'], name: 'Dumbbell Lunge' })
      expect(ui.close).not.toHaveBeenCalled()
    })
  })
})
