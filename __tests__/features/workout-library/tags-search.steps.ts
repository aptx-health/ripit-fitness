/**
 * Step definitions for features/workout-library/tags-search.feature
 * (work 226, slice 2). Design: initiatives/workout-library/docs/141-discovery.md.
 *
 * Contract the tests pin (the implementer builds it; existing files change
 * unless marked new):
 *
 *   Schema: SavedWorkout.tags String[] @default([]) with a GIN index
 *     (@@index([tags], type: Gin)). The hand-written migration under
 *     prisma/migrations/ adds the "tags" column to "SavedWorkout" and creates the
 *     index USING GIN. The tests read and write tags through untyped delegates,
 *     so this file type-checks before the Prisma client is regenerated.
 *
 *   lib/saved-workouts/tags.ts (new)
 *     STARTER_TAGS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Core', 'Cardio', 'Quick']
 *     TAG_MAX_LENGTH = 24, MAX_TAGS_PER_WORKOUT = 8, MAX_TAGS_PER_USER = 50
 *     normaliseTag(raw: string, known: readonly string[]): string | null
 *       Trims and turns every run of whitespace into one space; null when
 *       nothing is left. Then the first entry of `known` equal to it ignoring
 *       case, spelled as in `known`; otherwise the tidied text as typed.
 *       Callers pass the user's own tags followed by STARTER_TAGS. No limits here.
 *     normaliseTags(raw: readonly string[], known): string[]
 *       normaliseTag on each, empties dropped, a repeat (ignoring case) dropped,
 *       first one kept, order kept.
 *     (__tests__/lib/saved-workout-tags.test.ts)
 *
 *   A user's tags are the distinct tags on their own saved workouts. A starter
 *   tag is one of them once a workout carries it.
 *
 *   PATCH /api/workouts/saved/[id]  body { tags: string[] }, sent on its own.
 *     Replaces the workout's tags with normaliseTags(tags, [user's tags, ...STARTER_TAGS]).
 *     200 { saved: { ...the row's list fields, tags } }.
 *     400 { error, limit } and nothing written when, after normalising:
 *       a tag is over 24 characters      limit: 'length'
 *       the workout has over 8 tags      limit: 'perWorkout'
 *       the user would have over 50 different tags (ignoring case), counted
 *       after this change                limit: 'perUser'
 *     400 (no write) when tags isn't an array of strings.
 *     Another user's id is 404, the same as an unknown id; 401 signed out;
 *     refused by checkRateLimit (keyed on the user id) with no write; 500 and
 *     logger.error when the database fails. Its query count doesn't grow with
 *     the number of the user's workouts.
 *   GET /api/workouts/saved  each row has tags: string[].
 *
 *   components/features/saved-workouts (SavedWorkoutsList and its rows):
 *     The row panel gains a button named "Tags for <name>" (its text can be
 *     "Tags…"). It opens a dialog named "Tags for <name>" holding:
 *       one toggle button per tag (aria-pressed), named exactly the tag: the
 *         user's tags and the starter tags, each once;
 *       a textbox named "New tag" and an "Add" button; adding normalises the
 *         text and turns that tag on (an existing chip, or a new one);
 *       a "Done" button that closes it and saves the tags (PATCH above).
 *     Past a limit, a role="alert" in the dialog says which ("24 characters",
 *     "8 tags", "50 tags") and nothing is added.
 *     A row shows its tags (their text is inside the row's <li>).
 *     Above the groups: a search box (role searchbox, name "Search workouts")
 *     and a group named "Filter by tag" holding one toggle button
 *     (aria-pressed) per tag in use, named exactly the tag.
 *     While searching or filtering, each group (region New, Pinned, Recent,
 *     Older) lists only matching workouts, in the usual order; a group with none
 *     is not shown; Older's matches show without a tap. Nothing matching: the
 *     text "No workouts match" and a button "Clear" that clears both.
 *     Archived workouts never show in a group; with Show archived open, the
 *     archived ones that match show there.
 *     Every new button is a 48px tap target and uses theme colours only.
 *
 *   lib/mcp/tools.ts
 *     list_saved_workouts({ includeArchived?, tag?: string }): each workout has
 *       tags; with tag, only the user's workouts carrying it.
 *     propose_workout_create({ ..., tags?: string[] }): the result gains
 *       droppedTags: string[]. Tags are matched (normaliseTag) against the
 *       user's tags and STARTER_TAGS when the proposal is made; a tag matching
 *       neither is dropped. Approving writes the kept tags to the new workout.
 *   lib/coaching/send.ts  sendToTrainee carries the coach's saved workout's
 *     tags, matched the same way against the trainee's tags and STARTER_TAGS;
 *     { ok: true, proposalId, droppedTags }. Accepting writes the kept tags.
 *
 * Here the UI talks to the real route handlers: fetch is stubbed to call them.
 * vitest-cucumber runs every step as its own test and Testing Library cleans up
 * between tests, so each UI step renders and does everything it checks.
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

const feature = await loadFeature('features/workout-library/tags-search.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Json = Record<string, unknown>
type Delegate = Record<string, (args?: unknown) => Promise<unknown>>
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)
const STARTERS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Core', 'Cardio', 'Quick']

interface State {
  prisma: PrismaClient
  user: string
  other: string
  tokenId: string
  ids: Record<string, string>
  pending?: string
  sent?: { agent: Json; agentId: string; coach: Json; coachId: string }
}
let s: State

const saved = () => (s.prisma as unknown as Record<string, Delegate>).savedWorkout
const row = async (id: string) => (await saved().findUnique({ where: { id } })) as Json
const tagsOf = async (name: string, userId = s.user) =>
  ((await saved().findFirst({ where: { name, userId } })) as Json).tags as string[]
const sorted = (a: unknown) => [...(a as string[])].sort()

type Seed = {
  origin?: string
  lastUsedAt?: Date | null
  createdAt?: Date
  pinnedAt?: Date | null
  archivedAt?: Date | null
  notes?: string | null
  tags?: string[]
  userId?: string
  workoutData?: unknown
}
async function seed(name: string, o: Seed = {}): Promise<string> {
  const made = (await saved().create({
    data: {
      userId: o.userId ?? s.user,
      name,
      notes: o.notes ?? null,
      workoutData: o.workoutData ?? [],
      exerciseCount: 3,
      lastUsedAt: o.lastUsedAt === undefined ? null : o.lastUsedAt,
      createdAt: o.createdAt ?? daysAgo(5),
      pinnedAt: o.pinnedAt ?? null,
      tags: o.tags ?? [],
      ...(o.origin !== undefined && { origin: o.origin }),
      ...(o.archivedAt !== undefined && { archivedAt: o.archivedAt }),
    },
  })) as Json
  s.ids[name] = String(made.id)
  return String(made.id)
}

/** Fill the user's tags up to `total` different ones with workouts of up to 8 tags. */
async function fillTags(total: number) {
  const have = new Set(((await saved().findMany({ where: { userId: s.user } })) as Json[]).flatMap((r) => r.tags as string[]))
  const extra = Array.from({ length: total - have.size }, (_, i) => `Filler ${i + 1}`)
  for (let i = 0; i < extra.length; i += 8)
    await seed(`Filler workout ${i / 8 + 1}`, { lastUsedAt: daysAgo(90), createdAt: daysAgo(90), tags: extra.slice(i, i + 8) })
}

