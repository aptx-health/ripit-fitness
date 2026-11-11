/**
 * Step definitions for features/coaching/send.feature (work 148, coaching
 * slice 2). Design: initiatives/coaching/docs/136-discovery.md.
 * Converters: __tests__/lib/coaching-send-converters.test.ts.
 *
 * Seams (new unless marked existing):
 *   lib/coaching/send.ts
 *     sendToTrainee(db, coachUserId, { linkId, kind: 'program' | 'saved_workout', sourceId, note? })
 *       -> { ok: true, proposalId } | { ok: false, code: 'not_linked' | 'not_found' | 'invalid', missingExercises?: string[] }
 *       Creates a pending program.create / saved_workout.create Proposal for the
 *       link's trainee: userId = trainee, coachLinkId = link, agentTokenId null,
 *       payload = the converted snapshot, rationale = the note ('' without one).
 *       The existing check* run as the trainee. Never calls notify (Discord, Bark).
 *       not_linked: no active link with this user as its coach. not_found: not
 *       the coach's own (or a deleted) program or saved workout. invalid: the
 *       snapshot fails the proposal schema, or uses exercises that are neither
 *       shared, the trainee's nor the coach's; then missingExercises names them
 *       (definition names, in order of use). The coach's own exercises travel
 *       with the send since work 163 (custom-exercises.steps.ts).
 *     listSent(db, coachUserId, linkId) -> [{ name, kind, sentAt, status }], newest
 *       first, only those keys. kind 'program' | 'saved_workout'; status
 *       'pending' | 'accepted' | 'declined'. [] for an ended link and for a link
 *       the user doesn't coach.
 *   POST /api/coaching/send   body { linkId, kind, sourceId, note? }
 *     201 { proposalId }; 401 signed out; 400 a bad body or code 'invalid'
 *     (body { code, missingExercises? }); 403 code 'not_linked'; 404 code
 *     'not_found'; 429 when checkRateLimit (keyed on the user id) refuses, with
 *     nothing sent; 500 and logger.error when the database fails.
 *   GET /api/coaching/trainees   { trainees: [{ linkId, name }] }: the user's
 *     active links as coach, names as slice 1 shows them.
 *   components/coaching/SendToTrainee.tsx   default export, props { kind, sourceId }.
 *     Loads GET /api/coaching/trainees; renders nothing with no trainees. One
 *     trainee: a button "Send to Sam". Several: "Send to…", then a picker with a
 *     button per trainee name. Then a dialog with an optional "Note" textbox, the
 *     text "Sam will get a copy to accept or decline" and a Send button that
 *     POSTs /api/coaching/send. A refusal shows (role alert) "Sam doesn't have
 *     these exercises: <names, comma separated>".
 *     Mounted in app/(app)/library/programs/[id]/page.tsx (kind "program") and in
 *     SavedWorkoutDetailDialog (kind "saved_workout").
 *   Trainee screens (existing): SuggestionItem and SuggestionDetail gain the
 *     sender, so every item in Training's "From your coach" block (the newest
 *     card and the rows under it) and SuggestionReview read "From Dustin" (the
 *     coach's slice 1 name) or "From <agent token name>".
 *   Approving a coach's saved_workout.create gives origin "coach"; Library's New
 *     row reads "From Dustin".
 *   Settings → Coaching (existing page, server side): under each trainee a list
 *     named "Sent to <name>", one item per listSent row: the name, "Program" or
 *     "Workout", a <time> with the send date, and "Pending", "Accepted" or "Declined".
 *
 * vitest-cucumber runs every step as its own test, so state lives in `s` and
 * the database; a step that needs the screen renders it itself.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { programTreeSelect } from '@/lib/proposals/program'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))
const rl = vi.hoisted(() => ({ refuse: false, calls: [] as Array<{ key: string }> }))
const boom = vi.hoisted(() => ({ on: false }))
const log = vi.hoisted(() => ({ error: vi.fn() }))
const notifySpy = vi.hoisted(() => ({ fn: vi.fn(async () => {}) }))
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
vi.mock('@/lib/notify', () => ({ notify: notifySpy.fn }))
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

const feature = await loadFeature('features/coaching/send.feature')

// ---------------------------------------------------------------------------
const load = (spec: string) => import(/* @vite-ignore */ spec)
type Json = Record<string, unknown>
type Delegate = Record<string, (args?: unknown) => Promise<unknown>>
const DAY = 24 * 60 * 60 * 1000

interface State {
  prisma: PrismaClient
  dustin: string
  sam: string
  alex: string
  linkSam: string
  linkAlex?: string
  defs: Record<string, string>
  program: string
  saved: string
  proposalId?: string
  before?: unknown
}
let s: State

