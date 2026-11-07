/**
 * Step definitions for features/workout-library/origin-new-archive.feature
 * (work 144, slice 3). Design: initiatives/workout-library/docs/141-discovery.md.
 *
 * Schema the tests expect (the implementer migrates it):
 *   SavedWorkout.origin      String   @default("session")   session | agent | coach
 *   SavedWorkout.archivedAt  DateTime?
 *   The hand-written migration under prisma/migrations/ that adds "origin" also
 *   backfills it with an UPDATE statement: "agent" for every saved workout an
 *   applied saved_workout.create proposal points at (Proposal.targetId). The
 *   test database is built with db push, so the tests run that UPDATE themselves.
 *   The tests read and write the new columns through untyped delegates, so this
 *   file type-checks before the Prisma client is regenerated.
 *
 * Seams (existing files change unless marked new):
 *   POST /api/workouts/saved            sets origin "session".
 *   lib/proposals/saved-workout.ts      createSavedWorkout (approve) sets origin "agent".
 *   PATCH /api/workouts/saved/[id]      body { archived: boolean } archives or
 *     restores (a non-boolean is 400, no write). Archive clears pinnedAt.
 *     Another user's id is 404, the same as an unknown id; refused by
 *     checkRateLimit (keyed on the user id) with no write; 500 and logger.error
 *     when the database fails. Undo puts the workout back as it was, pinnedAt
 *     included; the route may return whatever Undo needs.
 *   A restored workout goes to Recent or Older by its date, never New or Pinned,
 *   even an agent workout that was never started. Undo after Dismiss puts it
 *   back in New. How the server tells those apart is the implementer's call.
 *   lib/saved-workouts/groups.ts        groupSavedWorkouts gains `new` and
 *     `archived` (see __tests__/lib/saved-workout-groups-new.test.ts).
 *   lib/mcp/tools.ts  list_saved_workouts({ includeArchived?: boolean }) returns
 *     savedWorkouts[] with origin, lastUsedAt, pinned (boolean), archived
 *     (boolean); archived ones only with includeArchived; order: last used,
 *     else saved, newest first (pins don't lift a row here).
 *   lib/training/home.ts                pinned never holds an archived workout.
 *   components/QuickActionSheet.tsx     "My saved workouts" counts unarchived ones.
 *   components/features/saved-workouts/SavedWorkoutsList.tsx and its rows:
 *     region "New" (only when it has rows) above "Pinned". A New row shows
 *       "From <agent token name>" and buttons named Start… and Dismiss…; Start
 *       starts it like the detail dialog does (POST …/start, then
 *       /training/adhoc/<completionId>). Dismiss archives it.
 *     The row's actions menu ("Actions for <name>") gains Archive.
 *     Archive and Dismiss show a toast with an Undo button (the app's
 *     ToastProvider grows an action; the tests render the real one).
 *     The last thing in the list is a button "Show archived (n)" (none when n
 *     is 0). Opened, it lists the archived workouts, each with Restore and
 *     Delete buttons; Delete confirms through DeleteSavedWorkoutDialog.
 *     Every button in the list and the row menu is a 48px tap target.
 *
 * Here the UI talks to the real route handlers: fetch is stubbed to call them.
 * vitest-cucumber runs every step as its own test and Testing Library cleans up
 * between tests, so a When step records what to do in `s.pending` and the Then
 * step renders, does it, and checks.
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'
import { countQueries } from '@/lib/test/query-count'

const auth = vi.hoisted(() => ({ userId: '' }))
const rl = vi.hoisted(() => ({ refuse: false, calls: [] as Array<{ key: string }> }))
const boom = vi.hoisted(() => ({ on: false }))
const log = vi.hoisted(() => ({ error: vi.fn() }))
const nav = vi.hoisted(() => ({ to: [] as string[] }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const real = (await db()).getPrismaClient()
  // boom.on makes every database call from app code fail (tests use the real client).
  const prisma = new Proxy(real, {
    get(target, key) {
      if (boom.on) throw new Error('database unavailable (test)')
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId
      ? { user: { id: auth.userId, role: 'user', email: `${auth.userId}@x.test` }, error: null }
      : { user: null, error: null },
}))
vi.mock('@/lib/logger', () => {
  const l = { error: log.error, warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn() }
  return { logger: { ...l, child: () => l }, default: l }
})
vi.mock('@/lib/client-logger', () => ({ clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/rate-limit', async () => {
  const refused = () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_t, key) => {
        if (key === 'then' || key === '__esModule') return undefined
        if (key === 'getClientIp') return () => '203.0.113.7'
        if (key === 'checkRateLimit')
          return async (_l: unknown, k: string) => {
            rl.calls.push({ key: String(k) })
            return rl.refuse ? refused() : null
          }
        if (key === 'checkRateLimitWithHeaders')
          return async (_l: unknown, k: string) => {
            rl.calls.push({ key: String(k) })
            return { response: rl.refuse ? refused() : null, headers: {} }
          }
        return {}
      },
    }
  )
})
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn(), flushEvents: vi.fn(async () => {}), identify: vi.fn() }))
vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: null, isLoading: false, error: null, refetch: vi.fn(async () => {}), updateSettings: vi.fn() }),
}))
vi.mock('@/lib/contexts/DraftWorkoutContext', () => ({
  useDraftWorkout: () => ({ activeDraft: null, refreshDraft: vi.fn(async () => {}), setActiveDraft: vi.fn(), isLoading: false }),
  DraftWorkoutProvider: ({ children }: { children: unknown }) => children,
}))
vi.mock('next/navigation', () => {
  const router = {
    push: (to: string) => nav.to.push(to),
    replace: (to: string) => nav.to.push(to),
    refresh: () => {},
    back: () => {},
    prefetch: () => {},
  }
  return {
    redirect: (to: string) => {
      throw new Error(`NEXT_REDIRECT ${to}`)
    },
    useRouter: () => router,
    usePathname: () => '/library',
    useSearchParams: () => new URLSearchParams('type=workouts'),
  }
})

const feature = await loadFeature('features/workout-library/origin-new-archive.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Json = Record<string, unknown>
type Delegate = Record<string, (args?: unknown) => Promise<unknown>>
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)

interface State {
  prisma: PrismaClient
  user: string
  other: string
  tokenId: string
  ids: Record<string, string>
  pending?: string
  mcp?: { plain: Json[]; all: Json[] }
}
let s: State

const saved = () => (s.prisma as unknown as Record<string, Delegate>).savedWorkout
const row = async (id: string) => (await saved().findUnique({ where: { id } })) as Json
const rowByName = async (name: string, userId = s.user) =>
  (await saved().findFirst({ where: { name, userId } })) as Json

type Seed = {
  origin?: string
  lastUsedAt?: Date | null
  createdAt?: Date
  pinnedAt?: Date | null
  archivedAt?: Date | null
  userId?: string
}
async function seed(name: string, o: Seed = {}): Promise<string> {
  const made = (await saved().create({
    data: {
      userId: o.userId ?? s.user,
      name,
      workoutData: [],
      exerciseCount: 3,
      lastUsedAt: o.lastUsedAt ?? null,
      createdAt: o.createdAt ?? daysAgo(5),
      pinnedAt: o.pinnedAt ?? null,
      ...(o.origin !== undefined && { origin: o.origin }),
      ...(o.archivedAt !== undefined && { archivedAt: o.archivedAt }),
    },
  })) as Json
  s.ids[name] = String(made.id)
  return String(made.id)
}

async function agentToken(userId: string, name: string) {
  const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
  return (await createAgentToken(s.prisma, userId, name)).record.id
}

/** An agent proposes a saved workout and the user approves it: the real create path. */
async function approveAgentWorkout(name: string, tokenId = s.tokenId, userId = s.user): Promise<string> {
  const bench = await createTestExerciseDefinition(s.prisma, { name: `Bench ${Math.random().toString(36).slice(2, 7)}` })
  const { createProposal, approveProposal } = (await load('@/lib/proposals/service')) as typeof import(
    '@/lib/proposals/service'
  )
  const made = await createProposal(
    s.prisma,
    {
      userId,
      agentTokenId: tokenId,
      kind: 'saved_workout.create',
      rationale: 'Try this',
      workout: { name, exercises: [{ exerciseDefinitionId: bench.id, sets: [{ reps: '8' }, { reps: '8' }] }] },
    } as never,
    async () => {}
  )
  expect(made.ok, JSON.stringify(made)).toBe(true)
  const proposalId = (made as { proposal: { id: string } }).proposal.id
  const approved = await approveProposal(s.prisma, proposalId, userId)
  expect(approved.ok, JSON.stringify(approved)).toBe(true)
  const p = (await s.prisma.proposal.findUnique({ where: { id: proposalId } })) as Json
  s.ids[name] = String(p.targetId)
  return String(p.targetId)
}

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const [user, other] = [(await createTestUser()).id, (await createTestUser()).id]
  auth.userId = user
  nav.to.length = 0
  s = { prisma, user, other, tokenId: '', ids: {} }
  s.tokenId = await agentToken(user, 'Hermes')
  // The library before slice 3: a pinned one used long ago, a recent one, an old one.
  await seed('Upper A', { lastUsedAt: daysAgo(60), createdAt: daysAgo(90), pinnedAt: daysAgo(10) })
  await seed('Leg Day', { lastUsedAt: daysAgo(2), createdAt: daysAgo(40) })
  await seed('Old Pull', { lastUsedAt: daysAgo(45), createdAt: daysAgo(100) })
  return s
}

