/**
 * Step definitions for features/coaching/custom-exercises.feature (work 163):
 * a coach's send carries the custom exercises it uses, and the trainee chooses
 * on accept between a copy and an exercise of their own. Replaces the refusal
 * in send.feature (send.steps.ts keeps the rest of slice 2).
 *
 * Contract (new unless marked existing):
 *   Send: sendToTrainee (existing signature, lib/coaching/send.ts). An exercise
 *     the coach owns (userId = coach, not isSystem) that the trainee can't see
 *     no longer refuses the send; it is bundled. The proposal payload gains a
 *     top-level key, present only when something is bundled:
 *       customExercises: Array<{
 *         sourceId: string          // the coach's ExerciseDefinition id
 *         name: string
 *         equipment: string[]
 *         primaryFAUs: string[]
 *         secondaryFAUs: string[]
 *         category: string | null
 *         aliases: string[]
 *         instructions: string | null
 *         notes: string | null
 *       }>
 *     in order of first use, once each, exactly these keys, values as stored at
 *     send time. Exercises in the program / workout keep referencing sourceId.
 *     Shared (isSystem) exercises and ones the trainee owns are never bundled.
 *     An exercise that is neither shared, the trainee's nor the coach's is
 *     still refused with missingExercises (send.steps.ts).
 *   Accept: approveProposal(db, proposalId, userId, choices?) (existing, new
 *     optional 4th argument), and POST /api/suggestions/[id]/accept with an
 *     optional JSON body of the same shape (no body = all defaults):
 *       choices = { exercises?: Record<sourceId, { use: 'copy' } | { use: 'mine'; exerciseDefinitionId: string }> }
 *     A bundled exercise with no entry is 'copy'.
 *     - copy: reuse the trainee's earlier copy of the same sourceId if it still
 *       exists (found through an earlier applied proposal's record, below; a
 *       rename doesn't break it; another trainee's copy never counts), else
 *       create an ExerciseDefinition with the snapshot's fields, userId =
 *       trainee, createdBy = coach, isSystem false, named
 *       "<snapshot name> (from <coach first name>)"; first name = first word of
 *       the coach's coaching name (lib/coaching/names.ts). When that name's
 *       normalizedName is taken app-wide: " 2", " 3", ... appended.
 *     - mine: exerciseDefinitionId must be shared or the trainee's own; no copy.
 *     Every use of sourceId in the created program / saved workout points to
 *     the chosen definition (Exercise.name / workoutData name follow it).
 *     The applied proposal records the copy: payload.customExercises[i].copyId
 *     = the copy's id (new or reused); absent for 'mine'.
 *     One transaction: any failure leaves no copy, no program / workout, the
 *     proposal pending. A refused choice is { ok: false, code: 'invalid' } and
 *     its error names the exercise (snapshot name).
 *     Route: 400 { code: 'invalid' } for a malformed body; 422 { code: 'invalid',
 *     error } for a refused choice, error naming the exercise; nothing applied.
 *   Review screen (existing SuggestionReview, fed by getSuggestionDetail): one
 *     group per bundled exercise (role group or radiogroup, accessible name
 *     containing the exercise name) reading "<coach name>'s exercise", with
 *     radios "Add a copy" (checked by default) and "Use one of mine". With an
 *     earlier copy it also reads "You have this from an earlier send". Choosing
 *     "Use one of mine" shows a search box; it searches GET
 *     /api/exercises/search?query= (existing) and offers each result as a
 *     button or option by name; picking one shows its name. Accept POSTs the
 *     choices. A refused accept shows the route's error in a role alert.
 *   Decline and agent proposals: unchanged; agents can't bundle definitions
 *     (a customExercises key in an agent's payload is refused).
 *
 * vitest-cucumber runs every step as its own test, so state lives in `s` and
 * the database; a step that needs the screen renders it itself.
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
const nav = vi.hoisted(() => ({ to: [] as string[] }))

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
vi.mock('@/lib/rate-limit', async () => {
  return new Proxy(
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
})
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/events', () => ({ recordEvent: () => {} }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn(), flushEvents: vi.fn(async () => {}), identify: vi.fn() }))
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
    notFound: () => {
      throw new Error('NEXT_NOT_FOUND')
    },
    useRouter: () => router,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }
})

const feature = await loadFeature('features/coaching/custom-exercises.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Json = Record<string, unknown>

interface State {
  prisma: PrismaClient
  dustin: string
  sam: string
  alex: string
  linkSam: string
  defs: Record<string, string>
  fly: string
  program: string
  proposalId?: string
  copyId?: string
}
let s: State

const FLY = {
  name: 'Cable Fly',
  equipment: ['cable'],
  primaryFAUs: ['chest'],
  secondaryFAUs: ['front-delts'],
  category: 'isolation',
  aliases: ['Cable Crossover'],
  instructions: 'Squeeze at the middle',
  notes: 'Keep it light',
}
const SNAPSHOT_KEYS = ['aliases', 'category', 'equipment', 'instructions', 'name', 'notes', 'primaryFAUs', 'secondaryFAUs', 'sourceId']

type Choice = { use: 'copy' } | { use: 'mine'; exerciseDefinitionId: string }
type Choices = { exercises?: Record<string, Choice> }
type Decision = { ok: true; proposal: Json } | { ok: false; code: string; error: string }
type Service = {
  approveProposal: (db: PrismaClient, id: string, userId: string, choices?: Choices) => Promise<Decision>
  rejectProposal: (db: PrismaClient, id: string, userId: string) => Promise<Decision>
  createProposal: (db: PrismaClient, input: Json, notify?: () => Promise<void>) => Promise<{ ok: boolean; code?: string }>
}
const service = async () => (await load('@/lib/proposals/service')) as Service
type SendLib = {
  sendToTrainee: (db: PrismaClient, coach: string, input: Json) => Promise<{ ok: boolean; proposalId?: string; code?: string }>
}

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const [dustin, sam, alex] = [(await createTestUser()).id, (await createTestUser()).id, (await createTestUser()).id]
  await prisma.userSettings.createMany({
    data: [
      { userId: dustin, displayName: 'Dustin' },
      { userId: sam, displayName: 'Sam' },
      { userId: alex, displayName: 'Alex' },
    ],
  })
  const link = await prisma.coachLink.create({ data: { coachUserId: dustin, traineeUserId: sam } })
  const defs: Record<string, string> = {}
  for (const name of ['Barbell Bench Press', 'Leg Press'])
    defs[name] = (await createTestExerciseDefinition(prisma, { name, isSystem: true })).id
  s = { prisma, dustin, sam, alex, linkSam: link.id, defs, fly: '', program: '' }
  s.fly = await own(dustin, FLY)
  s.program = await makeProgram(dustin, 'Fly Day', [defs['Barbell Bench Press'], s.fly, s.fly])
  auth.userId = sam
  nav.to.length = 0
  return s
}

/** A custom exercise owned by `userId`. */
async function own(userId: string, fields: Partial<typeof FLY> & { name: string }) {
  const d = await createTestExerciseDefinition(s.prisma, {
    equipment: ['cable'],
    primaryFAUs: ['chest'],
    ...fields,
    isSystem: false,
    userId,
  })
  s.defs[fields.name] = d.id
  return d.id
}

