/**
 * Step definitions for features/agent-tools/saved-workout-proposals.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md ("Saved
 * workouts"): agents read saved workouts and the live session, propose new
 * saved workouts and changes, and never write a live session.
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so state is created once
 * per scenario in the first Background step. Never reset it in afterEach.
 *
 * Saved workouts Dustin "already has" are written straight to the table, in
 * the SavedWorkoutData shape (types/saved-workout.ts), the way the app's save
 * route leaves them. Edits "Dustin made himself" are plain row updates.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const feature = await loadFeature('features/agent-tools/saved-workout-proposals.feature')

type Outcome = { failed: boolean; value: unknown; text: string; thrown: boolean; raw?: unknown }
type Def = { id: string; name: string }
type Json = Record<string, unknown>

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  bench: Def
  ohp: Def
  pullup: Def
  squat: Def
  notify: ReturnType<typeof vi.fn>
  saved?: SavedRow
  theirs?: SavedRow
  last?: Outcome
  second?: Outcome
  proposalId?: string
  snapshot?: string
  draftId?: string
  outcomes?: Outcome[]
}

let s = {} as State

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function textOf(v: unknown): string {
  if (v instanceof Error) return `${v.name}: ${v.message}`
  try {
    return JSON.stringify(v) ?? String(v)
  } catch {
    return String(v)
  }
}

function unwrap(raw: unknown): unknown {
  const t = (raw as { content?: Array<{ text?: string }> } | null)?.content?.[0]?.text
  if (typeof t === 'string') {
    try {
      return JSON.parse(t)
    } catch {
      return t
    }
  }
  return raw
}

async function attempt(fn: () => Promise<unknown>): Promise<Outcome> {
  try {
    const raw = await fn()
    const isError = (raw as { isError?: boolean } | null)?.isError === true
    return { failed: isError, value: unwrap(raw), text: `${textOf(raw)} ${textOf(unwrap(raw))}`, thrown: false, raw }
  } catch (e) {
    return { failed: true, value: e, text: textOf(e), thrown: true }
  }
}

const load = (spec: string) => import(/* @vite-ignore */ spec)
async function tools() {
  return (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
}
async function service() {
  return (await load('@/lib/proposals/service')) as typeof import('@/lib/proposals/service')
}
async function agentTokens() {
  return (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
}

function ctx() {
  return { userId: s.userId, tokenId: s.tokenId, role: 'admin', notify: s.notify }
}

async function callAgentTool(name: string, args: Record<string, unknown>, prisma: PrismaClient = s.prisma): Promise<Outcome> {
  const { callTool } = await tools()
  return attempt(() => callTool(prisma, ctx() as never, name, args as never))
}

function mustSucceed(o: Outcome, what: string) {
  expect(o.failed, `${what} should succeed but got: ${o.text}`).toBe(false)
}

function toolPayload(o: Outcome): Json {
  expect((o.raw as { isError?: boolean })?.isError, `tool should set isError: ${o.text}`).toBe(true)
  return o.value as Json
}

function expectNotFound(o: Outcome) {
  expect(o.failed, `should fail: ${o.text}`).toBe(true)
  expect(o.text).toMatch(/not found/i)
}

/** The tool refused the call and named the field that failed first. */
function expectField(o: Outcome, field: string) {
  const p = toolPayload(o)
  expect(p.field, `field in ${textOf(p)}`).toBe(field)
  expect(typeof p.error).toBe('string')
  expect(String(p.error).length).toBeGreaterThan(0)
}

type Decision = 'approveProposal' | 'rejectProposal' | 'revertProposal'
async function decide(fn: Decision, proposalId: string): Promise<Outcome> {
  const svc = (await service()) as unknown as Record<Decision, (...a: unknown[]) => Promise<unknown>>
  const raw = (await svc[fn](s.prisma, proposalId, s.userId)) as { ok?: boolean }
  return { failed: raw?.ok !== true, value: raw, text: textOf(raw), thrown: false, raw }
}

function expectOk(o: Outcome, what: string) {
  expect((o.value as { ok?: boolean })?.ok, `${what} should be ok: ${o.text}`).toBe(true)
}

function expectRefused(o: Outcome, code: string) {
  const v = o.value as { ok?: boolean; code?: string; error?: string }
  expect(v.ok, `expected refusal, got: ${o.text}`).toBe(false)
  expect(v.code).toBe(code)
  expect(typeof v.error).toBe('string')
}

const RATIONALE = 'Your pressing volume is low and this fills it'

async function latestProposal() {
  return await s.prisma.proposal.findFirstOrThrow({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' } })
}
async function proposalById(id: string = s.proposalId!) {
  return await s.prisma.proposal.findUniqueOrThrow({ where: { id } })
}
const proposalCount = () => s.prisma.proposal.count()

async function expectNoProposal() {
  expect(await proposalCount()).toBe(0)
  expect(s.notify).not.toHaveBeenCalled()
}

// --- Exercise input and the stored shape ------------------------------------
type SetIn = { reps: string; rir?: number; rpe?: number; isWarmup?: boolean }
type ExIn = { exerciseDefinitionId: string; notes?: string; sets: SetIn[] }

const ex = (def: Def, sets: SetIn[] = [{ reps: '8' }], notes?: string): ExIn => ({
  exerciseDefinitionId: def.id,
  ...(notes !== undefined ? { notes } : {}),
  sets,
})
const sets = (n: number, reps: string, rir?: number): SetIn[] =>
  Array.from({ length: n }, () => ({ reps, ...(rir !== undefined ? { rir } : {}) }))

type StoredSet = { setNumber: number; reps: string; rir: number | null; rpe: number | null; isWarmup: boolean }
type StoredEx = {
  name: string
  exerciseDefinitionId: string
  order: number
  notes: string | null
  exerciseGroup: string | null
  sets: StoredSet[]
}
type Item = { def: Def; sets?: SetIn[]; notes?: string; name?: string }

/** What the spec says approve stores for these items: positions from the array, name from the definition. */
function stored(items: Item[]): StoredEx[] {
  return items.map((it, i) => ({
    name: it.name ?? it.def.name,
    exerciseDefinitionId: it.def.id,
    order: i + 1,
    notes: it.notes ?? null,
    exerciseGroup: null,
    sets: (it.sets ?? [{ reps: '8' }]).map((st, j) => ({
      setNumber: j + 1,
      reps: st.reps,
      rir: st.rir ?? null,
      rpe: st.rpe ?? null,
      isWarmup: st.isWarmup ?? false,
    })),
  }))
}
const inputOf = (items: Item[]): ExIn[] => items.map((it) => ex(it.def, it.sets, it.notes))

// --- Saved workouts -----------------------------------------------------------
type SavedRow = Awaited<ReturnType<typeof seedSaved>>

async function seedSaved(o: { name: string; notes?: string | null; items?: Item[]; userId?: string; createdAt?: Date; lastUsedAt?: Date }) {
  const items = o.items ?? [{ def: s.bench }]
  return await s.prisma.savedWorkout.create({
    data: {
      userId: o.userId ?? s.userId,
      name: o.name,
      notes: o.notes ?? null,
      workoutData: stored(items) as never,
      exerciseCount: items.length,
      ...(o.createdAt ? { createdAt: o.createdAt } : {}),
      ...(o.lastUsedAt ? { lastUsedAt: o.lastUsedAt } : {}),
    },
  })
}
const liveSaved = (id: string) => s.prisma.savedWorkout.findUnique({ where: { id } })
const savedCount = () => s.prisma.savedWorkout.count()
const allSaved = () => s.prisma.savedWorkout.findMany({ orderBy: { createdAt: 'asc' } })

/** Dustin starts a saved workout: a draft session that carries its id. */
async function startIt(savedWorkoutId: string) {
  return await s.prisma.workoutCompletion.create({
    data: { userId: s.userId, savedWorkoutId, status: 'draft', isAdHoc: true, startedAt: new Date(), name: 'Push day' },
  })
}

type SavedOut = {
  id: string
  name: string
  notes: string | null
  exerciseCount: number
  lastUsedAt: string | null
  createdAt: string
  exercises?: Array<{
    order: number
    exerciseDefinitionId: string
    name: string
    notes: string | null
    sets: StoredSet[]
  }>
}

async function readList() {
  const o = await callAgentTool('list_saved_workouts', {})
  mustSucceed(o, 'list_saved_workouts')
  return (o.value as { savedWorkouts: SavedOut[] }).savedWorkouts
}
async function readOne(id: string, prisma: PrismaClient = s.prisma) {
  const o = await callAgentTool('get_saved_workout', { id }, prisma)
  mustSucceed(o, 'get_saved_workout')
  return o.value as SavedOut
}

// --- Live session ---------------------------------------------------------------
async function seedDraft(o: {
  userId?: string
  startedAt: Date
  name?: string | null
  isAdHoc?: boolean
  status?: string
  items: Array<{ def: Def; logged: number }>
}) {
  const userId = o.userId ?? s.userId
  const completion = await s.prisma.workoutCompletion.create({
    data: {
      userId,
      status: o.status ?? 'draft',
      isAdHoc: o.isAdHoc ?? true,
      name: o.name ?? null,
      startedAt: o.startedAt,
      completedAt: o.startedAt,
    },
  })
  for (const [i, item] of o.items.entries()) {
    const exercise = await s.prisma.exercise.create({
      data: { name: item.def.name, exerciseDefinitionId: item.def.id, order: i + 1, userId, workoutCompletionId: completion.id, isOneOff: true },
    })
    await s.prisma.loggedSet.createMany({
      data: Array.from({ length: item.logged }, (_, j) => ({
        setNumber: j + 1,
        reps: 5,
        weight: 100,
        weightUnit: 'lbs',
        isWarmup: false,
        exerciseId: exercise.id,
        completionId: completion.id,
        userId,
        createdAt: o.startedAt,
      })),
    })
  }
  return completion
}

type DraftOut = {
  completionId: string
  name: string | null
  isAdHoc: boolean
  startedAt: string
  exercises: Array<{ name: string; exerciseDefinitionId: string; loggedSetCount: number }>
}
async function readDraft(prisma: PrismaClient = s.prisma) {
  const o = await callAgentTool('get_active_draft', {}, prisma)
  mustSucceed(o, 'get_active_draft')
  return o.value as DraftOut | null
}

/** Every session row, exercise and set, as one string, to prove nothing moved. */
async function sessionSnapshot() {
  const rows = await s.prisma.workoutCompletion.findMany({
    orderBy: { id: 'asc' },
    include: { exercises: { orderBy: { id: 'asc' }, include: { loggedSets: { orderBy: { id: 'asc' } } } } },
  })
  return JSON.stringify(rows)
}

/** Count calls on a Prisma client; `watch` names the model methods that count. */
function countingProxy(prisma: PrismaClient, watch: Set<string>, counter: { n: number }, rawNames: string[] = []) {
  return new Proxy(prisma, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof prop === 'string' && rawNames.includes(prop)) {
        return (...a: unknown[]) => {
          counter.n++
          return (value as (...x: unknown[]) => unknown).apply(target, a)
        }
      }
      if (typeof prop === 'string' && !prop.startsWith('$') && value && typeof value === 'object') {
        return new Proxy(value as object, {
          get(model, method, r) {
            const fn = Reflect.get(model, method, r)
            if (typeof fn !== 'function') return fn
            return (...a: unknown[]) => {
              if (watch.has(String(method))) counter.n++
              return fn.apply(model, a)
            }
          },
        })
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as PrismaClient
}
const WRITES = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'])
const RAW_WRITES = ['$executeRaw', '$executeRawUnsafe', '$transaction']

// --- Proposals ---------------------------------------------------------------
type CreateArgs = { name?: unknown; notes?: unknown; exercises?: unknown; [k: string]: unknown }
const proposeCreate = (args: CreateArgs, extra: Json = {}) =>
  callAgentTool('propose_workout_create', { rationale: RATIONALE, ...args, ...extra })
const proposeUpdate = (savedWorkoutId: string, args: Json, extra: Json = {}) =>
  callAgentTool('propose_workout_update', { savedWorkoutId, rationale: RATIONALE, ...args, ...extra })

async function pendingCreate(name: string, items: Item[], extra: Json = {}): Promise<string> {
  mustSucceed(await proposeCreate({ name, exercises: inputOf(items), ...extra }), 'propose_workout_create')
  s.proposalId = (await latestProposal()).id
  return s.proposalId
}
async function pendingUpdate(args: Json, saved: SavedRow = s.saved!): Promise<string> {
  mustSucceed(await proposeUpdate(saved.id, args), 'propose_workout_update')
  s.proposalId = (await latestProposal()).id
  return s.proposalId
}
async function approveNow(id: string = s.proposalId!) {
  expectOk(await decide('approveProposal', id), 'approve')
}
/** Dustin approved a proposed new saved workout; `s.saved` is the row it made. */
async function approvedCreate(name: string, items: Item[], extra: Json = {}) {
  const id = await pendingCreate(name, items, extra)
  await approveNow(id)
  s.saved = (await allSaved()).at(-1)!
  return id
}
async function approvedUpdate(args: Json) {
  const id = await pendingUpdate(args)
  await approveNow(id)
  return id
}

/** Create `n` extra exercises visible to Dustin. */
async function extras(n: number, userId?: string): Promise<Def[]> {
  const out: Def[] = []
  for (let i = 0; i < n; i++) {
    out.push(await createTestExerciseDefinition(s.prisma, { name: `Extra Lift ${userId ?? 'sys'} ${i}`, ...(userId ? { userId } : {}) }))
  }
  return out
}

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const user = await createTestUser()
  const other = await createTestUser()
  const next = {
    prisma,
    userId: user.id,
    otherUserId: other.id,
    tokenId: '',
    notify: vi.fn(async () => {}),
  } as State
  const { createAgentToken } = await agentTokens()
  next.tokenId = (await createAgentToken(prisma, next.userId, 'coach')).record.id
  return next
}

async function seedLibrary() {
  s.bench = await createTestExerciseDefinition(s.prisma, { name: 'Bench Press', primaryFAUs: ['chest'], secondaryFAUs: ['triceps'] })
  s.ohp = await createTestExerciseDefinition(s.prisma, { name: 'Overhead Press', primaryFAUs: ['front-delts'], secondaryFAUs: ['triceps'] })
  s.pullup = await createTestExerciseDefinition(s.prisma, { name: 'Pull-up', primaryFAUs: ['lats', 'biceps'] })
  s.squat = await createTestExerciseDefinition(s.prisma, { name: 'Back Squat', primaryFAUs: ['quads'], secondaryFAUs: ['glutes'] })
}

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given, And }) => {
    Given('Dustin has an agent token named "coach"', async () => {
      s = await freshState()
    })
    And('the exercise library contains "Bench Press", "Overhead Press", "Pull-up" and "Back Squat"', async () => {
      await seedLibrary()
    })
  })

  Rule('Agents read saved workouts and the live session', ({ RuleScenario }) => {
    RuleScenario('Listing and reading saved workouts', ({ Given, And, When, Then }) => {
      Given('Dustin has a saved workout "Push day" with "Bench Press" 3 sets of "8" at RIR 2', async () => {
        s.saved = await seedSaved({ name: 'Push day', items: [{ def: s.bench, sets: sets(3, '8', 2) }] })
      })
      And('another user has a saved workout "Their day"', async () => {
        s.theirs = await seedSaved({ name: 'Their day', userId: s.otherUserId, items: [{ def: s.pullup }] })
      })
      When('the agent calls "list_saved_workouts" and "get_saved_workout" for "Push day"', async () => {
        s.last = await callAgentTool('list_saved_workouts', {})
        s.second = await callAgentTool('get_saved_workout', { id: s.saved!.id })
      })
      Then('the list shows only "Push day"', () => {
        mustSucceed(s.last!, 'list_saved_workouts')
        const list = (s.last!.value as { savedWorkouts: SavedOut[] }).savedWorkouts
        expect(list.map((w) => w.name)).toEqual(['Push day'])
        expect(list[0]).toMatchObject({ id: s.saved!.id, notes: null, exerciseCount: 1, lastUsedAt: null })
        expect(typeof list[0].createdAt).toBe('string')
      })
      And('"Push day" shows "Bench Press" with 3 sets of "8" at RIR 2', () => {
        mustSucceed(s.second!, 'get_saved_workout')
        const out = s.second!.value as SavedOut
        expect(out).toMatchObject({ id: s.saved!.id, name: 'Push day', exerciseCount: 1 })
        expect(out.exercises).toEqual([
          {
            order: 1,
            exerciseDefinitionId: s.bench.id,
            name: 'Bench Press',
            notes: null,
            sets: [1, 2, 3].map((n) => ({ setNumber: n, reps: '8', rir: 2, rpe: null, isWarmup: false })),
          },
        ])
      })
    })

    RuleScenario("Another user's saved workout is not found", ({ When, Then }) => {
      When("the agent calls \"get_saved_workout\" with the other user's saved workout id", async () => {
        s.theirs = await seedSaved({ name: 'Their day', userId: s.otherUserId, items: [{ def: s.pullup }] })
        s.last = await callAgentTool('get_saved_workout', { id: s.theirs.id })
      })
      Then('the call fails with "not found"', () => {
        expectNotFound(s.last!)
      })
    })

    RuleScenario('Reading the live session changes nothing', ({ Given, When, Then, And }) => {
      Given('Dustin is in the middle of a session with 2 logged sets of "Bench Press"', async () => {
        s.snapshot = undefined
        const draft = await seedDraft({ startedAt: new Date(Date.now() - 20 * 60 * 1000), name: 'Quick lift', items: [{ def: s.bench, logged: 2 }] })
        s.draftId = draft.id
        s.snapshot = await sessionSnapshot()
      })
      When('the agent calls "get_active_draft"', async () => {
        s.last = await callAgentTool('get_active_draft', {})
      })
      Then('it shows that session with "Bench Press" and 2 logged sets', () => {
        mustSucceed(s.last!, 'get_active_draft')
        const out = s.last!.value as DraftOut
        expect(out.completionId).toBe(s.draftId)
        expect(out.name).toBe('Quick lift')
        expect(out.isAdHoc).toBe(true)
        expect(typeof out.startedAt).toBe('string')
        expect(out.exercises).toEqual([{ name: 'Bench Press', exerciseDefinitionId: s.bench.id, loggedSetCount: 2 }])
      })
      And('the session is unchanged', async () => {
        expect(await sessionSnapshot()).toBe(s.snapshot)
      })
    })

    RuleScenario('Read tools are marked read-only', ({ When, Then, And }) => {
      When('the agent lists the tools', async () => {
        const { listTools } = await tools()
        const raw = (await listTools('admin')) as unknown
        const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? [])
        s.snapshot = JSON.stringify(list)
      })
      Then('every read tool is marked read-only', () => {
        const list = JSON.parse(s.snapshot!) as Array<{ name: string; annotations?: Json }>
        const reads = list.filter((t) => isReadTool(t.name))
        expect(reads.map((t) => t.name)).toEqual(expect.arrayContaining(['list_saved_workouts', 'get_saved_workout', 'get_active_draft']))
        for (const t of reads) expect(t.annotations?.readOnlyHint, `${t.name} readOnlyHint`).toBe(true)
      })
      And('the propose tools are not', () => {
        const list = JSON.parse(s.snapshot!) as Array<{ name: string; annotations?: Json }>
        const proposes = list.filter((t) => t.name.startsWith('propose_'))
        expect(proposes.map((t) => t.name)).toEqual(expect.arrayContaining(['propose_workout_create', 'propose_workout_update']))
        for (const t of proposes) {
          expect(t.annotations?.readOnlyHint, `${t.name} readOnlyHint`).toBe(false)
          expect(t.annotations?.destructiveHint, `${t.name} destructiveHint`).toBe(false)
        }
      })
    })
  })

  Rule('New saved workouts are proposed and approved', ({ RuleScenario }) => {
    RuleScenario('Proposing a new saved workout changes nothing yet', ({ When, Then, And }) => {
      When(
        'the agent proposes a saved workout "Push day" with "Bench Press" 3 sets of "8" and "Overhead Press" 3 sets of "10"',
        async () => {
          s.last = await proposeCreate({
            name: 'Push day',
            exercises: inputOf([
              { def: s.bench, sets: sets(3, '8') },
              { def: s.ohp, sets: sets(3, '10') },
            ]),
          })
        }
      )
      Then('a pending proposal "New saved workout: Push day (2 exercises)" exists', async () => {
        mustSucceed(s.last!, 'propose_workout_create')
        const p = await latestProposal()
        expect(p.status).toBe('pending')
        expect(p.kind).toBe('saved_workout.create')
        expect(p.userId).toBe(s.userId)
        expect(p.agentTokenId).toBe(s.tokenId)
        expect(p.summary).toBe('New saved workout: Push day (2 exercises)')
        expect(p.rationale).toBe(RATIONALE)
        expect(p.decidedAt).toBeNull()
        expect(await proposalCount()).toBe(1)
        expect(s.last!.value).toMatchObject({ proposalId: p.id, status: 'pending', summary: p.summary })
        expect(s.notify).toHaveBeenCalledTimes(1)
        const payload = s.notify.mock.calls[0][0] as Json
        expect(payload.proposalId).toBe(p.id)
        expect(textOf(payload)).toContain('New saved workout: Push day (2 exercises)')
      })
      And('Dustin has no saved workouts', async () => {
        expect(await savedCount()).toBe(0)
      })
    })

    RuleScenario('A bad saved workout is refused', ({ When, Then, And }) => {
      When(
        "the agent proposes a saved workout with an exercise that doesn't exist, another user's exercise, no exercises, or a set with RIR 11",
        async () => {
          const [theirs] = await extras(1, s.otherUserId)
          s.outcomes = [
            await proposeCreate({ name: 'Push day', exercises: [ex(s.bench), { exerciseDefinitionId: 'no-such-exercise', sets: [{ reps: '8' }] }] }),
            await proposeCreate({ name: 'Push day', exercises: [ex(theirs)] }),
            await proposeCreate({ name: 'Push day', exercises: [] }),
            await proposeCreate({ name: 'Push day', exercises: [ex(s.bench, [{ reps: '8', rir: 11 }])] }),
          ]
        }
      )
      Then('each proposal is refused, naming the bad field', () => {
        const [unknown, theirs, none, rir] = s.outcomes!
        expectField(unknown, 'exercises[1].exerciseDefinitionId')
        expectField(theirs, 'exercises[0].exerciseDefinitionId')
        expectField(none, 'exercises')
        expectField(rir, 'exercises[0].sets[0].rir')
      })
      And('no proposal is created', async () => {
        await expectNoProposal()
      })
    })

    RuleScenario('Approving creates the saved workout', ({ Given, When, Then, And }) => {
      Given('the agent proposed a saved workout "Push day" with "Bench Press" 3 sets of "8" at RIR 2', async () => {
        await pendingCreate('Push day', [{ def: s.bench, sets: sets(3, '8', 2) }])
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('Dustin has a saved workout "Push day" with 1 exercise, "Bench Press", 3 sets of "8" at RIR 2', async () => {
        expectOk(s.last!, 'approve')
        const rows = await allSaved()
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ userId: s.userId, name: 'Push day', notes: null, exerciseCount: 1, lastUsedAt: null })
        expect(rows[0].workoutData).toEqual(stored([{ def: s.bench, sets: sets(3, '8', 2) }]))
        const p = await proposalById()
        expect(p.status).toBe('applied')
        expect(p.targetId).toBe(rows[0].id)
        expect(p.inverse).toEqual({ op: 'delete', id: rows[0].id })
        expect(p.decidedAt).not.toBeNull()
      })
      And('no session was started', async () => {
        expect(await s.prisma.workoutCompletion.count()).toBe(0)
        expect(await s.prisma.exercise.count()).toBe(0)
      })
    })

    RuleScenario('Reverting a new saved workout deletes it', ({ Given, When, Then }) => {
      Given('Dustin approved a proposed saved workout "Push day"', async () => {
        await approvedCreate('Push day', [{ def: s.bench }])
        expect(await savedCount()).toBe(1)
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('Dustin has no saved workouts', async () => {
        expectOk(s.last!, 'revert')
        expect(await savedCount()).toBe(0)
        expect((await proposalById()).status).toBe('reverted')
      })
    })

    RuleScenario("A saved workout Dustin has started can't be reverted", ({ Given, When, Then, And }) => {
      Given('Dustin approved a proposed saved workout "Push day" and started it', async () => {
        await approvedCreate('Push day', [{ def: s.bench }])
        await startIt(s.saved!.id)
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('the revert is refused as a conflict', async () => {
        expectRefused(s.last!, 'conflict')
        expect((await proposalById()).status).toBe('applied')
      })
      And('"Push day" and the started session still exist', async () => {
        expect((await liveSaved(s.saved!.id))?.name).toBe('Push day')
        expect(await s.prisma.workoutCompletion.count({ where: { savedWorkoutId: s.saved!.id } })).toBe(1)
      })
    })
  })

  Rule('Changes to saved workouts are proposed and approved', ({ RuleScenario }) => {
    RuleScenario('Proposing a change changes nothing yet', ({ Given, When, Then, And }) => {
      Given('Dustin has a saved workout "Push day" with "Bench Press"', async () => {
        s.saved = await seedSaved({ name: 'Push day', items: [{ def: s.bench }] })
        s.snapshot = JSON.stringify(await liveSaved(s.saved.id))
      })
      When('the agent proposes renaming it "Push A" and replacing its exercises with "Overhead Press" 4 sets of "6"', async () => {
        s.last = await proposeUpdate(s.saved!.id, { name: 'Push A', exercises: inputOf([{ def: s.ohp, sets: sets(4, '6') }]) })
      })
      Then('a pending proposal "Update saved workout Push day: name, exercises" exists', async () => {
        mustSucceed(s.last!, 'propose_workout_update')
        const p = await latestProposal()
        expect(p.status).toBe('pending')
        expect(p.kind).toBe('saved_workout.update')
        expect(p.targetId).toBe(s.saved!.id)
        expect(p.agentTokenId).toBe(s.tokenId)
        expect(p.summary).toBe('Update saved workout Push day: name, exercises')
        expect(p.rationale).toBe(RATIONALE)
        expect(p.decidedAt).toBeNull()
        expect(await proposalCount()).toBe(1)
        expect(s.last!.value).toMatchObject({ proposalId: p.id, status: 'pending', summary: p.summary })
        expect(s.notify).toHaveBeenCalledTimes(1)
      })
      And('"Push day" is unchanged', async () => {
        expect(JSON.stringify(await liveSaved(s.saved!.id))).toBe(s.snapshot)
      })
    })

    RuleScenario('Approving changes only the named fields', ({ Given, And, When, Then }) => {
      Given('Dustin has a saved workout "Push day" with notes "Heavy" and "Bench Press"', async () => {
        s.saved = await seedSaved({ name: 'Push day', notes: 'Heavy', items: [{ def: s.bench }] })
      })
      And('the agent proposed replacing its exercises with "Overhead Press" 4 sets of "6"', async () => {
        await pendingUpdate({ exercises: inputOf([{ def: s.ohp, sets: sets(4, '6') }]) })
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('"Push day" has "Overhead Press" 4 sets of "6" and still has notes "Heavy"', async () => {
        expectOk(s.last!, 'approve')
        const row = (await liveSaved(s.saved!.id))!
        expect(row.name).toBe('Push day')
        expect(row.notes).toBe('Heavy')
        expect(row.exerciseCount).toBe(1)
        expect(row.workoutData).toEqual(stored([{ def: s.ohp, sets: sets(4, '6') }]))
        const p = await proposalById()
        expect(p.status).toBe('applied')
        expect(p.targetId).toBe(s.saved!.id)
        expect(p.before).toEqual({ exercises: stored([{ def: s.bench }]) })
        expect(p.inverse).toEqual(p.before)
      })
    })

    RuleScenario('A field changed since the proposal is a conflict', ({ Given, And, When, Then }) => {
      Given('the agent proposed renaming "Push day" to "Push A"', async () => {
        s.saved = await seedSaved({ name: 'Push day' })
        await pendingUpdate({ name: 'Push A' })
      })
      And('Dustin then renamed it "Push B" himself', async () => {
        await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { name: 'Push B' } })
      })
      When('Dustin approves the proposal', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the proposal is marked as a conflict', async () => {
        expectRefused(s.last!, 'conflict')
        const p = await proposalById()
        expect(p.status).toBe('conflict')
        expect(p.decidedAt).not.toBeNull()
      })
      And('the saved workout is still named "Push B"', async () => {
        expect((await liveSaved(s.saved!.id))?.name).toBe('Push B')
      })
    })

    RuleScenario('A saved workout deleted since the proposal is a conflict', ({ Given, And, When, Then }) => {
      Given('the agent proposed renaming "Push day" to "Push A"', async () => {
        s.saved = await seedSaved({ name: 'Push day' })
        await pendingUpdate({ name: 'Push A' })
      })
      And('Dustin then deleted "Push day"', async () => {
        await s.prisma.savedWorkout.delete({ where: { id: s.saved!.id } })
      })
      When('Dustin approves the proposal', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the proposal is marked as a conflict', async () => {
        expectRefused(s.last!, 'conflict')
        const p = await proposalById()
        expect(p.status).toBe('conflict')
        expect(String(p.error)).toMatch(/deleted/i)
        expect(await savedCount()).toBe(0)
      })
    })

    RuleScenario('Reverting a change restores the named fields', ({ Given, When, Then }) => {
      Given('Dustin approved renaming "Push day" to "Push A" and replacing its exercises', async () => {
        s.saved = await seedSaved({ name: 'Push day', notes: 'Heavy', items: [{ def: s.bench, sets: sets(3, '8', 2) }] })
        await approvedUpdate({ name: 'Push A', exercises: inputOf([{ def: s.ohp, sets: sets(4, '6') }]) })
        expect((await liveSaved(s.saved!.id))?.name).toBe('Push A')
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('the saved workout is named "Push day" with its original exercises again', async () => {
        expectOk(s.last!, 'revert')
        const row = (await liveSaved(s.saved!.id))!
        expect(row.name).toBe('Push day')
        expect(row.notes).toBe('Heavy')
        expect(row.exerciseCount).toBe(1)
        expect(row.workoutData).toEqual(stored([{ def: s.bench, sets: sets(3, '8', 2) }]))
        expect((await proposalById()).status).toBe('reverted')
      })
    })

    RuleScenario("Another user's saved workout can't be changed", ({ When, Then, And }) => {
      When("the agent proposes a change to the other user's saved workout", async () => {
        s.theirs = await seedSaved({ name: 'Their day', userId: s.otherUserId, items: [{ def: s.pullup }] })
        s.last = await proposeUpdate(s.theirs.id, { name: 'Mine now' })
      })
      Then('the call fails with "not found"', () => {
        expectNotFound(s.last!)
      })
      And('no proposal is created', async () => {
        await expectNoProposal()
        expect((await liveSaved(s.theirs!.id))?.name).toBe('Their day')
      })
    })
  })
})

// ---------------------------------------------------------------------------
// What the scenarios imply but don't spell out (spec: "Saved workouts").
// Plain tests, each against a fresh database.
// ---------------------------------------------------------------------------
function isReadTool(name: string) {
  return /^(get_|list_)/.test(name) || name === 'search_exercises' || name === 'export_training_data'
}

describe('saved workout tools: registration', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  async function listed() {
    const { listTools } = await tools()
    const raw = (await listTools('admin')) as unknown
    const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? [])
    return list as Array<{ name: string; annotations?: Json; inputSchema?: Json }>
  }

  it('lists the five tools', async () => {
    const names = (await listed()).map((t) => t.name)
    for (const n of ['list_saved_workouts', 'get_saved_workout', 'get_active_draft', 'propose_workout_create', 'propose_workout_update']) {
      expect(names, n).toContain(n)
    }
  })

  it('every read tool, old and new, is read-only; every propose tool is not', async () => {
    const list = await listed()
    const reads = list.filter((t) => isReadTool(t.name))
    const proposes = list.filter((t) => t.name.startsWith('propose_'))
    // 13 reads before this slice, plus the 3 new ones.
    expect(reads.length).toBeGreaterThanOrEqual(16)
    expect(proposes.length).toBeGreaterThanOrEqual(7)
    for (const t of reads) expect(t.annotations, t.name).toMatchObject({ readOnlyHint: true })
    for (const t of proposes) expect(t.annotations, t.name).toMatchObject({ readOnlyHint: false, destructiveHint: false })
    // Every tool is one or the other, so none is left unmarked.
    for (const t of list.filter((x) => !isReadTool(x.name) && !x.name.startsWith('propose_'))) {
      expect.fail(`unclassified tool ${t.name}`)
    }
  })

  it('the propose tools take the documented arguments', async () => {
    const list = await listed()
    const props = (name: string) => Object.keys(((list.find((t) => t.name === name)?.inputSchema as { properties?: Json })?.properties ?? {}) as Json)
    expect(props('propose_workout_create')).toEqual(expect.arrayContaining(['name', 'notes', 'exercises', 'rationale', 'feedbackId']))
    expect(props('propose_workout_update')).toEqual(
      expect.arrayContaining(['savedWorkoutId', 'name', 'notes', 'exercises', 'rationale', 'feedbackId'])
    )
    expect(props('get_saved_workout')).toContain('id')
  })
})