// --- the backfill ---------------------------------------------------------------
function backfillSql(): string[] {
  const dir = path.resolve('prisma/migrations')
  const files = readdirSync(dir)
    .map((d) => path.join(dir, d, 'migration.sql'))
    .filter((f) => {
      try {
        const sql = readFileSync(f, 'utf8')
        return /"origin"/.test(sql) && /"SavedWorkout"/.test(sql)
      } catch {
        return false
      }
    })
  const statements = files.flatMap((f) => readFileSync(f, 'utf8').replace(/--.*$/gm, '').split(';'))
  return statements.map((st) => st.trim()).filter((st) => /^update\s/i.test(st))
}
async function runBackfill() {
  const sql = backfillSql()
  expect(sql.length, 'the migration that adds "origin" to "SavedWorkout" backfills it with an UPDATE').toBeGreaterThan(0)
  for (const st of sql) await s.prisma.$executeRawUnsafe(st)
}
async function insertProposal(kind: string, status: string, targetId: string | null, userId = s.user) {
  const tokenId = userId === s.user ? s.tokenId : await agentToken(userId, 'Other agent')
  await s.prisma.$executeRawUnsafe(
    `INSERT INTO "Proposal" (id, "userId", "agentTokenId", kind, status, summary, rationale, payload, "targetId")
     VALUES ($1, $2, $3, $4, $5, 's', 'r', '{}'::jsonb, $6)`,
    `p_${Math.random().toString(36).slice(2)}`,
    userId,
    tokenId,
    kind,
    status,
    targetId
  )
}