/** Two weeks, one day each, using `ids` in order (a repeated id is used twice per day). */
async function makeProgram(userId: string, name: string, ids: string[]) {
  const program = await s.prisma.program.create({
    data: {
      name,
      userId,
      isUserCreated: true,
      weeks: {
        create: [1, 2].map((weekNumber) => ({
          weekNumber,
          userId,
          workouts: {
            create: [
              {
                dayNumber: 1,
                name: 'Day',
                userId,
                exercises: {
                  create: ids.map((id, i) => ({
                    order: i + 1,
                    exerciseDefinitionId: id,
                    name: `Exercise ${i + 1}`,
                    userId,
                    prescribedSets: { create: [{ setNumber: 1, reps: '10', userId }] },
                  })),
                },
              },
            ],
          },
        })),
      },
    },
  })
  return program.id
}

async function makeSaved(userId: string, name: string, ids: string[]) {
  const row = await s.prisma.savedWorkout.create({
    data: {
      userId,
      name,
      exerciseCount: ids.length,
      workoutData: ids.map((id, i) => ({
        name: `Exercise ${i + 1}`,
        exerciseDefinitionId: id,
        order: i + 1,
        notes: null,
        exerciseGroup: null,
        sets: [{ setNumber: 1, reps: '10', rir: null, rpe: null, isWarmup: false }],
      })),
    },
  })
  return row.id
}

async function send(input: Json = {}, coach = s.dustin) {
  const lib = (await load('@/lib/coaching/send')) as SendLib
  const r = await lib.sendToTrainee(s.prisma, coach, { linkId: s.linkSam, kind: 'program', sourceId: s.program, ...input })
  expect(r.ok, JSON.stringify(r)).toBe(true)
  return String(r.proposalId)
}
async function accept(id: string, choices?: Choices, userId = s.sam) {
  const r = await (await service()).approveProposal(s.prisma, id, userId, choices)
  expect(r.ok, JSON.stringify(r)).toBe(true)
  return r as { ok: true; proposal: Json }
}
const payloadOf = async (id: string) =>
  (await s.prisma.proposal.findUniqueOrThrow({ where: { id } })).payload as Json & { customExercises?: Json[] }