describe('saved workout reads', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it('the reads do no writes, with or without rows', async () => {
    const run = async (label: string) => {
      const counter = { n: 0 }
      const counted = countingProxy(s.prisma, WRITES, counter, RAW_WRITES)
      await callAgentTool('list_saved_workouts', {}, counted)
      if (s.saved) await readOne(s.saved.id, counted)
      await readDraft(counted)
      expect(counter.n, `${label}: write calls`).toBe(0)
    }
    await run('no rows')
    expect(await savedCount()).toBe(0)
    s.saved = await seedSaved({ name: 'Push day' })
    await seedDraft({ startedAt: new Date(Date.now() - 60_000), items: [{ def: s.bench, logged: 2 }] })
    const before = await sessionSnapshot()
    await run('with rows')
    expect(await sessionSnapshot()).toBe(before)
    expect(await proposalCount()).toBe(0)
  })

  it('the write counter does count writes', async () => {
    const counter = { n: 0 }
    const counted = countingProxy(s.prisma, WRITES, counter, RAW_WRITES)
    await counted.savedWorkout.create({ data: { userId: s.userId, name: 'x', workoutData: [], exerciseCount: 0 } })
    expect(counter.n).toBe(1)
  })

  describe('list_saved_workouts', () => {
    it('is empty with no saved workouts', async () => {
      const o = await callAgentTool('list_saved_workouts', {})
      mustSucceed(o, 'list_saved_workouts')
      expect(o.value).toEqual({ savedWorkouts: [] })
    })

    it('lists only Dustin\'s, newest created first, with the documented fields', async () => {
      const day = 24 * 60 * 60 * 1000
      const used = new Date(Date.now() - 2 * day)
      const old = await seedSaved({ name: 'Old', createdAt: new Date(Date.now() - 9 * day) })
      const mid = await seedSaved({
        name: 'Mid',
        notes: 'Keep it light',
        createdAt: new Date(Date.now() - 5 * day),
        lastUsedAt: used,
        items: [{ def: s.bench }, { def: s.ohp }],
      })
      const fresh = await seedSaved({ name: 'Fresh', createdAt: new Date(Date.now() - 1 * day) })
      await seedSaved({ name: 'Theirs', userId: s.otherUserId, createdAt: new Date(Date.now() - 3 * day) })
      const list = await readList()
      expect(list.map((w) => w.id)).toEqual([fresh.id, mid.id, old.id])
      expect(list[1]).toMatchObject({ name: 'Mid', notes: 'Keep it light', exerciseCount: 2 })
      expect(new Date(list[1].lastUsedAt!).getTime()).toBe(used.getTime())
      expect(list[0].lastUsedAt).toBeNull()
      expect(new Date(list[2].createdAt).getTime()).toBe(old.createdAt.getTime())
    })
  })

  describe('get_saved_workout', () => {
    it('returns every exercise and set in order, with notes, RPE and warm-up flags', async () => {
      const items: Item[] = [
        { def: s.squat, notes: 'Pause at the bottom', sets: [{ reps: '5', isWarmup: true }, { reps: '5', rpe: 8 }, { reps: '3-5', rir: 1, rpe: 9 }] },
        { def: s.pullup, sets: [{ reps: 'AMRAP' }] },
      ]
      const row = await seedSaved({ name: 'Mixed', notes: 'Notes here', items })
      const out = await readOne(row.id)
      expect(out).toMatchObject({ id: row.id, name: 'Mixed', notes: 'Notes here', exerciseCount: 2, lastUsedAt: null })
      expect(typeof out.createdAt).toBe('string')
      expect(out.exercises).toEqual(
        stored(items).map((e) => ({
          order: e.order,
          exerciseDefinitionId: e.exerciseDefinitionId,
          name: e.name,
          notes: e.notes,
          sets: e.sets,
        }))
      )
    })

    it('an unknown id is not found', async () => {
      expectNotFound(await callAgentTool('get_saved_workout', { id: 'no-such-workout' }))
    })

    it('a missing id is refused', async () => {
      const row = await seedSaved({ name: 'Push day' })
      expect((await readOne(row.id)).id).toBe(row.id)
      const o = await callAgentTool('get_saved_workout', {})
      expect(String(toolPayload(o).error)).not.toMatch(/unknown tool/i)
    })
  })

  describe('get_active_draft', () => {
    it('is null with no draft', async () => {
      const o = await callAgentTool('get_active_draft', {})
      mustSucceed(o, 'get_active_draft')
      expect(o.value).toBeNull()
    })

    it("is null when there are only completed sessions and other users' drafts", async () => {
      await seedDraft({ startedAt: new Date(Date.now() - 3_600_000), status: 'completed', items: [{ def: s.bench, logged: 3 }] })
      await seedDraft({ startedAt: new Date(Date.now() - 60_000), userId: s.otherUserId, items: [{ def: s.bench, logged: 3 }] })
      expect(await readDraft()).toBeNull()
    })

    it('returns the newest draft, with its exercises in order and their logged sets', async () => {
      await seedDraft({ startedAt: new Date(Date.now() - 5 * 3_600_000), name: 'Stale', items: [{ def: s.squat, logged: 5 }] })
      const startedAt = new Date(Date.now() - 30 * 60_000)
      const newest = await seedDraft({
        startedAt,
        name: null,
        isAdHoc: false,
        items: [
          { def: s.ohp, logged: 0 },
          { def: s.bench, logged: 4 },
        ],
      })
      await seedDraft({ startedAt: new Date(Date.now() - 10 * 60_000), userId: s.otherUserId, items: [{ def: s.pullup, logged: 1 }] })
      await seedDraft({ startedAt: new Date(Date.now() - 5 * 60_000), status: 'completed', items: [{ def: s.pullup, logged: 1 }] })
      const out = (await readDraft())!
      expect(out.completionId).toBe(newest.id)
      expect(out.name).toBeNull()
      expect(out.isAdHoc).toBe(false)
      expect(new Date(out.startedAt).getTime()).toBe(startedAt.getTime())
      expect(out.exercises).toEqual([
        { name: 'Overhead Press', exerciseDefinitionId: s.ohp.id, loggedSetCount: 0 },
        { name: 'Bench Press', exerciseDefinitionId: s.bench.id, loggedSetCount: 4 },
      ])
    })
  })
})