// --- routes -------------------------------------------------------------------
type Ctx = { params: Promise<{ id: string }> }
type Handler = (r: NextRequest, c?: Ctx) => Promise<Response>
const listRoute = async () => (await load('@/app/api/workouts/saved/route')) as { GET: Handler; POST: Handler }
const idRoute = async () => (await load('@/app/api/workouts/saved/[id]/route')) as { PATCH: Handler; DELETE: Handler }
const startRoute = async () => (await load('@/app/api/workouts/saved/[id]/start/route')) as { POST: Handler }
const result = async (res: Response) => ({ status: res.status, body: (await res.json().catch(() => ({}))) as Json })
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
const ctx = (id: string): Ctx => ({ params: Promise.resolve({ id }) })
const patch = async (id: string, body: unknown) =>
  result(await (await idRoute()).PATCH(req(`/api/workouts/saved/${id}`, 'PATCH', body), ctx(id)))

/** fetch that runs the real saved-workout routes; anything else answers 200 {}. */
function routedFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: { method?: string; body?: string }) => {
      const url = String(input instanceof Request ? input.url : input).replace(/^https?:\/\/[^/]+/, '')
      const method = (init?.method ?? 'GET').toUpperCase()
      const pathOnly = url.split('?')[0]
      const r = new NextRequest(`http://localhost${url}`, {
        method,
        ...(init?.body !== undefined && { headers: { 'content-type': 'application/json' }, body: init.body }),
      })
      let res: Response | null = null
      if (pathOnly === '/api/workouts/saved') {
        const m = await listRoute()
        res = method === 'POST' ? await m.POST(r) : await m.GET(r)
      } else {
        const start = /^\/api\/workouts\/saved\/([^/]+)\/start$/.exec(pathOnly)?.[1]
        const one = /^\/api\/workouts\/saved\/([^/]+)$/.exec(pathOnly)?.[1]
        if (start) res = await (await startRoute()).POST(r, ctx(start))
        else if (one) {
          const m = (await idRoute()) as unknown as Record<string, Handler>
          if (m[method]) res = await m[method](r, ctx(one))
        }
      }
      if (!res) {
        const body = pathOnly === '/api/training/next-workout' ? { next: null } : {}
        res = new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return res
    })
  )
}

// --- UI -----------------------------------------------------------------------
async function renderList() {
  routedFetch()
  const List = ((await load('@/components/features/saved-workouts/SavedWorkoutsList')) as { default: ComponentType })
    .default
  const { ToastProvider } = (await load('@/components/ToastProvider')) as {
    ToastProvider: ComponentType<{ children: unknown }>
  }
  render(createElement(ToastProvider, null, createElement(List)))
  await screen.findAllByRole('button', { name: /^View / })
}
const region = (name: string) => screen.queryByRole('region', { name })
const viewName = (b: HTMLElement) => b.getAttribute('aria-label')?.replace(/^View /, '')
const namesIn = (r: HTMLElement | null) =>
  r ? within(r).queryAllByRole('button', { name: /^View / }).map(viewName) : []