const defsOf = (userId: string) =>
  s.prisma.exerciseDefinition.findMany({ where: { userId, isSystem: false }, orderBy: { createdAt: 'asc' } })
/** Definition ids and names used by the trainee's program, in order. */
async function programUses(programId: string) {
  const rows = await s.prisma.exercise.findMany({
    where: { workout: { week: { programId } } },
    orderBy: [{ workout: { week: { weekNumber: 'asc' } } }, { order: 'asc' }],
    select: { exerciseDefinitionId: true, name: true, userId: true },
  })
  return rows
}
const samsProgram = async () => s.prisma.program.findFirstOrThrow({ where: { userId: s.sam } })

// --- routes and screens --------------------------------------------------------
type Handler = (r: NextRequest, c?: unknown) => Promise<Response>
const acceptRoute = async () => (await load('@/app/api/suggestions/[id]/accept/route')) as { POST: Handler }
async function postAccept(id: string, body?: unknown) {
  const r = new NextRequest(`http://localhost/api/suggestions/${id}/accept`, {
    method: 'POST',
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const res = await (await acceptRoute()).POST(r, { params: Promise.resolve({ id }) })
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Json }
}

/** fetch that runs the real routes the review screen calls; anything else answers 200 {}. */
const calls: Array<{ url: string; method: string; body?: string }> = []
function routedFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: { method?: string; body?: string }) => {
      const url = String(input instanceof Request ? input.url : input).replace(/^https?:\/\/[^/]+/, '')
      const method = (init?.method ?? 'GET').toUpperCase()
      calls.push({ url, method, body: init?.body })
      const p = url.split('?')[0]
      const r = new NextRequest(`http://localhost${url}`, {
        method,
        ...(init?.body !== undefined && { headers: { 'content-type': 'application/json' }, body: init.body }),
      })
      let res: Response | null = null
      const acceptId = /^\/api\/suggestions\/([^/]+)\/accept$/.exec(p)?.[1]
      if (acceptId && method === 'POST') res = await (await acceptRoute()).POST(r, { params: Promise.resolve({ id: acceptId }) })
      else if (p === '/api/exercises/search' && method === 'GET')
        res = await ((await load('@/app/api/exercises/search/route')) as { GET: Handler }).GET(r)
      return res ?? new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    })
  )
}
async function renderReview(id: string, userId = s.sam) {
  auth.userId = userId
  routedFetch()
  const { getSuggestionDetail } = (await load('@/lib/suggestions/detail')) as {
    getSuggestionDetail: (u: string, id: string) => Promise<Json | null>
  }
  const detail = await getSuggestionDetail(userId, id)
  expect(detail, 'the trainee can open the suggestion').toBeTruthy()
  const Review = ((await load('@/components/suggestions/SuggestionReview')) as { default: ComponentType<{ suggestion: Json }> })
    .default
  render(createElement(Review, { suggestion: detail as Json }))
}
/** The review screen's block for one bundled exercise. */
function groupFor(name: string): HTMLElement {
  const groups = [...screen.queryAllByRole('group'), ...screen.queryAllByRole('radiogroup')]
  const re = new RegExp(name.replace(/[()]/g, '\\$&'))
  const hit = groups.find((g) => re.test(g.getAttribute('aria-label') ?? '') || re.test(accessibleName(g)))
  expect(hit, `a group named for "${name}"`).toBeTruthy()
  return hit as HTMLElement
}
function accessibleName(el: HTMLElement): string {
  const by = el.getAttribute('aria-labelledby')
  if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
  const legend = el.querySelector('legend')
  return legend?.textContent ?? ''
}
async function pickMine(group: HTMLElement, query: string, pick: string) {
  fireEvent.click(within(group).getByRole('radio', { name: /use one of mine/i }))
  const boxes = await waitFor(() => {
    const found = ['searchbox', 'textbox', 'combobox'].flatMap((role) => screen.queryAllByRole(role))
    expect(found.length, 'a search box').toBeGreaterThan(0)
    return found
  })
  fireEvent.change(boxes[boxes.length - 1], { target: { value: query } })
  const option = await waitFor(
    () => {
      const hits = ['button', 'option'].flatMap((role) => screen.queryAllByRole(role, { name: new RegExp(pick) }))
      expect(hits.length, `an option for ${pick}`).toBeGreaterThan(0)
      return hits[0]
    },
    { timeout: 3000 }
  )
  fireEvent.click(option)
}
const tapAccept = () => fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
const bodyText = () => document.body.textContent ?? ''