// --- Arguments ---------------------------------------------------------------
const word = (n: number) => 'x'.repeat(n)

describe('propose_workout_create: arguments', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  const base = (): CreateArgs => ({ name: 'Push day', exercises: [ex(s.bench)] })
  const withSets = (st: unknown[]): CreateArgs => ({ ...base(), exercises: [{ exerciseDefinitionId: s.bench.id, sets: st }] })
  const withSet = (set: Json): CreateArgs => withSets([{ reps: '8', ...set }])

  const refused: Array<[string, () => Promise<CreateArgs> | CreateArgs, string]> = [
    ['no name', () => ({ exercises: [ex(s.bench)] }), 'name'],
    ['an empty name', () => ({ ...base(), name: '' }), 'name'],
    ['a 101-character name', () => ({ ...base(), name: word(101) }), 'name'],
    ['1001 characters of notes', () => ({ ...base(), notes: word(1001) }), 'notes'],
    ['no exercises key', () => ({ name: 'Push day' }), 'exercises'],
    ['an empty exercise list', () => ({ ...base(), exercises: [] }), 'exercises'],
    ['16 exercises', async () => ({ ...base(), exercises: (await extras(16)).map((d) => ex(d)) }), 'exercises'],
    [
      'an unknown exercise at position 3',
      () => ({ ...base(), exercises: [ex(s.bench), ex(s.ohp), { exerciseDefinitionId: 'no-such-exercise', sets: [{ reps: '8' }] }] }),
      'exercises[2].exerciseDefinitionId',
    ],
    [
      "another user's exercise",
      async () => ({ ...base(), exercises: [ex((await extras(1, s.otherUserId))[0])] }),
      'exercises[0].exerciseDefinitionId',
    ],
    ['no exerciseDefinitionId', () => ({ ...base(), exercises: [{ sets: [{ reps: '8' }] }] }), 'exercises[0].exerciseDefinitionId'],
    ['an empty set list', () => withSets([]), 'exercises[0].sets'],
    ['11 sets', () => withSets(sets(11, '8')), 'exercises[0].sets'],
    ['a set with no reps', () => withSets([{ rir: 2 }]), 'exercises[0].sets[0].reps'],
    ['empty reps', () => withSet({ reps: '' }), 'exercises[0].sets[0].reps'],
    ['21-character reps', () => withSet({ reps: word(21) }), 'exercises[0].sets[0].reps'],
    ['numeric reps', () => withSet({ reps: 8 }), 'exercises[0].sets[0].reps'],
    ['RIR 11', () => withSet({ rir: 11 }), 'exercises[0].sets[0].rir'],
    ['RIR -1', () => withSet({ rir: -1 }), 'exercises[0].sets[0].rir'],
    ['RIR 2.5', () => withSet({ rir: 2.5 }), 'exercises[0].sets[0].rir'],
    ['RPE 0.5', () => withSet({ rpe: 0.5 }), 'exercises[0].sets[0].rpe'],
    ['RPE 10.5', () => withSet({ rpe: 10.5 }), 'exercises[0].sets[0].rpe'],
    ['fractional RPE 7.5', () => withSet({ rpe: 7.5 }), 'exercises[0].sets[0].rpe'],
    ['fractional RPE 8.5 on a later set', () => withSets([{ reps: '8', rpe: 8 }, { reps: '8', rpe: 8.5 }]), 'exercises[0].sets[1].rpe'],
    ['a non-boolean warm-up flag', () => withSet({ isWarmup: 'yes' }), 'exercises[0].sets[0].isWarmup'],
  ]

  it.each(refused)('refuses %s, naming the field', async (_label, build, field) => {
    expectField(await proposeCreate(await build()), field)
    await expectNoProposal()
  })

  it('names the first failure when several exercises are bad', async () => {
    const bad = (id: string) => ({ exerciseDefinitionId: id, sets: [{ reps: '8' }] })
    const o = await proposeCreate({ ...base(), exercises: [ex(s.bench), bad('missing-one'), ex(s.ohp), bad('missing-two')] })
    expectField(o, 'exercises[1].exerciseDefinitionId')
    const p = await proposeCreate({ ...base(), exercises: [ex(s.bench, [{ reps: '8' }, { reps: '8', rir: 20 }, { reps: '' }])] })
    expectField(p, 'exercises[0].sets[1].rir')
    await expectNoProposal()
  })

  const unknown: Array<[string, () => CreateArgs, RegExp]> = [
    ['an exercise name', () => ({ ...base(), exercises: [{ ...ex(s.bench), name: 'Bench' }] }), /^exercises\[0\]/],
    ['an order', () => ({ ...base(), exercises: [{ ...ex(s.bench), order: 1 }] }), /^exercises\[0\]/],
    ['an exerciseGroup', () => ({ ...base(), exercises: [{ ...ex(s.bench), exerciseGroup: 'A' }] }), /^exercises\[0\]/],
    ['a setNumber', () => withSet({ setNumber: 1 }), /^exercises\[0\]\.sets\[0\]/],
    ['a weight', () => withSet({ weight: 100 }), /^exercises\[0\]\.sets\[0\]/],
  ]

  it.each(unknown)('refuses unknown fields: %s', async (_label, build, pattern) => {
    const p = toolPayload(await proposeCreate(build()))
    expect(String(p.field), textOf(p)).toMatch(pattern)
    await expectNoProposal()
  })

  const accepted: Array<[string, () => Promise<CreateArgs> | CreateArgs]> = [
    ['15 exercises', async () => ({ ...base(), exercises: (await extras(15)).map((d) => ex(d)) })],
    ['10 sets', () => withSets(sets(10, '8'))],
    ['20-character reps', () => withSet({ reps: word(20) })],
    ['reps like "8-10" and "AMRAP"', () => withSets([{ reps: '8-10' }, { reps: 'AMRAP' }])],
    ['RIR 0 and RIR 10', () => withSets([{ reps: '8', rir: 0 }, { reps: '8', rir: 10 }])],
    ['RPE 1, 7 and 10', () => withSets([{ reps: '8', rpe: 1 }, { reps: '8', rpe: 7 }, { reps: '8', rpe: 10 }])],
    ['a 100-character name', () => ({ ...base(), name: word(100) })],
    ['1000 characters of notes', () => ({ ...base(), notes: word(1000) })],
    ["one of Dustin's own exercises", async () => ({ ...base(), exercises: [ex((await extras(1, s.userId))[0])] })],
  ]

  it.each(accepted)('accepts %s', async (_label, build) => {
    mustSucceed(await proposeCreate(await build()), 'propose_workout_create')
    expect(await proposalCount()).toBe(1)
    expect(await savedCount()).toBe(0)
  })

  it('the summary counts the exercises and uses the given name', async () => {
    mustSucceed(await proposeCreate({ name: 'Leg day', exercises: [ex(s.squat), ex(s.bench), ex(s.ohp)] }), 'propose')
    expect((await latestProposal()).summary).toBe('New saved workout: Leg day (3 exercises)')
  })

  it('the summary says "1 exercise" for a single exercise', async () => {
    mustSucceed(await proposeCreate({ name: 'Push day', exercises: [ex(s.bench)] }), 'propose')
    expect((await latestProposal()).summary).toBe('New saved workout: Push day (1 exercise)')
  })

  it('links the feedback it addresses, and refuses feedback that is not there', async () => {
    const fb = await s.prisma.feedback.create({ data: { userId: s.userId, category: 'general', message: 'I need a push day', pageUrl: '/' } })
    mustSucceed(await proposeCreate(base(), { feedbackId: fb.id }), 'propose with feedbackId')
    expect((await latestProposal()).feedbackId).toBe(fb.id)
    const bad = await proposeCreate(base(), { feedbackId: 'no-such-feedback' })
    expectField(bad, 'feedbackId')
    expect(await proposalCount()).toBe(1)
  })
})

