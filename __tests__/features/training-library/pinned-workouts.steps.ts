/**
 * Step definitions for features/training-library/pinned-workouts.feature.
 * Codes strictly against initiatives/training-library/docs/spec.md
 * ("TL4 Pinned workouts").
 *
 * Schema the tests expect (the implementer migrates it):
 *   SavedWorkout.pinnedAt  DateTime?                       (column "pinnedAt")
 *   @@index([userId, pinnedAt(sort: Desc)])
 * The tests read and write the column with raw SQL, so this file type-checks
 * before the Prisma client is regenerated.
 *
 * Seams (existing files change; nothing new except the toggles):
 *
 *   app/api/workouts/saved/[id]/route.ts   PATCH
 *     body { pinned?: boolean, name?, notes? }, any of them; pinned alone is valid.
 *     pinned:true sets pinnedAt = now only if it is null (pinning again keeps it);
 *     pinned:false clears it; a non-boolean pinned (string, number, null) is 400
 *     with no write. 404 for an unknown id AND for another user's id (today the
 *     route answers 403 for another user's: it changes to 404).
 *     200 { saved: { ..., pinnedAt: ISO string | null } }.
 *   app/api/workouts/saved/route.ts   GET: each item has pinnedAt (ISO | null);
 *     the order is unchanged (lastUsedAt desc nulls last, createdAt desc).
 *   lib/training/home.ts   getTrainingHome(userId) gains
 *     pinned: [{ id, name, exerciseCount, pinnedAt: Date }]
 *     the user's own pinned workouts, pinnedAt desc, at most 5, [] when none.
 *   components/training/TrainingHome.tsx   renders home.pinned (see
 *     __tests__/components/pinned-workouts-view.test.tsx).
 *   components/features/saved-workouts/SavedWorkoutsList.tsx (rows, detail dialog)
 *     the pin toggle (see the same view test).
 *
 * Here the UI talks to the real route handlers: fetch is stubbed to call them.
 * vitest-cucumber runs every step as its own test and Testing Library cleans
 * up between tests, so a When step records what to render in `pending` and
 * each Then/And step renders it again with shown().
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))
const ui = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null },
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => null,
  workoutActionLimiter: {},
  destructiveOpLimiter: {},
  programManagementLimiter: {},
}))
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: ui.push, refresh: ui.refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/training',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ success: ui.toastSuccess, error: ui.toastError, info: vi.fn(), warning: vi.fn() }),
  ToastProvider: ({ children }: { children: unknown }) => children,
}))

const feature = await loadFeature('features/training-library/pinned-workouts.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)

interface Pinned {
  id: string
  name: string
  exerciseCount: number
  pinnedAt: Date
}
interface Home {
  upNext: unknown
  pinned: Pinned[]
  recent: Array<{ name: string }>
  currentProgram: unknown
}
interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  saved: Record<string, { id: string; name: string }>
  defId: string
  last?: { status: number; body: Record<string, unknown> }
  pushed?: unknown[]
}
let s: State
let pending: (() => Promise<unknown>) | null = null
const shown = async () => {
  await (pending as () => Promise<unknown>)()
}

const MIN = 60_000
const ago = (minutes: number) => new Date(Date.now() - minutes * MIN)

async function seedSaved(name: string, exercises = 2, userId = s.userId, createdMinutesAgo = 100) {
  const data = Array.from({ length: exercises }, (_, i) => ({
    name: `Lift ${i + 1}`,
    exerciseDefinitionId: s.defId,
    order: i + 1,
    notes: null,
    exerciseGroup: null,
    sets: [{ setNumber: 1, reps: '8', rir: 2, rpe: null, isWarmup: false }],
  }))
  const row = await s.prisma.savedWorkout.create({
    data: { userId, name, workoutData: data as never, exerciseCount: exercises, createdAt: ago(createdMinutesAgo) },
  })
  if (userId === s.userId) s.saved[name] = { id: row.id, name }
  return row
}
const setPinned = (id: string, at: Date | null) =>
  s.prisma.$executeRaw`UPDATE "SavedWorkout" SET "pinnedAt" = ${at} WHERE id = ${id}`
async function pinnedAtOf(id: string): Promise<Date | null> {
  const rows = await s.prisma.$queryRaw<Array<{ pinnedAt: Date | null }>>`SELECT "pinnedAt" FROM "SavedWorkout" WHERE id = ${id}`
  return rows[0]?.pinnedAt ?? null
}
async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const user = await createTestUser()
  const other = await createTestUser()
  auth.userId = user.id
  const def = await createTestExerciseDefinition(prisma, { name: 'Back Squat' })
  return { prisma, userId: user.id, otherUserId: other.id, saved: {}, defId: def.id }
}
async function withThree() {
  s = await freshState()
  await seedSaved('Upper Body', 5, s.userId, 300)
  await seedSaved('Quick Machines', 3, s.userId, 200)
  await seedSaved('Mobility', 1, s.userId, 100)
}

// ---------------------------------------------------------------------------
// Routes, called directly or through a stubbed fetch
// ---------------------------------------------------------------------------
type IdRoute = {
  GET: (r: NextRequest, c: { params: Promise<{ id: string }> }) => Promise<Response>
  PATCH: (r: NextRequest, c: { params: Promise<{ id: string }> }) => Promise<Response>
}
const idRoute = async () => (await load('@/app/api/workouts/saved/[id]/route')) as IdRoute
const listRoute = async () => (await load('@/app/api/workouts/saved/route')) as { GET: (r: NextRequest) => Promise<Response> }
const startRoute = async () =>
  (await load('@/app/api/workouts/saved/[id]/start/route')) as {
    POST: (r: NextRequest, c: { params: Promise<{ id: string }> }) => Promise<Response>
  }

async function patch(id: string, body: unknown, userId = s.userId) {
  auth.userId = userId
  const route = await idRoute()
  const res = await route.PATCH(
    new NextRequest(`http://localhost/api/workouts/saved/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
  auth.userId = s.userId
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}
async function list() {
  const route = await listRoute()
  const res = await route.GET(new NextRequest('http://localhost/api/workouts/saved'))
  return (await res.json()) as { saved: Array<Record<string, unknown>> }
}
async function getHome(userId = s.userId): Promise<Home> {
  const mod = (await load('@/lib/training/home')) as { getTrainingHome: (u: string) => Promise<Home> }
  return mod.getTrainingHome(userId)
}

/** fetch that runs the real saved-workout route handlers. */
function routedFetch() {
  const calls: Array<{ url: string; method: string }> = []
  const START = /^\/api\/workouts\/saved\/([^/]+)\/start$/
  const ONE = /^\/api\/workouts\/saved\/([^/?]+)$/
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method })
      const req = (extra: Record<string, unknown> = {}) => new NextRequest(`http://localhost${url}`, { method, ...extra })
      const startId = START.exec(url)?.[1]
      const oneId = ONE.exec(url)?.[1]
      let res: Response | null = null
      if (method === 'POST' && startId) {
        res = await (await startRoute()).POST(req(), { params: Promise.resolve({ id: startId }) })
      } else if (method === 'PATCH' && oneId) {
        res = await (await idRoute()).PATCH(req({ headers: { 'content-type': 'application/json' }, body: init?.body }), {
          params: Promise.resolve({ id: oneId }),
        })
      } else if (method === 'GET' && oneId) {
        res = await (await idRoute()).GET(req(), { params: Promise.resolve({ id: oneId }) })
      } else if (method === 'GET' && url.startsWith('/api/workouts/saved')) {
        res = await (await listRoute()).GET(req())
      }
      if (!res) return { ok: true, status: 200, json: async () => ({}) }
      const r = res
      return { ok: r.ok, status: r.status, json: () => r.json() }
    })
  )
  return calls
}