const rowOf = (name: string, scope: HTMLElement = document.body) => {
  const view = within(scope).queryByRole('button', { name: `View ${name}` })
  const li = view?.closest('li') as HTMLElement | null
  expect(li, `a row for ${name}`).toBeTruthy()
  return li as HTMLElement
}
const showArchived = () => screen.queryByRole('button', { name: /^show archived/i })
async function openOlder() {
  const fold = screen.queryByRole('button', { name: /^older \(\d+\)/i })
  if (fold && fold.getAttribute('aria-expanded') === 'false') fireEvent.click(fold)
}
async function openArchived() {
  const b = showArchived()
  expect(b, 'a Show archived button').toBeTruthy()
  fireEvent.click(b as HTMLElement)
  await waitFor(() => expect(screen.queryAllByRole('button', { name: /^restore\b/i }).length).toBeGreaterThan(0))
}
async function archiveFromMenu(name: string) {
  fireEvent.click(within(rowOf(name)).getByRole('button', { name: `Actions for ${name}` }))
  const item = await screen.findByRole('button', { name: /^archive\b/i })
  fireEvent.click(item)
}
async function tapUndo() {
  const undo = await screen.findByRole('button', { name: /^undo\b/i })
  await act(async () => {
    fireEvent.click(undo)
  })
}
async function untilDb(check: () => Promise<boolean>, what: string) {
  await waitFor(async () => expect(await check(), what).toBe(true))
}
const archivedAt = async (name: string) => (await rowByName(name))?.archivedAt ?? null

async function renderQuickActionSheet() {
  routedFetch()
  const Sheet = ((await load('@/components/QuickActionSheet')) as {
    default: ComponentType<{ open: boolean; onOpenChange: () => void }>
  }).default
  const { ToastProvider } = (await load('@/components/ToastProvider')) as {
    ToastProvider: ComponentType<{ children: unknown }>
  }
  render(createElement(ToastProvider, null, createElement(Sheet, { open: true, onOpenChange: () => {} })))
}
const savedCountShown = async () => {
  const label = await screen.findByText('My saved workouts')
  const rowEl = label.closest('button') ?? label.parentElement?.parentElement ?? document.body
  return within(rowEl as HTMLElement).getByText(/\d+ saved/).textContent
}

async function callList(args: Json = {}) {
  const { callTool } = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
  const res = await callTool(s.prisma, { userId: s.user, tokenId: s.tokenId, role: 'user', notify: async () => {} }, 'list_saved_workouts', args)
  expect(res.isError, res.content[0]?.text).toBeFalsy()
  return (JSON.parse(res.content[0].text) as { savedWorkouts: Json[] }).savedWorkouts
}