describe('propose_workout_update: arguments', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
    s.saved = await seedSaved({ name: 'Push day', notes: 'Heavy', items: [{ def: s.bench, sets: sets(3, '8', 2) }] })
  })

  it('needs at least one of name, notes and exercises', async () => {
    mustSucceed(await proposeUpdate(s.saved!.id, { name: 'Push A' }), 'the same call with a name')
    const none = await proposeUpdate(s.saved!.id, {})
    expect(toolPayload(none).error).toBeTruthy()
    expect(String(toolPayload(none).error)).not.toMatch(/unknown tool/i)
    const onlyWhy = await proposeUpdate(s.saved!.id, {}, { rationale: 'because' })
    expect(toolPayload(onlyWhy).error).toBeTruthy()
    expect(await proposalCount()).toBe(1)
  })

  it('needs a saved workout id', async () => {
    mustSucceed(await proposeUpdate(s.saved!.id, { name: 'Push A' }), 'the same call with an id')
    const o = await callAgentTool('propose_workout_update', { name: 'Push A', rationale: RATIONALE })
    expect(toolPayload(o).error).toBeTruthy()
    expect(await proposalCount()).toBe(1)
  })

  it('an unknown saved workout is not found', async () => {
    expectNotFound(await proposeUpdate('no-such-workout', { name: 'Push A' }))
    await expectNoProposal()
  })

  const refused: Array<[string, () => Json, string]> = [
    ['an empty name', () => ({ name: '' }), 'name'],
    ['a 101-character name', () => ({ name: word(101) }), 'name'],
    ['1001 characters of notes', () => ({ notes: word(1001) }), 'notes'],
    ['an empty exercise list', () => ({ exercises: [] }), 'exercises'],
    [
      'an unknown exercise',
      () => ({ exercises: [{ exerciseDefinitionId: 'no-such-exercise', sets: [{ reps: '8' }] }] }),
      'exercises[0].exerciseDefinitionId',
    ],
    ['RIR 11', () => ({ exercises: [{ exerciseDefinitionId: s.bench.id, sets: [{ reps: '8', rir: 11 }] }] }), 'exercises[0].sets[0].rir'],
    ['11 sets', () => ({ exercises: [{ exerciseDefinitionId: s.bench.id, sets: sets(11, '8') }] }), 'exercises[0].sets'],
  ]

  it.each(refused)('refuses %s, naming the field', async (_label, build, field) => {
    expectField(await proposeUpdate(s.saved!.id, build()), field)
    await expectNoProposal()
  })

  it('refuses an unknown field on a set', async () => {
    const p = toolPayload(await proposeUpdate(s.saved!.id, { exercises: [{ exerciseDefinitionId: s.bench.id, sets: [{ reps: '8', weight: 100 }] }] }))
    expect(String(p.field)).toMatch(/^exercises\[0\]\.sets\[0\]/)
    await expectNoProposal()
  })

  it('accepts a notes-only, name-only and exercises-only change, and notes: null', async () => {
    for (const args of [{ notes: 'New notes' }, { name: 'Push A' }, { exercises: [ex(s.ohp)] }, { notes: null }]) {
      mustSucceed(await proposeUpdate(s.saved!.id, args), `propose_workout_update ${textOf(args)}`)
    }
    expect(await proposalCount()).toBe(4)
    expect(JSON.stringify(await liveSaved(s.saved!.id))).toBe(JSON.stringify(s.saved))
  })

  // Rows are built when the file loads, before the library exists, so the
  // arguments are built inside the test.
  const summaries: Array<[string, () => Json, string]> = [
    ['name', () => ({ name: 'Push A' }), 'Update saved workout Push day: name'],
    ['notes', () => ({ notes: null }), 'Update saved workout Push day: notes'],
    ['exercises', () => ({ exercises: [ex(s.bench)] }), 'Update saved workout Push day: exercises'],
    ['name and notes', () => ({ notes: 'x', name: 'Push A' }), 'Update saved workout Push day: name, notes'],
    ['notes and exercises', () => ({ exercises: [ex(s.bench)], notes: 'x' }), 'Update saved workout Push day: notes, exercises'],
    [
      'all three, in name, notes, exercises order',
      () => ({ exercises: [ex(s.bench)], notes: 'x', name: 'Push A' }),
      'Update saved workout Push day: name, notes, exercises',
    ],
  ]

  it.each(summaries)('summary for %s', async (_label, build, summary) => {
    mustSucceed(await proposeUpdate(s.saved!.id, build()), 'propose_workout_update')
    expect((await latestProposal()).summary).toBe(summary)
  })

  it('records only the touched fields as `before`, in the stored shape', async () => {
    await pendingUpdate({ name: 'Push A' })
    expect((await proposalById()).before).toEqual({ name: 'Push day' })
    await pendingUpdate({ notes: null })
    expect((await proposalById()).before).toEqual({ notes: 'Heavy' })
    await pendingUpdate({ exercises: [ex(s.ohp)], notes: 'Lighter' })
    expect((await proposalById()).before).toEqual({ notes: 'Heavy', exercises: stored([{ def: s.bench, sets: sets(3, '8', 2) }]) })
  })

  it('records a null note as null', async () => {
    const plain = await seedSaved({ name: 'Plain' })
    await pendingUpdate({ notes: 'Now with notes' }, plain)
    expect((await proposalById()).before).toEqual({ notes: null })
  })
})