async function agentToken(userId: string, name: string) {
  const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
  return (await createAgentToken(s.prisma, userId, name)).record.id
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
  // New, Pinned, Recent (3) and Older (3). The user's tags: Legs, Hill sprints, Pull.
  await seed('Bench Machine', { origin: 'agent', createdAt: daysAgo(1) })
  await seed('Upper A', { lastUsedAt: daysAgo(60), createdAt: daysAgo(90), pinnedAt: daysAgo(10), notes: 'Bench focus' })
  await seed('Leg Day', { lastUsedAt: daysAgo(2), createdAt: daysAgo(40), tags: ['Legs', 'Hill sprints'] })
  await seed('Bench Blast', { lastUsedAt: daysAgo(5), createdAt: daysAgo(40) })
  await seed('Squat Focus', { lastUsedAt: daysAgo(7), createdAt: daysAgo(40), tags: ['Legs'] })
  await seed('Old Pull', { lastUsedAt: daysAgo(45), createdAt: daysAgo(100), tags: ['Pull'] })
  await seed('Bench Classic', { lastUsedAt: daysAgo(60), createdAt: daysAgo(100) })
  await seed('Squat Classic', { lastUsedAt: daysAgo(70), createdAt: daysAgo(100) })
  // Someone else's, with a tag the user doesn't have.
  await seed('Their Legs', { userId: other, lastUsedAt: daysAgo(1), tags: ['Legs', 'Their Secret'] })
  return s
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
const patchTags = (name: string, tags: unknown) => patch(s.ids[name], { tags })

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
      if (!res) res = new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
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
  await screen.findAllByRole('listitem')
}
const region = (name: string) => screen.queryByRole('region', { name })
const headerOf = (li: HTMLElement) =>
  within(li)
    .queryAllByRole('button')
    .find((b) => b.hasAttribute('aria-expanded'))
const nameOf = (li: HTMLElement) =>
  headerOf(li)?.querySelector('span')?.textContent ??
  within(li).queryByRole('button', { name: /^View / })?.getAttribute('aria-label')?.replace(/^View /, '')
