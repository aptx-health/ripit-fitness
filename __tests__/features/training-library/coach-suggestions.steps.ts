/**
 * Step definitions for features/training-library/coach-suggestions.feature.
 * Codes strictly against initiatives/training-library/docs/spec.md
 * ("TL5a Suggestions for users").
 *
 * Proposals are seeded through the real MCP tools (callTool) and decided
 * through the real routes, so the service, the routes and the loaders are all
 * real. The UI parts render the real components with fetch stubbed to call
 * the real route handlers.
 *
 * Seams (all new; names are the contract):
 *
 *   lib/suggestions/kinds.ts
 *     SUGGESTION_KINDS = the five allowed kinds
 *     suggestionKindLabel(kind) -> 'Workout' | 'Workout change' | 'Program' |
 *       'Anchor lifts' | 'Training targets' | null (null for hidden kinds)
 *
 *   app/api/suggestions/route.ts            GET
 *     200 { suggestions: [{ id, kind, kindLabel, title, summary, rationale, createdAt: ISO }] }
 *     `title` is what users see (suggestionTitle); `summary` is the service's, unchanged.
 *     the user's pending allowed-kind proposals, newest first. 401 with no user.
 *   app/api/suggestions/[id]/route.ts       GET
 *     200 { suggestion: SuggestionDetail } for any status of an allowed kind.
 *   app/api/suggestions/[id]/accept/route.ts   POST
 *     the service's approve, mapped like the admin decision route
 *     (not_found 404, not_pending 409, conflict 409, invalid 422), as
 *     { error, code } on failure; 200 { success: true, data, programId }
 *     where programId is the new program's id for program.create, else null.
 *   app/api/suggestions/[id]/reject/route.ts   POST   200 { success: true, data }
 *     Every route: 404 for another user's, an unknown or a hidden-kind id,
 *     with no state change. There is no revert route.
 *
 *   lib/suggestions/detail.ts
 *     getSuggestionDetail(userId, id) -> SuggestionDetail | null (null = 404)
 *     SuggestionDetail = { id, kind, kindLabel, status, outcome, title, summary,
 *       rationale, createdAt: Date, programId, body }
 *       outcome: null while pending, else 'Accepted' (applied), 'Rejected',
 *       'No longer applies' (conflict).
 *       programId: the created program (program.create, once applied) else null.
 *       body, by kind (the shared renderers' data; the admin page uses it too):
 *         saved_workout.create -> { type: 'saved_workout_create', name, notes,
 *             exercises: [{ name, notes?, sets }] }   names resolved from definitions
 *         saved_workout.update -> { type: 'saved_workout_update', rows: DiffRow[] }
 *         program.create       -> { type: 'program', program, definitionNames }
 *         anchors.update / balance_targets.update -> { type: 'diff', rows: DiffRow[] }
 *       DiffRow = { field, before, after, current? }; field is a display name
 *       ('Quads', 'Hinge', 'Mid Back'), never a key.
 *
 *   lib/training/home.ts   getTrainingHome(userId) gains
 *     suggestions: { count, items }  count = all pending allowed-kind
 *     suggestions, items = the newest 3 as { id, kind, title, summary, rationale, createdAt }.
 *
 *   suggestionTitle(kind, payload, before) -> string, exported from a lib/suggestions
 *     module (the tests look in title.ts, titles.ts, kinds.ts, bodies.ts and detail.ts). Users
 *     see it everywhere, never the summary:
 *       saved_workout.create  the workout's name
 *       saved_workout.update  '<name before>: <changed fields>' in order name, notes,
 *                             exercises, e.g. 'Push A: name, exercises'
 *       program.create        the program's name
 *       balance_targets.update  '<FAU display name> <before> → <after>', joined with ', '
 *       anchors.update        the pattern display names, joined with ', '
 *
 *   Error wording on every user route (the `error` field, never 'proposal'):
 *     not_pending 'This suggestion was already decided.'  conflict 'This suggestion no longer applies.'
 *     not_found 'Suggestion not found.'  invalid 'This suggestion can't be applied.'
 *   Accept and reject answer { success: true, data: { id, status, kind }, ... }, never the row.
 *   All four routes, GET included, are rate limited (a refusing limiter gives 429).
 *
 *   components/training/TrainingHome.tsx, components/suggestions/SuggestionsList.tsx,
 *   components/suggestions/SuggestionReview.tsx   see
 *   __tests__/components/suggestions-view.test.tsx.
 *
 * vitest-cucumber runs every step as its own test and Testing Library cleans
 * up between tests, so a When step records what to render in `pending` and
 * each Then/And step renders it again with shown().
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))
const ui = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
const rl = vi.hoisted(() => ({ refuse: false }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null },
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => (rl.refuse ? new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }) : null),
  workoutActionLimiter: {},
  destructiveOpLimiter: {},
  programManagementLimiter: {},
  suggestionLimiter: {},
  proposalLimiter: {},
}))
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: ui.push, refresh: ui.refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/suggestions',
  useSearchParams: () => new URLSearchParams(),
}))

const feature = await loadFeature('features/training-library/coach-suggestions.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)

type Json = Record<string, unknown>
interface Detail {
  id: string
  kind: string
  kindLabel: string
  status: string
  outcome: string | null
  title: string
  summary: string
  rationale: string
  createdAt: Date
  programId: string | null
  body: Json & { type: string; rows?: Array<{ field: string; before?: unknown; after: unknown; current?: unknown }> }
}
interface Home {
  upNext: unknown
  pinned: unknown[]
  suggestions: { count: number; items: Array<{ id: string; kind: string; title: string; summary: string; rationale: string; createdAt: Date }> }
  recent: unknown[]
  currentProgram: unknown
}
interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  otherTokenId: string
  bench: { id: string }
  squat: { id: string }
  pending: Record<string, string>
  saved?: { id: string }
  pushed: unknown[]
  alertText?: string
  calls?: string[]
}
let s: State
const fetched: Array<{ url: string; method: string }> = []
let pending: (() => Promise<unknown>) | null = null
const shown = async () => {
  await (pending as () => Promise<unknown>)()
}

const MIN = 60_000
const ago = (m: number) => new Date(Date.now() - m * MIN)

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const user = await createTestUser()
  const other = await createTestUser()
  auth.userId = user.id
  const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
  const tokenId = (await createAgentToken(prisma, user.id, 'coach')).record.id
  const otherTokenId = (await createAgentToken(prisma, other.id, 'their coach')).record.id
  const bench = await createTestExerciseDefinition(prisma, { name: 'Barbell Bench Press' })
  const squat = await createTestExerciseDefinition(prisma, { name: 'Back Squat' })
  return { prisma, userId: user.id, otherUserId: other.id, tokenId, otherTokenId, bench, squat, pending: {}, pushed: [] }
}

// --- seeding through the real MCP tools -----------------------------------
const RATIONALE = 'Your pressing volume is low and this fills it'
async function agent(name: string, args: Json, who: 'me' | 'other' = 'me') {
  const { callTool } = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
  const ctx = {
    userId: who === 'me' ? s.userId : s.otherUserId,
    tokenId: who === 'me' ? s.tokenId : s.otherTokenId,
    notify: vi.fn(async () => {}),
  }
  const raw = (await callTool(s.prisma, ctx as never, name, args as never)) as { isError?: boolean; content?: Array<{ text?: string }> }
  expect(raw.isError, `${name} failed: ${JSON.stringify(raw)}`).not.toBe(true)
  const owner = who === 'me' ? s.userId : s.otherUserId
  return (await s.prisma.proposal.findFirstOrThrow({ where: { userId: owner }, orderBy: { createdAt: 'desc' } })).id
}
async function aged(id: string, minutes: number) {
  await s.prisma.proposal.update({ where: { id }, data: { createdAt: ago(minutes) } })
  return id
}
const workoutArgs = (name: string) => ({
  name,
  exercises: [
    { exerciseDefinitionId: s.bench.id, sets: [{ reps: '8', rir: 2 }, { reps: '8', rir: 2 }] },
    { exerciseDefinitionId: s.squat.id, notes: 'Brace', sets: [{ reps: '5' }] },
  ],
  rationale: RATIONALE,
})
const suggestWorkout = async (name: string, minutes = 10, who: 'me' | 'other' = 'me') =>
  aged(await agent('propose_workout_create', workoutArgs(name), who), minutes)
const programArgs = (name: string) => ({
  program: {
    name,
    description: `${name} block`,
    weeks: [
      {
        name: 'Week One',
        workouts: [
          { name: 'Push', exercises: [{ exerciseDefinitionId: s.bench.id, prescribedSets: [{ reps: '5', weight: '100', rpe: 7 }] }] },
          { name: 'Legs', exercises: [{ exerciseDefinitionId: s.squat.id, prescribedSets: [{ reps: '3' }] }] },
        ],
      },
    ],
  },
  rationale: 'A simple block built from your recent training',
})
const suggestProgram = async (name: string, minutes = 20) => aged(await agent('propose_program_create', programArgs(name)), minutes)
const suggestTarget = async (changes: Json, minutes = 15) =>
  aged(await agent('propose_target_update', { changes, rationale: 'Your quads lag your hamstrings' }), minutes)
const suggestAnchor = async (changes: Json, minutes = 16) =>
  aged(await agent('propose_anchor_update', { changes, rationale: 'These lifts fit your setup' }), minutes)
const suggestExercise = async (minutes = 12, who: 'me' | 'other' = 'me') =>
  aged(
    await agent('propose_exercise_create', { definition: { name: 'Larsen Press', equipment: ['barbell'], primaryFAUs: ['chest'], secondaryFAUs: ['triceps'] }, rationale: 'A bench variation' }, who),
    minutes
  )
async function savedWorkout(name: string) {
  const row = await s.prisma.savedWorkout.create({
    data: {
      userId: s.userId,
      name,
      workoutData: [
        { name: 'Barbell Bench Press', exerciseDefinitionId: s.bench.id, order: 1, notes: null, exerciseGroup: null, sets: [{ setNumber: 1, reps: '8', rir: null, rpe: null, isWarmup: false }] },
      ] as never,
      exerciseCount: 1,
    },
  })
  s.saved = row
  return row
}
const statusOf = async (id: string) => (await s.prisma.proposal.findUniqueOrThrow({ where: { id } })).status

// --- routes ---------------------------------------------------------------
type Ctx = { params: Promise<{ id: string }> }
const route = async <T>(spec: string) => (await load(spec)) as T
async function call(spec: string, method: 'GET' | 'POST', id?: string, userId = s.userId) {
  auth.userId = userId
  const mod = await route<Record<string, (r: NextRequest, c?: Ctx) => Promise<Response>>>(spec)
  const req = new NextRequest('http://localhost/api/suggestions', { method })
  const res = await mod[method](req, id ? { params: Promise.resolve({ id }) } : undefined)
  auth.userId = s.userId
  return { status: res.status, body: (await res.json()) as Json }
}
const list = (userId?: string) => call('@/app/api/suggestions/route', 'GET', undefined, userId)
const detail = (id: string, userId?: string) => call('@/app/api/suggestions/[id]/route', 'GET', id, userId)
const accept = (id: string, userId?: string) => call('@/app/api/suggestions/[id]/accept/route', 'POST', id, userId)
const reject = (id: string, userId?: string) => call('@/app/api/suggestions/[id]/reject/route', 'POST', id, userId)
const listed = async (userId?: string) =>
  ((await list(userId)).body.suggestions as Array<{ id: string; kind: string; kindLabel: string; title: string; summary: string; rationale: string; createdAt: string }>) ?? []

async function getDetail(id: string, userId = s.userId): Promise<Detail | null> {
  const mod = await route<{ getSuggestionDetail: (u: string, i: string) => Promise<Detail | null> }>('@/lib/suggestions/detail')
  return mod.getSuggestionDetail(userId, id)
}
async function getHome(userId = s.userId): Promise<Home> {
  const mod = await route<{ getTrainingHome: (u: string) => Promise<Home> }>('@/lib/training/home')
  return mod.getTrainingHome(userId)
}

/** fetch that runs the real handlers for the routes the review screen calls. */
function routedFetch() {
  const calls = fetched
  calls.length = 0
  const ACCEPT = /^\/api\/suggestions\/([^/]+)\/accept$/
  const REJECT = /^\/api\/suggestions\/([^/]+)\/reject$/
  const ACTIVATE = /^\/api\/programs\/([^/]+)\/activate$/
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string }) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method })
      const done = async (res: Response) => ({ ok: res.ok, status: res.status, json: () => res.json() })
      const req = (init: Json = {}) => new NextRequest(`http://localhost${url}`, { method, ...init })
      const a = ACCEPT.exec(url)?.[1]
      const r = REJECT.exec(url)?.[1]
      const p = ACTIVATE.exec(url)?.[1]
      if (method === 'POST' && a) {
        const mod = await route<{ POST: (r: NextRequest, c: Ctx) => Promise<Response> }>('@/app/api/suggestions/[id]/accept/route')
        return done(await mod.POST(req(), { params: Promise.resolve({ id: a }) }))
      }
      if (method === 'POST' && r) {
        const mod = await route<{ POST: (r: NextRequest, c: Ctx) => Promise<Response> }>('@/app/api/suggestions/[id]/reject/route')
        return done(await mod.POST(req(), { params: Promise.resolve({ id: r }) }))
      }
      if (method === 'POST' && p) {
        const mod = await route<{ POST: (r: NextRequest, c: { params: Promise<{ programId: string }> }) => Promise<Response> }>(
          '@/app/api/programs/[programId]/activate/route'
        )
        return done(await mod.POST(req(), { params: Promise.resolve({ programId: p }) }))
      }
      if (method === 'GET' && url === '/api/suggestions') {
        const mod = await route<{ GET: (r: NextRequest) => Promise<Response> }>('@/app/api/suggestions/route')
        return done(await mod.GET(req()))
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
  )
  return calls
}