/** Makes inserting a program named `name` fail inside Postgres (for the all-or-nothing check). */
async function failProgramInsert(name: string) {
  await s.prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION boom_program() RETURNS trigger AS $$
    BEGIN IF NEW.name = '${name}' THEN RAISE EXCEPTION 'program insert failed (test)'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`)
  await s.prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS boom_program ON "Program"')
  await s.prisma.$executeRawUnsafe('CREATE TRIGGER boom_program BEFORE INSERT ON "Program" FOR EACH ROW EXECUTE FUNCTION boom_program()')
}
const unfailProgramInsert = () => s.prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS boom_program ON "Program"')

beforeEach(() => {
  calls.length = 0
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
    Given('Dustin coaches Sam on an active link', async () => {
      await freshState()
    })
    And(
      'Dustin\'s program uses "Cable Fly", an exercise Dustin made, and "Barbell Bench Press" from the shared library',
      async () => {
        const uses = await programUses(s.program)
        expect(uses.map((u) => u.exerciseDefinitionId)).toContain(s.fly)
        expect(uses.map((u) => u.exerciseDefinitionId)).toContain(s.defs['Barbell Bench Press'])
      }
    )
  })

  // Sending ------------------------------------------------------------------------
  Scenario('Send is allowed', ({ When, Then, And }) => {
    When('Dustin sends the program', async () => {
      s.proposalId = await send()
    })
    Then(
      'it is sent, and the send carries a snapshot of "Cable Fly" (name, equipment, muscles, category, aliases, instructions, notes)',
      async () => {
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId } })
        expect(p).toMatchObject({ userId: s.sam, coachLinkId: s.linkSam, status: 'pending', kind: 'program.create' })
        const bundled = (p.payload as { customExercises?: Json[] }).customExercises
        expect(bundled).toEqual([{ sourceId: s.fly, ...FLY }])
        expect(Object.keys((bundled as Json[])[0]).sort()).toEqual(SNAPSHOT_KEYS)
      }
    )
    And('shared library exercises are not copied', async () => {
      const payload = await payloadOf(String(s.proposalId))
      expect((payload.customExercises ?? []).map((c) => c.sourceId)).not.toContain(s.defs['Barbell Bench Press'])
      await accept(String(s.proposalId))
      const uses = await programUses((await samsProgram()).id)
      expect(uses[0].exerciseDefinitionId).toBe(s.defs['Barbell Bench Press'])
      expect((await defsOf(s.sam)).map((d) => d.name)).toEqual(['Cable Fly (from Dustin)'])
    })
  })

  Scenario('Snapshot of the exercise', ({ Given, When, Then }) => {
    Given('Dustin sent the program', async () => {
      s.proposalId = await send()
    })
    When('he edits or deletes "Cable Fly" afterwards', async () => {
      await s.prisma.exerciseDefinition.update({
        where: { id: s.fly },
        data: { name: 'Cable Flye', normalizedName: 'cable flye', equipment: ['dumbbell'], notes: 'Changed', aliases: [] },
      })
    })
    Then('what Sam is offered does not change', async () => {
      await renderReview(String(s.proposalId))
      expect(groupFor('Cable Fly').textContent).toContain('Cable Fly')
      expect(bodyText()).not.toContain('Cable Flye')
      cleanup()
      await accept(String(s.proposalId))
      const [copy] = await defsOf(s.sam)
      expect(copy).toMatchObject({ ...FLY, name: 'Cable Fly (from Dustin)' })
      // Deleting it is covered in the edges below.
    })
  })

  // Accepting ----------------------------------------------------------------------
  Scenario('The review screen lists the custom exercises', ({ When, Then }) => {
    When('Sam opens the suggestion', async () => {
      s.proposalId = await send()
    })
    Then('it lists "Cable Fly" as "Dustin\'s exercise" with a choice: "Add a copy" (default) or "Use one of mine"', async () => {
      await renderReview(String(s.proposalId))
      const group = groupFor('Cable Fly')
      expect(group.textContent).toContain("Dustin's exercise")
      const copy = within(group).getByRole('radio', { name: /add a copy/i }) as HTMLInputElement
      const mine = within(group).getByRole('radio', { name: /use one of mine/i }) as HTMLInputElement
      expect(copy.checked).toBe(true)
      expect(mine.checked).toBe(false)
      // Shared library exercises get no choice.
      const groups = [...screen.queryAllByRole('group'), ...screen.queryAllByRole('radiogroup')]
      expect(groups.filter((g) => /Barbell Bench Press/.test(accessibleName(g) + (g.getAttribute('aria-label') ?? '')))).toHaveLength(0)
      // Accepting with the default makes the copy.
      tapAccept()
      await screen.findByText(/added to my programs/i)
      expect((await defsOf(s.sam)).map((d) => d.name)).toEqual(['Cable Fly (from Dustin)'])
    })
  })

  Scenario('Add a copy', ({ When, Then, And }) => {
    When('Sam accepts with "Add a copy" for "Cable Fly"', async () => {
      s.proposalId = await send()
      await accept(s.proposalId, { exercises: { [s.fly]: { use: 'copy' } } })
    })
    Then('Sam has a custom exercise "Cable Fly (from Dustin)" with the snapshot\'s details, owned by Sam', async () => {
      const mine = await defsOf(s.sam)
      expect(mine).toHaveLength(1)
      expect(mine[0]).toMatchObject({
        ...FLY,
        name: 'Cable Fly (from Dustin)',
        userId: s.sam,
        createdBy: s.dustin,
        isSystem: false,
      })
      expect(mine[0].id).not.toBe(s.fly)
      s.copyId = mine[0].id
      // Dustin's own is untouched.
      expect(await s.prisma.exerciseDefinition.findUnique({ where: { id: s.fly } })).toMatchObject({ ...FLY, userId: s.dustin })
    })
    And('the accepted program uses it wherever Dustin\'s used "Cable Fly"', async () => {
      const uses = await programUses((await samsProgram()).id)
      expect(uses.map((u) => u.exerciseDefinitionId)).toEqual(
        [1, 2].flatMap(() => [s.defs['Barbell Bench Press'], s.copyId, s.copyId])
      )
      expect(uses.filter((u) => u.exerciseDefinitionId === s.copyId).map((u) => u.name)).toEqual(
        Array(4).fill('Cable Fly (from Dustin)')
      )
      expect(new Set(uses.map((u) => u.userId))).toEqual(new Set([s.sam]))
    })
  })

  Scenario('Use one of mine', ({ When, Then }) => {
    When('Sam picks "Use one of mine" and chooses "Pec Deck" from their own exercises or the shared library', async () => {
      await own(s.sam, { name: 'Pec Deck', equipment: ['machine'] })
      s.proposalId = await send()
      await renderReview(s.proposalId)
      await pickMine(groupFor('Cable Fly'), 'Pec', 'Pec Deck')
      await waitFor(() => expect(groupFor('Cable Fly').textContent).toContain('Pec Deck'))
      tapAccept()
      await screen.findByText(/added to my programs/i)
      const post = calls.find((c) => c.method === 'POST' && c.url.endsWith('/accept'))
      expect(JSON.parse(String(post?.body))).toEqual({
        exercises: { [s.fly]: { use: 'mine', exerciseDefinitionId: s.defs['Pec Deck'] } },
      })
    })
    Then('the accepted program uses "Pec Deck" there, and no copy is made', async () => {
      const uses = await programUses((await samsProgram()).id)
      expect(uses.map((u) => u.exerciseDefinitionId)).toEqual(
        [1, 2].flatMap(() => [s.defs['Barbell Bench Press'], s.defs['Pec Deck'], s.defs['Pec Deck']])
      )
      expect(uses.filter((u) => u.exerciseDefinitionId === s.defs['Pec Deck'])[0].name).toBe('Pec Deck')
      expect((await defsOf(s.sam)).map((d) => d.name)).toEqual(['Pec Deck'])
      // The shared library works the same way (lib level).
      const second = await send({ sourceId: await makeProgram(s.dustin, 'Fly Day 2', [s.fly]) })
      await accept(second, { exercises: { [s.fly]: { use: 'mine', exerciseDefinitionId: s.defs['Leg Press'] } } })
      const p2 = await s.prisma.program.findFirstOrThrow({ where: { userId: s.sam, name: 'Fly Day 2' } })
      expect(new Set((await programUses(p2.id)).map((u) => u.exerciseDefinitionId))).toEqual(new Set([s.defs['Leg Press']]))
      expect((await defsOf(s.sam)).map((d) => d.name)).toEqual(['Pec Deck'])
    })
  })

  Scenario('A later send reuses the copy', ({ Given, When, Then }) => {
    Given('Sam already added "Cable Fly (from Dustin)" from an earlier send', async () => {
      await accept(await send())
      s.copyId = (await defsOf(s.sam))[0].id
    })
    When('Sam accepts another send using "Cable Fly"', async () => {
      s.proposalId = await send({ sourceId: await makeProgram(s.dustin, 'Fly Day 2', [s.fly]) })
    })
    Then(
      '"Add a copy" offers that existing copy ("You have this from an earlier send") instead of making a second one',
      async () => {
        await renderReview(String(s.proposalId))
        const group = groupFor('Cable Fly')
        expect(group.textContent).toContain('You have this from an earlier send')
        expect((within(group).getByRole('radio', { name: /add a copy/i }) as HTMLInputElement).checked).toBe(true)
        tapAccept()
        await screen.findByText(/added to my programs/i)
        expect(await defsOf(s.sam)).toHaveLength(1)
        const p2 = await s.prisma.program.findFirstOrThrow({ where: { userId: s.sam, name: 'Fly Day 2' } })
        expect(new Set((await programUses(p2.id)).map((u) => u.exerciseDefinitionId))).toEqual(new Set([s.copyId]))
      }
    )
  })

  Scenario('Name already taken', ({ Given, When, Then }) => {
    Given('an exercise named "Cable Fly (from Dustin)" exists that isn\'t Sam\'s copy', async () => {
      // Same normalizedName as "Cable Fly (from Dustin)": names are unique app-wide after normalising.
      await own(s.alex, { name: 'Cable Fly from Dustin' })
    })
    When('Sam adds a copy', async () => {
      await accept(await send())
    })
    Then('the copy gets the next free name ("Cable Fly (from Dustin) 2")', async () => {
      const mine = await defsOf(s.sam)
      expect(mine.map((d) => d.name)).toEqual(['Cable Fly (from Dustin) 2'])
      const uses = await programUses((await samsProgram()).id)
      expect(uses.find((u) => u.exerciseDefinitionId === mine[0].id)?.name).toBe('Cable Fly (from Dustin) 2')
    })
  })

  Scenario('All or nothing', ({ When, Then }) => {
    When('anything fails while accepting', async () => {
      await own(s.dustin, { name: 'Hack Squat', equipment: ['machine'], primaryFAUs: ['quads'] })
      await own(s.dustin, { name: "Dustin's Pullover" })
      s.program = await makeProgram(s.dustin, 'Boom Program', [s.defs['Hack Squat'], s.fly])
      s.proposalId = await send()
      // 1. A refused choice for the second exercise, after the first would be copied.
      const refused = await (await service()).approveProposal(s.prisma, s.proposalId, s.sam, {
        exercises: { [s.defs['Hack Squat']]: { use: 'copy' }, [s.fly]: { use: 'mine', exerciseDefinitionId: s.defs["Dustin's Pullover"] } },
      })
      expect(refused).toMatchObject({ ok: false, code: 'invalid' })
      expect((refused as { error: string }).error).toContain('Cable Fly')
      // 2. The program insert fails after the copies are made.
      await failProgramInsert('Boom Program')
      try {
        const failed = await (await service())
          .approveProposal(s.prisma, s.proposalId, s.sam)
          .catch((e: unknown) => ({ ok: false, thrown: String(e) }))
        expect(failed.ok).toBe(false)
      } finally {
        await unfailProgramInsert()
      }
    })
    Then('no copy is created and nothing is added, and Sam sees why', async () => {
      expect(await defsOf(s.sam)).toHaveLength(0)
      expect(await s.prisma.program.count({ where: { userId: s.sam } })).toBe(0)
      expect((await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId } })).status).toBe('pending')
      // Through the route: a refused choice is a 422 naming the exercise.
      auth.userId = s.sam
      const r = await postAccept(String(s.proposalId), {
        exercises: { [s.fly]: { use: 'mine', exerciseDefinitionId: s.defs["Dustin's Pullover"] } },
      })
      expect(r.status).toBe(422)
      expect(r.body).toMatchObject({ code: 'invalid' })
      expect(String(r.body.error)).toContain('Cable Fly')
      // On screen: Sam's pick is deleted before they tap Accept.
      await own(s.sam, { name: 'Pec Deck', equipment: ['machine'] })
      await renderReview(String(s.proposalId))
      await pickMine(groupFor('Cable Fly'), 'Pec', 'Pec Deck')
      await waitFor(() => expect(groupFor('Cable Fly').textContent).toContain('Pec Deck'))
      await s.prisma.exerciseDefinition.delete({ where: { id: s.defs['Pec Deck'] } })
      tapAccept()
      const alert = await screen.findByRole('alert')
      expect(alert.textContent).toContain('Cable Fly')
      expect(await defsOf(s.sam)).toHaveLength(0)
      expect(await s.prisma.program.count({ where: { userId: s.sam } })).toBe(0)
    })
  })

  Scenario('Decline makes no copies', ({ When, Then }) => {
    When('Sam declines', async () => {
      s.proposalId = await send()
      const r = await (await service()).rejectProposal(s.prisma, s.proposalId, s.sam)
      expect(r.ok).toBe(true)
    })
    Then('no exercise is added to Sam\'s account', async () => {
      expect(await defsOf(s.sam)).toHaveLength(0)
      expect(await s.prisma.program.count({ where: { userId: s.sam } })).toBe(0)
    })
  })

  Scenario('Agent suggestions unchanged', ({ Then }) => {
    Then('agent proposals still refuse exercises the user can\'t see, as before', async () => {
      const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
      const token = (await createAgentToken(s.prisma, s.sam, 'Hermes')).record.id
      const svc = await service()
      const agent = { userId: s.sam, agentTokenId: token, rationale: 'From the agent' }
      const program = { name: 'Agent Day', weeks: [{ workouts: [{ name: 'Day', exercises: [{ exerciseDefinitionId: s.fly, prescribedSets: [{ reps: '10' }] }] }] }] }
      const quiet = async () => {}
      expect(await svc.createProposal(s.prisma, { ...agent, kind: 'program.create', program }, quiet)).toMatchObject({ ok: false, code: 'invalid' })
      expect(
        await svc.createProposal(
          s.prisma,
          { ...agent, kind: 'saved_workout.create', workout: { name: 'Agent W', exercises: [{ exerciseDefinitionId: s.fly, sets: [{ reps: '10' }] }] } },
          quiet
        )
      ).toMatchObject({ ok: false, code: 'invalid' })
      // An agent can't smuggle definitions in.
      const smuggled = { ...program, customExercises: [{ sourceId: s.fly, ...FLY }] }
      expect(await svc.createProposal(s.prisma, { ...agent, kind: 'program.create', program: smuggled }, quiet)).toMatchObject({
        ok: false,
        code: 'invalid',
      })
      expect(await s.prisma.proposal.count({ where: { userId: s.sam } })).toBe(0)
      expect(await defsOf(s.sam)).toHaveLength(0)
    })
  })
})

// ---------------------------------------------------------------------------
// Edges the scenarios don't pin
// ---------------------------------------------------------------------------
describe('custom exercise edges', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('bundles each custom exercise once, in order of first use, and none Sam already owns', async () => {
    const hack = await own(s.dustin, { name: 'Hack Squat', equipment: ['machine'], primaryFAUs: ['quads'] })
    const samOwn = await own(s.sam, { name: 'Sam Curl' })
    s.program = await makeProgram(s.dustin, 'Mixed', [hack, s.fly, hack, samOwn])
    const payload = await payloadOf(await send())
    expect((payload.customExercises ?? []).map((c) => c.sourceId)).toEqual([hack, s.fly])
  })

  it('a send with no custom exercises has no customExercises key, and the screen offers no choice', async () => {
    s.program = await makeProgram(s.dustin, 'Plain', [s.defs['Barbell Bench Press']])
    const id = await send()
    expect(await payloadOf(id)).not.toHaveProperty('customExercises')
    await renderReview(id)
    expect(screen.queryByRole('radio', { name: /add a copy/i })).toBeNull()
  })

  it('choices go to the right exercise: one copied, one mapped to Sam\'s own', async () => {
    const hack = await own(s.dustin, { name: 'Hack Squat', equipment: ['machine'], primaryFAUs: ['quads'] })
    const pec = await own(s.sam, { name: 'Pec Deck', equipment: ['machine'] })
    s.program = await makeProgram(s.dustin, 'Two', [hack, s.fly])
    await accept(await send(), { exercises: { [s.fly]: { use: 'mine', exerciseDefinitionId: pec } } })
    const mine = await defsOf(s.sam)
    expect(mine.map((d) => d.name).sort()).toEqual(['Hack Squat (from Dustin)', 'Pec Deck'])
    const copy = mine.find((d) => d.name === 'Hack Squat (from Dustin)')
    const uses = (await programUses((await samsProgram()).id)).map((u) => u.exerciseDefinitionId)
    expect(uses).toEqual([copy?.id, pec, copy?.id, pec])
  })

  it('a saved workout carries and copies them too', async () => {
    const saved = await makeSaved(s.dustin, 'Fly Session', [s.defs['Barbell Bench Press'], s.fly])
    const id = await send({ kind: 'saved_workout', sourceId: saved })
    expect((await payloadOf(id)).customExercises).toEqual([{ sourceId: s.fly, ...FLY }])
    await accept(id)
    const [copy] = await defsOf(s.sam)
    expect(copy.name).toBe('Cable Fly (from Dustin)')
    const row = await s.prisma.savedWorkout.findFirstOrThrow({ where: { userId: s.sam } })
    const data = row.workoutData as Array<{ exerciseDefinitionId: string; name: string }>
    expect(data.map((e) => e.exerciseDefinitionId)).toEqual([s.defs['Barbell Bench Press'], copy.id])
    expect(data[1].name).toBe('Cable Fly (from Dustin)')
  })

  it('the coach deleting the exercise after sending still lets Sam copy it', async () => {
    const id = await send()
    await s.prisma.program.delete({ where: { id: s.program } })
    await s.prisma.exerciseDefinition.delete({ where: { id: s.fly } })
    await renderReview(id)
    expect(groupFor('Cable Fly').textContent).toContain("Dustin's exercise")
    cleanup()
    await accept(id)
    expect(await defsOf(s.sam)).toMatchObject([{ ...FLY, name: 'Cable Fly (from Dustin)' }])
  })

  it('the copy uses the coach\'s first name', async () => {
    await s.prisma.userSettings.update({ where: { userId: s.dustin }, data: { displayName: 'Dustin Mays' } })
    await accept(await send())
    expect((await defsOf(s.sam)).map((d) => d.name)).toEqual(['Cable Fly (from Dustin)'])
  })

  it('counts past 2 when 2 is taken too', async () => {
    await own(s.alex, { name: 'Cable Fly (from Dustin)' })
    await own(s.alex, { name: 'Cable Fly (from Dustin) 2' })
    await accept(await send())
    expect((await defsOf(s.sam)).map((d) => d.name)).toEqual(['Cable Fly (from Dustin) 3'])
  })

  it('records the copy on the accepted proposal, and finds it again after Sam renames it', async () => {
    const first = await send()
    await accept(first)
    const [copy] = await defsOf(s.sam)
    expect((await payloadOf(first)).customExercises).toEqual([{ sourceId: s.fly, ...FLY, copyId: copy.id }])
    await s.prisma.exerciseDefinition.update({ where: { id: copy.id }, data: { name: 'My Fly', normalizedName: 'my fly' } })
    const second = await send({ sourceId: await makeProgram(s.dustin, 'Fly Day 2', [s.fly]) })
    await accept(second)
    expect((await defsOf(s.sam)).map((d) => d.id)).toEqual([copy.id])
    expect((await payloadOf(second)).customExercises?.[0]).toMatchObject({ copyId: copy.id })
  })

  it('makes a new copy when Sam deleted the earlier one', async () => {
    await accept(await send())
    const [old] = await defsOf(s.sam)
    await s.prisma.program.deleteMany({ where: { userId: s.sam } })
    await s.prisma.exerciseDefinition.delete({ where: { id: old.id } })
    await accept(await send({ sourceId: await makeProgram(s.dustin, 'Fly Day 2', [s.fly]) }))
    const mine = await defsOf(s.sam)
    expect(mine).toHaveLength(1)
    expect(mine[0]).toMatchObject({ name: 'Cable Fly (from Dustin)', userId: s.sam })
    expect(mine[0].id).not.toBe(old.id)
  })

  it("another trainee's copy is never reused", async () => {
    const linkAlex = await s.prisma.coachLink.create({ data: { coachUserId: s.dustin, traineeUserId: s.alex } })
    await accept(await send({ linkId: linkAlex.id }), undefined, s.alex)
    expect((await defsOf(s.alex)).map((d) => d.name)).toEqual(['Cable Fly (from Dustin)'])
    await accept(await send())
    const mine = await defsOf(s.sam)
    expect(mine.map((d) => d.name)).toEqual(['Cable Fly (from Dustin) 2'])
    expect(mine[0].userId).toBe(s.sam)
  })

  it("'Use one of mine' refuses an exercise Sam can't see, naming the exercise", async () => {
    const pullover = await own(s.dustin, { name: "Dustin's Pullover" })
    const id = await send()
    const r = await (await service()).approveProposal(s.prisma, id, s.sam, {
      exercises: { [s.fly]: { use: 'mine', exerciseDefinitionId: pullover } },
    })
    expect(r).toMatchObject({ ok: false, code: 'invalid' })
    expect((r as { error: string }).error).toContain('Cable Fly')
    expect(await defsOf(s.sam)).toHaveLength(0)
    expect(await s.prisma.program.count({ where: { userId: s.sam } })).toBe(0)
  })

  it('the route accepts no body as all defaults and refuses a malformed one with 400', async () => {
    const id = await send()
    auth.userId = s.sam
    for (const bad of [{ exercises: 'copy' }, { exercises: { [s.fly]: { use: 'steal' } } }, { exercises: { [s.fly]: { use: 'mine' } } }]) {
      const r = await postAccept(id, bad)
      expect(r.status, JSON.stringify(bad)).toBe(400)
      expect(r.body).toMatchObject({ code: 'invalid' })
    }
    expect(await defsOf(s.sam)).toHaveLength(0)
    const ok = await postAccept(id)
    expect(ok.status).toBe(200)
    expect((await defsOf(s.sam)).map((d) => d.name)).toEqual(['Cable Fly (from Dustin)'])
  })
})