const TAP = /\b(min-)?h-12\b|\b(min-)?h-\[48px\]/
/** Raw palette colours bypass the theme tokens (light, dark and E-INK). */
const RAW_COLOUR = /\b(bg|text|border)-(white|black|(gray|slate|zinc|neutral|red|green|blue|yellow|orange)-\d{2,3})\b|\[#[0-9a-f]{3,6}\]/i

beforeEach(() => {
  rl.refuse = false
  rl.calls.length = 0
  boom.on = false
  log.error.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a signed-in user with saved workouts, today 2026-11-07', async () => {
      await freshState()
    })
  })

  // Origin -----------------------------------------------------------------------
  Scenario('Origin is recorded', ({ Then, And }) => {
    Then('a workout saved after a session has origin "session"', async () => {
      const completion = await s.prisma.workoutCompletion.create({
        data: { userId: s.user, status: 'completed', isAdHoc: true, name: 'Freestyle', completedAt: daysAgo(0) },
      })
      const { POST } = await listRoute()
      const res = await result(
        await POST(req('/api/workouts/saved', 'POST', { sourceCompletionId: completion.id, name: 'Thursday Mix' }))
      )
      expect(res.status).toBe(200)
      expect((await rowByName('Thursday Mix')).origin).toBe('session')
    })
    And('a workout created by approving an agent\'s saved-workout proposal has origin "agent"', async () => {
      const id = await approveAgentWorkout('Machine Upper')
      expect((await row(id)).origin).toBe('agent')
      expect((await row(id)).archivedAt).toBeNull()
    })
    And('origin "coach" exists for coaching slice 2 to use', async () => {
      const id = await seed('From Coach', { origin: 'coach' })
      expect((await row(id)).origin).toBe('coach')
      // Rows written without an origin, like the ones before this change, are "session".
      expect((await rowByName('Leg Day')).origin).toBe('session')
    })
  })

  Scenario('Existing workouts', ({ Given, Then }) => {
    Given('workouts saved before this change', async () => {
      const agentMade = await seed('Agent Made')
      const updatedByAgent = await seed('Edited By Agent')
      const othersAgentMade = await seed('Their Agent Made', { userId: s.other })
      await insertProposal('saved_workout.create', 'applied', agentMade)
      // An agent's edit to a session workout doesn't make it an agent workout.
      await insertProposal('saved_workout.update', 'applied', updatedByAgent)
      await insertProposal('saved_workout.create', 'pending', null)
      await insertProposal('saved_workout.create', 'applied', othersAgentMade, s.other)
      // Before the backfill every row has the column default.
      await s.prisma.$executeRawUnsafe(`UPDATE "SavedWorkout" SET "origin" = 'session'`)
    })
    Then('the ones created by an applied agent proposal get origin "agent" and the rest "session"', async () => {
      await runBackfill()
      const rows = (await saved().findMany({})) as Json[]
      const byName = Object.fromEntries(rows.map((r) => [r.name, r.origin]))
      expect(byName).toEqual({
        'Upper A': 'session',
        'Leg Day': 'session',
        'Old Pull': 'session',
        'Agent Made': 'agent',
        'Edited By Agent': 'session',
        'Their Agent Made': 'agent',
      })
      expect(rows.every((r) => r.archivedAt === null)).toBe(true)
    })
  })

  // New group ------------------------------------------------------------------------
  Scenario('AI workouts wait in New', ({ Given, Then, And }) => {
    Given("the user approved an agent's workout \"Machine Upper\" and hasn't started it", async () => {
      await approveAgentWorkout('Machine Upper')
    })
    Then(
      'it shows in a "New" group above Pinned, with who it came from ("From <agent name>") and Start and Dismiss',
      async () => {
        await renderList()
        const fresh = region('New')
        expect(fresh, 'a New group').toBeTruthy()
        expect(namesIn(fresh)).toEqual(['Machine Upper'])
        const pinned = region('Pinned') as HTMLElement
        expect((fresh as HTMLElement).compareDocumentPosition(pinned) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        const r = rowOf('Machine Upper', fresh as HTMLElement)
        expect(r.textContent).toContain('From Hermes')
        expect(within(r).getByRole('button', { name: /^start\b/i })).toBeTruthy()
        expect(within(r).getByRole('button', { name: /^dismiss\b/i })).toBeTruthy()
      }
    )
    And('it is not also shown in Recent', async () => {
      await renderList()
      expect(namesIn(region('Recent'))).toEqual(['Leg Day'])
      expect(screen.getAllByRole('button', { name: 'View Machine Upper' })).toHaveLength(1)
    })
  })

  Scenario('Starting leaves New', ({ When, Then }) => {
    When('the user starts a workout from New', async () => {
      await approveAgentWorkout('Machine Upper')
      await renderList()
      fireEvent.click(within(rowOf('Machine Upper', region('New') as HTMLElement)).getByRole('button', { name: /^start\b/i }))
      await waitFor(() => expect(nav.to.some((to) => to.startsWith('/training/adhoc/'))).toBe(true))
    })
    Then('it moves to Recent', async () => {
      expect((await rowByName('Machine Upper')).lastUsedAt).not.toBeNull()
      await renderList()
      expect(region('New')).toBeNull()
      expect(namesIn(region('Recent'))).toEqual(['Machine Upper', 'Leg Day'])
    })
  })

  Scenario('Dismiss', ({ When, Then }) => {
    When('the user taps Dismiss on a workout in New', async () => {
      await approveAgentWorkout('Machine Upper')
      s.pending = 'dismiss'
    })
    Then('it is archived, and an Undo toast brings it back', async () => {
      expect(s.pending).toBe('dismiss')
      await renderList()
      fireEvent.click(within(rowOf('Machine Upper', region('New') as HTMLElement)).getByRole('button', { name: /^dismiss\b/i }))
      await waitFor(() => expect(region('New')).toBeNull())
      await untilDb(async () => (await archivedAt('Machine Upper')) !== null, 'Dismiss archives it')
      expect(screen.queryByRole('button', { name: 'View Machine Upper' })).toBeNull()

      await tapUndo()
      await waitFor(() => expect(namesIn(region('New'))).toEqual(['Machine Upper']))
      await untilDb(async () => (await archivedAt('Machine Upper')) === null, 'Undo restores it')
    })
  })

  Scenario('No New group', ({ Given, Then }) => {
    Given('no unstarted AI or coach workouts', async () => {
      const started = await approveAgentWorkout('Machine Upper')
      await saved().update({ where: { id: started }, data: { lastUsedAt: daysAgo(1) } })
      await seed('Coach Started', { origin: 'coach', lastUsedAt: daysAgo(3) })
      await seed('Agent Dismissed', { origin: 'agent', archivedAt: daysAgo(1) })
    })
    Then('there is no New group', async () => {
      await renderList()
      expect(region('New')).toBeNull()
      expect(screen.queryByRole('heading', { name: /^new$/i })).toBeNull()
      expect(namesIn(region('Recent'))).toEqual(['Machine Upper', 'Leg Day', 'Coach Started'])
    })
  })

  // Archive --------------------------------------------------------------------------
  Scenario('Archive by hand', ({ When, Then, And }) => {
    When('the user archives a workout from its row menu', async () => {
      s.pending = 'archive Upper A'
    })
    Then(
      'it leaves every group, is unpinned, and no longer shows on Training or in the quick action sheet',
      async () => {
        expect(s.pending).toBe('archive Upper A')
        await renderList()
        await archiveFromMenu('Upper A')
        await waitFor(() => expect(screen.queryByRole('button', { name: 'View Upper A' })).toBeNull())
        expect(region('Pinned')).toBeNull()
        await untilDb(async () => (await archivedAt('Upper A')) !== null, 'archived')
        expect((await rowByName('Upper A')).pinnedAt).toBeNull()
        cleanup()

        const { getTrainingHome } = (await load('@/lib/training/home')) as {
          getTrainingHome: (userId: string) => Promise<{ pinned: Array<{ name: string }> }>
        }
        expect((await getTrainingHome(s.user)).pinned.map((p) => p.name)).toEqual([])

        await renderQuickActionSheet()
        expect(await savedCountShown()).toMatch(/^2 saved$/)
      }
    )
    And('an Undo toast brings it back as it was (pinned again if it was)', async () => {
      // Back to the start: pinned, not archived.
      const pinnedAt = daysAgo(10)
      await saved().update({ where: { id: s.ids['Upper A'] }, data: { archivedAt: null, pinnedAt } })
      await renderList()
      await archiveFromMenu('Upper A')
      await untilDb(async () => (await archivedAt('Upper A')) !== null, 'archived')
      await tapUndo()
      await waitFor(() => expect(namesIn(region('Pinned'))).toEqual(['Upper A']))
      await untilDb(async () => (await archivedAt('Upper A')) === null, 'Undo restores it')
      const back = await rowByName('Upper A')
      expect((back.pinnedAt as Date | null)?.toISOString()).toBe(pinnedAt.toISOString())
    })
  })

  Scenario('Show archived', ({ Given, Then, When }) => {
    Given('3 archived workouts', async () => {
      await seed('Arch One', { lastUsedAt: daysAgo(5), archivedAt: daysAgo(1) })
      await seed('Arch Two', { lastUsedAt: daysAgo(50), archivedAt: daysAgo(2) })
      await seed('Arch Three', { origin: 'agent', archivedAt: daysAgo(3) })
    })
    Then('the end of the list has "Show archived (3)"', async () => {
      await renderList()
      const b = showArchived() as HTMLElement
      expect(b?.textContent).toMatch(/show archived \(3\)/i)
      for (const v of screen.getAllByRole('button', { name: /^View / }))
        expect(v.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      const fold = screen.getByRole('button', { name: /^older \(\d+\)/i })
      expect(fold.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      for (const name of ['Arch One', 'Arch Two', 'Arch Three'])
        expect(screen.queryByRole('button', { name: `View ${name}` })).toBeNull()
      expect(region('New')).toBeNull()
    })
    When('the user opens it', async () => {
      s.pending = 'open archived'
    })
    Then('the archived workouts show with Restore and Delete', async () => {
      expect(s.pending).toBe('open archived')
      await renderList()
      await openArchived()
      for (const name of ['Arch One', 'Arch Two', 'Arch Three']) {
        const r = rowOf(name)
        expect(within(r).getByRole('button', { name: /^restore\b/i })).toBeTruthy()
        expect(within(r).getByRole('button', { name: /^delete\b/i })).toBeTruthy()
      }
      expect(screen.getAllByRole('button', { name: /^restore\b/i })).toHaveLength(3)
      expect(within(rowOf('Leg Day')).queryByRole('button', { name: /^restore\b/i })).toBeNull()
    })
  })

  Scenario('Restore', ({ When, Then }) => {
    When('the user restores an archived workout', async () => {
      // Archived through the route: a dismissed AI workout and the pinned Upper A.
      await approveAgentWorkout('Machine Upper')
      expect((await patch(s.ids['Machine Upper'], { archived: true })).status).toBe(200)
      expect((await patch(s.ids['Upper A'], { archived: true })).status).toBe(200)
      s.pending = 'restore'
    })
    Then('it goes back to Recent or Older by its date (not New, not Pinned)', async () => {
      expect(s.pending).toBe('restore')
      await renderList()
      await openArchived()
      fireEvent.click(within(rowOf('Machine Upper')).getByRole('button', { name: /^restore\b/i }))
      await untilDb(async () => (await archivedAt('Machine Upper')) === null, 'restored')
      fireEvent.click(within(rowOf('Upper A')).getByRole('button', { name: /^restore\b/i }))
      await untilDb(async () => (await archivedAt('Upper A')) === null, 'restored')
      await waitFor(() => expect(namesIn(region('Recent'))).toEqual(['Machine Upper', 'Leg Day']))
      expect(region('New')).toBeNull()
      expect(region('Pinned')).toBeNull()
      await openOlder()
      expect(namesIn(region('Older'))).toEqual(['Old Pull', 'Upper A'])
      expect((await rowByName('Upper A')).pinnedAt).toBeNull()

      // And after a reload too.
      cleanup()
      await renderList()
      expect(region('New')).toBeNull()
      expect(namesIn(region('Recent'))).toEqual(['Machine Upper', 'Leg Day'])
    })
  })

  Scenario('Nothing is archived on its own', ({ Then }) => {
    Then('no workout is archived or deleted without the user doing it', async () => {
      await seed('Ancient', { lastUsedAt: daysAgo(400), createdAt: daysAgo(500) })
      await seed('Ancient AI', { origin: 'agent', createdAt: daysAgo(400) })
      const before = ((await saved().findMany({ orderBy: { name: 'asc' } })) as Json[]).map((r) => r.id)
      await renderList()
      await result(await (await listRoute()).GET(req('/api/workouts/saved', 'GET')))
      const { getTrainingHome } = (await load('@/lib/training/home')) as { getTrainingHome: (u: string) => Promise<unknown> }
      await getTrainingHome(s.user)
      await callList()
      const after = (await saved().findMany({ orderBy: { name: 'asc' } })) as Json[]
      expect(after.map((r) => r.id)).toEqual(before)
      expect(after.every((r) => r.archivedAt === null)).toBe(true)
    })
  })

  // Agents ---------------------------------------------------------------------------
  Scenario('MCP list', ({ When, Then, And }) => {
    When('an agent calls list_saved_workouts', async () => {
      await approveAgentWorkout('Machine Upper') // never used, saved now
      await seed('Coach Week', { origin: 'coach', createdAt: daysAgo(20) }) // never used, saved 20 days ago
      await seed('Shelved', { lastUsedAt: daysAgo(1), archivedAt: daysAgo(1) })
      await seed('Not Mine', { userId: s.other, lastUsedAt: daysAgo(0) })
      s.mcp = { plain: await callList(), all: await callList({ includeArchived: true }) }
    })
    Then('each workout includes origin, lastUsedAt, pinned and archived', async () => {
      const by = Object.fromEntries((s.mcp?.all ?? []).map((w) => [w.name, w]))
      expect(by['Machine Upper']).toMatchObject({ origin: 'agent', lastUsedAt: null, pinned: false, archived: false })
      expect(by['Coach Week']).toMatchObject({ origin: 'coach', pinned: false, archived: false })
      expect(by['Upper A']).toMatchObject({ origin: 'session', pinned: true, archived: false })
      expect(by['Shelved']).toMatchObject({ archived: true, pinned: false })
      expect(new Date(String(by['Leg Day'].lastUsedAt)).getTime()).toBe(
        ((await rowByName('Leg Day')).lastUsedAt as Date).getTime()
      )
    })
    And(
      'archived workouts are left out unless it asks for them, and the order matches the app (last used, never-used by when saved)',
      async () => {
        const names = (list: Json[]) => list.map((w) => w.name)
        expect(names(s.mcp?.plain ?? [])).toEqual(['Machine Upper', 'Leg Day', 'Coach Week', 'Old Pull', 'Upper A'])
        expect(names(s.mcp?.all ?? [])).toEqual(['Machine Upper', 'Shelved', 'Leg Day', 'Coach Week', 'Old Pull', 'Upper A'])
        const { listTools } = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
        const tool = listTools('user').find((t) => t.name === 'list_saved_workouts')
        expect(Object.keys((tool?.inputSchema.properties ?? {}) as Json)).toContain('includeArchived')
      }
    )
  })

  // Safety and fit ---------------------------------------------------------------------
  Scenario('Scoped and rate limited', ({ Then }) => {
    Then('archive, restore and dismiss only touch the user\'s own workouts, are rate limited and log errors', async () => {
      const theirs = await seed('Their Upper', { userId: s.other, pinnedAt: daysAgo(3) })
      for (const archived of [true, false]) {
        if (!archived) await saved().update({ where: { id: theirs }, data: { archivedAt: daysAgo(1) } })
        const before = await row(theirs)
        expect((await patch(theirs, { archived })).status).toBe(404)
        expect(await row(theirs)).toEqual(before)
      }

      const mine = s.ids['Leg Day']
      rl.refuse = true
      expect((await patch(mine, { archived: true })).status).toBe(429)
      expect((await row(mine)).archivedAt).toBeNull()
      expect(rl.calls.map((c) => c.key)).toContain(s.user)
      rl.refuse = false

      boom.on = true
      expect((await patch(mine, { archived: true })).status).toBe(500)
      boom.on = false
      expect(log.error).toHaveBeenCalled()
      expect((await row(mine)).archivedAt).toBeNull()
    })
  })

  Scenario('Phone width', ({ Then }) => {
    Then('at 390px the New group, row menu and Show archived fit with 48px tap targets, in light, dark and E-INK', async () => {
      await approveAgentWorkout('Machine Upper')
      await seed('Arch One', { lastUsedAt: daysAgo(5), archivedAt: daysAgo(1) })
      await renderList()
      await openArchived()
      fireEvent.click(within(rowOf('Leg Day')).getByRole('button', { name: 'Actions for Leg Day' }))
      await screen.findByRole('button', { name: /^archive\b/i })
      const targets = [...document.body.querySelectorAll('button, a')] as HTMLElement[]
      expect(targets.length).toBeGreaterThan(8)
      for (const t of targets) expect(`${t.textContent}: ${t.className}`).toMatch(TAP)
      for (const el of document.body.querySelectorAll('[class]'))
        expect(String(el.getAttribute('class'))).not.toMatch(RAW_COLOUR)
    })
  })
})

// ---------------------------------------------------------------------------
// Edges the scenarios don't pin
// ---------------------------------------------------------------------------
describe('archive route edges', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('a non-boolean archived is 400 and writes nothing', async () => {
    const id = s.ids['Leg Day']
    for (const archived of ['yes', 1, null]) expect((await patch(id, { archived })).status).toBe(400)
    expect((await row(id)).archivedAt).toBeNull()
  })

  it('an unknown id is 404', async () => {
    expect((await patch('nope', { archived: true })).status).toBe(404)
  })

  it('archive answers 401 when signed out', async () => {
    auth.userId = ''
    expect((await patch(s.ids['Leg Day'], { archived: true })).status).toBe(401)
    expect((await row(s.ids['Leg Day'])).archivedAt).toBeNull()
  })

  it('archiving keeps name, notes, workoutData and lastUsedAt; restoring a never-pinned one does not pin it', async () => {
    const id = s.ids['Leg Day']
    const before = await row(id)
    expect((await patch(id, { archived: true })).status).toBe(200)
    expect((await patch(id, { archived: false })).status).toBe(200)
    const after = await row(id)
    for (const k of ['name', 'notes', 'workoutData', 'exerciseCount', 'lastUsedAt', 'origin', 'createdAt'])
      expect(after[k], k).toEqual(before[k])
    expect(after.pinnedAt).toBeNull()
    expect(after.archivedAt).toBeNull()
  })

  it('a plain restore of a pinned workout does not pin it again', async () => {
    const id = s.ids['Upper A']
    await patch(id, { archived: true })
    await patch(id, { archived: false })
    expect((await row(id)).pinnedAt).toBeNull()
  })
})