// --- Approve and revert: create ---------------------------------------------
describe('saved workout create: approve', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it('builds workoutData from the input: positions, definition names, defaults', async () => {
    await approvedCreate('Full day', [
      { def: s.bench, notes: 'Touch the chest', sets: [{ reps: '5', isWarmup: true }, { reps: '8-10', rir: 2 }, { reps: '8', rpe: 8 }] },
      { def: s.pullup, sets: [{ reps: 'AMRAP' }] },
    ])
    const row = (await liveSaved(s.saved!.id))!
    expect(row.workoutData).toEqual([
      {
        name: 'Bench Press',
        exerciseDefinitionId: s.bench.id,
        order: 1,
        notes: 'Touch the chest',
        exerciseGroup: null,
        sets: [
          { setNumber: 1, reps: '5', rir: null, rpe: null, isWarmup: true },
          { setNumber: 2, reps: '8-10', rir: 2, rpe: null, isWarmup: false },
          { setNumber: 3, reps: '8', rir: null, rpe: 8, isWarmup: false },
        ],
      },
      {
        name: 'Pull-up',
        exerciseDefinitionId: s.pullup.id,
        order: 2,
        notes: null,
        exerciseGroup: null,
        sets: [{ setNumber: 1, reps: 'AMRAP', rir: null, rpe: null, isWarmup: false }],
      },
    ])
    expect(row.exerciseCount).toBe(2)
    expect(row.lastUsedAt).toBeNull()
    expect(row.userId).toBe(s.userId)
  })

  it('keeps the notes the agent gave, and a missing note stays null', async () => {
    await approvedCreate('With notes', [{ def: s.bench }], { notes: 'Start light' })
    expect((await liveSaved(s.saved!.id))?.notes).toBe('Start light')
    await approvedCreate('Without notes', [{ def: s.bench }])
    expect((await liveSaved(s.saved!.id))?.notes).toBeNull()
  })

  it('counts every exercise', async () => {
    const more = await extras(4)
    await approvedCreate('Long day', [{ def: s.bench }, { def: s.ohp }, { def: s.pullup }, ...more.map((d) => ({ def: d }))])
    expect((await liveSaved(s.saved!.id))?.exerciseCount).toBe(7)
  })

  it("takes each exercise's name from the definition when Dustin approves", async () => {
    const id = await pendingCreate('Push day', [{ def: s.bench }])
    await s.prisma.exerciseDefinition.update({ where: { id: s.bench.id }, data: { name: 'Flat Bench Press' } })
    await approveNow(id)
    const row = (await allSaved())[0]
    expect((row.workoutData as StoredEx[])[0].name).toBe('Flat Bench Press')
  })

  it('accepts an exercise Dustin created himself', async () => {
    const [mine] = await extras(1, s.userId)
    await approvedCreate('Custom day', [{ def: mine }])
    expect(await savedCount()).toBe(1)
  })

  it('refuses as invalid when an exercise was deleted while the proposal was pending', async () => {
    const [temp] = await extras(1)
    const id = await pendingCreate('Push day', [{ def: s.bench }, { def: temp }])
    await s.prisma.exerciseDefinition.delete({ where: { id: temp.id } })
    expectRefused(await decide('approveProposal', id), 'invalid')
    expect(await savedCount()).toBe(0)
    expect((await proposalById(id)).status).not.toBe('applied')
  })

  it('cannot be approved twice', async () => {
    const id = await approvedCreate('Push day', [{ def: s.bench }])
    expectRefused(await decide('approveProposal', id), 'not_pending')
    expect(await savedCount()).toBe(1)
  })

  it('rejecting makes nothing', async () => {
    const id = await pendingCreate('Push day', [{ def: s.bench }])
    expectOk(await decide('rejectProposal', id), 'reject')
    expect(await savedCount()).toBe(0)
    expect((await proposalById(id)).status).toBe('rejected')
  })

  it('never starts a session', async () => {
    await approvedCreate('Push day', [{ def: s.bench }])
    expect(await s.prisma.workoutCompletion.count()).toBe(0)
    expect(await s.prisma.exercise.count()).toBe(0)
    expect(await s.prisma.loggedSet.count()).toBe(0)
  })
})