async function renderHome() {
  cleanup()
  const home = await getHome()
  const mod = await route<{ default: ComponentType<{ home: Home }> }>('@/components/training/TrainingHome')
  render(createElement(mod.default, { home }))
  return home
}
async function renderReview(id: string) {
  cleanup()
  const suggestion = (await getDetail(id)) as Detail
  const mod = await route<{ default: ComponentType<{ suggestion: Detail }> }>('@/components/suggestions/SuggestionReview')
  render(createElement(mod.default, { suggestion }))
  return suggestion
}
const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

beforeEach(() => {
  rl.refuse = false
  ui.push.mockClear()
  ui.refresh.mockClear()
  routedFetch()
})

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given }) => {
    Given('the user has an agent that made suggestions for them', async () => {
      s = await freshState()
      expect(await s.prisma.agentToken.count({ where: { userId: s.userId } })).toBe(1)
    })
  })

  Rule('Training surfaces pending suggestions', ({ RuleScenario }) => {
    RuleScenario('The newest suggestion is shown first on Training', ({ Given, When, Then, And }) => {
      Given('the user has pending suggestions "Short Full-Body Workout" (newest) and "New 3-Day Strength Program"', async () => {
        s.pending.workout = await suggestWorkout('Short Full-Body Workout', 5)
        s.pending.program = await suggestProgram('New 3-Day Strength Program', 60)
      })
      When('the user opens Training', async () => {
        pending = renderHome
        await shown()
      })
      Then('the first section is "Coach Suggestions · 2"', async () => {
        const home = await renderHome()
        expect(home.suggestions.count).toBe(2)
        expect(headings()[0]).toBe('Coach Suggestions · 2')
      })
      And('"Short Full-Body Workout" is shown with its rationale and a Review button', async () => {
        const home = await renderHome()
        expect(home.suggestions.items[0].id).toBe(s.pending.workout)
        expect(screen.getByText(/Short Full-Body Workout/)).toBeTruthy()
        expect(screen.getByText(RATIONALE)).toBeTruthy()
        expect(screen.queryByText(/New saved workout:|New program:/)).toBeNull()
        expect(screen.getByText(/^review$/i).closest('a')?.getAttribute('href')).toBe(`/suggestions/${s.pending.workout}`)
      })
      And('"New 3-Day Strength Program" is listed below it', async () => {
        await shown()
        const first = screen.getByText(/Short Full-Body Workout/)
        const second = screen.getByText(/New 3-Day Strength Program/)
        expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(second.closest('a')?.getAttribute('href')).toBe(`/suggestions/${s.pending.program}`)
      })
      And('"View Suggestions" opens the list of suggestions', async () => {
        await shown()
        expect(screen.getByText(/view suggestions/i).closest('a')?.getAttribute('href')).toBe('/suggestions')
      })
    })

    RuleScenario('No section without pending suggestions', ({ Given, When, Then }) => {
      Given('the user has no pending suggestions', async () => {
        const decided = await suggestWorkout('Already rejected')
        expect((await reject(decided)).status).toBe(200)
        const accepted = await suggestWorkout('Already accepted')
        expect((await accept(accepted)).status).toBe(200)
      })
      When('the user opens Training', async () => {
        pending = renderHome
        await shown()
      })
      Then('there is no Coach Suggestions section', async () => {
        const home = await renderHome()
        expect(home.suggestions).toEqual({ count: 0, items: [] })
        expect(screen.queryByText(/coach suggestions/i)).toBeNull()
        expect(screen.queryByText(/view suggestions/i)).toBeNull()
      })
    })

    RuleScenario('Exercise-library suggestions stay in admin', ({ Given, When, Then, And }) => {
      Given('the agent proposed an exercise-library change for the user', async () => {
        s.pending.exercise = await suggestExercise()
        expect(await statusOf(s.pending.exercise)).toBe('pending')
      })
      When('the user opens Training or the suggestions list', async () => {
        pending = renderHome
        await shown()
      })
      Then('that proposal is not shown', async () => {
        const home = await renderHome()
        expect(home.suggestions).toEqual({ count: 0, items: [] })
        expect(screen.queryByText(/larsen press/i)).toBeNull()
        expect(await listed()).toEqual([])
      })
      And('opening it directly is not found', async () => {
        const id = s.pending.exercise
        expect((await detail(id)).status).toBe(404)
        expect((await accept(id)).status).toBe(404)
        expect((await reject(id)).status).toBe(404)
        expect(await getDetail(id)).toBeNull()
        expect(await statusOf(id)).toBe('pending')
        expect(await s.prisma.exerciseDefinition.count({ where: { name: 'Larsen Press' } })).toBe(0)
      })
    })

    RuleScenario("Another user's suggestion is not found", ({ When, Then }) => {
      When("the user opens another user's suggestion", async () => {
        s.pending.theirs = await suggestWorkout('Theirs', 5, 'other')
      })
      Then('it is not found', async () => {
        const id = s.pending.theirs
        expect((await detail(id)).status).toBe(404)
        expect((await accept(id)).status).toBe(404)
        expect((await reject(id)).status).toBe(404)
        expect(await getDetail(id)).toBeNull()
        expect(await statusOf(id)).toBe('pending')
        expect(await s.prisma.savedWorkout.count()).toBe(0)
        expect((await getDetail(id, s.otherUserId))?.id).toBe(id)
      })
    })
  })

  Rule("Accepting puts the suggestion into the user's library", ({ RuleScenario }) => {
    RuleScenario('Accepting a workout suggestion', ({ Given, When, Then, And }) => {
      Given('the user has a pending workout suggestion "Push day"', async () => {
        s.pending.workout = await suggestWorkout('Push day')
      })
      When('the user reviews it and accepts', async () => {
        await renderReview(s.pending.workout)
        fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
        const link = await screen.findByRole('link', { name: /my workouts|library/i })
        const url = new URL(link.getAttribute('href') as string, 'http://x')
        expect([url.pathname, url.searchParams.get('type')]).toEqual(['/library', 'workouts'])
      })
      Then('"Push day" is in My Workouts', async () => {
        const rows = await s.prisma.savedWorkout.findMany({ where: { userId: s.userId } })
        expect(rows.map((r) => r.name)).toEqual(['Push day'])
        expect(rows[0].exerciseCount).toBe(2)
      })
      And('the suggestion is no longer pending', async () => {
        expect(await statusOf(s.pending.workout)).toBe('applied')
        expect(await listed()).toEqual([])
      })
    })

    RuleScenario('Accepting a program suggestion and making it active', ({ Given, When, Then, And }) => {
      Given('the user has a pending program suggestion "3-Day Strength"', async () => {
        s.pending.program = await suggestProgram('3-Day Strength')
        await s.prisma.program.create({ data: { name: 'Current Plan', userId: s.userId, isActive: true } })
      })
      When('the user accepts it and chooses Make active', async () => {
        await renderReview(s.pending.program)
        fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
        expect(await screen.findByText(/make it active\?/i)).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: /^make active$/i }))
        await waitFor(() => expect(ui.push).toHaveBeenCalled())
        s.pushed = ui.push.mock.calls.map((c) => c[0])
        s.calls = fetched.map((c) => `${c.method} ${c.url}`)
      })
      Then('"3-Day Strength" is the active program', async () => {
        const active = await s.prisma.program.findMany({ where: { userId: s.userId, isActive: true } })
        expect(active.map((p) => p.name)).toEqual(['3-Day Strength'])
      })
      And('they land on its detail screen', async () => {
        const program = await s.prisma.program.findFirstOrThrow({ where: { userId: s.userId, name: '3-Day Strength' } })
        const url = new URL(s.pushed[0] as string, 'http://x')
        expect(url.pathname).toBe(`/library/programs/${program.id}`)
        expect(s.calls).toContain(`POST /api/programs/${program.id}/activate`)
      })
    })

    RuleScenario('Accepting a program suggestion without activating it', ({ Given, When, Then }) => {
      Given('the user has a pending program suggestion "3-Day Strength"', async () => {
        s.pending.program = await suggestProgram('3-Day Strength')
        await s.prisma.program.create({ data: { name: 'Current Plan', userId: s.userId, isActive: true } })
      })
      When('the user accepts it and chooses Not now', async () => {
        await renderReview(s.pending.program)
        fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
        fireEvent.click(await screen.findByRole('button', { name: /^not now$/i }))
        await waitFor(() => expect(ui.push).toHaveBeenCalled())
        s.pushed = ui.push.mock.calls.map((c) => c[0])
        s.calls = fetched.map((c) => `${c.method} ${c.url}`)
      })
      Then('"3-Day Strength" is in My Programs and not active', async () => {
        const program = await s.prisma.program.findFirstOrThrow({ where: { userId: s.userId, name: '3-Day Strength' } })
        expect(program.isActive).toBe(false)
        expect(program.deletedAt).toBeNull()
        const current = await s.prisma.program.findFirstOrThrow({ where: { name: 'Current Plan' } })
        expect(current.isActive).toBe(true)
        expect(new URL(s.pushed[0] as string, 'http://x').pathname).toBe(`/library/programs/${program.id}`)
        expect((s.calls ?? []).some((c) => c.includes('/activate'))).toBe(false)
        expect(s.calls).toContain(`POST /api/suggestions/${s.pending.program}/accept`)
      })
    })

    RuleScenario('Accepting goes past the program cap', ({ Given, When, Then }) => {
      Given('the user already has 3 programs and a pending program suggestion', async () => {
        for (const n of ['A', 'B', 'C']) await s.prisma.program.create({ data: { name: `Plan ${n}`, userId: s.userId } })
        s.pending.program = await suggestProgram('Fourth Plan')
      })
      When('the user accepts it', async () => {
        const res = await accept(s.pending.program)
        expect(res.status).toBe(200)
      })
      Then('the user has 4 programs', async () => {
        expect(await s.prisma.program.count({ where: { userId: s.userId, deletedAt: null } })).toBe(4)
      })
    })

    RuleScenario('Accepting a training-target suggestion', ({ Given, When, Then, And }) => {
      Given('the user has a pending suggestion to change their quads target', async () => {
        s.pending.target = await suggestTarget({ quads: 1.3 })
      })
      When('the user reviews it', async () => {
        pending = () => renderReview(s.pending.target)
        await shown()
      })
      Then('the change is shown with the muscle\'s display name, not its key', async () => {
        const d = (await getDetail(s.pending.target)) as Detail
        expect(d.body.type).toBe('diff')
        expect(d.body.rows?.map((r) => r.field)).toEqual(['Quads'])
        expect(String(d.body.rows?.[0].after)).toBe('1.3')
        await shown()
        expect(screen.getByText('Quads')).toBeTruthy()
        expect(screen.queryByText('quads')).toBeNull()
        expect(screen.getByText('1.3')).toBeTruthy()
      })
      And('accepting it updates the target', async () => {
        const res = await accept(s.pending.target)
        expect(res.status).toBe(200)
        const row = await s.prisma.userMuscleBalanceSettings.findUniqueOrThrow({ where: { userId: s.userId } })
        expect((row.targets as Record<string, number>).quads).toBe(1.3)
      })
    })

    RuleScenario('A suggestion that no longer applies', ({ Given, When, Then, And }) => {
      Given('the user has a pending suggestion to rename "Push day" and then renamed it themselves', async () => {
        const saved = await savedWorkout('Push day')
        s.pending.update = await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push Day A', rationale: RATIONALE })
        await s.prisma.savedWorkout.update({ where: { id: saved.id }, data: { name: 'My Push' } })
      })
      When('the user accepts the suggestion', async () => {
        await renderReview(s.pending.update)
        fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
        const alert = await screen.findByText(/no longer applies/i)
        s.alertText = alert.textContent ?? ''
      })
      Then('they are told it no longer applies', async () => {
        expect(s.alertText).toMatch(/this suggestion no longer applies/i)
        expect(await statusOf(s.pending.update)).toBe('conflict')
      })
      And('"Push day" keeps their name', async () => {
        const row = await s.prisma.savedWorkout.findUniqueOrThrow({ where: { id: (s.saved as { id: string }).id } })
        expect(row.name).toBe('My Push')
      })
    })
  })

  Rule('Rejecting removes the suggestion', ({ RuleScenario }) => {
    RuleScenario('Rejecting a suggestion', ({ Given, When, Then, And }) => {
      Given('the user has a pending workout suggestion "Push day"', async () => {
        s.pending.workout = await suggestWorkout('Push day')
      })
      When('the user rejects it', async () => {
        await renderReview(s.pending.workout)
        fireEvent.click(screen.getByRole('button', { name: /^reject$/i }))
        await waitFor(() => expect(ui.push).toHaveBeenCalled())
        s.pushed = ui.push.mock.calls.map((c) => c[0])
      })
      Then('nothing is added to My Workouts', async () => {
        expect(await s.prisma.savedWorkout.count()).toBe(0)
        expect(await statusOf(s.pending.workout)).toBe('rejected')
        expect(s.pushed).toEqual(['/training'])
      })
      And('the suggestion is gone from Training and the list', async () => {
        expect((await getHome()).suggestions).toEqual({ count: 0, items: [] })
        expect(await listed()).toEqual([])
      })
    })

    RuleScenario("A decided suggestion can't be decided again", ({ Given, When, Then }) => {
      Given('the user accepted a suggestion', async () => {
        s.pending.workout = await suggestWorkout('Push day')
        expect((await accept(s.pending.workout)).status).toBe(200)
      })
      When('the user opens it again', async () => {
        pending = () => renderReview(s.pending.workout)
        await shown()
      })
      Then('it shows "Accepted" without Accept or Reject', async () => {
        await shown()
        expect(screen.getByText(/^accepted$/i)).toBeTruthy()
        expect(screen.queryByRole('button', { name: /^accept$/i })).toBeNull()
        expect(screen.queryByRole('button', { name: /^reject$/i })).toBeNull()
        const again = await accept(s.pending.workout)
        expect(again.status).toBe(409)
        expect(again.body.code).toBe('not_pending')
        expect(await s.prisma.savedWorkout.count()).toBe(1)
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Edges: kinds and labels
// ---------------------------------------------------------------------------
describe('suggestions: kinds', () => {
  const kinds = async () =>
    route<{ SUGGESTION_KINDS: readonly string[]; suggestionKindLabel: (k: string) => string | null }>('@/lib/suggestions/kinds')

  it('the allowed kinds are the five user kinds', async () => {
    const { SUGGESTION_KINDS } = await kinds()
    expect([...SUGGESTION_KINDS].sort()).toEqual(
      ['anchors.update', 'balance_targets.update', 'program.create', 'saved_workout.create', 'saved_workout.update'].sort()
    )
  })

  it.each([
    ['saved_workout.create', 'Workout'],
    ['saved_workout.update', 'Workout change'],
    ['program.create', 'Program'],
    ['anchors.update', 'Anchor lifts'],
    ['balance_targets.update', 'Training targets'],
  ])('%s is labelled %s', async (kind, label) => {
    expect((await kinds()).suggestionKindLabel(kind)).toBe(label)
  })

  it.each(['exercise_definition.create', 'exercise_definition.update', 'nonsense'])('%s has no label (hidden)', async (kind) => {
    expect((await kinds()).suggestionKindLabel(kind)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Edges: the routes
// ---------------------------------------------------------------------------
describe('suggestions: GET /api/suggestions', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('lists pending allowed-kind suggestions, newest first, with the documented fields', async () => {
    const a = await suggestWorkout('Oldest', 90)
    const b = await suggestProgram('Middle', 40)
    const c = await suggestTarget({ quads: 1.2 }, 5)
    const rows = await listed()
    expect(rows.map((r) => r.id)).toEqual([c, b, a])
    expect(rows[2]).toMatchObject({ id: a, kind: 'saved_workout.create', kindLabel: 'Workout', rationale: RATIONALE })
    expect(rows[2].summary).toContain('Oldest')
    expect(Number.isNaN(Date.parse(rows[0].createdAt))).toBe(false)
    expect(rows.map((r) => r.kindLabel)).toEqual(['Training targets', 'Program', 'Workout'])
  })

  it('includes anchors and saved-workout updates', async () => {
    const anchor = await suggestAnchor({ hinge: [s.squat.id] })
    const saved = await savedWorkout('Push day')
    const update = await aged(await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push A', rationale: RATIONALE }), 3)
    expect((await listed()).map((r) => [r.id, r.kindLabel])).toEqual([
      [update, 'Workout change'],
      [anchor, 'Anchor lifts'],
    ])
  })

  it('leaves out decided suggestions: accepted, rejected and no longer applying', async () => {
    const keep = await suggestWorkout('Keep', 1)
    expect((await accept(await suggestWorkout('Accepted', 30))).status).toBe(200)
    expect((await reject(await suggestWorkout('Rejected', 20))).status).toBe(200)
    const saved = await savedWorkout('Push day')
    const stale = await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push A', rationale: RATIONALE })
    await s.prisma.savedWorkout.update({ where: { id: saved.id }, data: { name: 'Mine' } })
    expect((await accept(stale)).status).toBe(409)
    expect((await listed()).map((r) => r.id)).toEqual([keep])
  })

  it('leaves out exercise-library proposals', async () => {
    await suggestExercise()
    expect(await listed()).toEqual([])
  })

  it("never lists another user's suggestions", async () => {
    await suggestWorkout('Theirs', 5, 'other')
    expect(await listed()).toEqual([])
    expect((await listed(s.otherUserId)).length).toBe(1)
  })

  it('is an empty list, not an error, with nothing pending', async () => {
    const res = await list()
    expect(res.status).toBe(200)
    expect(res.body.suggestions).toEqual([])
  })

  it('needs a signed-in user', async () => {
    const saved = auth.userId
    auth.userId = ''
    const mod = await route<{ GET: (r: NextRequest) => Promise<Response> }>('@/app/api/suggestions/route')
    const res = await mod.GET(new NextRequest('http://localhost/api/suggestions'))
    auth.userId = saved
    expect(res.status).toBe(401)
  })
})

describe('suggestions: the id routes', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('GET returns one suggestion of any status, with what the review screen needs', async () => {
    const id = await suggestWorkout('Push day')
    const pendingRes = await detail(id)
    expect(pendingRes.status).toBe(200)
    const d = pendingRes.body.suggestion as Json
    expect(d).toMatchObject({ id, kind: 'saved_workout.create', kindLabel: 'Workout', status: 'pending', outcome: null, rationale: RATIONALE })
    expect(String(d.summary)).toContain('Push day')
    await reject(id)
    const rejected = (await detail(id)).body.suggestion as Json
    expect([rejected.status, rejected.outcome]).toEqual(['rejected', 'Rejected'])
  })

  it.each([
    ['GET', detail],
    ['accept', accept],
    ['reject', reject],
  ] as const)('%s: an unknown id is 404', async (_n, fn) => {
    expect((await fn('does-not-exist')).status).toBe(404)
  })

  it.each([
    ['GET', detail],
    ['accept', accept],
    ['reject', reject],
  ] as const)("%s: another user's suggestion is 404 and unchanged", async (_n, fn) => {
    const theirs = await suggestWorkout('Theirs', 5, 'other')
    expect((await fn(theirs)).status).toBe(404)
    expect(await statusOf(theirs)).toBe('pending')
    expect(await s.prisma.savedWorkout.count()).toBe(0)
  })

  it.each([
    ['GET', detail],
    ['accept', accept],
    ['reject', reject],
  ] as const)('%s: a hidden kind is 404 and unchanged', async (_n, fn) => {
    const hidden = await suggestExercise()
    expect((await fn(hidden)).status).toBe(404)
    expect(await statusOf(hidden)).toBe('pending')
  })

  it('a hidden kind is also 404 for its own user after the admin decided it', async () => {
    const hidden = await suggestExercise()
    const { approveProposal } = await route<typeof import('@/lib/proposals/service')>('@/lib/proposals/service')
    await approveProposal(s.prisma, hidden, s.userId)
    expect((await detail(hidden)).status).toBe(404)
  })

  it('accept and reject need a signed-in user', async () => {
    const id = await suggestWorkout('Push day')
    const saved = auth.userId
    auth.userId = ''
    for (const spec of ['@/app/api/suggestions/[id]/accept/route', '@/app/api/suggestions/[id]/reject/route']) {
      const mod = await route<{ POST: (r: NextRequest, c: Ctx) => Promise<Response> }>(spec)
      const res = await mod.POST(new NextRequest('http://localhost/x', { method: 'POST' }), { params: Promise.resolve({ id }) })
      expect(res.status).toBe(401)
    }
    auth.userId = saved
    expect(await statusOf(id)).toBe('pending')
  })

  it('accept: a suggestion that is not pending is 409 not_pending, and nothing is applied twice', async () => {
    const id = await suggestWorkout('Push day')
    expect((await accept(id)).status).toBe(200)
    const again = await accept(id)
    expect([again.status, again.body.code]).toEqual([409, 'not_pending'])
    expect(typeof again.body.error).toBe('string')
    expect(await s.prisma.savedWorkout.count()).toBe(1)
  })

  it('accept: a rejected suggestion is 409 and stays rejected', async () => {
    const id = await suggestWorkout('Push day')
    await reject(id)
    const res = await accept(id)
    expect([res.status, res.body.code]).toEqual([409, 'not_pending'])
    expect(await statusOf(id)).toBe('rejected')
    expect(await s.prisma.savedWorkout.count()).toBe(0)
  })

  it('accept: a conflict is 409 with code conflict, status conflict, and nothing changes', async () => {
    const saved = await savedWorkout('Push day')
    const id = await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push Day A', rationale: RATIONALE })
    await s.prisma.savedWorkout.update({ where: { id: saved.id }, data: { name: 'Mine' } })
    const res = await accept(id)
    expect([res.status, res.body.code]).toEqual([409, 'conflict'])
    expect(await statusOf(id)).toBe('conflict')
    expect((await s.prisma.savedWorkout.findUniqueOrThrow({ where: { id: saved.id } })).name).toBe('Mine')
    const after = (await detail(id)).body.suggestion as Json
    expect(after.outcome).toBe('No longer applies')
  })

  it('accept: a program suggestion answers with the new program id', async () => {
    const id = await suggestProgram('3-Day Strength')
    const res = await accept(id)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const program = await s.prisma.program.findFirstOrThrow({ where: { userId: s.userId, name: '3-Day Strength' } })
    expect(res.body.programId).toBe(program.id)
    expect(program.isActive).toBe(false)
  })

  it('accept: other kinds carry no program id', async () => {
    const res = await accept(await suggestWorkout('Push day'))
    expect(res.status).toBe(200)
    expect(res.body.programId ?? null).toBeNull()
  })

  it('accept: anchors are updated', async () => {
    const id = await suggestAnchor({ hinge: [s.squat.id] })
    expect((await accept(id)).status).toBe(200)
    const profile = await s.prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId: s.userId } })
    expect((profile.targetMovements as Record<string, string[]>).hinge).toEqual([s.squat.id])
  })

  it('reject: marks it rejected and applies nothing', async () => {
    const id = await suggestProgram('3-Day Strength')
    const res = await reject(id)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(await statusOf(id)).toBe('rejected')
    expect(await s.prisma.program.count({ where: { userId: s.userId } })).toBe(0)
  })

  it('reject: a decided suggestion is 409', async () => {
    const id = await suggestWorkout('Push day')
    await accept(id)
    const res = await reject(id)
    expect([res.status, res.body.code]).toEqual([409, 'not_pending'])
    expect(await statusOf(id)).toBe('applied')
  })

  it('there is no revert route for users', async () => {
    await expect(load('@/app/api/suggestions/[id]/revert/route')).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Edges: getSuggestionDetail and the shared bodies
// ---------------------------------------------------------------------------
describe('suggestions: getSuggestionDetail', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('is null for a hidden kind, another user\'s and an unknown id', async () => {
    expect(await getDetail(await suggestExercise())).toBeNull()
    expect(await getDetail(await suggestWorkout('Theirs', 5, 'other'))).toBeNull()
    expect(await getDetail('nope')).toBeNull()
  })

  it('a workout create has its name, notes and exercises with library names and sets', async () => {
    const d = (await getDetail(await suggestWorkout('Push day'))) as Detail
    expect(d.body.type).toBe('saved_workout_create')
    expect(d.body.name).toBe('Push day')
    const exercises = d.body.exercises as Array<{ name: string; notes?: string | null; sets: Array<{ reps: string }> }>
    expect(exercises.map((e) => e.name)).toEqual(['Barbell Bench Press', 'Back Squat'])
    expect(exercises.map((e) => e.sets.length)).toEqual([2, 1])
    expect(exercises[1].notes).toBe('Brace')
    expect(d.kindLabel).toBe('Workout')
    expect([d.status, d.outcome, d.programId]).toEqual(['pending', null, null])
  })

  it('a workout update has before and after per touched field', async () => {
    const saved = await savedWorkout('Push day')
    const id = await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push Day A', notes: 'Heavy', rationale: RATIONALE })
    const d = (await getDetail(id)) as Detail
    expect(d.body.type).toBe('saved_workout_update')
    expect(d.body.rows?.map((r) => [r.field, r.before, r.after])).toEqual([
      ['Name', 'Push day', 'Push Day A'],
      ['Notes', null, 'Heavy'],
    ])
    expect(d.kindLabel).toBe('Workout change')
  })

  it('a pending update whose workout moved shows the live value', async () => {
    const saved = await savedWorkout('Push day')
    const id = await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push Day A', rationale: RATIONALE })
    await s.prisma.savedWorkout.update({ where: { id: saved.id }, data: { name: 'Mine' } })
    const d = (await getDetail(id)) as Detail
    expect(d.body.rows?.[0].current).toBe('Mine')
  })

  it('a program has its outline data and exercise names', async () => {
    const d = (await getDetail(await suggestProgram('3-Day Strength'))) as Detail
    expect(d.body.type).toBe('program')
    expect((d.body.program as { name: string }).name).toBe('3-Day Strength')
    expect(Object.values(d.body.definitionNames as Record<string, string>).sort()).toEqual(['Back Squat', 'Barbell Bench Press'])
    expect(d.kindLabel).toBe('Program')
  })

  it('an applied program suggestion carries the created program id', async () => {
    const id = await suggestProgram('3-Day Strength')
    await accept(id)
    const d = (await getDetail(id)) as Detail
    const program = await s.prisma.program.findFirstOrThrow({ where: { name: '3-Day Strength' } })
    expect([d.status, d.outcome, d.programId]).toEqual(['applied', 'Accepted', program.id])
  })

  it('targets use display names: "Quads" and "Mid Back", never the keys', async () => {
    const d = (await getDetail(await suggestTarget({ quads: 1.3, 'mid-back': 1.2 }))) as Detail
    expect(d.body.type).toBe('diff')
    expect(d.body.rows?.map((r) => r.field).sort()).toEqual(['Mid Back', 'Quads'])
    expect(JSON.stringify(d.body.rows?.map((r) => r.field))).not.toMatch(/quads|mid-back/)
    expect(d.kindLabel).toBe('Training targets')
  })

  it('anchors use pattern display names and exercise names, never keys or ids', async () => {
    const d = (await getDetail(await suggestAnchor({ horizontal_push: [s.bench.id], hinge: [s.squat.id] }))) as Detail
    expect(d.body.rows?.map((r) => r.field).sort()).toEqual(['Hinge', 'Horizontal Push'])
    const byField = Object.fromEntries((d.body.rows ?? []).map((r) => [r.field, r.after]))
    expect(byField['Horizontal Push']).toEqual(['Barbell Bench Press'])
    expect(byField.Hinge).toEqual(['Back Squat'])
    expect(d.kindLabel).toBe('Anchor lifts')
  })

  it.each([
    ['rejected', async (id: string) => reject(id), 'Rejected'],
    ['applied', async (id: string) => accept(id), 'Accepted'],
  ])('a %s suggestion has the outcome %s', async (_status, decide, outcome) => {
    const id = await suggestWorkout('Push day')
    await decide(id)
    expect(((await getDetail(id)) as Detail).outcome).toBe(outcome)
  })
})

// ---------------------------------------------------------------------------
// Edges: getTrainingHome().suggestions
// ---------------------------------------------------------------------------
describe('suggestions: getTrainingHome', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('is empty with nothing pending', async () => {
    expect((await getHome()).suggestions).toEqual({ count: 0, items: [] })
  })

  it('holds the newest 3 but counts all pending', async () => {
    const ids: string[] = []
    for (const [i, name] of ['One', 'Two', 'Three', 'Four'].entries()) ids.push(await suggestWorkout(name, 100 - i * 10))
    const { suggestions } = await getHome()
    expect(suggestions.count).toBe(4)
    expect(suggestions.items.map((i) => i.id)).toEqual([ids[3], ids[2], ids[1]])
    expect(suggestions.items[0]).toMatchObject({ kind: 'saved_workout.create', rationale: RATIONALE })
    expect(suggestions.items[0].summary).toContain('Four')
    expect(suggestions.items[0].createdAt).toBeInstanceOf(Date)
  })

  it('counts only pending, allowed kinds, own', async () => {
    await suggestWorkout('Mine', 5)
    await suggestExercise()
    await suggestWorkout('Theirs', 5, 'other')
    await reject(await suggestWorkout('Rejected', 8))
    expect((await getHome()).suggestions.count).toBe(1)
  })

  it('does not disturb the other sections', async () => {
    await suggestWorkout('Mine', 5)
    const home = await getHome()
    expect([home.upNext, home.pinned, home.recent, home.currentProgram]).toEqual([null, [], [], null])
  })
})

// ---------------------------------------------------------------------------
// Titles (review 049): users see suggestionTitle, never the service summary
// ---------------------------------------------------------------------------
type TitleFn = (kind: string, payload: unknown, before: unknown) => string
async function titleFn(): Promise<TitleFn> {
  for (const name of ['title', 'titles', 'kinds', 'bodies', 'detail']) {
    try {
      const mod = (await load(`@/lib/suggestions/${name}`)) as { suggestionTitle?: TitleFn }
      if (typeof mod.suggestionTitle === 'function') return mod.suggestionTitle
    } catch {
      // try the next module
    }
  }
  throw new Error('suggestionTitle is not exported from lib/suggestions')
}

describe('suggestions: suggestionTitle', () => {
  it('a workout create is the workout\'s name', async () => {
    const title = await titleFn()
    expect(title('saved_workout.create', { name: 'Push day', notes: null, exercises: [] }, null)).toBe('Push day')
  })

  it('a workout update is "<name>: <changed fields>" in name, notes, exercises order', async () => {
    const title = await titleFn()
    const before = { name: 'Push A', notes: null, exercises: [] }
    expect(title('saved_workout.update', { savedWorkoutId: 'x', changes: { exercises: [], name: 'Push B' } }, before)).toBe('Push A: name, exercises')
    expect(title('saved_workout.update', { savedWorkoutId: 'x', changes: { notes: 'Heavy' } }, before)).toBe('Push A: notes')
    expect(title('saved_workout.update', { savedWorkoutId: 'x', changes: { exercises: [], notes: 'n', name: 'Z' } }, before)).toBe('Push A: name, notes, exercises')
  })

  it('a program is the program\'s name', async () => {
    const title = await titleFn()
    expect(title('program.create', { name: '3-Day Strength', description: 'x', weeks: [] }, null)).toBe('3-Day Strength')
  })

  it('targets read "<FAU name> <before> → <after>", joined with commas, in the order changed', async () => {
    const title = await titleFn()
    expect(title('balance_targets.update', { changes: { quads: 1.3 } }, { quads: 1 })).toBe('Quads 1 → 1.3')
    expect(title('balance_targets.update', { changes: { quads: 1.25, 'mid-back': 2 } }, { quads: 1, 'mid-back': 1.5 })).toBe(
      'Quads 1 → 1.25, Mid Back 1.5 → 2'
    )
  })

  it('anchors are the pattern display names, joined with commas', async () => {
    const title = await titleFn()
    expect(title('anchors.update', { changes: { horizontal_push: ['a'], hinge: ['b'] } }, {})).toBe('Horizontal Push, Hinge')
    expect(title('anchors.update', { changes: { vertical_pull: ['a'] } }, { vertical_pull: ['z'] })).toBe('Vertical Pull')
  })

  it('never shows an FAU or pattern key', async () => {
    const title = await titleFn()
    const t1 = title('balance_targets.update', { changes: { 'mid-back': 1.2, 'rear-delts': 1.1 } }, { 'mid-back': 1, 'rear-delts': 1 })
    const t2 = title('anchors.update', { changes: { horizontal_push: ['a'], vertical_pull: ['b'] } }, {})
    expect(t1).not.toMatch(/mid-back|rear-delts/)
    expect(t2).not.toMatch(/horizontal_push|vertical_pull|_/)
  })
})

describe('suggestions: titles on every surface', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  async function seedAll() {
    const saved = await savedWorkout('Push day')
    return {
      create: await suggestWorkout('Short Full-Body Workout', 50),
      update: await aged(await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push Day B', rationale: RATIONALE }), 40),
      program: await suggestProgram('3-Day Strength', 30),
      targets: await suggestTarget({ quads: 1.3 }, 20),
      anchors: await suggestAnchor({ hinge: [s.squat.id], horizontal_push: [s.bench.id] }, 10),
    }
  }
  const EXPECT = (id: string, ids: Awaited<ReturnType<typeof seedAll>>) =>
    ({
      [ids.create]: 'Short Full-Body Workout',
      [ids.update]: 'Push day: name',
      [ids.program]: '3-Day Strength',
      [ids.targets]: 'Quads 1 → 1.3',
      [ids.anchors]: 'Hinge, Horizontal Push',
    })[id]

  it('the list API gives each item a title, and leaves the summary as the service wrote it', async () => {
    const ids = await seedAll()
    const rows = await listed()
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      expect(row.title).toBe(EXPECT(row.id, ids))
      const proposal = await s.prisma.proposal.findUniqueOrThrow({ where: { id: row.id } })
      expect(row.summary).toBe(proposal.summary)
      expect(row.title).not.toBe(row.summary)
    }
  })

  it('the review detail has the same title, and keeps the summary', async () => {
    const ids = await seedAll()
    for (const id of Object.values(ids)) {
      const d = (await getDetail(id)) as Detail & { title: string }
      expect(d.title).toBe(EXPECT(id, ids))
      const proposal = await s.prisma.proposal.findUniqueOrThrow({ where: { id } })
      expect(d.summary).toBe(proposal.summary)
      const viaRoute = (await detail(id)).body.suggestion as Json
      expect(viaRoute.title).toBe(EXPECT(id, ids))
    }
  })

  it('Training\'s items carry the title as well as the summary', async () => {
    const ids = await seedAll()
    const { suggestions } = await getHome()
    expect(suggestions.items.map((i) => [i.id, i.title])).toEqual([
      [ids.anchors, 'Hinge, Horizontal Push'],
      [ids.targets, 'Quads 1 → 1.3'],
      [ids.program, '3-Day Strength'],
    ])
    for (const item of suggestions.items) {
      const proposal = await s.prisma.proposal.findUniqueOrThrow({ where: { id: item.id } })
      expect(item.summary).toBe(proposal.summary)
    }
  })

  it('the Training section shows titles, never summaries', async () => {
    await seedAll()
    const home = await renderHome()
    for (const item of home.suggestions.items) {
      expect(screen.getByText(item.title)).toBeTruthy()
      expect(screen.queryByText(item.summary)).toBeNull()
    }
    expect(document.body.textContent).not.toMatch(/New saved workout|New program|Update saved workout/i)
  })

  it('a title uses the workout\'s name as it was when proposed, even after a rename', async () => {
    const saved = await savedWorkout('Push day')
    const id = await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push Day A', rationale: RATIONALE })
    await s.prisma.savedWorkout.update({ where: { id: saved.id }, data: { name: 'Mine' } })
    const row = (await listed()).find((r) => r.id === id)
    expect(row?.title).toBe('Push day: name')
  })
})

// ---------------------------------------------------------------------------
// Error wording (review 049)
// ---------------------------------------------------------------------------
describe('suggestions: error wording', () => {
  beforeEach(async () => {
    s = await freshState()
  })
  const WORDS = {
    not_pending: 'This suggestion was already decided.',
    conflict: 'This suggestion no longer applies.',
    not_found: 'Suggestion not found.',
    invalid: "This suggestion can't be applied.",
  }
  const noProposal = (body: Json) => expect(JSON.stringify(body)).not.toMatch(/proposal/i)

  it.each([
    ['GET', detail],
    ['accept', accept],
    ['reject', reject],
  ] as const)('%s: not found says "Suggestion not found." for unknown, hidden and other users\' ids', async (_n, fn) => {
    const theirs = await suggestWorkout('Theirs', 5, 'other')
    const hidden = await suggestExercise()
    for (const id of ['does-not-exist', theirs, hidden]) {
      const res = await fn(id)
      expect(res.status).toBe(404)
      expect(res.body.error).toBe(WORDS.not_found)
      noProposal(res.body)
    }
  })

  it.each([
    ['accept', accept],
    ['reject', reject],
  ] as const)('%s: a decided suggestion says "This suggestion was already decided."', async (_n, fn) => {
    const id = await suggestWorkout('Push day')
    await accept(id)
    const res = await fn(id)
    expect([res.status, res.body.code, res.body.error]).toEqual([409, 'not_pending', WORDS.not_pending])
    noProposal(res.body)
  })

  it('a rejected suggestion also says it was already decided', async () => {
    const id = await suggestWorkout('Push day')
    await reject(id)
    const res = await accept(id)
    expect(res.body.error).toBe(WORDS.not_pending)
  })

  it('a conflict says "This suggestion no longer applies."', async () => {
    const saved = await savedWorkout('Push day')
    const id = await agent('propose_workout_update', { savedWorkoutId: saved.id, name: 'Push Day A', rationale: RATIONALE })
    await s.prisma.savedWorkout.update({ where: { id: saved.id }, data: { name: 'Mine' } })
    const res = await accept(id)
    expect([res.status, res.body.code, res.body.error]).toEqual([409, 'conflict', WORDS.conflict])
    noProposal(res.body)
  })

  it('an invalid suggestion says "This suggestion can\'t be applied." and stays pending', async () => {
    const id = await suggestProgram('3-Day Strength')
    await s.prisma.exerciseDefinition.deleteMany({ where: { id: { in: [s.bench.id, s.squat.id] } } })
    const res = await accept(id)
    expect([res.status, res.body.code, res.body.error]).toEqual([422, 'invalid', WORDS.invalid])
    noProposal(res.body)
    expect(await statusOf(id)).toBe('pending')
  })

  it('accept answers with data of exactly { id, status, kind }', async () => {
    const id = await suggestWorkout('Push day')
    const res = await accept(id)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id, status: 'applied', kind: 'saved_workout.create' })
    noProposal(res.body)
  })

  it('a program accept keeps the program id beside data', async () => {
    const id = await suggestProgram('3-Day Strength')
    const res = await accept(id)
    expect(res.body.data).toEqual({ id, status: 'applied', kind: 'program.create' })
    const program = await s.prisma.program.findFirstOrThrow({ where: { name: '3-Day Strength' } })
    expect(res.body.programId).toBe(program.id)
  })

  it('reject answers with data of exactly { id, status, kind }', async () => {
    const id = await suggestAnchor({ hinge: [s.squat.id] })
    const res = await reject(id)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id, status: 'rejected', kind: 'anchors.update' })
  })

  it('no response leaks the payload, token or user columns', async () => {
    const id = await suggestWorkout('Push day')
    const body = JSON.stringify((await accept(id)).body)
    for (const leak of ['payload', 'agentTokenId', 'userId', 'inverse', 'rationale']) expect(body).not.toContain(leak)
  })
})

// ---------------------------------------------------------------------------
// Rate limiting (review 049)
// ---------------------------------------------------------------------------
describe('suggestions: rate limiting', () => {
  beforeEach(async () => {
    s = await freshState()
  })
  afterEach(() => {
    rl.refuse = false
  })

  it('a refusing limiter gives 429 on both GET routes', async () => {
    const id = await suggestWorkout('Push day')
    rl.refuse = true
    expect((await list()).status).toBe(429)
    expect((await detail(id)).status).toBe(429)
  })

  it('a refusing limiter gives 429 on accept and reject, with nothing changed', async () => {
    const id = await suggestWorkout('Push day')
    rl.refuse = true
    expect((await accept(id)).status).toBe(429)
    expect((await reject(id)).status).toBe(429)
    rl.refuse = false
    expect(await statusOf(id)).toBe('pending')
    expect(await s.prisma.savedWorkout.count()).toBe(0)
  })

  it('the limit is checked before the id is looked up', async () => {
    rl.refuse = true
    expect((await detail('does-not-exist')).status).toBe(429)
  })

  it('with the limiter open the same calls succeed', async () => {
    const id = await suggestWorkout('Push day')
    expect((await list()).status).toBe(200)
    expect((await detail(id)).status).toBe(200)
  })
})

afterEach(() => {
  cleanup()
})