const namesIn = (r: HTMLElement | null) => (r ? within(r).queryAllByRole('listitem').map(nameOf) : [])
const shown = (name: string) => screen.queryAllByText(name, { exact: true }).filter((el) => el.closest('li'))
const rowOf = (name: string, scope: HTMLElement = document.body) => {
  const li = within(scope)
    .queryAllByText(name, { exact: true })
    .map((el) => el.closest('li'))
    .find(Boolean) as HTMLElement | undefined
  expect(li, `a row for ${name}`).toBeTruthy()
  return li as HTMLElement
}
const openRow = (name: string) => {
  const li = rowOf(name)
  const header = headerOf(li) as HTMLElement
  if (header.getAttribute('aria-expanded') !== 'true') fireEvent.click(header)
  return li
}
async function openOlder() {
  const fold = screen.queryByRole('button', { name: /^older \(\d+\)/i })
  if (fold && fold.getAttribute('aria-expanded') === 'false') fireEvent.click(fold)
}
/** Every region's rows, in page order: { New: [...], Pinned: [...] }. */
const groupsShown = () =>
  Object.fromEntries(
    ['New', 'Pinned', 'Recent', 'Older'].flatMap((g) => (region(g) ? [[g, namesIn(region(g))]] : []))
  )
const regionOrder = () =>
  screen
    .queryAllByRole('region')
    .map((r) => r.getAttribute('aria-label'))
    .filter((n) => ['New', 'Pinned', 'Recent', 'Older'].includes(String(n)))

const searchBox = () => screen.getByRole('searchbox', { name: /search workouts/i }) as HTMLInputElement
async function search(text: string) {
  await act(async () => {
    fireEvent.change(searchBox(), { target: { value: text } })
  })
}
const filterGroup = () => screen.getByRole('group', { name: /filter by tag/i })
const filterChip = (tag: string) => within(filterGroup()).queryByRole('button', { name: tag })
async function tapFilter(tag: string) {
  const chip = filterChip(tag)
  expect(chip, `a filter chip ${tag}`).toBeTruthy()
  await act(async () => {
    fireEvent.click(chip as HTMLElement)
  })
}

/** Open a row's Tags dialog. */
async function openTags(name: string) {
  if (!shown(name).length) await openOlder()
  const li = openRow(name)
  fireEvent.click(within(li).getByRole('button', { name: `Tags for ${name}` }))
  return screen.findByRole('dialog', { name: `Tags for ${name}` })
}
const sheetChip = (dialog: HTMLElement, tag: string) => within(dialog).queryByRole('button', { name: tag })
const pressed = (el: HTMLElement | null) => el?.getAttribute('aria-pressed') === 'true'
const pressedIn = (dialog: HTMLElement) =>
  within(dialog)
    .queryAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent?.trim())
async function toggle(dialog: HTMLElement, tag: string) {
  const chip = sheetChip(dialog, tag)
  expect(chip, `a chip ${tag} in the sheet`).toBeTruthy()
  await act(async () => {
    fireEvent.click(chip as HTMLElement)
  })
}
async function addTyped(dialog: HTMLElement, text: string) {
  const box = within(dialog).getByRole('textbox', { name: /new tag/i })
  await act(async () => {
    fireEvent.change(box, { target: { value: text } })
  })
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: /^add$/i }))
  })
}
async function done(dialog: HTMLElement) {
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: /^done$/i }))
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}
async function untilDb(check: () => Promise<boolean>, what: string) {
  await waitFor(async () => expect(await check(), what).toBe(true))
}
const sameTags = (name: string, want: string[]) => async () =>
  JSON.stringify(sorted(await tagsOf(name))) === JSON.stringify(sorted(want))

async function callTool(name: string, args: Json, userId = s.user, tokenId = s.tokenId) {
  const tools = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
  const res = await tools.callTool(s.prisma, { userId, tokenId, role: 'user', notify: async () => {} }, name, args)
  expect(res.isError, res.content[0]?.text).toBeFalsy()
  return JSON.parse(res.content[0].text) as Json
}
const listSaved = async (args: Json = {}) => (await callTool('list_saved_workouts', args)).savedWorkouts as Json[]
const service = async () => (await load('@/lib/proposals/service')) as typeof import('@/lib/proposals/service')

/** One exercise and a set, as the stored workoutData shape. */
async function workoutData() {
  const def = await createTestExerciseDefinition(s.prisma, {
    name: `Bench ${Math.random().toString(36).slice(2, 7)}`,
    isSystem: true,
  } as never)
  return {
    def: def.id,
    data: [
      {
        name: def.name,
        exerciseDefinitionId: def.id,
        order: 1,
        notes: null,
        exerciseGroup: null,
        sets: [{ setNumber: 1, reps: '8', rir: null, rpe: null, isWarmup: false }],
      },
    ],
  }
}