describe('saved workout create: revert', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
    await approvedCreate('Push day', [{ def: s.bench, sets: sets(3, '8', 2) }])
  })

  async function revertRefused() {
    expectRefused(await decide('revertProposal', s.proposalId!), 'conflict')
    expect((await proposalById()).status).toBe('applied')
    expect(await liveSaved(s.saved!.id)).not.toBeNull()
  }

  it('deletes an untouched saved workout and marks the proposal reverted', async () => {
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    expect(await liveSaved(s.saved!.id)).toBeNull()
    expect((await proposalById()).status).toBe('reverted')
  })

  it('is refused once a session was started from it, and the session stays', async () => {
    const run = await startIt(s.saved!.id)
    await revertRefused()
    expect(await s.prisma.workoutCompletion.findUnique({ where: { id: run.id } })).not.toBeNull()
  })

  it('is refused when the session was completed and archived, too', async () => {
    const run = await startIt(s.saved!.id)
    await s.prisma.workoutCompletion.update({ where: { id: run.id }, data: { status: 'completed', isArchived: true } })
    await revertRefused()
  })

  it("a session from a different saved workout doesn't block it", async () => {
    const other = await seedSaved({ name: 'Other' })
    await startIt(other.id)
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    expect(await liveSaved(s.saved!.id)).toBeNull()
    expect(await liveSaved(other.id)).not.toBeNull()
  })

  it('is refused when Dustin renamed it after approve', async () => {
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { name: 'Push B' } })
    await revertRefused()
  })

  it('is refused when Dustin changed its notes after approve', async () => {
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: 'Added later' } })
    await revertRefused()
  })

  it('is refused when Dustin changed its exercises after approve', async () => {
    await s.prisma.savedWorkout.update({
      where: { id: s.saved!.id },
      data: { workoutData: stored([{ def: s.ohp }]) as never, exerciseCount: 1 },
    })
    await revertRefused()
  })

  it('cannot be reverted twice', async () => {
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    expectRefused(await decide('revertProposal', s.proposalId!), 'not_applied')
  })
})