describe('New rows name their source', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('two agents: each row says which one', async () => {
    const claude = await agentToken(s.user, 'Claude')
    await approveAgentWorkout('Machine Upper')
    await approveAgentWorkout('Kettlebell Flow', claude)
    await renderList()
    expect(rowOf('Machine Upper').textContent).toContain('From Hermes')
    expect(rowOf('Kettlebell Flow').textContent).toContain('From Claude')
    expect(namesIn(region('New'))).toEqual(['Kettlebell Flow', 'Machine Upper'])
  })

  it('the quick action sheet counts only unarchived workouts', async () => {
    await seed('Arch One', { archivedAt: daysAgo(1) })
    await renderQuickActionSheet()
    expect(await savedCountShown()).toMatch(/^3 saved$/)
  })

  it('the list route sends the same number of queries for 1 New row as for 10', async () => {
    const counted = async () => {
      const { count, result: res } = await countQueries(s.prisma, async () =>
        (await listRoute()).GET(req('/api/workouts/saved', 'GET'))
      )
      expect(res.status).toBe(200)
      return count
    }
    await approveAgentWorkout('AI 0')
    const one = await counted()
    for (let i = 1; i < 10; i++) await approveAgentWorkout(`AI ${i}`, await agentToken(s.user, `Agent ${i}`))
    expect(await counted()).toBe(one)
  })
})