/** The agent proposes "Agent Push" with tags; the coach sends "Coach Pull" with tags. Nothing approved yet. */
async function sendBoth() {
  const { def, data } = await workoutData()
  const agent = await callTool('propose_workout_create', {
    name: 'Agent Push',
    exercises: [{ exerciseDefinitionId: def, sets: [{ reps: '8' }] }],
    rationale: 'Try this',
    tags: ['push', 'Hill Sprints', 'Secret Sauce'],
  })
  const coach = (await createTestUser()).id
  const link = await s.prisma.coachLink.create({ data: { coachUserId: coach, traineeUserId: s.user } })
  const source = await seed('Coach Pull', { userId: coach, workoutData: data, tags: ['Pull', 'Hill sprints', 'Coach Only'] })
  const { sendToTrainee } = (await load('@/lib/coaching/send')) as {
    sendToTrainee: (db: PrismaClient, coachUserId: string, input: Json) => Promise<Json>
  }
  const sent = await sendToTrainee(s.prisma, coach, { linkId: link.id, kind: 'saved_workout', sourceId: source })
  expect(sent.ok, JSON.stringify(sent)).toBe(true)
  s.sent = { agent, agentId: String(agent.proposalId), coach: sent, coachId: String(sent.proposalId) }
}
async function approved(proposalId: string) {
  const ok = await (await service()).approveProposal(s.prisma, proposalId, s.user)
  expect(ok.ok, JSON.stringify(ok)).toBe(true)
  const p = (await s.prisma.proposal.findUnique({ where: { id: proposalId } })) as Json
  return (await row(String(p.targetId))).tags as string[]
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
  Background(({ Given, And }) => {
    Given('I am signed in', async () => {
      await freshState()
    })
    And('I have saved workouts in Library → Workouts', async () => {
      expect(Object.keys(s.ids)).toContain('Leg Day')
    })
  })

  // Tagging -----------------------------------------------------------------------
  Scenario('Tag a workout from its row menu', ({ When, Then, And }) => {
    When('I choose "Tags…" from a workout\'s ⋮ menu', async () => {
      s.pending = 'tags Bench Blast'
    })
    Then('a sheet shows my existing tags and the starter tags as chips', async () => {
      expect(s.pending).toBe('tags Bench Blast')
      await renderList()
      const dialog = await openTags('Bench Blast')
      for (const tag of ['Legs', 'Hill sprints', 'Pull', ...STARTERS]) expect(sheetChip(dialog, tag), tag).toBeTruthy()
      // Each once: Legs and Pull are both the user's and starters.
      expect(within(dialog).getAllByRole('button', { name: 'Legs' })).toHaveLength(1)
      expect(within(dialog).queryByRole('button', { name: 'Their Secret' })).toBeNull()
      expect(pressedIn(dialog)).toEqual([])
    })
    And('I can toggle chips on and off, or type a new tag and add it', async () => {
      await renderList()
      const dialog = await openTags('Bench Blast')
      await toggle(dialog, 'Push')
      await toggle(dialog, 'Hill sprints')
      expect(pressed(sheetChip(dialog, 'Push'))).toBe(true)
      expect(pressed(sheetChip(dialog, 'Hill sprints'))).toBe(true)
      await toggle(dialog, 'Hill sprints')
      expect(pressed(sheetChip(dialog, 'Hill sprints'))).toBe(false)
      await addTyped(dialog, 'Mobility')
      expect(pressed(sheetChip(dialog, 'Mobility'))).toBe(true)
      expect(sorted(pressedIn(dialog))).toEqual(['Mobility', 'Push'])
    })
    And("when I close the sheet the workout's tags are saved and shown on its row", async () => {
      await renderList()
      const dialog = await openTags('Bench Classic') // in Older
      await toggle(dialog, 'Push')
      await addTyped(dialog, 'Mobility')
      await done(dialog)
      await untilDb(sameTags('Bench Classic', ['Push', 'Mobility']), 'tags saved')
      const r = rowOf('Bench Classic')
      expect(within(r).getByText('Push')).toBeTruthy()
      expect(within(r).getByText('Mobility')).toBeTruthy()
      // And still there after a reload.
      cleanup()
      await renderList()
      await openOlder()
      expect(within(rowOf('Bench Classic')).getByText('Mobility')).toBeTruthy()
    })
  })

  Scenario('Starter tags', ({ Then, And }) => {
    Then(
      'the starter tags are "Push", "Pull", "Legs", "Upper", "Lower", "Full body", "Core", "Cardio" and "Quick"',
      async () => {
        const tags = (await load('@/lib/saved-workouts/tags')) as { STARTER_TAGS: readonly string[] }
        expect([...tags.STARTER_TAGS]).toEqual(STARTERS)
      }
    )
    And('a starter tag becomes one of my tags once I use it', async () => {
      await renderList()
      expect(filterChip('Legs')).toBeTruthy()
      expect(filterChip('Push')).toBeNull()
      cleanup()
      expect((await patchTags('Bench Blast', ['push'])).status).toBe(200)
      expect(await tagsOf('Bench Blast')).toEqual(['Push'])
      await renderList()
      expect(filterChip('Push')).toBeTruthy()
      expect(filterChip('Core')).toBeNull()
    })
  })

  Scenario('Tags are tidied', ({ When, Then, And }) => {
    When('I add " full  BODY "', async () => {
      s.pending = 'add full body'
    })
    Then(
      'it is saved as "Full body" (trimmed, single spaces, matched without case to a tag I already have or a starter tag)',
      async () => {
        expect(s.pending).toBe('add full body')
        await renderList()
        const dialog = await openTags('Bench Blast')
        await addTyped(dialog, ' full  BODY ')
        await addTyped(dialog, 'hill   SPRINTS')
        expect(sorted(pressedIn(dialog))).toEqual(['Full body', 'Hill sprints'])
        expect(within(dialog).getAllByRole('button', { name: 'Full body' })).toHaveLength(1)
        await done(dialog)
        await untilDb(sameTags('Bench Blast', ['Full body', 'Hill sprints']), 'tidied tags saved')
        // The route tidies too, whatever the client sends.
        expect((await patchTags('Bench Classic', [' full  BODY ', '\tlegs '])).body.saved).toMatchObject({
          tags: ['Full body', 'Legs'],
        })
      }
    )
    And('a new tag keeps the case I typed', async () => {
      const res = await patchTags('Bench Blast', ['Box JUMPS', 'mobility'])
      expect(res.status).toBe(200)
      expect(await tagsOf('Bench Blast')).toEqual(['Box JUMPS', 'mobility'])
      // Once it is one of my tags, other spellings match it.
      await patchTags('Bench Classic', ['box jumps'])
      expect(await tagsOf('Bench Classic')).toEqual(['Box JUMPS'])
    })
    And('the same tag is never on a workout twice', async () => {
      const res = await patchTags('Bench Blast', ['Legs', 'legs', ' LEGS ', 'Sled Push', 'sled  PUSH'])
      expect(res.status).toBe(200)
      expect(await tagsOf('Bench Blast')).toEqual(['Legs', 'Sled Push'])

      await renderList()
      const dialog = await openTags('Leg Day')
      await addTyped(dialog, 'LEGS')
      expect(within(dialog).getAllByRole('button', { name: 'Legs' })).toHaveLength(1)
      expect(sorted(pressedIn(dialog))).toEqual(['Hill sprints', 'Legs'])
      await done(dialog)
      await waitFor(async () => expect(sorted(await tagsOf('Leg Day'))).toEqual(['Hill sprints', 'Legs']))
    })
  })

  Scenario('Tag limits', ({ Then, And }) => {
    Then('a tag is at most 24 characters', async () => {
      const ok = 'Abcdefghij  klmnopqrstuvw' // 24 once the double space is one
      expect((await patchTags('Bench Blast', [`  ${ok} `])).status).toBe(200)
      expect(await tagsOf('Bench Blast')).toEqual(['Abcdefghij klmnopqrstuvw'])
      const res = await patchTags('Bench Blast', ['Push', 'Abcdefghijklmnopqrstuvwxy'])
      expect(res.status).toBe(400)
      expect(res.body.limit).toBe('length')
      expect(await tagsOf('Bench Blast')).toEqual(['Abcdefghij klmnopqrstuvw'])
    })
    And('a workout has at most 8 tags', async () => {
      const eight = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Core', 'Cardio', 'Quick']
      // 9 entries, but one repeats: 8 tags.
      expect((await patchTags('Bench Blast', [...eight, 'quick'])).status).toBe(200)
      expect(await tagsOf('Bench Blast')).toEqual(eight)
      const res = await patchTags('Bench Blast', [...eight, 'Full body'])
      expect(res.status).toBe(400)
      expect(res.body.limit).toBe('perWorkout')
      expect(await tagsOf('Bench Blast')).toEqual(eight)
    })
    And('I have at most 50 different tags in all', async () => {
      await freshState()
      await fillTags(49)
      expect((await patchTags('Bench Blast', ['Number Fifty'])).status).toBe(200)
      const res = await patchTags('Bench Classic', ['Number Fifty One'])
      expect(res.status).toBe(400)
      expect(res.body.limit).toBe('perUser')
      expect(await tagsOf('Bench Classic')).toEqual([])
      // Another user's tags don't count toward mine.
      await seed('Their Many', { userId: s.other, tags: ['T1', 'T2', 'T3'] })
      expect((await patchTags('Bench Classic', ['number fifty'])).status).toBe(200)
      expect(await tagsOf('Bench Classic')).toEqual(['Number Fifty'])
    })
    And('past a limit the sheet tells me which one and adds nothing', async () => {
      await freshState()
      await renderList()
      let dialog = await openTags('Leg Day')
      await addTyped(dialog, 'Abcdefghijklmnopqrstuvwxy')
      expect((await within(dialog).findByRole('alert')).textContent).toMatch(/24 characters/i)
      expect(sheetChip(dialog, 'Abcdefghijklmnopqrstuvwxy')).toBeNull()
      for (const tag of ['Push', 'Pull', 'Upper', 'Lower', 'Core', 'Cardio']) await toggle(dialog, tag)
      expect(pressedIn(dialog)).toHaveLength(8)
      await toggle(dialog, 'Quick')
      await waitFor(() => expect(within(dialog).getByRole('alert').textContent).toMatch(/8 tags/i))
      expect(pressed(sheetChip(dialog, 'Quick'))).toBe(false)
      await addTyped(dialog, 'Tempo')
      expect(sheetChip(dialog, 'Tempo')).toBeNull()
      expect(pressedIn(dialog)).toHaveLength(8)
      await done(dialog)
      await untilDb(
        sameTags('Leg Day', ['Legs', 'Hill sprints', 'Push', 'Pull', 'Upper', 'Lower', 'Core', 'Cardio']),
        'the 8 tags saved'
      )
      cleanup()

      await fillTags(50)
      await renderList()
      dialog = await openTags('Squat Classic')
      await addTyped(dialog, 'Brand New')
      expect((await within(dialog).findByRole('alert')).textContent).toMatch(/50 .*tags|50 tags/i)
      expect(sheetChip(dialog, 'Brand New')).toBeNull()
      await done(dialog)
      expect(await tagsOf('Squat Classic')).toEqual([])
    })
  })

  Scenario('Remove a tag from everything', ({ When, Then }) => {
    When('I remove the last workout using a tag', async () => {
      s.pending = 'untag Hill sprints'
    })
    Then('that tag no longer shows as a chip', async () => {
      expect(s.pending).toBe('untag Hill sprints')
      await renderList()
      expect(filterChip('Hill sprints')).toBeTruthy()
      const dialog = await openTags('Leg Day')
      await toggle(dialog, 'Hill sprints')
      await done(dialog)
      await waitFor(() => expect(filterChip('Hill sprints')).toBeNull())
      expect(filterChip('Legs')).toBeTruthy()
      await untilDb(sameTags('Leg Day', ['Legs']), 'untagged')
    })
  })

  // Finding -----------------------------------------------------------------------
  Scenario('Search', ({ When, Then, And }) => {
    When('I type in the search box on Library → Workouts', async () => {
      s.pending = 'search'
    })
    Then('only workouts whose name, notes or tags contain the text (any case) show', async () => {
      expect(s.pending).toBe('search')
      await renderList()
      await search('BENCH') // names, and Upper A's notes
      await waitFor(() =>
        expect(groupsShown()).toEqual({
          New: ['Bench Machine'],
          Pinned: ['Upper A'],
          Recent: ['Bench Blast'],
          Older: ['Bench Classic'],
        })
      )
      await search('legs') // tags only: no name has "legs"
      await waitFor(() => expect(groupsShown()).toEqual({ Recent: ['Leg Day', 'Squat Focus'] }))
      await search('SPRINT') // part of a tag
      await waitFor(() => expect(groupsShown()).toEqual({ Recent: ['Leg Day'] }))
      expect(shown('Their Legs')).toEqual([])
    })
    And('the groups (New, Pinned, Recent, Older) keep their order, hiding empty ones', async () => {
      await renderList()
      await search('bench')
      await waitFor(() => expect(regionOrder()).toEqual(['New', 'Pinned', 'Recent', 'Older']))
      await search('squat')
      await waitFor(() => expect(regionOrder()).toEqual(['Recent', 'Older']))
      expect(region('New')).toBeNull()
      expect(region('Pinned')).toBeNull()
    })
    And('Older opens by itself when it has a match', async () => {
      await renderList()
      expect(namesIn(region('Older'))).toEqual([]) // closed until a search
      await search('pull')
      await waitFor(() => expect(groupsShown()).toEqual({ Older: ['Old Pull'] }))
    })
    And('clearing the search brings everything back', async () => {
      await renderList()
      await search('bench')
      await waitFor(() => expect(region('Recent')).toBeTruthy())
      await search('')
      await waitFor(() => expect(namesIn(region('Recent'))).toEqual(['Leg Day', 'Bench Blast', 'Squat Focus']))
      expect(namesIn(region('New'))).toEqual(['Bench Machine'])
      expect(namesIn(region('Pinned'))).toEqual(['Upper A'])
      expect(screen.getByRole('button', { name: /^older \(3\)/i })).toBeTruthy()
      await openOlder()
      expect(namesIn(region('Older'))).toEqual(['Old Pull', 'Bench Classic', 'Squat Classic'])
    })
  })

  Scenario('Filter by a tag chip', ({ When, Then, And }) => {
    When('I tap a tag chip above the list', async () => {
      s.pending = 'chip'
    })
    Then('only workouts with that tag show', async () => {
      expect(s.pending).toBe('chip')
      await renderList()
      await tapFilter('Legs')
      await waitFor(() => expect(groupsShown()).toEqual({ Recent: ['Leg Day', 'Squat Focus'] }))
      expect(pressed(filterChip('Legs'))).toBe(true)
    })
    And('one chip is active at a time; tapping it again clears it', async () => {
      await renderList()
      await tapFilter('Legs')
      await tapFilter('Pull')
      expect(pressed(filterChip('Legs'))).toBe(false)
      expect(pressed(filterChip('Pull'))).toBe(true)
      await waitFor(() => expect(groupsShown()).toEqual({ Older: ['Old Pull'] }))
      await tapFilter('Pull')
      expect(pressed(filterChip('Pull'))).toBe(false)
      await waitFor(() => expect(namesIn(region('Recent'))).toEqual(['Leg Day', 'Bench Blast', 'Squat Focus']))
      expect(namesIn(region('Pinned'))).toEqual(['Upper A'])
    })
    And('search and the chip combine', async () => {
      await renderList()
      await search('squat') // Squat Focus (Legs) and Squat Classic (no tags)
      await tapFilter('Legs') // Leg Day and Squat Focus
      await waitFor(() => expect(groupsShown()).toEqual({ Recent: ['Squat Focus'] }))
    })
  })

  Scenario('No matches', ({ When, Then }) => {
    When('nothing matches', async () => {
      s.pending = 'no match'
    })
    Then('I see "No workouts match" with a "Clear" button', async () => {
      expect(s.pending).toBe('no match')
      await renderList()
      await tapFilter('Pull')
      await search('bench')
      await screen.findByText('No workouts match')
      expect(groupsShown()).toEqual({})
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^clear$/i }))
      })
      await waitFor(() => expect(namesIn(region('Recent'))).toEqual(['Leg Day', 'Bench Blast', 'Squat Focus']))
      expect(searchBox().value).toBe('')
      expect(pressed(filterChip('Pull'))).toBe(false)
      expect(screen.queryByText('No workouts match')).toBeNull()
    })
  })

  Scenario('Archived stays out', ({ Then }) => {
    Then('search and chips never show archived workouts unless "Show archived" is on', async () => {
      await seed('Bench Shelved', { lastUsedAt: daysAgo(3), archivedAt: daysAgo(1), tags: ['Legs'] })
      await renderList()
      await search('bench')
      await waitFor(() => expect(namesIn(region('Recent'))).toEqual(['Bench Blast']))
      expect(shown('Bench Shelved')).toEqual([])
      await search('')
      await tapFilter('Legs')
      await waitFor(() => expect(groupsShown()).toEqual({ Recent: ['Leg Day', 'Squat Focus'] }))
      expect(shown('Bench Shelved')).toEqual([])
      cleanup()

      // Show archived on, then search: the matching archived one shows there.
      await renderList()
      fireEvent.click(screen.getByRole('button', { name: /^show archived/i }))
      await waitFor(() => expect(shown('Bench Shelved')).toHaveLength(1))
      await search('shelved')
      await waitFor(() => expect(shown('Bench Shelved')).toHaveLength(1))
      expect(groupsShown()).toEqual({})
      expect(region('Archived')?.contains(rowOf('Bench Shelved'))).toBe(true)
    })
  })

  // Agents and coaches -----------------------------------------------------------
  Scenario('Agents and coaches can tag, but only with existing tags', ({ When, Then, And }) => {
    When('an agent or a coach sends a saved workout with tags', async () => {
      await sendBoth()
    })
    Then('tags I already have or starter tags are kept, matched as above', async () => {
      expect(sorted(await approved(s.sent?.agentId as string))).toEqual(['Hill sprints', 'Push'])
      expect(sorted(await approved(s.sent?.coachId as string))).toEqual(['Hill sprints', 'Pull'])
    })
    And('any other tag is dropped, and the response says which were dropped', async () => {
      expect(s.sent?.agent.droppedTags).toEqual(['Secret Sauce'])
      expect(s.sent?.coach.droppedTags).toEqual(['Coach Only'])
      const all = ((await saved().findMany({ where: { userId: s.user } })) as Json[]).flatMap((r) => r.tags as string[])
      expect(all).not.toContain('Secret Sauce')
      expect(all).not.toContain('Coach Only')
    })
    And("list_saved_workouts returns each workout's tags and can filter by one tag", async () => {
      const all = await listSaved()
      const by = Object.fromEntries(all.map((w) => [w.name, w.tags]))
      expect(by['Leg Day']).toEqual(['Legs', 'Hill sprints'])
      expect(by['Upper A']).toEqual([])
      expect(by['Their Legs']).toBeUndefined()
      const legs = await listSaved({ tag: 'Legs' })
      expect(legs.map((w) => w.name)).toEqual(['Leg Day', 'Squat Focus'])
      expect(await listSaved({ tag: 'Their Secret' })).toEqual([])
      const { listTools } = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
      const props = (name: string) =>
        Object.keys((listTools('user').find((t) => t.name === name)?.inputSchema.properties ?? {}) as Json)
      expect(props('list_saved_workouts')).toContain('tag')
      expect(props('propose_workout_create')).toContain('tags')
    })
  })

  Scenario('Tags are private', ({ Then, And }) => {
    Then('my tags are only ever read or changed through my own account', async () => {
      const theirs = s.ids['Their Legs']
      const before = await row(theirs)
      expect((await patch(theirs, { tags: ['Push'] })).status).toBe(404)
      expect(await row(theirs)).toEqual(before)
      expect((await patch('nope', { tags: ['Push'] })).status).toBe(404)
      auth.userId = ''
      expect((await patchTags('Bench Blast', ['Push'])).status).toBe(401)
      expect(await tagsOf('Bench Blast')).toEqual([])
      auth.userId = s.user
      // The list, the chips and the sheet show only the user's own tags.
      const list = await result(await (await listRoute()).GET(req('/api/workouts/saved', 'GET')))
      expect(JSON.stringify(list.body)).not.toContain('Their Secret')
      await renderList()
      expect(filterChip('Their Secret')).toBeNull()
      const dialog = await openTags('Bench Blast')
      expect(sheetChip(dialog, 'Their Secret')).toBeNull()
    })
    And('tag changes are rate limited like other workout edits', async () => {
      rl.refuse = true
      expect((await patchTags('Bench Blast', ['Push'])).status).toBe(429)
      expect(await tagsOf('Bench Blast')).toEqual([])
      expect(rl.calls.map((c) => c.key)).toContain(s.user)
      rl.refuse = false

      boom.on = true
      expect((await patchTags('Bench Blast', ['Push'])).status).toBe(500)
      boom.on = false
      expect(log.error).toHaveBeenCalled()
      expect(await tagsOf('Bench Blast')).toEqual([])
    })
  })
})