// --- Approve and revert: update ---------------------------------------------
describe('saved workout update: approve', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
    s.saved = await seedSaved({ name: 'Push day', notes: 'Heavy', items: [{ def: s.bench, sets: sets(3, '8', 2) }] })
  })

  const original = () => stored([{ def: s.bench, sets: sets(3, '8', 2) }])

  it('a name-only change leaves notes, exercises and the count alone', async () => {
    await approvedUpdate({ name: 'Push A' })
    const row = (await liveSaved(s.saved!.id))!
    expect(row.name).toBe('Push A')
    expect(row.notes).toBe('Heavy')
    expect(row.workoutData).toEqual(original())
    expect(row.exerciseCount).toBe(1)
    const p = await proposalById()
    expect(p.before).toEqual({ name: 'Push day' })
    expect(p.inverse).toEqual({ name: 'Push day' })
  })

  it('a notes change writes only the notes', async () => {
    await approvedUpdate({ notes: 'Go lighter' })
    const row = (await liveSaved(s.saved!.id))!
    expect(row).toMatchObject({ name: 'Push day', notes: 'Go lighter', exerciseCount: 1 })
    expect(row.workoutData).toEqual(original())
  })

  it('notes: null clears the notes', async () => {
    await approvedUpdate({ notes: null })
    const row = (await liveSaved(s.saved!.id))!
    expect(row.notes).toBeNull()
    expect(row.name).toBe('Push day')
    expect((await proposalById()).inverse).toEqual({ notes: 'Heavy' })
  })

  it('an exercises change replaces the whole list and updates the count', async () => {
    const items: Item[] = [
      { def: s.ohp, sets: sets(4, '6'), notes: 'Strict' },
      { def: s.pullup, sets: [{ reps: '8', rpe: 8 }] },
    ]
    await approvedUpdate({ exercises: inputOf(items) })
    const row = (await liveSaved(s.saved!.id))!
    expect(row.workoutData).toEqual(stored(items))
    expect(row.exerciseCount).toBe(2)
    expect(row.name).toBe('Push day')
    expect(row.notes).toBe('Heavy')
  })

  it('a change to all three fields writes all three', async () => {
    await approvedUpdate({ name: 'Push A', notes: null, exercises: inputOf([{ def: s.squat }]) })
    const row = (await liveSaved(s.saved!.id))!
    expect(row).toMatchObject({ name: 'Push A', notes: null, exerciseCount: 1 })
    expect(row.workoutData).toEqual(stored([{ def: s.squat }]))
    const p = await proposalById()
    expect(p.status).toBe('applied')
    expect(p.inverse).toEqual({ name: 'Push day', notes: 'Heavy', exercises: original() })
  })

  it('takes exercise names from the definition when Dustin approves', async () => {
    const id = await pendingUpdate({ exercises: inputOf([{ def: s.ohp }]) })
    await s.prisma.exerciseDefinition.update({ where: { id: s.ohp.id }, data: { name: 'Strict Press' } })
    await approveNow(id)
    expect(((await liveSaved(s.saved!.id))!.workoutData as StoredEx[])[0].name).toBe('Strict Press')
  })

  it('an edit to an untouched field is not a conflict', async () => {
    const id = await pendingUpdate({ name: 'Push A' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: 'Dustin edited the notes', workoutData: stored([{ def: s.squat }]) as never, exerciseCount: 1 } })
    await approveNow(id)
    const row = (await liveSaved(s.saved!.id))!
    expect(row.name).toBe('Push A')
    expect(row.notes).toBe('Dustin edited the notes')
    expect(row.workoutData).toEqual(stored([{ def: s.squat }]))
  })

  it('a touched field that Dustin changed and changed back is not a conflict', async () => {
    const id = await pendingUpdate({ name: 'Push A' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { name: 'Push B' } })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { name: 'Push day' } })
    await approveNow(id)
    expect((await liveSaved(s.saved!.id))?.name).toBe('Push A')
  })

  async function expectConflict(id: string) {
    const before = JSON.stringify(await liveSaved(s.saved!.id))
    expectRefused(await decide('approveProposal', id), 'conflict')
    expect((await proposalById(id)).status).toBe('conflict')
    expect(JSON.stringify(await liveSaved(s.saved!.id))).toBe(before)
  }

  it('Dustin changing the notes conflicts with a notes change', async () => {
    const id = await pendingUpdate({ notes: 'Go lighter' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: 'Dustin wrote this' } })
    await expectConflict(id)
  })

  it('Dustin clearing the notes conflicts with a notes change', async () => {
    const id = await pendingUpdate({ notes: 'Go lighter' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: null } })
    await expectConflict(id)
  })

  it('Dustin changing the exercises conflicts with an exercises change', async () => {
    const id = await pendingUpdate({ exercises: inputOf([{ def: s.ohp }]) })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { workoutData: stored([{ def: s.bench, sets: sets(4, '8', 2) }]) as never } })
    await expectConflict(id)
  })

  it('a conflict on one touched field stops the other touched fields too', async () => {
    const id = await pendingUpdate({ name: 'Push A', notes: 'Go lighter' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: 'Dustin wrote this' } })
    await expectConflict(id)
    expect((await liveSaved(s.saved!.id))?.name).toBe('Push day')
  })

  it('a deleted saved workout says so', async () => {
    const id = await pendingUpdate({ notes: 'Go lighter' })
    await s.prisma.savedWorkout.delete({ where: { id: s.saved!.id } })
    expectRefused(await decide('approveProposal', id), 'conflict')
    const p = await proposalById(id)
    expect(p.status).toBe('conflict')
    expect(String(p.error)).toMatch(/deleted/i)
    expect(await savedCount()).toBe(0)
  })

  it('refuses as invalid when an exercise was deleted while the proposal was pending, and changes nothing', async () => {
    const [temp] = await extras(1)
    const id = await pendingUpdate({ name: 'Push A', exercises: inputOf([{ def: temp }]) })
    await s.prisma.exerciseDefinition.delete({ where: { id: temp.id } })
    const before = JSON.stringify(await liveSaved(s.saved!.id))
    expectRefused(await decide('approveProposal', id), 'invalid')
    expect(JSON.stringify(await liveSaved(s.saved!.id))).toBe(before)
    expect((await proposalById(id)).status).not.toBe('applied')
  })

  it("never touches another user's saved workout", async () => {
    const theirs = await seedSaved({ name: 'Their day', userId: s.otherUserId, items: [{ def: s.pullup }] })
    await approvedUpdate({ name: 'Push A', exercises: inputOf([{ def: s.ohp }]) })
    expect((await liveSaved(theirs.id))?.name).toBe('Their day')
    expect((await liveSaved(theirs.id))?.workoutData).toEqual(stored([{ def: s.pullup }]))
  })

  it('never starts a session', async () => {
    await approvedUpdate({ exercises: inputOf([{ def: s.ohp }]) })
    expect(await s.prisma.workoutCompletion.count()).toBe(0)
  })
})