type SendInput = { linkId: string; kind: 'program' | 'saved_workout'; sourceId: string; note?: string }
type SendResult = { ok: true; proposalId: string } | { ok: false; code: string; missingExercises?: string[] }
type SendLib = {
  sendToTrainee: (db: PrismaClient, coachUserId: string, input: SendInput) => Promise<SendResult>
  listSent: (db: PrismaClient, coachUserId: string, linkId: string) => Promise<Json[]>
}
const sendLib = async () => (await load('@/lib/coaching/send')) as SendLib
async function send(input: Partial<SendInput> = {}, coach = s.dustin): Promise<SendResult> {
  return (await sendLib()).sendToTrainee(s.prisma, coach, {
    linkId: s.linkSam,
    kind: 'program',
    sourceId: s.program,
    ...input,
  } as SendInput)
}
async function sendOk(input: Partial<SendInput> = {}) {
  const r = await send(input)
  expect(r.ok, JSON.stringify(r)).toBe(true)
  return (r as { proposalId: string }).proposalId
}
const listSent = async (linkId = s.linkSam, coach = s.dustin) => (await sendLib()).listSent(s.prisma, coach, linkId)
const proposals = (userId: string) => s.prisma.proposal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
const service = async () => (await load('@/lib/proposals/service')) as typeof import('@/lib/proposals/service')

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
  for (const name of ['Barbell Bench Press', 'Seated Cable Row', 'Lat Pulldown', 'Leg Press'])
    defs[name] = (await createTestExerciseDefinition(prisma, { name, isSystem: true })).id
  s = { prisma, dustin, sam, alex, linkSam: link.id, defs, program: '', saved: '' }
  s.program = await makeProgram(dustin, 'Machine Starter')
  s.saved = await makeSaved(dustin, 'Push Pull')
  auth.userId = dustin
  nav.to.length = 0
  return s
}