// ---------------------------------------------------------------------------
// Edges the scenarios don't pin
// ---------------------------------------------------------------------------
describe('tags route and schema', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('tags that are not an array of strings are 400 and write nothing', async () => {
    for (const tags of ['Push', [1], [null], { 0: 'Push' }]) expect((await patchTags('Leg Day', tags)).status).toBe(400)
    expect(await tagsOf('Leg Day')).toEqual(['Legs', 'Hill sprints'])
  })

  it('PATCH answers with the saved tags; an empty list clears them; GET lists them', async () => {
    const res = await patchTags('Leg Day', ['Legs', 'Quick'])
    expect(res.status).toBe(200)
    expect((res.body.saved as Json).tags).toEqual(['Legs', 'Quick'])
    expect((res.body.saved as Json).name).toBe('Leg Day')
    expect((await patchTags('Squat Focus', [])).status).toBe(200)
    expect(await tagsOf('Squat Focus')).toEqual([])
    const list = await result(await (await listRoute()).GET(req('/api/workouts/saved', 'GET')))
    const by = Object.fromEntries((list.body.saved as Json[]).map((w) => [w.name, w.tags]))
    expect(by['Leg Day']).toEqual(['Legs', 'Quick'])
    expect(by['Bench Blast']).toEqual([])
  })

  it('tagging keeps the name, notes, pin, dates and exercises', async () => {
    const id = s.ids['Upper A']
    const before = await row(id)
    await patch(id, { tags: ['Upper'] })
    const after = await row(id)
    for (const k of ['name', 'notes', 'workoutData', 'exerciseCount', 'lastUsedAt', 'pinnedAt', 'origin', 'createdAt', 'archivedAt'])
      expect(after[k], k).toEqual(before[k])
  })

  it('a migration adds "tags" to "SavedWorkout" with a GIN index', () => {
    const dir = path.resolve('prisma/migrations')
    const sql = readdirSync(dir)
      .map((d) => {
        try {
          return readFileSync(path.join(dir, d, 'migration.sql'), 'utf8')
        } catch {
          return ''
        }
      })
      .filter((text) => /"SavedWorkout"/.test(text) && /"tags"/.test(text))
      .join('\n')
    expect(sql).toMatch(/ADD COLUMN\s+"tags"\s+TEXT\[\]/i)
    expect(sql).toMatch(/USING\s+GIN\s*\(\s*"tags"/i)
  })

  it('PATCH tags sends the same number of queries for 1 workout as for 10', async () => {
    const counted = async () => {
      const { count, result: res } = await countQueries(s.prisma, async () => patchTags('Bench Blast', ['Push', 'Legs']))
      expect(res.status).toBe(200)
      return count
    }
    const one = await counted()
    for (let i = 0; i < 9; i++) await seed(`More ${i}`, { lastUsedAt: daysAgo(3), tags: [`Extra ${i}`, 'Legs'] })
    expect(await counted()).toBe(one)
  })

  it('deleting the last workout with a tag removes its chip', async () => {
    await renderList()
    expect(filterChip('Pull')).toBeTruthy()
    await openOlder()
    fireEvent.click(within(openRow('Old Pull')).getByRole('button', { name: /^delete\b/i }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(filterChip('Pull')).toBeNull())
  })

  it('the Tags button, sheet, search and filter chips use 48px tap targets and theme colours', async () => {
    await renderList()
    const filters = within(filterGroup()).getAllByRole('button')
    expect(filters.length).toBe(3)
    const tagsButton = within(openRow('Leg Day')).getByRole('button', { name: 'Tags for Leg Day' })
    const box = searchBox()
    const dialog = await openTags('Leg Day')
    const targets = [
      ...filters,
      tagsButton,
      ...within(dialog).getAllByRole('button'),
      within(dialog).getByRole('textbox', { name: /new tag/i }),
      box,
    ]
    for (const t of targets) expect(`${t.textContent}: ${t.className}`).toMatch(TAP)
    for (const el of document.body.querySelectorAll('[class]'))
      expect(String(el.getAttribute('class'))).not.toMatch(RAW_COLOUR)
  })
})