describe('saved workout update: revert', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
    s.saved = await seedSaved({ name: 'Push day', notes: 'Heavy', items: [{ def: s.bench, sets: sets(3, '8', 2) }] })
  })

  const original = () => stored([{ def: s.bench, sets: sets(3, '8', 2) }])

  async function revertRefused(id: string = s.proposalId!) {
    const before = JSON.stringify(await liveSaved(s.saved!.id))
    expectRefused(await decide('revertProposal', id), 'conflict')
    expect((await proposalById(id)).status).toBe('applied')
    expect(JSON.stringify(await liveSaved(s.saved!.id))).toBe(before)
  }

  it('restores the name and leaves other fields as they are', async () => {
    await approvedUpdate({ name: 'Push A' })
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    const row = (await liveSaved(s.saved!.id))!
    expect(row).toMatchObject({ name: 'Push day', notes: 'Heavy', exerciseCount: 1 })
    expect(row.workoutData).toEqual(original())
    expect((await proposalById()).status).toBe('reverted')
  })

  it('restores cleared notes', async () => {
    await approvedUpdate({ notes: null })
    expect((await liveSaved(s.saved!.id))?.notes).toBeNull()
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    expect((await liveSaved(s.saved!.id))?.notes).toBe('Heavy')
  })

  it('restores the exercises and the count', async () => {
    await approvedUpdate({ exercises: inputOf([{ def: s.ohp }, { def: s.pullup }, { def: s.squat }]) })
    expect((await liveSaved(s.saved!.id))?.exerciseCount).toBe(3)
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    const row = (await liveSaved(s.saved!.id))!
    expect(row.workoutData).toEqual(original())
    expect(row.exerciseCount).toBe(1)
  })

  it("keeps an untouched field Dustin edited after approve", async () => {
    await approvedUpdate({ name: 'Push A' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: 'Edited after' } })
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    const row = (await liveSaved(s.saved!.id))!
    expect(row.name).toBe('Push day')
    expect(row.notes).toBe('Edited after')
  })

  it('is refused when a touched field moved: name', async () => {
    await approvedUpdate({ name: 'Push A' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { name: 'Push B' } })
    await revertRefused()
  })

  it('is refused when a touched field moved: notes', async () => {
    await approvedUpdate({ notes: 'Go lighter' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: null } })
    await revertRefused()
  })

  it('is refused when a touched field moved: exercises', async () => {
    await approvedUpdate({ exercises: inputOf([{ def: s.ohp }]) })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { workoutData: stored([{ def: s.ohp, sets: sets(2, '5') }]) as never } })
    await revertRefused()
  })

  it('is refused when one of several touched fields moved, and none is restored', async () => {
    await approvedUpdate({ name: 'Push A', notes: 'Go lighter' })
    await s.prisma.savedWorkout.update({ where: { id: s.saved!.id }, data: { notes: 'Dustin wrote this' } })
    await revertRefused()
    expect((await liveSaved(s.saved!.id))?.name).toBe('Push A')
  })

  it('is refused when the saved workout is gone', async () => {
    await approvedUpdate({ name: 'Push A' })
    await s.prisma.savedWorkout.delete({ where: { id: s.saved!.id } })
    expectRefused(await decide('revertProposal', s.proposalId!), 'conflict')
    expect((await proposalById()).status).toBe('applied')
  })

  it("doesn't care that the saved workout was started: a session never blocks an update revert", async () => {
    await approvedUpdate({ name: 'Push A' })
    const run = await startIt(s.saved!.id)
    expectOk(await decide('revertProposal', s.proposalId!), 'revert')
    expect((await liveSaved(s.saved!.id))?.name).toBe('Push day')
    expect(await s.prisma.workoutCompletion.findUnique({ where: { id: run.id } })).not.toBeNull()
  })
})