/** A two-week program with a superset, warm-ups, weights, RPE and RIR. */
async function makeProgram(userId: string, name: string, exerciseIds?: string[]) {
  const ids = exerciseIds ?? [s.defs['Barbell Bench Press'], s.defs['Seated Cable Row'], s.defs['Lat Pulldown']]
  const ex = (order: number, id: string, extra: Json = {}) => ({
    order,
    exerciseDefinitionId: id,
    name: Object.entries(s.defs).find(([, v]) => v === id)?.[0] ?? 'Custom',
    userId,
    ...extra,
    prescribedSets: {
      create: [
        { setNumber: 1, reps: '10', weight: '45lbs', isWarmup: true, userId },
        { setNumber: 2, reps: '5', weight: '135lbs', rpe: 8, userId },
        { setNumber: 3, reps: '5', rir: 2, userId },
      ],
    },
  })
  const program = await s.prisma.program.create({
    data: {
      name,
      description: 'Three days',
      userId,
      isUserCreated: true,
      weeks: {
        create: [1, 2].map((weekNumber) => ({
          weekNumber,
          name: weekNumber === 1 ? 'Intro' : null,
          userId,
          workouts: {
            create: [
              {
                dayNumber: 1,
                name: 'Upper',
                userId,
                exercises: {
                  create: [
                    ex(1, ids[0], { notes: 'Pause on chest' }),
                    ex(2, ids[1], { exerciseGroup: 'A' }),
                    ex(3, ids[2] ?? ids[1], { exerciseGroup: 'A' }),
                  ],
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
async function makeSaved(userId: string, name: string) {
  const d = (n: string) => s.defs[n]
  const row = await s.prisma.savedWorkout.create({
    data: {
      userId,
      name,
      notes: 'Rest 2 min',
      exerciseCount: 3,
      workoutData: [
        { name: 'Barbell Bench Press', exerciseDefinitionId: d('Barbell Bench Press'), order: 1, notes: 'Pause', exerciseGroup: null,
          sets: [{ setNumber: 1, reps: '10', rir: null, rpe: null, isWarmup: true }, { setNumber: 2, reps: '5', rir: 2, rpe: null, isWarmup: false }] },
        { name: 'Seated Cable Row', exerciseDefinitionId: d('Seated Cable Row'), order: 2, notes: null, exerciseGroup: 'A',
          sets: [{ setNumber: 1, reps: '10', rir: null, rpe: 8, isWarmup: false }] },
        { name: 'Lat Pulldown', exerciseDefinitionId: d('Lat Pulldown'), order: 3, notes: null, exerciseGroup: 'A',
          sets: [{ setNumber: 1, reps: '12', rir: 1, rpe: null, isWarmup: false }] },
      ],
    },
  })
  return row.id
}
/** The program as the trainee would see it, without ids. */
async function tree(programId: string) {
  const p = await s.prisma.program.findUnique({
    where: { id: programId },
    select: { name: true, description: true, weeks: { orderBy: { weekNumber: 'asc' }, select: programTreeSelect } },
  })
  return p
}

// --- routes -------------------------------------------------------------------
type Handler = (r: NextRequest, c?: unknown) => Promise<Response>
const result = async (res: Response) => ({ status: res.status, body: (await res.json().catch(() => ({}))) as Json })
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
const sendRoute = async () => (await load('@/app/api/coaching/send/route')) as { POST: Handler }
const traineesRoute = async () => (await load('@/app/api/coaching/trainees/route')) as { GET: Handler }
const postSend = async (body: unknown) => result(await (await sendRoute()).POST(req('/api/coaching/send', 'POST', body)))

/** fetch that runs the real routes the screens call; anything else answers 200 {}. */
function routedFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: { method?: string; body?: string }) => {
      const url = String(input instanceof Request ? input.url : input).replace(/^https?:\/\/[^/]+/, '')
      const method = (init?.method ?? 'GET').toUpperCase()
      const p = url.split('?')[0]
      const r = new NextRequest(`http://localhost${url}`, {
        method,
        ...(init?.body !== undefined && { headers: { 'content-type': 'application/json' }, body: init.body }),
      })
      let res: Response | null = null
      if (p === '/api/coaching/trainees' && method === 'GET') res = await (await traineesRoute()).GET(r)
      else if (p === '/api/coaching/send' && method === 'POST') res = await (await sendRoute()).POST(r)
      else if (p === '/api/workouts/saved' && method === 'GET')
        res = await ((await load('@/app/api/workouts/saved/route')) as { GET: Handler }).GET(r)
      else {
        const one = /^\/api\/workouts\/saved\/([^/]+)$/.exec(p)?.[1]
        if (one && method === 'GET')
          res = await ((await load('@/app/api/workouts/saved/[id]/route')) as { GET: Handler }).GET(r, {
            params: Promise.resolve({ id: one }),
          })
      }
      return res ?? new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    })
  )
}

// --- UI -----------------------------------------------------------------------
async function withToasts(el: ReactElement) {
  const { ToastProvider } = (await load('@/components/ToastProvider')) as { ToastProvider: ComponentType<{ children: unknown }> }
  return render(createElement(ToastProvider, null, el))
}
async function renderSend(kind: 'program' | 'saved_workout', sourceId: string, as = s.dustin) {
  auth.userId = as
  routedFetch()
  const Send = ((await load('@/components/coaching/SendToTrainee')) as { default: ComponentType<Json> }).default
  await withToasts(createElement(Send, { kind, sourceId }))
}
/** Waits for the trainee list to load, then opens the sheet (picking `pick` when asked). */
async function openSheet(pick?: string) {
  const button = await screen.findByRole('button', { name: /^send to/i })
  fireEvent.click(button)
  if (pick) fireEvent.click(await screen.findByRole('button', { name: pick }))
  return screen.findByRole('dialog')
}
async function tapSend(dialog: HTMLElement, note?: string) {
  if (note !== undefined) fireEvent.change(within(dialog).getByRole('textbox', { name: /note/i }), { target: { value: note } })
  fireEvent.click(within(dialog).getByRole('button', { name: /^send$/i }))
}
async function renderCoachingPage(userId: string) {
  auth.userId = userId
  routedFetch()
  const page = (await load('@/app/(app)/settings/coaching/page')) as { default: () => Promise<ReactElement> }
  render(await page.default())
}
async function renderTraining(userId: string) {
  const { getTrainingHome } = (await load('@/lib/training/home')) as { getTrainingHome: (u: string) => Promise<Json> }
  const home = await getTrainingHome(userId)
  const Home = ((await load('@/components/training/TrainingHome')) as { default: ComponentType<{ home: Json }> }).default
  render(createElement(Home, { home }))
}
async function renderReview(userId: string, id: string) {
  const { getSuggestionDetail } = (await load('@/lib/suggestions/detail')) as {
    getSuggestionDetail: (u: string, id: string) => Promise<Json | null>
  }
  const detail = await getSuggestionDetail(userId, id)
  expect(detail, 'the trainee can open the suggestion').toBeTruthy()
  const Review = ((await load('@/components/suggestions/SuggestionReview')) as { default: ComponentType<{ suggestion: Json }> })
    .default
  render(createElement(Review, { suggestion: detail as Json }))
}
async function agentProposal(userId: string, tokenName: string, workoutName: string) {
  const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
  const token = (await createAgentToken(s.prisma, userId, tokenName)).record.id
  const made = await (await service()).createProposal(
    s.prisma,
    {
      userId,
      agentTokenId: token,
      kind: 'saved_workout.create',
      rationale: 'From the agent',
      workout: { name: workoutName, exercises: [{ exerciseDefinitionId: s.defs['Leg Press'], sets: [{ reps: '10' }] }] },
    },
    async () => {}
  )
  expect(made.ok).toBe(true)
  return (made as { proposal: { id: string } }).proposal.id
}
const bodyText = () => document.body.textContent ?? ''

const TAP = /\b(min-)?h-12\b|\b(min-)?h-\[48px\]/
/** Raw palette colours bypass the theme tokens (light, dark and E-INK). */
const RAW_COLOUR = /\b(bg|text|border)-(white|black|(gray|slate|zinc|neutral|red|green|blue|yellow|orange)-\d{2,3})\b|\[#[0-9a-f]{3,6}\]/i
function expectPhoneFriendly() {
  const targets = [...document.body.querySelectorAll('button, a')] as HTMLElement[]
  expect(targets.length).toBeGreaterThan(0)
  for (const t of targets) expect(`${t.textContent}: ${t.className}`).toMatch(TAP)
  for (const el of document.body.querySelectorAll('[class]')) expect(String(el.getAttribute('class'))).not.toMatch(RAW_COLOUR)
}

beforeEach(() => {
  rl.refuse = false
  rl.calls.length = 0
  boom.on = false
  log.error.mockClear()
  notifySpy.fn.mockClear()
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
    Given('Dustin coaches Sam', async () => {
      await freshState()
    })
  })

  // Sending ------------------------------------------------------------------------
  Scenario('Send a program', ({ When, Then }) => {
    When('Dustin opens one of his programs in Library and taps "Send to Sam"', async () => {
      const page = readFileSync(path.resolve('app/(app)/library/programs/[id]/page.tsx'), 'utf8')
      expect(page, 'the Library program page mounts SendToTrainee').toMatch(/SendToTrainee/)
      expect(page).toMatch(/kind=["{']+program/)
      await renderSend('program', s.program)
      expect(await screen.findByRole('button', { name: 'Send to Sam' })).toBeTruthy()
    })
    Then('a sheet asks for an optional note and shows "Sam will get a copy to accept or decline"', async () => {
      await renderSend('program', s.program)
      const dialog = await openSheet()
      expect(within(dialog).getByRole('textbox', { name: /note/i })).toBeTruthy()
      expect(dialog.textContent).toContain('Sam will get a copy to accept or decline')
      expect(await proposals(s.sam)).toHaveLength(0)
    })
    When('he taps Send', async () => {
      await renderSend('program', s.program)
      await tapSend(await openSheet(), 'Start here, three days a week')
      await waitFor(async () => expect(await proposals(s.sam)).toHaveLength(1))
    })
    Then('Sam has a pending program proposal with Dustin\'s program as it is now, and the note as its "Why"', async () => {
      const [p] = await proposals(s.sam)
      expect(p).toMatchObject({
        kind: 'program.create',
        status: 'pending',
        coachLinkId: s.linkSam,
        agentTokenId: null,
        rationale: 'Start here, three days a week',
      })
      const payload = p.payload as {
        name: string
        weeks: Array<{ workouts: Array<{ exercises: Array<Json & { prescribedSets: Json[] }> }> }>
      }
      expect(payload.name).toBe('Machine Starter')
      expect(payload.weeks).toHaveLength(2)
      const [bench, row, pulldown] = payload.weeks[0].workouts[0].exercises
      expect(bench.exerciseDefinitionId).toBe(s.defs['Barbell Bench Press'])
      expect(bench.prescribedSets[0]).toMatchObject({ reps: '10', weight: '45lbs', isWarmup: true })
      expect(bench.prescribedSets[1]).toMatchObject({ reps: '5', weight: '135lbs', rpe: 8 })
      expect(row.group).toBe('A')
      expect(pulldown.group).toBe('A')
      expect(await proposals(s.dustin)).toHaveLength(0)
    })
  })

  Scenario('Send a saved workout', ({ When, Then }) => {
    When('Dustin sends a saved workout to Sam the same way', async () => {
      // The saved workout's detail dialog carries the same Send action.
      routedFetch()
      const Dialog = ((await load('@/components/features/saved-workouts/SavedWorkoutDetailDialog')) as {
        default: ComponentType<Json>
      }).default
      const item = { id: s.saved, name: 'Push Pull', exerciseCount: 3, lastUsedAt: null, createdAt: new Date().toISOString() }
      await withToasts(createElement(Dialog, { item, onTogglePin: () => {}, onOpenChange: () => {} }))
      expect(await screen.findByRole('button', { name: 'Send to Sam' })).toBeTruthy()
      cleanup()
      await renderSend('saved_workout', s.saved)
      await tapSend(await openSheet())
      await waitFor(async () => expect(await proposals(s.sam)).toHaveLength(1))
    })
    Then('Sam has a pending saved-workout proposal with its exercises, sets and supersets', async () => {
      const [p] = await proposals(s.sam)
      expect(p).toMatchObject({ kind: 'saved_workout.create', status: 'pending', coachLinkId: s.linkSam, agentTokenId: null })
      const w = p.payload as { name: string; notes?: string; exercises: Array<Json & { sets: Json[] }> }
      expect(w.name).toBe('Push Pull')
      expect(w.notes).toBe('Rest 2 min')
      expect(w.exercises.map((e) => e.exerciseDefinitionId)).toEqual([
        s.defs['Barbell Bench Press'],
        s.defs['Seated Cable Row'],
        s.defs['Lat Pulldown'],
      ])
      expect(w.exercises[0].sets).toEqual([
        expect.objectContaining({ reps: '10', isWarmup: true }),
        expect.objectContaining({ reps: '5', rir: 2 }),
      ])
      expect(w.exercises.map((e) => e.group ?? null)).toEqual([null, 'A', 'A'])
      expect(w.exercises[1].sets[0]).toMatchObject({ rpe: 8 })
    })
  })

  Scenario('Several trainees', ({ Given, Then }) => {
    Given('Dustin also coaches Alex', async () => {
      s.linkAlex = (await s.prisma.coachLink.create({ data: { coachUserId: s.dustin, traineeUserId: s.alex } })).id
    })
    Then('"Send to…" asks which trainee first', async () => {
      await renderSend('program', s.program)
      const button = await screen.findByRole('button', { name: /^send to…$/i })
      expect(screen.queryByRole('button', { name: 'Send to Sam' })).toBeNull()
      fireEvent.click(button)
      expect(await screen.findByRole('button', { name: 'Sam' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Alex' }))
      const dialog = await screen.findByRole('dialog')
      expect(dialog.textContent).toContain('Alex will get a copy to accept or decline')
      await tapSend(dialog)
      await waitFor(async () => expect(await proposals(s.alex)).toHaveLength(1))
      expect((await proposals(s.alex))[0].coachLinkId).toBe(s.linkAlex)
      expect(await proposals(s.sam)).toHaveLength(0)
    })
  })

  Scenario('No trainees', ({ Given, Then }) => {
    Given('Dustin coaches nobody', async () => {
      await s.prisma.coachLink.deleteMany({})
      // Sam coaching Dustin doesn't make Dustin a coach.
      await s.prisma.coachLink.create({ data: { coachUserId: s.sam, traineeUserId: s.dustin } })
    })
    Then('there is no Send option', async () => {
      await renderSend('program', s.program)
      await waitFor(() => expect((fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0))
      await new Promise((r) => setTimeout(r, 50))
      expect(screen.queryByRole('button', { name: /^send to/i })).toBeNull()
      const { body } = await result(await (await traineesRoute()).GET(req('/api/coaching/trainees', 'GET')))
      expect(body.trainees).toEqual([])
    })
  })

  Scenario('A snapshot', ({ Given, When, Then }) => {
    Given('Dustin sent a program', async () => {
      s.before = await tree(s.program)
      s.proposalId = await sendOk({ note: 'Go' })
    })
    When('he edits his program afterwards', async () => {
      await s.prisma.program.update({ where: { id: s.program }, data: { name: 'Machine Starter v2' } })
      await s.prisma.prescribedSet.updateMany({ where: { exercise: { workout: { week: { programId: s.program } } } }, data: { reps: '3' } })
      const extra = await s.prisma.exercise.findFirst({ where: { workout: { week: { programId: s.program } } }, orderBy: { order: 'desc' } })
      await s.prisma.exercise.delete({ where: { id: extra?.id } })
    })
    Then('what Sam sees and gets does not change', async () => {
      await renderReview(s.sam, s.proposalId as string)
      expect(bodyText()).toContain('Machine Starter')
      expect(bodyText()).not.toContain('v2')
      cleanup()
      const ok = await (await service()).approveProposal(s.prisma, s.proposalId as string, s.sam)
      expect(ok.ok, JSON.stringify(ok)).toBe(true)
      const copy = await s.prisma.program.findFirst({ where: { userId: s.sam } })
      expect(await tree(String(copy?.id))).toEqual(s.before)
    })
  })

  Scenario('Nothing goes to Dustin\'s channels', ({ Then }) => {
    Then('a coach send never posts to Discord or Bark', async () => {
      const outbound = vi.fn(async () => new Response('{}'))
      vi.stubGlobal('fetch', outbound)
      await sendOk()
      await sendOk({ kind: 'saved_workout', sourceId: s.saved })
      auth.userId = s.dustin
      // work 152: a pending duplicate is refused, so send a second program.
      expect((await postSend({ linkId: s.linkSam, kind: 'program', sourceId: await makeProgram(s.dustin, 'Second Program') })).status).toBe(201)
      await new Promise((r) => setTimeout(r, 20))
      expect(notifySpy.fn).not.toHaveBeenCalled()
      expect(outbound).not.toHaveBeenCalled()
      expect(await proposals(s.sam)).toHaveLength(3)
    })
  })

  // Receiving ----------------------------------------------------------------------
  Scenario('Sam sees who it\'s from', ({ Then, And }) => {
    Then('on Training under "From your coach" and on the review screen it reads "From Dustin"', async () => {
      s.proposalId = await sendOk({ kind: 'saved_workout', sourceId: s.saved, note: 'Try this' })
      auth.userId = s.sam
      await renderTraining(s.sam)
      const block = screen.getByRole('region', { name: /from your coach/i })
      expect(block.textContent).toContain('From Dustin')
      cleanup()
      await renderReview(s.sam, s.proposalId)
      expect(bodyText()).toContain('From Dustin')
    })
    And('agent suggestions still read "From <agent name>"', async () => {
      const agentId = await agentProposal(s.sam, 'Hermes', 'Agent Legs')
      // work 152: a pending duplicate is refused, so send a second saved workout.
      await sendOk({ kind: 'saved_workout', sourceId: await makeSaved(s.dustin, 'Second Saved') })
      await renderTraining(s.sam)
      const block = screen.getByRole('region', { name: /from your coach/i })
      expect(block.textContent).toContain('From Dustin')
      expect(block.textContent).toContain('From Hermes')
      cleanup()
      await renderReview(s.sam, agentId)
      expect(bodyText()).toContain('From Hermes')
      expect(bodyText()).not.toContain('From Dustin')
    })
  })

  Scenario('Accept a workout', ({ When, Then }) => {
    When('Sam accepts a saved workout from Dustin', async () => {
      s.proposalId = await sendOk({ kind: 'saved_workout', sourceId: s.saved })
      const ok = await (await service()).approveProposal(s.prisma, s.proposalId, s.sam)
      expect(ok.ok, JSON.stringify(ok)).toBe(true)
    })
    Then('Sam has their own saved workout with origin "coach" in their New group, "From Dustin"', async () => {
      const mine = (await (s.prisma as unknown as Record<string, Delegate>).savedWorkout.findMany({
        where: { userId: s.sam },
      })) as Json[]
      expect(mine).toHaveLength(1)
      expect(mine[0]).toMatchObject({ name: 'Push Pull', origin: 'coach', lastUsedAt: null })
      const dustins = await s.prisma.savedWorkout.findUnique({ where: { id: s.saved } })
      expect(mine[0].workoutData).toEqual(dustins?.workoutData)
      expect(mine[0].id).not.toBe(s.saved)

      auth.userId = s.sam
      routedFetch()
      const List = ((await load('@/components/features/saved-workouts/SavedWorkoutsList')) as { default: ComponentType })
        .default
      await withToasts(createElement(List))
      const fresh = await screen.findByRole('region', { name: 'New' })
      expect(fresh.textContent).toContain('Push Pull')
      expect(fresh.textContent).toContain('From Dustin')
    })
  })

  Scenario('Accept a program', ({ When, Then }) => {
    When('Sam accepts a program from Dustin', async () => {
      s.before = await tree(s.program)
      s.proposalId = await sendOk()
      const ok = await (await service()).approveProposal(s.prisma, s.proposalId, s.sam)
      expect(ok.ok, JSON.stringify(ok)).toBe(true)
    })
    Then('Sam has their own program, which Dustin can\'t see or change', async () => {
      const copy = await s.prisma.program.findFirst({ where: { userId: s.sam } })
      expect(copy).toBeTruthy()
      expect(copy?.id).not.toBe(s.program)
      expect(await tree(String(copy?.id))).toEqual(s.before)
      // Everything in the copy is Sam's.
      const owners = await s.prisma.exercise.findMany({ where: { workout: { week: { programId: copy?.id } } }, select: { userId: true } })
      expect(new Set(owners.map((o) => o.userId))).toEqual(new Set([s.sam]))
      // Dustin's Sent list says Accepted and nothing that leads to the copy.
      const sent = await listSent()
      expect(sent).toHaveLength(1)
      expect(JSON.stringify(sent)).not.toContain(String(copy?.id))
      // Dustin changing his own program leaves Sam's alone.
      await s.prisma.prescribedSet.updateMany({ where: { exercise: { workout: { week: { programId: s.program } } } }, data: { reps: '1' } })
      expect(await tree(String(copy?.id))).toEqual(s.before)
    })
  })

  Scenario('Decline', ({ When, Then }) => {
    When('Sam declines', async () => {
      s.proposalId = await sendOk()
      await sendOk({ kind: 'saved_workout', sourceId: s.saved })
      for (const p of await proposals(s.sam)) {
        const r = await (await service()).rejectProposal(s.prisma, p.id, s.sam)
        expect(r.ok).toBe(true)
      }
    })
    Then('nothing is added to Sam\'s account', async () => {
      expect(await s.prisma.program.count({ where: { userId: s.sam } })).toBe(0)
      expect(await s.prisma.savedWorkout.count({ where: { userId: s.sam } })).toBe(0)
      expect((await listSent()).map((r) => r.status)).toEqual(['declined', 'declined'])
    })
  })

  // What the coach sees -------------------------------------------------------------
  Scenario('Sent list', ({ Then, And }) => {
    Then(
      'Settings → Coaching, under each trainee, lists what Dustin sent: name, kind, sent date and "Pending", "Accepted" or "Declined"',
      async () => {
        const svc = await service()
        const accepted = await sendOk()
        await s.prisma.proposal.update({ where: { id: accepted }, data: { createdAt: new Date(Date.now() - 3 * DAY) } })
        expect((await svc.approveProposal(s.prisma, accepted, s.sam)).ok).toBe(true)
        const declined = await sendOk({ kind: 'saved_workout', sourceId: s.saved })
        await s.prisma.proposal.update({ where: { id: declined }, data: { createdAt: new Date(Date.now() - 2 * DAY) } })
        expect((await svc.rejectProposal(s.prisma, declined, s.sam)).ok).toBe(true)
        const second = await makeSaved(s.dustin, 'Arms')
        await sendOk({ kind: 'saved_workout', sourceId: second })

        const sent = await listSent()
        expect(sent.map((r) => [r.name, r.kind, r.status])).toEqual([
          ['Arms', 'saved_workout', 'pending'],
          ['Push Pull', 'saved_workout', 'declined'],
          ['Machine Starter', 'program', 'accepted'],
        ])
        for (const r of sent) {
          expect(Object.keys(r).sort()).toEqual(['kind', 'name', 'sentAt', 'status'])
          expect(new Date(r.sentAt as string).getTime()).toBeGreaterThan(Date.now() - 4 * DAY)
        }

        await renderCoachingPage(s.dustin)
        const list = screen.getByRole('list', { name: 'Sent to Sam' })
        const items = within(list).getAllByRole('listitem')
        expect(items).toHaveLength(3)
        expect(items[0].textContent).toMatch(/Arms/)
        expect(items[0].textContent).toMatch(/Workout/)
        expect(items[0].textContent).toMatch(/Pending/)
        expect(items[1].textContent).toMatch(/Push Pull/)
        expect(items[1].textContent).toMatch(/Declined/)
        expect(items[2].textContent).toMatch(/Machine Starter/)
        expect(items[2].textContent).toMatch(/Program/)
        expect(items[2].textContent).toMatch(/Accepted/)
        for (const item of items) expect(item.querySelector('time[datetime]')).toBeTruthy()
      }
    )
    And('nothing about Sam\'s workouts, logs or Progress', async () => {
      await sendOk()
      await makeSaved(s.sam, 'Sam Secret Legs')
      await makeProgram(s.sam, 'Sam Own Plan')
      await s.prisma.workoutCompletion.create({
        data: { userId: s.sam, status: 'completed', isAdHoc: true, name: 'Sam Tuesday Session' },
      })
      // Another coach's sends to Sam aren't Dustin's to see.
      const alexLink = await s.prisma.coachLink.create({ data: { coachUserId: s.alex, traineeUserId: s.sam } })
      const alexProgram = await makeProgram(s.alex, 'Alex Plan')
      expect((await (await sendLib()).sendToTrainee(s.prisma, s.alex, { linkId: alexLink.id, kind: 'program', sourceId: alexProgram })).ok).toBe(true)

      // The Then step's three sends and this one, and nothing of Alex's.
      expect((await listSent()).map((r) => r.name)).toEqual(['Machine Starter', 'Arms', 'Push Pull', 'Machine Starter'])
      expect(await listSent(alexLink.id)).toEqual([])
      expect(await listSent(s.linkSam, s.sam)).toEqual([])

      await renderCoachingPage(s.dustin)
      for (const secret of ['Sam Secret Legs', 'Sam Own Plan', 'Sam Tuesday Session', 'Alex Plan']) expect(bodyText()).not.toContain(secret)
    })
  })

  Scenario('After the link ends', ({ Given, Then }) => {
    Given('the link has ended', async () => {
      s.proposalId = await sendOk()
      await sendOk({ kind: 'saved_workout', sourceId: s.saved })
      const { endLink } = (await load('@/lib/coaching/links')) as typeof import('@/lib/coaching/links')
      expect(await endLink(s.prisma, s.sam, s.linkSam)).toBe(true)
    })
    Then(
      'Dustin can\'t send, Sam can still accept or decline pending items, and Dustin no longer sees the Sent list',
      async () => {
        expect(await send()).toMatchObject({ ok: false, code: 'not_linked' })
        expect((await postSend({ linkId: s.linkSam, kind: 'program', sourceId: s.program })).status).toBe(403)
        expect(await proposals(s.sam)).toHaveLength(2)

        await renderSend('program', s.program)
        await new Promise((r) => setTimeout(r, 50))
        expect(screen.queryByRole('button', { name: /^send to/i })).toBeNull()
        cleanup()

        const { listPendingSuggestions } = (await load('@/lib/suggestions/detail')) as {
          listPendingSuggestions: (u: string) => Promise<Json[]>
        }
        expect(await listPendingSuggestions(s.sam)).toHaveLength(2)
        const [program, workout] = await proposals(s.sam)
        const svc = await service()
        expect((await svc.approveProposal(s.prisma, program.id, s.sam)).ok).toBe(true)
        expect((await svc.rejectProposal(s.prisma, workout.id, s.sam)).ok).toBe(true)
        expect(await s.prisma.program.count({ where: { userId: s.sam } })).toBe(1)

        expect(await listSent()).toEqual([])
        await renderCoachingPage(s.dustin)
        expect(screen.queryByRole('list', { name: 'Sent to Sam' })).toBeNull()
        expect(bodyText()).not.toContain('Machine Starter')
      }
    )
  })

  // Safety and fit -------------------------------------------------------------------
  Scenario('Scoped and rate limited', ({ Then }) => {
    Then(
      'only a coach on an active link can send to that trainee, only their own programs and workouts, rate limited and logged',
      async () => {
        const sams = await makeSaved(s.sam, 'Sam Legs')
        const alexProgram = await makeProgram(s.alex, 'Alex Plan')
        const body = (over: Json = {}) => ({ linkId: s.linkSam, kind: 'program', sourceId: s.program, ...over })

        auth.userId = s.alex // not on the link
        expect(await postSend(body())).toMatchObject({ status: 403, body: { code: 'not_linked' } })
        auth.userId = s.sam // the trainee, not the coach
        expect(await postSend(body({ kind: 'saved_workout', sourceId: sams }))).toMatchObject({ status: 403 })

        auth.userId = s.dustin
        expect(await postSend(body({ sourceId: alexProgram }))).toMatchObject({ status: 404, body: { code: 'not_found' } })
        expect(await postSend(body({ kind: 'saved_workout', sourceId: sams }))).toMatchObject({ status: 404 })
        // A program id given as a saved workout isn't one.
        expect(await postSend(body({ kind: 'saved_workout', sourceId: s.program }))).toMatchObject({ status: 404 })
        await s.prisma.program.update({ where: { id: s.program }, data: { deletedAt: new Date() } })
        expect(await postSend(body())).toMatchObject({ status: 404 })
        await s.prisma.program.update({ where: { id: s.program }, data: { deletedAt: null } })
        expect(await proposals(s.sam)).toHaveLength(0)

        rl.refuse = true
        expect((await postSend(body())).status).toBe(429)
        expect(rl.calls.map((c) => c.key)).toContain(s.dustin)
        rl.refuse = false
        expect(await proposals(s.sam)).toHaveLength(0)

        boom.on = true
        expect((await postSend(body())).status).toBe(500)
        boom.on = false
        expect(log.error).toHaveBeenCalled()

        expect((await postSend(body())).status).toBe(201)
        expect(await proposals(s.sam)).toHaveLength(1)
      }
    )
  })

  Scenario('Phone width', ({ Then }) => {
    Then('the Send sheet, trainee picker and Sent list fit at 390px with 48px tap targets, in light, dark and E-INK', async () => {
      await s.prisma.coachLink.create({ data: { coachUserId: s.dustin, traineeUserId: s.alex } })
      await renderSend('program', s.program)
      fireEvent.click(await screen.findByRole('button', { name: /^send to…$/i }))
      await screen.findByRole('button', { name: 'Sam' })
      expectPhoneFriendly()
      fireEvent.click(screen.getByRole('button', { name: 'Sam' }))
      await screen.findByRole('dialog')
      expectPhoneFriendly()
      cleanup()

      await sendOk()
      await renderCoachingPage(s.dustin)
      expect(screen.getByRole('list', { name: 'Sent to Sam' })).toBeTruthy()
      expectPhoneFriendly()
    })
  })
})

// ---------------------------------------------------------------------------
// Edges the scenarios don't pin
// ---------------------------------------------------------------------------
describe('send edges', () => {
  beforeEach(async () => {
    await freshState()
  })

  it('a note is optional', async () => {
    const id = await sendOk()
    const p = await s.prisma.proposal.findUnique({ where: { id } })
    expect(p?.rationale).toBe('')
  })

  // work 163: Dustin's own exercises travel with the send (custom-exercises.steps.ts);
  // one that is neither shared, Sam's nor Dustin's is still refused by name.
  it("names every exercise that is neither shared, Sam's nor Dustin's, in order of use, once each", async () => {
    const fly = (await createTestExerciseDefinition(s.prisma, { name: "Alex's Cable Fly", isSystem: false, userId: s.alex })).id
    const hack = (await createTestExerciseDefinition(s.prisma, { name: "Alex's Hack Squat", isSystem: false, userId: s.alex })).id
    s.program = await makeProgram(s.dustin, 'Custom Day', [hack, fly, fly])
    expect(await send()).toMatchObject({ ok: false, code: 'invalid', missingExercises: ["Alex's Hack Squat", "Alex's Cable Fly"] })
    expect(await proposals(s.sam)).toHaveLength(0)
  })

  it('a program too big for a proposal is refused as invalid, not a crash', async () => {
    const big = await s.prisma.program.create({
      data: {
        name: 'Seventeen Weeks',
        userId: s.dustin,
        weeks: {
          create: Array.from({ length: 17 }, (_, i) => ({
            weekNumber: i + 1,
            userId: s.dustin,
            workouts: {
              create: [
                {
                  dayNumber: 1,
                  name: 'Day',
                  userId: s.dustin,
                  exercises: {
                    create: [
                      {
                        order: 1,
                        name: 'Leg Press',
                        exerciseDefinitionId: s.defs['Leg Press'],
                        userId: s.dustin,
                        prescribedSets: { create: [{ setNumber: 1, reps: '10', userId: s.dustin }] },
                      },
                    ],
                  },
                },
              ],
            },
          })),
        },
      },
    })
    expect(await send({ sourceId: big.id })).toMatchObject({ ok: false, code: 'invalid' })
    expect(await proposals(s.sam)).toHaveLength(0)
  })

  it('an unknown link is not_linked, an unknown program not_found', async () => {
    expect(await send({ linkId: 'nope' })).toMatchObject({ ok: false, code: 'not_linked' })
    expect(await send({ sourceId: 'nope' })).toMatchObject({ ok: false, code: 'not_found' })
  })

  it('the route answers 401 signed out and 400 for a bad kind or missing ids, sending nothing', async () => {
    auth.userId = ''
    expect((await postSend({ linkId: s.linkSam, kind: 'program', sourceId: s.program })).status).toBe(401)
    auth.userId = s.dustin
    expect((await postSend({ linkId: s.linkSam, kind: 'anchors', sourceId: s.program })).status).toBe(400)
    expect((await postSend({ kind: 'program', sourceId: s.program })).status).toBe(400)
    expect((await postSend({ linkId: s.linkSam, kind: 'program' })).status).toBe(400)
    expect(await proposals(s.sam)).toHaveLength(0)
  })

  it('the route answers 201 with the proposal id', async () => {
    const { status, body } = await postSend({ linkId: s.linkSam, kind: 'program', sourceId: s.program, note: 'Hi' })
    expect(status).toBe(201)
    const p = await s.prisma.proposal.findUnique({ where: { id: String(body.proposalId) } })
    expect(p).toMatchObject({ userId: s.sam, rationale: 'Hi' })
  })

  it('trainees lists only active links where the user is the coach, by name', async () => {
    const alex = await s.prisma.coachLink.create({ data: { coachUserId: s.dustin, traineeUserId: s.alex } })
    await s.prisma.coachLink.create({ data: { coachUserId: s.alex, traineeUserId: s.dustin } })
    await s.prisma.coachLink.update({ where: { id: alex.id }, data: { endedAt: new Date(), endedBy: s.dustin } })
    const { status, body } = await result(await (await traineesRoute()).GET(req('/api/coaching/trainees', 'GET')))
    expect(status).toBe(200)
    expect(body.trainees).toEqual([{ linkId: s.linkSam, name: 'Sam' }])
    auth.userId = ''
    expect((await (await traineesRoute()).GET(req('/api/coaching/trainees', 'GET'))).status).toBe(401)
  })
})