async function renderList() {
  cleanup()
  const mod = (await load('@/components/features/saved-workouts/SavedWorkoutsList')) as { default: ComponentType }
  render(createElement(mod.default))
}
async function renderHome() {
  cleanup()
  const home = await getHome()
  const mod = (await load('@/components/training/TrainingHome')) as { default: ComponentType<{ home: Home }> }
  render(createElement(mod.default, { home }))
  return home
}
const rowOf = (name: string) => screen.getByRole('button', { name: `View ${name}` }).closest('li') as HTMLElement
const pinButton = (name: string) => within(rowOf(name)).getByRole('button', { name: /^pin\b/i })
const unpinButton = (name: string) => within(rowOf(name)).getByRole('button', { name: /^unpin\b/i })
const pinnedRowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement
const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

beforeEach(() => {
  ui.push.mockClear()
  ui.refresh.mockClear()
  ui.toastError.mockClear()
  ui.toastSuccess.mockClear()
  routedFetch()
})

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given }) => {
    Given('the user has saved workouts "Upper Body", "Quick Machines" and "Mobility"', async () => {
      await withThree()
      expect(await s.prisma.savedWorkout.count({ where: { userId: s.userId } })).toBe(3)
    })
  })

  Rule('Workouts are pinned from My Workouts', ({ RuleScenario }) => {
    RuleScenario('Pinning a workout', ({ When, Then, And }) => {
      When('the user pins "Upper Body" in My Workouts', async () => {
        await renderList()
        await screen.findByRole('button', { name: 'View Upper Body' })
        fireEvent.click(pinButton('Upper Body'))
        await waitFor(async () => expect(await pinnedAtOf(s.saved['Upper Body'].id)).not.toBeNull())
      })
      Then('"Upper Body" is marked as pinned', async () => {
        await renderList()
        await screen.findByRole('button', { name: 'View Upper Body' })
        expect(unpinButton('Upper Body').getAttribute('aria-pressed')).toBe('true')
        expect(within(rowOf('Upper Body')).getByText(/^pinned$/i)).toBeTruthy()
        expect(within(rowOf('Mobility')).queryByText(/^pinned$/i)).toBeNull()
      })
      And('it appears under Pinned Workouts on Training', async () => {
        const home = await renderHome()
        expect(home.pinned.map((p) => p.name)).toEqual(['Upper Body'])
        expect(screen.getByText(/^pinned workouts$/i)).toBeTruthy()
        expect(screen.getByText('Upper Body')).toBeTruthy()
      })
    })

    RuleScenario('Unpinning a workout', ({ Given, When, Then, And }) => {
      Given('"Upper Body" is pinned', async () => {
        await setPinned(s.saved['Upper Body'].id, ago(10))
      })
      When('the user unpins "Upper Body"', async () => {
        await renderList()
        await screen.findByRole('button', { name: 'View Upper Body' })
        fireEvent.click(unpinButton('Upper Body'))
        await waitFor(async () => expect(await pinnedAtOf(s.saved['Upper Body'].id)).toBeNull())
      })
      Then('it is no longer marked as pinned', async () => {
        await renderList()
        await screen.findByRole('button', { name: 'View Upper Body' })
        expect(pinButton('Upper Body').getAttribute('aria-pressed')).toBe('false')
        expect(within(rowOf('Upper Body')).queryByText(/^pinned$/i)).toBeNull()
      })
      And('Training has no Pinned Workouts section', async () => {
        const home = await renderHome()
        expect(home.pinned).toEqual([])
        expect(screen.queryByText(/pinned workouts/i)).toBeNull()
      })
    })

    RuleScenario('Pinning again keeps its place', ({ Given, When, Then }) => {
      Given('"Upper Body" was pinned before "Mobility"', async () => {
        await setPinned(s.saved['Upper Body'].id, ago(60))
        await setPinned(s.saved.Mobility.id, ago(30))
      })
      When('the user pins "Upper Body" again', async () => {
        s.last = await patch(s.saved['Upper Body'].id, { pinned: true })
        expect(s.last.status).toBe(200)
      })
      Then('"Mobility" is still listed before "Upper Body" on Training', async () => {
        const home = await renderHome()
        expect(home.pinned.map((p) => p.name)).toEqual(['Mobility', 'Upper Body'])
        const names = screen.getAllByText(/^(Mobility|Upper Body)$/).map((e) => e.textContent)
        expect(names).toEqual(['Mobility', 'Upper Body'])
      })
    })

    RuleScenario("Another user's workout can't be pinned", ({ When, Then }) => {
      When("the user pins another user's saved workout", async () => {
        const theirs = await seedSaved('Theirs', 2, s.otherUserId)
        s.last = await patch(theirs.id, { pinned: true })
        s.saved.Theirs = { id: theirs.id, name: 'Theirs' }
      })
      Then('it is not found', async () => {
        expect(s.last?.status).toBe(404)
        expect(await pinnedAtOf(s.saved.Theirs.id)).toBeNull()
      })
    })
  })

  Rule('Training shows the newest pins', ({ RuleScenario }) => {
    RuleScenario('The five newest pins are shown with Start', ({ Given, When, Then, And }) => {
      Given('the user has pinned 6 workouts', async () => {
        await seedSaved('Chest Day', 4)
        await seedSaved('Leg Day', 6)
        await seedSaved('Arm Day', 2)
        const order = ['Upper Body', 'Quick Machines', 'Mobility', 'Chest Day', 'Leg Day', 'Arm Day']
        for (const [i, name] of order.entries()) await setPinned(s.saved[name].id, ago(60 - i * 5))
      })
      When('the user opens Training', async () => {
        pending = renderHome
        await shown()
      })
      Then('Pinned Workouts shows the 5 most recently pinned, newest first, each with its exercise count and Start', async () => {
        const home = await renderHome()
        expect(home.pinned.map((p) => p.name)).toEqual(['Arm Day', 'Leg Day', 'Chest Day', 'Mobility', 'Quick Machines'])
        expect(home.pinned.map((p) => p.exerciseCount)).toEqual([2, 6, 4, 1, 3])
        const names = ['Arm Day', 'Leg Day', 'Chest Day', 'Mobility', 'Quick Machines']
        const texts = names.map((n) => within(pinnedRowOf(n)).getByText(/exercises?$/).textContent)
        expect(texts).toEqual(['2 exercises', '6 exercises', '4 exercises', '1 exercise', '3 exercises'])
        for (const n of names) expect(within(pinnedRowOf(n)).getByRole('button', { name: /start/i })).toBeTruthy()
        expect(screen.queryByText('Upper Body')).toBeNull()
      })
      And('"See all" opens My Workouts', async () => {
        await shown()
        const link = screen.getByRole('link', { name: /see all/i })
        const url = new URL(link.getAttribute('href') as string, 'http://x')
        expect([url.pathname, url.searchParams.get('type')]).toEqual(['/library', 'workouts'])
      })
    })

    RuleScenario('Starting a pinned workout', ({ Given, When, Then }) => {
      Given('"Quick Machines" is pinned', async () => {
        await setPinned(s.saved['Quick Machines'].id, ago(5))
      })
      When('the user starts "Quick Machines" from Training', async () => {
        await renderHome()
        fireEvent.click(within(pinnedRowOf('Quick Machines')).getByRole('button', { name: /start/i }))
        await waitFor(() => expect(ui.push).toHaveBeenCalled())
        s.pushed = ui.push.mock.calls.map((c) => c[0])
      })
      Then('a session from "Quick Machines" is in progress', async () => {
        const drafts = await s.prisma.workoutCompletion.findMany({ where: { userId: s.userId, status: 'draft' } })
        expect(drafts).toHaveLength(1)
        expect(drafts[0].savedWorkoutId).toBe(s.saved['Quick Machines'].id)
        expect(drafts[0].name).toBe('Quick Machines')
        expect(drafts[0].workoutId).toBeNull()
        expect(s.pushed).toEqual([`/training/adhoc/${drafts[0].id}`])
      })
    })

    RuleScenario('Start is refused while another session is in progress', ({ Given, When, Then }) => {
      Given('"Quick Machines" is pinned and the user has a session in progress', async () => {
        await setPinned(s.saved['Quick Machines'].id, ago(5))
        await s.prisma.workoutCompletion.create({
          data: { userId: s.userId, status: 'draft', isAdHoc: true, name: 'Leg Day', startedAt: new Date() },
        })
      })
      When('the user starts "Quick Machines" from Training', async () => {
        await renderHome()
        fireEvent.click(within(pinnedRowOf('Quick Machines')).getByRole('button', { name: /start/i }))
        expect(await screen.findByText(/finish your current workout before starting a new one/i)).toBeTruthy()
        s.pushed = ui.push.mock.calls.map((c) => c[0])
      })
      Then('they are told a session is already in progress', async () => {
        expect(s.pushed).toEqual([])
        expect(await s.prisma.workoutCompletion.count({ where: { userId: s.userId, status: 'draft' } })).toBe(1)
        expect(await s.prisma.workoutCompletion.count({ where: { savedWorkoutId: s.saved['Quick Machines'].id } })).toBe(0)
      })
    })

    RuleScenario('Sections keep their order', ({ Given, When, Then }) => {
      Given('the user has an active program, a pinned workout and a completed session', async () => {
        const program = await s.prisma.program.create({
          data: {
            name: 'Machine Starter',
            userId: s.userId,
            isActive: true,
            weeks: {
              create: [1, 2].map((w) => ({
                weekNumber: w,
                userId: s.userId,
                workouts: { create: [1, 2].map((d) => ({ name: `W${w}D${d}`, dayNumber: d, userId: s.userId })) },
              })),
            },
          },
          include: { weeks: { include: { workouts: true } } },
        })
        const first = program.weeks.find((w) => w.weekNumber === 1)?.workouts.find((x) => x.dayNumber === 1)
        await s.prisma.workoutCompletion.create({
          data: { userId: s.userId, workoutId: first?.id, status: 'completed', completedAt: ago(1000) },
        })
        await setPinned(s.saved.Mobility.id, ago(5))
      })
      When('the user opens Training', async () => {
        pending = renderHome
        await shown()
      })
      Then('the sections are Up Next, Pinned Workouts, Recent Workouts and Current Program, in that order', async () => {
        await shown()
        expect(headings()).toEqual(['Up Next', 'Pinned Workouts', 'Recent Workouts', 'Current Program'])
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Edges: the PATCH route
// ---------------------------------------------------------------------------
describe('pinned: PATCH /api/workouts/saved/[id]', () => {
  beforeEach(async () => {
    await withThree()
  })
  afterEach(cleanup)
  const id = (n: string) => s.saved[n].id

  it('pinning sets pinnedAt to now and returns it', async () => {
    const before = Date.now()
    const { status, body } = await patch(id('Upper Body'), { pinned: true })
    expect(status).toBe(200)
    const at = await pinnedAtOf(id('Upper Body'))
    expect(at).not.toBeNull()
    expect((at as Date).getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect((at as Date).getTime()).toBeLessThanOrEqual(Date.now() + 1000)
    const saved = body.saved as { pinnedAt: string; id: string; name: string }
    expect(saved.id).toBe(id('Upper Body'))
    expect(new Date(saved.pinnedAt).getTime()).toBe((at as Date).getTime())
  })

  it('pinning again keeps the original pinnedAt, in the database and in the response', async () => {
    const original = ago(120)
    await setPinned(id('Upper Body'), original)
    const { status, body } = await patch(id('Upper Body'), { pinned: true })
    expect(status).toBe(200)
    expect(((await pinnedAtOf(id('Upper Body'))) as Date).getTime()).toBe(original.getTime())
    expect(new Date((body.saved as { pinnedAt: string }).pinnedAt).getTime()).toBe(original.getTime())
  })

  it('pinned:false clears pinnedAt and the response says null', async () => {
    await setPinned(id('Upper Body'), ago(5))
    const { status, body } = await patch(id('Upper Body'), { pinned: false })
    expect(status).toBe(200)
    expect(await pinnedAtOf(id('Upper Body'))).toBeNull()
    expect((body.saved as { pinnedAt: unknown }).pinnedAt).toBeNull()
  })

  it('pinned:false on a workout that is not pinned is fine', async () => {
    const { status, body } = await patch(id('Mobility'), { pinned: false })
    expect(status).toBe(200)
    expect((body.saved as { pinnedAt: unknown }).pinnedAt).toBeNull()
  })

  it.each([['"true"', 'true'], ['1', 1], ['null', null], ['an object', {}], ['an array', [true]]])(
    'a non-boolean pinned (%s) is 400 and writes nothing',
    async (_n, value) => {
      const { status } = await patch(id('Upper Body'), { pinned: value })
      expect(status).toBe(400)
      expect(await pinnedAtOf(id('Upper Body'))).toBeNull()
    }
  )

  it('a bad pinned is refused even alongside a valid rename, and nothing changes', async () => {
    const { status } = await patch(id('Upper Body'), { name: 'Renamed', pinned: 'yes' })
    expect(status).toBe(400)
    const row = await s.prisma.savedWorkout.findUnique({ where: { id: id('Upper Body') } })
    expect(row?.name).toBe('Upper Body')
  })

  it('renaming and pinning in one request does both', async () => {
    const { status, body } = await patch(id('Upper Body'), { name: 'Upper Body A', notes: 'Push first', pinned: true })
    expect(status).toBe(200)
    const row = await s.prisma.savedWorkout.findUnique({ where: { id: id('Upper Body') } })
    expect([row?.name, row?.notes]).toEqual(['Upper Body A', 'Push first'])
    expect(await pinnedAtOf(id('Upper Body'))).not.toBeNull()
    expect((body.saved as { name: string }).name).toBe('Upper Body A')
  })

  it('renaming alone does not touch the pin', async () => {
    const at = ago(15)
    await setPinned(id('Upper Body'), at)
    const { status } = await patch(id('Upper Body'), { name: 'Renamed' })
    expect(status).toBe(200)
    expect(((await pinnedAtOf(id('Upper Body'))) as Date).getTime()).toBe(at.getTime())
  })

  it('an empty body is still 400', async () => {
    expect((await patch(id('Upper Body'), {})).status).toBe(400)
  })

  it('pinning leaves name, notes and the plan alone', async () => {
    await s.prisma.savedWorkout.update({ where: { id: id('Quick Machines') }, data: { notes: 'Keep me', lastUsedAt: ago(30) } })
    const before = await s.prisma.savedWorkout.findUnique({ where: { id: id('Quick Machines') } })
    await patch(id('Quick Machines'), { pinned: true })
    const after = await s.prisma.savedWorkout.findUnique({ where: { id: id('Quick Machines') } })
    expect([after?.name, after?.notes, after?.exerciseCount]).toEqual([before?.name, before?.notes, before?.exerciseCount])
    expect(after?.workoutData).toEqual(before?.workoutData)
    expect(after?.lastUsedAt).toEqual(before?.lastUsedAt)
  })

  it('an unknown id is 404', async () => {
    expect((await patch('does-not-exist', { pinned: true })).status).toBe(404)
  })

  it("another user's workout is 404 and stays unpinned, pin or unpin", async () => {
    const theirs = await seedSaved('Theirs', 2, s.otherUserId)
    expect((await patch(theirs.id, { pinned: true })).status).toBe(404)
    await setPinned(theirs.id, ago(5))
    const at = await pinnedAtOf(theirs.id)
    expect((await patch(theirs.id, { pinned: false })).status).toBe(404)
    expect(((await pinnedAtOf(theirs.id)) as Date).getTime()).toBe((at as Date).getTime())
  })

  it('needs a signed-in user', async () => {
    const route = await idRoute()
    auth.userId = ''
    const res = await route.PATCH(
      new NextRequest('http://localhost/x', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{"pinned":true}' }),
      { params: Promise.resolve({ id: id('Upper Body') }) }
    )
    auth.userId = s.userId
    expect(res.status).toBe(401)
    expect(await pinnedAtOf(id('Upper Body'))).toBeNull()
  })
})

describe('pinned: GET /api/workouts/saved', () => {
  beforeEach(async () => {
    await withThree()
  })

  it('returns pinnedAt for each workout: a date when pinned, null when not', async () => {
    const at = ago(20)
    await setPinned(s.saved.Mobility.id, at)
    const { saved } = await list()
    const byName = Object.fromEntries(saved.map((x) => [x.name as string, x.pinnedAt]))
    expect(new Date(byName.Mobility as string).getTime()).toBe(at.getTime())
    expect(byName['Upper Body']).toBeNull()
    expect(byName['Quick Machines']).toBeNull()
    expect(saved.every((x) => 'pinnedAt' in x)).toBe(true)
  })

  it('keeps the list order: pinning does not move a workout', async () => {
    const before = (await list()).saved.map((x) => x.name)
    await setPinned(s.saved['Upper Body'].id, ago(1))
    await setPinned(s.saved.Mobility.id, ago(2))
    expect((await list()).saved.map((x) => x.name)).toEqual(before)
  })

  it('still lists a pinned workout (it lives in My Workouts too)', async () => {
    await setPinned(s.saved.Mobility.id, ago(2))
    expect((await list()).saved).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Edges: getTrainingHome().pinned
// ---------------------------------------------------------------------------
describe('pinned: getTrainingHome', () => {
  beforeEach(async () => {
    await withThree()
  })

  it('is empty with nothing pinned', async () => {
    expect((await getHome()).pinned).toEqual([])
  })

  it('lists id, name, exercise count and pinnedAt, newest pin first', async () => {
    const t1 = ago(50)
    const t2 = ago(10)
    await setPinned(s.saved['Upper Body'].id, t1)
    await setPinned(s.saved['Quick Machines'].id, t2)
    const { pinned } = await getHome()
    expect(pinned.map((p) => [p.id, p.name, p.exerciseCount])).toEqual([
      [s.saved['Quick Machines'].id, 'Quick Machines', 3],
      [s.saved['Upper Body'].id, 'Upper Body', 5],
    ])
    expect(pinned[0].pinnedAt).toBeInstanceOf(Date)
    expect([pinned[0].pinnedAt.getTime(), pinned[1].pinnedAt.getTime()]).toEqual([t2.getTime(), t1.getTime()])
  })

  it('holds at most 5, the 5 newest', async () => {
    for (const n of ['A', 'B', 'C']) await seedSaved(n)
    const order = ['Upper Body', 'Quick Machines', 'Mobility', 'A', 'B', 'C']
    for (const [i, n] of order.entries()) await setPinned(s.saved[n].id, ago(100 - i))
    const { pinned } = await getHome()
    expect(pinned.map((p) => p.name)).toEqual(['C', 'B', 'A', 'Mobility', 'Quick Machines'])
  })

  it('shows exactly 5 when there are exactly 5', async () => {
    for (const n of ['A', 'B']) await seedSaved(n)
    for (const [i, n] of ['Upper Body', 'Quick Machines', 'Mobility', 'A', 'B'].entries()) await setPinned(s.saved[n].id, ago(50 - i))
    expect((await getHome()).pinned).toHaveLength(5)
  })

  it("never includes another user's pinned workouts", async () => {
    const theirs = await seedSaved('Theirs', 2, s.otherUserId)
    await setPinned(theirs.id, ago(1))
    expect((await getHome()).pinned).toEqual([])
    expect((await getHome(s.otherUserId)).pinned.map((p) => p.name)).toEqual(['Theirs'])
  })

  it('drops a workout when it is unpinned', async () => {
    await setPinned(s.saved.Mobility.id, ago(5))
    await patch(s.saved.Mobility.id, { pinned: false })
    expect((await getHome()).pinned).toEqual([])
  })

  it('a deleted pinned workout is gone from Training', async () => {
    await setPinned(s.saved.Mobility.id, ago(5))
    await setPinned(s.saved['Upper Body'].id, ago(10))
    await s.prisma.savedWorkout.delete({ where: { id: s.saved.Mobility.id } })
    expect((await getHome()).pinned.map((p) => p.name)).toEqual(['Upper Body'])
  })

  it('a renamed pinned workout shows its new name', async () => {
    await setPinned(s.saved.Mobility.id, ago(5))
    await patch(s.saved.Mobility.id, { name: 'Mobility Flow' })
    expect((await getHome()).pinned.map((p) => p.name)).toEqual(['Mobility Flow'])
  })

  it('pinning does not make the empty-home or other sections appear or vanish', async () => {
    await setPinned(s.saved.Mobility.id, ago(5))
    const home = await getHome()
    expect([home.upNext, home.recent, home.currentProgram]).toEqual([null, [], null])
  })
})
