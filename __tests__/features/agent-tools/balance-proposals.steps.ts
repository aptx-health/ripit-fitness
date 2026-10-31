/**
 * Step definitions for features/agent-tools/balance-proposals.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md ("Anchors and
 * balance targets"): raw numbers only, and proposals that change nothing until
 * Dustin approves.
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so state is created once
 * per scenario in the first Background step. Never reset it in afterEach.
 *
 * "Settings" edits are written straight to the tables, the way the Settings
 * routes do: anchors in UserTrainingProfile.targetMovements, targets and calc
 * settings in UserMuscleBalanceSettings.
 *
 * Sessions are seeded relative to now plus one hour, so "N days ago" is N
 * whole days whatever time the suite runs.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ANCHOR_PATTERNS } from '@/lib/exercises/anchor-patterns'
import { ALL_FAUS, FAU_DISPLAY_NAMES } from '@/lib/fau-volume'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const feature = await loadFeature('features/agent-tools/balance-proposals.feature')

type Outcome = { failed: boolean; value: unknown; text: string; thrown: boolean; raw?: unknown }
type Def = { id: string; name: string }
type Json = Record<string, unknown>

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  deadlift: Def
  rdl: Def
  squat: Def
  pullup: Def
  notify: ReturnType<typeof vi.fn>
  last?: Outcome
  second?: Outcome
  proposalId?: string
}

let s = {} as State

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
/** `days` whole days ago, plus an hour so the age never rounds down. */
const ago = (days: number) => new Date(Date.now() - days * DAY - HOUR)

const DEFAULT_CALC = { lookbackDays: 14, includeSecondary: true, secondaryWeight: 0.5, excludeWarmups: true }
const BOUNDS = { min: 0, max: 2, step: 0.05 }

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
  return { userId: s.userId, tokenId: s.tokenId, notify: s.notify }
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

const RATIONALE = 'Your hinge work has been thin for six weeks'
const proposeAnchors = (changes: unknown, extra: Json = {}) =>
  callAgentTool('propose_anchor_update', { changes, rationale: RATIONALE, ...extra })
const proposeTargets = (changes: unknown, extra: Json = {}) =>
  callAgentTool('propose_target_update', { changes, rationale: RATIONALE, ...extra })

async function latestProposal() {
  return await s.prisma.proposal.findFirstOrThrow({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' } })
}
async function proposalById() {
  return await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
}
const proposalCount = () => s.prisma.proposal.count()

// --- Stores ----------------------------------------------------------------
type Anchors = Record<string, string[]>

/** Dustin edits his anchors in Settings: the whole map is replaced. */
async function setAnchors(map: Anchors) {
  await s.prisma.userTrainingProfile.upsert({
    where: { userId: s.userId },
    create: { userId: s.userId, ratioTargets: {}, targetMovements: map },
    update: { targetMovements: map },
  })
}
async function storedAnchors(): Promise<Anchors> {
  const p = await s.prisma.userTrainingProfile.findUnique({ where: { userId: s.userId } })
  return ((p?.targetMovements as Anchors | null) ?? {}) as Anchors
}
const anchorsFor = async (pattern: string) => (await storedAnchors())[pattern] ?? []

const defaultTargets = () => Object.fromEntries(ALL_FAUS.map((f) => [f, 1])) as Record<string, number>

type SettingsIn = Partial<typeof DEFAULT_CALC> & { targets?: Record<string, number> }
/** Dustin saves muscle-balance settings; unnamed targets stay at 1. */
async function setSettings(o: SettingsIn = {}) {
  const { targets, ...calc } = o
  const data = { targets: { ...defaultTargets(), ...(targets ?? {}) }, ...calc }
  await s.prisma.userMuscleBalanceSettings.upsert({
    where: { userId: s.userId },
    create: { userId: s.userId, ...data },
    update: data,
  })
}
async function liveTargets(): Promise<Record<string, number>> {
  const row = await s.prisma.userMuscleBalanceSettings.findUnique({ where: { userId: s.userId } })
  return { ...defaultTargets(), ...((row?.targets as Record<string, number> | null) ?? {}) }
}
const liveTarget = async (fau: string) => (await liveTargets())[fau]
async function liveCalc() {
  const row = await s.prisma.userMuscleBalanceSettings.findUniqueOrThrow({ where: { userId: s.userId } })
  return {
    lookbackDays: row.lookbackDays,
    includeSecondary: row.includeSecondary,
    secondaryWeight: row.secondaryWeight,
    excludeWarmups: row.excludeWarmups,
  }
}
/** Dustin moves one target in Settings, keeping the rest of the row. */
async function settingsSet(fau: string, value: number) {
  const row = await s.prisma.userMuscleBalanceSettings.findUnique({ where: { userId: s.userId } })
  if (!row) return setSettings({ targets: { [fau]: value } })
  await s.prisma.userMuscleBalanceSettings.update({
    where: { userId: s.userId },
    data: { targets: { ...defaultTargets(), ...(row.targets as Record<string, number>), [fau]: value } },
  })
}

// --- Training history --------------------------------------------------------
type SessionSpec = {
  date: Date
  def: Def
  working?: number
  warmups?: number
  userId?: string
  status?: string
  archived?: boolean
}
async function seedSession(o: SessionSpec) {
  const userId = o.userId ?? s.userId
  const completion = await s.prisma.workoutCompletion.create({
    data: { userId, status: o.status ?? 'completed', completedAt: o.date, isArchived: o.archived ?? false, isAdHoc: true },
  })
  const exercise = await s.prisma.exercise.create({
    data: { name: o.def.name, exerciseDefinitionId: o.def.id, order: 1, userId, workoutCompletionId: completion.id, isOneOff: true },
  })
  const kinds = [...Array(o.working ?? 1).fill(false), ...Array(o.warmups ?? 0).fill(true)] as boolean[]
  await s.prisma.loggedSet.createMany({
    data: kinds.map((isWarmup, i) => ({
      setNumber: i + 1,
      reps: 5,
      weight: 100,
      weightUnit: 'lbs',
      isWarmup,
      exerciseId: exercise.id,
      completionId: completion.id,
      userId,
      createdAt: o.date,
    })),
  })
  return completion
}

// --- Reads -------------------------------------------------------------------
type AnchorEntry = { id: string; name: string; lastLoggedDaysAgo: number | null }
type AnchorsOut = {
  patterns: Array<{ pattern: string; displayName: string; exercises: AnchorEntry[] }>
  validPatterns: string[]
  maxPerPattern: number
}
type FauRow = {
  fau: string
  displayName: string
  primarySets: number
  secondarySets: number
  target: number
  lastTrainedDaysAgo: number | null
}
type VolumeOut = { since: string; until: string; sessions: number; settings: Json; faus: FauRow[] }

async function readAnchors(prisma: PrismaClient = s.prisma) {
  const o = await callAgentTool('get_anchors', {}, prisma)
  mustSucceed(o, 'get_anchors')
  return o.value as AnchorsOut
}
async function readTargets(prisma: PrismaClient = s.prisma) {
  const o = await callAgentTool('get_balance_targets', {}, prisma)
  mustSucceed(o, 'get_balance_targets')
  return o.value as {
    targets: Record<string, number>
    isDefault: boolean
    bounds: Json
    settings: Json
  }
}
async function readVolume(args: Json = {}, prisma: PrismaClient = s.prisma) {
  const o = await callAgentTool('get_fau_volume', args, prisma)
  mustSucceed(o, 'get_fau_volume')
  return o.value as VolumeOut
}
const fauOf = (v: VolumeOut, fau: string) => v.faus.find((f) => f.fau === fau)!

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
async function pendingAnchors(changes: unknown): Promise<string> {
  mustSucceed(await proposeAnchors(changes), 'propose_anchor_update')
  s.proposalId = (await latestProposal()).id
  return s.proposalId
}
async function pendingTargets(changes: unknown): Promise<string> {
  mustSucceed(await proposeTargets(changes), 'propose_target_update')
  s.proposalId = (await latestProposal()).id
  return s.proposalId
}
async function approved(kind: 'anchors' | 'targets', changes: unknown) {
  const id = kind === 'anchors' ? await pendingAnchors(changes) : await pendingTargets(changes)
  expectOk(await decide('approveProposal', id), `approve ${kind} proposal`)
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

async function wipeTables(prisma: PrismaClient) {
  for (const t of [
    'Proposal',
    'Feedback',
    'AgentToken',
    'LoggedSet',
    'Exercise',
    'WorkoutCompletion',
    'UserTrainingProfile',
    'UserMuscleBalanceSettings',
  ]) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`)
    } catch {
      /* table missing */
    }
  }
}

async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  await wipeTables(prisma)
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

/** Squat trains quads and, secondarily, glutes and adductors. */
async function seedLibrary() {
  s.deadlift = await createTestExerciseDefinition(s.prisma, {
    name: 'Deadlift',
    primaryFAUs: ['hamstrings', 'lower-back'],
    secondaryFAUs: ['glutes'],
  })
  s.rdl = await createTestExerciseDefinition(s.prisma, {
    name: 'Romanian Deadlift',
    primaryFAUs: ['hamstrings'],
    secondaryFAUs: ['glutes', 'lower-back'],
  })
  s.squat = await createTestExerciseDefinition(s.prisma, {
    name: 'Back Squat',
    primaryFAUs: ['quads'],
    secondaryFAUs: ['glutes', 'adductors'],
  })
  s.pullup = await createTestExerciseDefinition(s.prisma, {
    name: 'Pull-up',
    primaryFAUs: ['lats', 'biceps'],
    secondaryFAUs: ['rear-delts'],
  })
}

const FORBIDDEN_WORDS = /neglect|status|share|deficit|balanced|over\b/i

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given, And }) => {
    Given('Dustin has an agent token named "coach"', async () => {
      s = await freshState()
    })
    And('the exercise library contains "Deadlift", "Romanian Deadlift", "Back Squat" and "Pull-up"', async () => {
      await seedLibrary()
    })
  })

  Rule('Agents read anchors, targets and FAU volume', ({ RuleScenario }) => {
    RuleScenario('Reading anchors', ({ Given, When, Then, And }) => {
      Given('Dustin\'s hinge anchors are "Deadlift" and "Romanian Deadlift", and he last logged "Deadlift" 5 days ago', async () => {
        await setAnchors({ hinge: [s.deadlift.id, s.rdl.id] })
        await seedSession({ date: ago(5), def: s.deadlift })
      })
      When('the agent calls "get_anchors"', async () => {
        s.last = await callAgentTool('get_anchors', {})
      })
      Then('hinge lists both exercises, with "Deadlift" at 5 days and "Romanian Deadlift" never logged', () => {
        mustSucceed(s.last!, 'get_anchors')
        const out = s.last!.value as AnchorsOut
        const hinge = out.patterns.find((p) => p.pattern === 'hinge')!
        expect(hinge.displayName).toBe('Hinge')
        expect(hinge.exercises).toEqual([
          { id: s.deadlift.id, name: 'Deadlift', lastLoggedDaysAgo: 5 },
          { id: s.rdl.id, name: 'Romanian Deadlift', lastLoggedDaysAgo: null },
        ])
        expect(out.maxPerPattern).toBe(5)
        expect([...out.validPatterns].sort()).toEqual([...ANCHOR_PATTERNS].sort())
      })
      And('the other 5 patterns are listed with no exercises', () => {
        const out = s.last!.value as AnchorsOut
        expect(out.patterns).toHaveLength(6)
        const others = out.patterns.filter((p) => p.pattern !== 'hinge')
        expect(others.map((p) => p.pattern).sort()).toEqual(ANCHOR_PATTERNS.filter((p) => p !== 'hinge').sort())
        for (const p of others) expect(p.exercises, p.pattern).toEqual([])
      })
    })

    RuleScenario('Default targets, and reading changes nothing', ({ Given, When, Then, And }) => {
      Given('Dustin has never saved muscle-balance settings', async () => {
        expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(0)
      })
      When('the agent calls "get_balance_targets"', async () => {
        s.last = await callAgentTool('get_balance_targets', {})
      })
      Then('all 18 FAUs have target 1 and the targets are marked as defaults', () => {
        mustSucceed(s.last!, 'get_balance_targets')
        const out = s.last!.value as Awaited<ReturnType<typeof readTargets>>
        expect(Object.keys(out.targets).sort()).toEqual([...ALL_FAUS].sort())
        expect(ALL_FAUS).toHaveLength(18)
        for (const fau of ALL_FAUS) expect(out.targets[fau], fau).toBe(1)
        expect(out.isDefault).toBe(true)
        expect(out.bounds).toEqual(BOUNDS)
        expect(out.settings).toEqual(DEFAULT_CALC)
      })
      And('no settings row has been created', async () => {
        expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(0)
      })
    })

    RuleScenario('FAU volume is raw set counts', ({ Given, When, Then, And }) => {
      Given('in the last 14 days Dustin logged 4 working sets of "Back Squat" and 2 warmup sets', async () => {
        await seedSession({ date: ago(2), def: s.squat, working: 4, warmups: 2 })
      })
      When('the agent calls "get_fau_volume"', async () => {
        s.last = await callAgentTool('get_fau_volume', {})
      })
      Then('quads shows 4 primary sets and glutes shows the squat\'s secondary sets', () => {
        mustSucceed(s.last!, 'get_fau_volume')
        const v = s.last!.value as VolumeOut
        expect(fauOf(v, 'quads')).toMatchObject({ primarySets: 4, secondarySets: 0, target: 1, lastTrainedDaysAgo: 2 })
        expect(fauOf(v, 'glutes')).toMatchObject({ primarySets: 0, secondarySets: 4, lastTrainedDaysAgo: null })
        expect(fauOf(v, 'adductors')).toMatchObject({ primarySets: 0, secondarySets: 4 })
        for (const f of v.faus.filter((x) => !['quads', 'glutes', 'adductors'].includes(x.fau))) {
          expect(f, f.fau).toMatchObject({ primarySets: 0, secondarySets: 0, lastTrainedDaysAgo: null })
        }
        expect(v.sessions).toBe(1)
      })
      And('no FAU has a status, share or neglected label', () => {
        const v = s.last!.value as VolumeOut
        expect(Object.keys(v).sort()).toEqual(['faus', 'sessions', 'settings', 'since', 'until'])
        expect(v.faus.map((f) => f.fau).sort()).toEqual([...ALL_FAUS].sort())
        for (const f of v.faus) {
          expect(Object.keys(f).sort(), f.fau).toEqual(
            ['displayName', 'fau', 'lastTrainedDaysAgo', 'primarySets', 'secondarySets', 'target'].sort(),
          )
        }
        expect(JSON.stringify(v)).not.toMatch(FORBIDDEN_WORDS)
      })
    })

    RuleScenario("Archived workouts and other users' training don't count toward volume", ({ Given, When, Then }) => {
      Given('another user logged "Back Squat" and one of Dustin\'s workouts is archived', async () => {
        await seedSession({ date: ago(2), def: s.squat, working: 4 })
        await seedSession({ date: ago(3), def: s.squat, working: 3, archived: true })
        await seedSession({ date: ago(1), def: s.squat, working: 5, userId: s.otherUserId })
      })
      When('the agent calls "get_fau_volume"', async () => {
        s.last = await callAgentTool('get_fau_volume', {})
      })
      Then("only Dustin's unarchived sets are counted", () => {
        mustSucceed(s.last!, 'get_fau_volume')
        const v = s.last!.value as VolumeOut
        expect(fauOf(v, 'quads')).toMatchObject({ primarySets: 4, secondarySets: 0, lastTrainedDaysAgo: 2 })
        expect(fauOf(v, 'glutes').secondarySets).toBe(4)
        expect(v.sessions).toBe(1)
      })
    })
  })

  Rule('Anchor changes are proposed and approved', ({ RuleScenario }) => {
    RuleScenario('Proposing an anchor change changes nothing yet', ({ When, Then, And }) => {
      When('the agent proposes hinge anchors "Romanian Deadlift"', async () => {
        await setAnchors({ hinge: [s.deadlift.id, s.rdl.id] })
        s.last = await proposeAnchors({ hinge: [s.rdl.id] })
      })
      Then('a pending anchor proposal exists, with the old hinge anchors recorded', async () => {
        mustSucceed(s.last!, 'propose_anchor_update')
        const p = await latestProposal()
        expect(p.status).toBe('pending')
        expect(p.kind).toBe('anchors.update')
        expect(p.userId).toBe(s.userId)
        expect(p.agentTokenId).toBe(s.tokenId)
        expect(p.summary).toBe('Update anchors: Hinge')
        expect(p.rationale).toBe(RATIONALE)
        expect(p.decidedAt).toBeNull()
        expect(p.before).toEqual({ hinge: [s.deadlift.id, s.rdl.id] })
        expect(await proposalCount()).toBe(1)
        expect(s.notify).toHaveBeenCalledTimes(1)
        const payload = s.notify.mock.calls[0][0] as Json
        expect(payload.proposalId).toBe(p.id)
        expect(textOf(payload)).toContain('Update anchors: Hinge')
      })
      And("Dustin's hinge anchors are unchanged", async () => {
        expect(await anchorsFor('hinge')).toEqual([s.deadlift.id, s.rdl.id])
      })
    })

    RuleScenario('A bad anchor change is refused', ({ When, Then }) => {
      When('the agent proposes 6 exercises for squat, or an unknown exercise for hinge', async () => {
        const six = await extras(6)
        s.last = await proposeAnchors({ squat: six.map((d) => d.id) })
        s.second = await proposeAnchors({ hinge: ['no-such-exercise'] })
      })
      Then('the tool returns an error naming that pattern, and no proposal is created', async () => {
        const tooMany = toolPayload(s.last!)
        expect(tooMany.field).toBe('squat')
        expect(String(tooMany.error)).toContain('squat')
        const unknown = toolPayload(s.second!)
        expect(unknown.field).toBe('hinge')
        expect(String(unknown.error)).toContain('hinge')
        expect(await proposalCount()).toBe(0)
        expect(s.notify).not.toHaveBeenCalled()
      })
    })

    RuleScenario('Approving changes only the named patterns', ({ Given, When, Then }) => {
      Given('Dustin\'s squat anchor is "Back Squat" and a pending proposal sets hinge to "Romanian Deadlift"', async () => {
        await setAnchors({ squat: [s.squat.id] })
        await pendingAnchors({ hinge: [s.rdl.id] })
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('hinge is "Romanian Deadlift" and squat is still "Back Squat"', async () => {
        expectOk(s.last!, 'approve')
        expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
        expect(await anchorsFor('squat')).toEqual([s.squat.id])
        const p = await proposalById()
        expect(p.status).toBe('applied')
        expect(p.decidedAt).not.toBeNull()
        expect(p.inverse).toEqual(p.before)
        expect(p.before).toEqual({ hinge: [] })
      })
    })

    RuleScenario('An anchor Dustin changed since the proposal is a conflict', ({ Given, And, When, Then }) => {
      Given('a pending proposal sets hinge to "Romanian Deadlift"', async () => {
        await setAnchors({ hinge: [s.deadlift.id] })
        await pendingAnchors({ hinge: [s.rdl.id] })
      })
      And('Dustin then changed his hinge anchors in Settings', async () => {
        await setAnchors({ hinge: [s.pullup.id] })
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the result code is "conflict" and his hinge anchors are as he set them', async () => {
        expectRefused(s.last!, 'conflict')
        expect((await proposalById()).status).toBe('conflict')
        expect(await anchorsFor('hinge')).toEqual([s.pullup.id])
      })
    })

    RuleScenario('Reverting an anchor change restores the old anchors', ({ Given, When, Then }) => {
      Given('Dustin approved a proposal that set hinge to "Romanian Deadlift"', async () => {
        await setAnchors({ hinge: [s.deadlift.id, s.rdl.id] })
        await approved('anchors', { hinge: [s.rdl.id] })
        expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('hinge is back to "Deadlift" and "Romanian Deadlift"', async () => {
        expectOk(s.last!, 'revert')
        expect(await anchorsFor('hinge')).toEqual([s.deadlift.id, s.rdl.id])
        expect((await proposalById()).status).toBe('reverted')
      })
    })
  })

  Rule('Target changes are proposed and approved', ({ RuleScenario }) => {
    RuleScenario('Proposing a target change changes nothing yet', ({ When, Then, And }) => {
      When('the agent proposes quads 1.3 and hamstrings 1.2', async () => {
        s.last = await proposeTargets({ quads: 1.3, hamstrings: 1.2 })
      })
      Then('a pending target proposal exists, summarised as "quads 1 → 1.3, hamstrings 1 → 1.2"', async () => {
        mustSucceed(s.last!, 'propose_target_update')
        const p = await latestProposal()
        expect(p.status).toBe('pending')
        expect(p.kind).toBe('balance_targets.update')
        expect(p.userId).toBe(s.userId)
        expect(p.agentTokenId).toBe(s.tokenId)
        expect(p.summary).toBe('Update targets: quads 1 → 1.3, hamstrings 1 → 1.2')
        expect(p.rationale).toBe(RATIONALE)
        expect(p.decidedAt).toBeNull()
        expect(p.before).toEqual({ quads: 1, hamstrings: 1 })
        expect(await proposalCount()).toBe(1)
        expect(s.notify).toHaveBeenCalledTimes(1)
        expect(textOf(s.notify.mock.calls[0][0])).toContain('quads 1 → 1.3')
      })
      And("Dustin's targets are unchanged", async () => {
        expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(0)
        expect(await liveTargets()).toEqual(defaultTargets())
      })
    })

    RuleScenario('An out-of-range or off-step target is refused', ({ When, Then }) => {
      When('the agent proposes quads 2.5, or quads 1.33', async () => {
        s.last = await proposeTargets({ quads: 2.5 })
        s.second = await proposeTargets({ quads: 1.33 })
      })
      Then('the tool returns an error naming "quads", and no proposal is created', async () => {
        expect(toolPayload(s.last!).field).toBe('quads')
        expect(String(toolPayload(s.last!).error)).toContain('quads')
        expect(toolPayload(s.second!).field).toBe('quads')
        expect(String(toolPayload(s.second!).error)).toContain('quads')
        expect(await proposalCount()).toBe(0)
      })
    })

    RuleScenario('Approving changes only the named targets and never the calc settings', ({ Given, When, Then }) => {
      Given('Dustin set a 21-day lookback in Settings and a pending proposal sets quads to 1.3', async () => {
        await setSettings({
          lookbackDays: 21,
          includeSecondary: false,
          secondaryWeight: 0.7,
          excludeWarmups: false,
          targets: { hamstrings: 0.8, lats: 1.5 },
        })
        await pendingTargets({ quads: 1.3 })
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('quads is 1.3, every other target is unchanged, and his lookback is still 21 days', async () => {
        expectOk(s.last!, 'approve')
        expect(await liveTargets()).toEqual({ ...defaultTargets(), quads: 1.3, hamstrings: 0.8, lats: 1.5 })
        expect(await liveCalc()).toEqual({ lookbackDays: 21, includeSecondary: false, secondaryWeight: 0.7, excludeWarmups: false })
        const p = await proposalById()
        expect(p.status).toBe('applied')
        expect(p.inverse).toEqual({ quads: 1 })
      })
    })

    RuleScenario('Approving creates settings from the defaults when none exist', ({ Given, When, Then }) => {
      Given('Dustin has never saved muscle-balance settings and a pending proposal sets quads to 1.3', async () => {
        expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(0)
        await pendingTargets({ quads: 1.3 })
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('quads is 1.3 and every other FAU and calc setting has its default', async () => {
        expectOk(s.last!, 'approve')
        expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(1)
        expect(await liveTargets()).toEqual({ ...defaultTargets(), quads: 1.3 })
        expect(await liveCalc()).toEqual(DEFAULT_CALC)
      })
    })

    RuleScenario('A target Dustin changed since the proposal is a conflict', ({ Given, And, When, Then }) => {
      Given('a pending proposal sets quads to 1.3', async () => {
        await pendingTargets({ quads: 1.3 })
      })
      And('Dustin then set quads to 0.8 in Settings', async () => {
        await settingsSet('quads', 0.8)
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the result code is "conflict" and quads is still 0.8', async () => {
        expectRefused(s.last!, 'conflict')
        expect((await proposalById()).status).toBe('conflict')
        expect(await liveTarget('quads')).toBe(0.8)
      })
    })

    RuleScenario('Reverting a target change restores the old target', ({ Given, When, Then }) => {
      Given('Dustin approved a proposal that set quads from 1 to 1.3', async () => {
        await approved('targets', { quads: 1.3 })
        expect(await liveTarget('quads')).toBe(1.3)
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('quads is back to 1', async () => {
        expectOk(s.last!, 'revert')
        expect(await liveTarget('quads')).toBe(1)
        expect((await proposalById()).status).toBe('reverted')
      })
    })
  })
})

// ---------------------------------------------------------------------------
// What the scenarios imply but don't spell out (spec: "Anchors and balance
// targets"). Plain tests, each against a fresh database.
// ---------------------------------------------------------------------------
describe('balance tools: registration', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it('lists the five tools', async () => {
    const { listTools } = await tools()
    const raw = (await listTools()) as unknown
    const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? [])
    const names = (list as Array<{ name: string }>).map((t) => t.name)
    for (const n of ['get_anchors', 'get_balance_targets', 'get_fau_volume', 'propose_anchor_update', 'propose_target_update']) {
      expect(names, n).toContain(n)
    }
  })
})

describe('balance reads', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it('the reads do no writes, with or without rows', async () => {
    const run = async (label: string) => {
      const counter = { n: 0 }
      const counted = countingProxy(s.prisma, WRITES, counter, RAW_WRITES)
      await readAnchors(counted)
      await readTargets(counted)
      await readVolume({}, counted)
      await readVolume({ days: 30 }, counted)
      expect(counter.n, `${label}: write calls`).toBe(0)
    }
    await run('no rows')
    expect(await s.prisma.userTrainingProfile.count()).toBe(0)
    expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(0)
    await setAnchors({ hinge: [s.deadlift.id] })
    await setSettings({ lookbackDays: 21 })
    await seedSession({ date: ago(3), def: s.squat, working: 2 })
    await run('with rows')
  })

  it('the write counter does count writes', async () => {
    const counter = { n: 0 }
    const counted = countingProxy(s.prisma, WRITES, counter, RAW_WRITES)
    await counted.userMuscleBalanceSettings.create({ data: { userId: s.userId, targets: defaultTargets() } })
    expect(counter.n).toBe(1)
  })

  describe('get_anchors', () => {
    it('keeps the stored order and ignores archived and abandoned sessions when dating the last log', async () => {
      await setAnchors({ hinge: [s.rdl.id, s.deadlift.id], squat: [s.squat.id] })
      await seedSession({ date: ago(9), def: s.deadlift })
      await seedSession({ date: ago(2), def: s.deadlift, archived: true })
      await seedSession({ date: ago(1), def: s.deadlift, status: 'abandoned' })
      await seedSession({ date: ago(1), def: s.rdl, archived: true })
      await seedSession({ date: ago(4), def: s.squat, userId: s.otherUserId })
      const out = await readAnchors()
      const byPattern = Object.fromEntries(out.patterns.map((p) => [p.pattern, p.exercises]))
      expect(byPattern.hinge).toEqual([
        { id: s.rdl.id, name: 'Romanian Deadlift', lastLoggedDaysAgo: null },
        { id: s.deadlift.id, name: 'Deadlift', lastLoggedDaysAgo: 9 },
      ])
      expect(byPattern.squat).toEqual([{ id: s.squat.id, name: 'Back Squat', lastLoggedDaysAgo: null }])
    })

    it('with no profile row lists all 6 patterns empty', async () => {
      const out = await readAnchors()
      expect(out.patterns.map((p) => p.pattern).sort()).toEqual([...ANCHOR_PATTERNS].sort())
      expect(out.patterns.every((p) => p.exercises.length === 0)).toBe(true)
      expect(out.patterns.find((p) => p.pattern === 'horizontal_push')!.displayName).toBe('Horizontal Push')
    })
  })

  describe('get_balance_targets', () => {
    it('reads a saved row, filling any FAU it lacks with 1', async () => {
      await s.prisma.userMuscleBalanceSettings.create({
        data: {
          userId: s.userId,
          targets: { quads: 0.8, lats: 1.55 },
          lookbackDays: 21,
          includeSecondary: false,
          secondaryWeight: 0.25,
          excludeWarmups: false,
        },
      })
      const out = await readTargets()
      expect(Object.keys(out.targets).sort()).toEqual([...ALL_FAUS].sort())
      expect(out.targets).toEqual({ ...defaultTargets(), quads: 0.8, lats: 1.55 })
      expect(out.isDefault).toBe(false)
      expect(out.bounds).toEqual(BOUNDS)
      expect(out.settings).toEqual({ lookbackDays: 21, includeSecondary: false, secondaryWeight: 0.25, excludeWarmups: false })
    })
  })

  describe('get_fau_volume', () => {
    it.each([[0], [-1], [366], [1.5]])('rejects days %s with a tool error naming days', async (days) => {
      expect(toolPayload(await callAgentTool('get_fau_volume', { days })).field).toBe('days')
    })

    it.each([[1], [365]])('accepts days %i at its limits', async (days) => {
      const v = await readVolume({ days })
      expect(v.faus).toHaveLength(18)
      expect(v.sessions).toBe(0)
      const span = new Date(v.until).getTime() - new Date(v.since).getTime()
      expect(Math.abs(span - days * DAY)).toBeLessThan(DAY)
    })

    it('uses 14 days with no settings, and the saved lookbackDays with settings', async () => {
      await seedSession({ date: ago(13), def: s.squat, working: 1 })
      await seedSession({ date: ago(15), def: s.squat, working: 4 })
      await seedSession({ date: ago(18), def: s.squat, working: 2 })
      let v = await readVolume()
      expect(fauOf(v, 'quads').primarySets).toBe(1)
      expect(v.sessions).toBe(1)
      await setSettings({ lookbackDays: 21 })
      v = await readVolume()
      expect(fauOf(v, 'quads').primarySets).toBe(7)
      expect(v.sessions).toBe(3)
      expect(v.settings).toEqual({ ...DEFAULT_CALC, lookbackDays: 21 })
    })

    it('days overrides the window', async () => {
      await seedSession({ date: ago(3), def: s.squat, working: 1 })
      await seedSession({ date: ago(10), def: s.squat, working: 2 })
      expect(fauOf(await readVolume({ days: 7 }), 'quads').primarySets).toBe(1)
      expect(fauOf(await readVolume({ days: 30 }), 'quads').primarySets).toBe(3)
    })

    it('counts only completed sessions', async () => {
      await seedSession({ date: ago(2), def: s.squat, working: 4 })
      await seedSession({ date: ago(2), def: s.squat, working: 6, status: 'abandoned' })
      const v = await readVolume()
      expect(fauOf(v, 'quads').primarySets).toBe(4)
      expect(v.sessions).toBe(1)
    })

    it('each primary FAU of an exercise gets every set, and the target is the saved one', async () => {
      await setSettings({ targets: { lats: 1.4 } })
      await seedSession({ date: ago(6), def: s.pullup, working: 3 })
      await seedSession({ date: ago(2), def: s.pullup, working: 2 })
      const v = await readVolume()
      expect(fauOf(v, 'lats')).toMatchObject({ primarySets: 5, secondarySets: 0, target: 1.4, lastTrainedDaysAgo: 2 })
      expect(fauOf(v, 'biceps')).toMatchObject({ primarySets: 5, target: 1, lastTrainedDaysAgo: 2 })
      expect(fauOf(v, 'rear-delts')).toMatchObject({ primarySets: 0, secondarySets: 5, lastTrainedDaysAgo: null })
      expect(fauOf(v, 'lats').displayName).toBe(FAU_DISPLAY_NAMES.lats)
    })

    it('secondary sets are raw counts, whatever secondaryWeight is', async () => {
      await setSettings({ secondaryWeight: 0.25 })
      await seedSession({ date: ago(2), def: s.squat, working: 4 })
      const v = await readVolume()
      expect(fauOf(v, 'glutes').secondarySets).toBe(4)
      expect(v.settings).toEqual({ ...DEFAULT_CALC, secondaryWeight: 0.25 })
    })

    it('warmups count only when excludeWarmups is off', async () => {
      await seedSession({ date: ago(2), def: s.squat, working: 4, warmups: 2 })
      expect(fauOf(await readVolume(), 'quads').primarySets).toBe(4)
      await setSettings({ excludeWarmups: false })
      const v = await readVolume()
      expect(fauOf(v, 'quads').primarySets).toBe(6)
      expect(fauOf(v, 'glutes').secondarySets).toBe(6)
    })

    it('a session of only warmups does not date the FAU while warmups are excluded', async () => {
      await seedSession({ date: ago(2), def: s.squat, working: 0, warmups: 3 })
      await seedSession({ date: ago(8), def: s.squat, working: 1 })
      expect(fauOf(await readVolume(), 'quads').lastTrainedDaysAgo).toBe(8)
    })
  })
})

describe('anchor proposals: arguments', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it.each([[{}], [null], [[]], ['hinge'], [undefined]])('changes %j is refused with a tool error naming changes', async (changes) => {
    const o = await proposeAnchors(changes)
    expect(toolPayload(o).field).toBe('changes')
    expect(await proposalCount()).toBe(0)
  })

  it('an unknown pattern is refused and named', async () => {
    const o = await proposeAnchors({ lunge: [s.squat.id] })
    expect(toolPayload(o).field).toBe('lunge')
    expect(await proposalCount()).toBe(0)
  })

  it('a pattern whose value is not a list is refused and named', async () => {
    const o = await proposeAnchors({ hinge: s.rdl.id })
    expect(toolPayload(o).field).toBe('hinge')
    expect(await proposalCount()).toBe(0)
  })

  it('one bad pattern refuses the whole change', async () => {
    const o = await proposeAnchors({ squat: [s.squat.id], hinge: ['no-such-exercise'] })
    expect(toolPayload(o).field).toBe('hinge')
    expect(await proposalCount()).toBe(0)
  })

  it('5 exercises are allowed and 6 are not', async () => {
    const six = await extras(6)
    mustSucceed(await proposeAnchors({ squat: six.slice(0, 5).map((d) => d.id) }), '5 anchors')
    expect(toolPayload(await proposeAnchors({ squat: six.map((d) => d.id) })).field).toBe('squat')
    expect(await proposalCount()).toBe(1)
  })

  it('duplicate ids are removed before the limit of 5 is checked', async () => {
    const five = await extras(5)
    const ids = five.map((d) => d.id)
    mustSucceed(await proposeAnchors({ squat: [...ids, ids[0]] }), '5 unique plus a duplicate')
    expectOk(await decide('approveProposal', (await latestProposal()).id), 'approve')
    expect(await anchorsFor('squat')).toEqual(ids)
  })

  it('a list of one id repeated stores the id once', async () => {
    mustSucceed(await proposeAnchors({ hinge: Array(6).fill(s.rdl.id) }), 'repeated id')
    expectOk(await decide('approveProposal', (await latestProposal()).id), 'approve')
    expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
  })

  it("an exercise from another user can't be an anchor", async () => {
    const [theirs] = await extras(1, s.otherUserId)
    const o = await proposeAnchors({ hinge: [s.deadlift.id, theirs.id] })
    expect(toolPayload(o).field).toBe('hinge')
    expect(await proposalCount()).toBe(0)
  })

  it('his own custom exercise and the system library are both allowed', async () => {
    const [mine] = await extras(1, s.userId)
    mustSucceed(await proposeAnchors({ hinge: [mine.id, s.deadlift.id] }), 'own plus system')
  })

  it("an exercise's own movement pattern is not checked", async () => {
    mustSucceed(await proposeAnchors({ hinge: [s.pullup.id] }), 'pull-up as a hinge anchor')
  })

  it('an empty list clears the pattern when approved', async () => {
    await setAnchors({ hinge: [s.deadlift.id, s.rdl.id], squat: [s.squat.id] })
    mustSucceed(await proposeAnchors({ hinge: [] }), 'clear hinge')
    const p = await latestProposal()
    expect(p.before).toEqual({ hinge: [s.deadlift.id, s.rdl.id] })
    expectOk(await decide('approveProposal', p.id), 'approve')
    expect(await anchorsFor('hinge')).toEqual([])
    expect(await anchorsFor('squat')).toEqual([s.squat.id])
  })

  it('names every touched pattern in the summary, by display name', async () => {
    mustSucceed(await proposeAnchors({ horizontal_push: [s.pullup.id], hinge: [s.rdl.id] }), 'two patterns')
    const p = await latestProposal()
    expect(p.summary).toMatch(/^Update anchors: /)
    expect(p.summary).toContain('Horizontal Push')
    expect(p.summary).toContain('Hinge')
    expect(Object.keys(p.before as Json).sort()).toEqual(['hinge', 'horizontal_push'])
  })

  it('the proposal links the feedback it addresses, as other proposals do', async () => {
    const feedback = await s.prisma.feedback.create({ data: { userId: s.userId, category: 'general', message: 'Anchors look stale', pageUrl: '/settings', refinements: [] } })
    mustSucceed(await proposeAnchors({ hinge: [s.rdl.id] }, { feedbackId: feedback.id }), 'with feedbackId')
    expect((await latestProposal()).feedbackId).toBe(feedback.id)
  })
})

describe('anchor proposals: approve and revert', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it('an unrelated profile edit does not conflict', async () => {
    await setAnchors({ hinge: [s.deadlift.id] })
    const id = await pendingAnchors({ hinge: [s.rdl.id] })
    await s.prisma.userTrainingProfile.update({
      where: { userId: s.userId },
      data: { goalSentences: ['Pull 200 kg'], weeklyIntent: ['3 sessions'] },
    })
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
    const profile = await s.prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId: s.userId } })
    expect(profile.goalSentences).toEqual(['Pull 200 kg'])
  })

  it('a change to a pattern the proposal does not touch does not conflict, and survives approval', async () => {
    await setAnchors({ hinge: [s.deadlift.id], squat: [s.squat.id] })
    const id = await pendingAnchors({ hinge: [s.rdl.id] })
    await setAnchors({ hinge: [s.deadlift.id], squat: [s.squat.id, s.pullup.id] })
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
    expect(await anchorsFor('squat')).toEqual([s.squat.id, s.pullup.id])
  })

  it('a conflict leaves the live anchors and everything else alone', async () => {
    await setAnchors({ hinge: [s.deadlift.id], squat: [s.squat.id] })
    const id = await pendingAnchors({ hinge: [s.rdl.id], squat: [s.pullup.id] })
    await setAnchors({ hinge: [s.deadlift.id], squat: [s.rdl.id] })
    expectRefused(await decide('approveProposal', id), 'conflict')
    expect(await storedAnchors()).toEqual({ hinge: [s.deadlift.id], squat: [s.rdl.id] })
    const p = await proposalById()
    expect(p.status).toBe('conflict')
    expect(p.inverse).toBeNull()
  })

  it('approving with no profile row creates the profile', async () => {
    expect(await s.prisma.userTrainingProfile.count()).toBe(0)
    const id = await pendingAnchors({ hinge: [s.rdl.id] })
    expect(await s.prisma.userTrainingProfile.count()).toBe(0)
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
  })

  it('revert is refused with conflict when a touched pattern moved after approval', async () => {
    await setAnchors({ hinge: [s.deadlift.id, s.rdl.id] })
    const id = await approved('anchors', { hinge: [s.rdl.id] })
    await setAnchors({ hinge: [s.pullup.id] })
    expectRefused(await decide('revertProposal', id), 'conflict')
    expect(await anchorsFor('hinge')).toEqual([s.pullup.id])
    expect((await proposalById()).status).toBe('applied')
  })

  it('revert restores only the touched patterns', async () => {
    await setAnchors({ hinge: [s.deadlift.id, s.rdl.id], squat: [s.squat.id] })
    const id = await approved('anchors', { hinge: [s.rdl.id] })
    await setAnchors({ hinge: [s.rdl.id], squat: [s.pullup.id] })
    expectOk(await decide('revertProposal', id), 'revert')
    expect(await anchorsFor('hinge')).toEqual([s.deadlift.id, s.rdl.id])
    expect(await anchorsFor('squat')).toEqual([s.pullup.id])
  })

  it('revert after an approve that cleared a pattern restores it', async () => {
    await setAnchors({ hinge: [s.deadlift.id] })
    const id = await approved('anchors', { hinge: [] })
    expect(await anchorsFor('hinge')).toEqual([])
    expectOk(await decide('revertProposal', id), 'revert')
    expect(await anchorsFor('hinge')).toEqual([s.deadlift.id])
  })

  it('reject changes nothing', async () => {
    await setAnchors({ hinge: [s.deadlift.id] })
    const id = await pendingAnchors({ hinge: [s.rdl.id] })
    expectOk(await decide('rejectProposal', id), 'reject')
    expect(await anchorsFor('hinge')).toEqual([s.deadlift.id])
    expect((await proposalById()).status).toBe('rejected')
  })
})

describe('target proposals: arguments', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it.each([[{}], [null], [[]], [1.3], [undefined]])('changes %j is refused with a tool error naming changes', async (changes) => {
    expect(toolPayload(await proposeTargets(changes)).field).toBe('changes')
    expect(await proposalCount()).toBe(0)
  })

  it.each([['quad'], ['Quads'], ['neck']])('an unknown FAU %j is refused and named', async (fau) => {
    expect(toolPayload(await proposeTargets({ [fau]: 1.2 })).field).toBe(fau)
    expect(await proposalCount()).toBe(0)
  })

  it.each([[-0.05], [2.05], [3], [1.33], [0.07], [1.001], [0.01], [Number.POSITIVE_INFINITY]])(
    'a target of %s is refused and the FAU named',
    async (value) => {
      expect(toolPayload(await proposeTargets({ quads: value })).field).toBe('quads')
      expect(await proposalCount()).toBe(0)
    },
  )

  it.each([['1.3'], [null], [true], [[1.3]]])('a target of %j (not a number) is refused and the FAU named', async (value) => {
    expect(toolPayload(await proposeTargets({ glutes: value })).field).toBe('glutes')
    expect(await proposalCount()).toBe(0)
  })

  it.each([[0], [0.05], [0.35], [0.7], [1.15], [1.95], [2]])('a target of %s is on the step and is accepted', async (value) => {
    mustSucceed(await proposeTargets({ quads: value }), `quads ${value}`)
    const id = (await latestProposal()).id
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await liveTarget('quads')).toBe(value)
  })

  it('an off-step value is refused, not rounded', async () => {
    expect(toolPayload(await proposeTargets({ quads: 1.33 })).field).toBe('quads')
    expect(await proposalCount()).toBe(0)
    expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(0)
  })

  it('one bad FAU refuses the whole change, naming it', async () => {
    const o = await proposeTargets({ quads: 1.3, hamstrings: 2.5, glutes: 0.9 })
    expect(toolPayload(o).field).toBe('hamstrings')
    expect(await proposalCount()).toBe(0)
  })

  it('a change cannot carry calc settings', async () => {
    const o = await proposeTargets({ lookbackDays: 30 })
    expect(toolPayload(o).field).toBe('lookbackDays')
    expect(await proposalCount()).toBe(0)
  })

  it('the summary shows the live value, not the default, as the old one', async () => {
    await setSettings({ targets: { quads: 0.8, glutes: 1.55 } })
    mustSucceed(await proposeTargets({ quads: 1.15, glutes: 1.2 }), 'propose')
    const p = await latestProposal()
    expect(p.summary).toBe('Update targets: quads 0.8 → 1.15, glutes 1.55 → 1.2')
    expect(p.before).toEqual({ quads: 0.8, glutes: 1.55 })
  })

  it('the proposal links the feedback it addresses, as other proposals do', async () => {
    const feedback = await s.prisma.feedback.create({ data: { userId: s.userId, category: 'general', message: 'Legs are behind', pageUrl: '/settings', refinements: [] } })
    mustSucceed(await proposeTargets({ quads: 1.2 }, { feedbackId: feedback.id }), 'with feedbackId')
    expect((await latestProposal()).feedbackId).toBe(feedback.id)
  })
})

describe('target proposals: approve and revert', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  it('an unrelated settings edit does not conflict and is kept', async () => {
    await setSettings({ lookbackDays: 14 })
    const id = await pendingTargets({ quads: 1.3 })
    await s.prisma.userMuscleBalanceSettings.update({ where: { userId: s.userId }, data: { lookbackDays: 30, secondaryWeight: 0.3 } })
    await settingsSet('hamstrings', 0.5)
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await liveTargets()).toEqual({ ...defaultTargets(), quads: 1.3, hamstrings: 0.5 })
    expect(await liveCalc()).toMatchObject({ lookbackDays: 30, secondaryWeight: 0.3 })
  })

  it('a row Dustin saved after the proposal, with the same value, does not conflict', async () => {
    const id = await pendingTargets({ quads: 1.3 })
    await setSettings({ lookbackDays: 28 })
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await liveTarget('quads')).toBe(1.3)
    expect((await liveCalc()).lookbackDays).toBe(28)
  })

  it('a conflict on one of several touched FAUs changes none of them', async () => {
    const id = await pendingTargets({ quads: 1.3, hamstrings: 1.2 })
    await settingsSet('hamstrings', 0.6)
    expectRefused(await decide('approveProposal', id), 'conflict')
    expect(await liveTargets()).toEqual({ ...defaultTargets(), hamstrings: 0.6 })
    expect((await proposalById()).status).toBe('conflict')
  })

  it('revert is refused with conflict when a touched FAU moved after approval', async () => {
    const id = await approved('targets', { quads: 1.3 })
    await settingsSet('quads', 0.9)
    expectRefused(await decide('revertProposal', id), 'conflict')
    expect(await liveTarget('quads')).toBe(0.9)
    expect((await proposalById()).status).toBe('applied')
  })

  it('revert restores only the touched FAUs', async () => {
    const id = await approved('targets', { quads: 1.3, glutes: 0.8 })
    await settingsSet('lats', 1.6)
    expectOk(await decide('revertProposal', id), 'revert')
    expect(await liveTargets()).toEqual({ ...defaultTargets(), lats: 1.6 })
  })

  it('revert after an approve that created the settings row restores the defaults', async () => {
    const id = await approved('targets', { quads: 1.3 })
    expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(1)
    expectOk(await decide('revertProposal', id), 'revert')
    expect(await liveTargets()).toEqual(defaultTargets())
    expect(await liveCalc()).toEqual(DEFAULT_CALC)
  })

  it('reject changes nothing and creates no row', async () => {
    const id = await pendingTargets({ quads: 1.3 })
    expectOk(await decide('rejectProposal', id), 'reject')
    expect(await s.prisma.userMuscleBalanceSettings.count()).toBe(0)
    expect((await proposalById()).status).toBe('rejected')
  })

  it('the agent sees the approved target on its next read', async () => {
    await approved('targets', { quads: 1.3 })
    const out = await readTargets()
    expect(out.targets.quads).toBe(1.3)
    expect(out.isDefault).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Review defect 1 (work/027-handback.md): approving an anchor change creates a
// missing UserTrainingProfile. Its ratioTargets must be seeded the way
// getOrCreateUserTrainingProfile seeds it: from the muscle-balance settings
// targets, or the defaults when there is no settings row. That function is the
// oracle: a second user with the same settings gets a profile from it, and the
// approved user's stored ratioTargets must be identical.
// ---------------------------------------------------------------------------
describe('anchor approve seeds a new profile from Settings', () => {
  beforeEach(async () => {
    s = await freshState()
    await seedLibrary()
  })

  const ratioOf = async (userId: string) =>
    (await s.prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId } })).ratioTargets as Record<string, number>

  /** What getOrCreateUserTrainingProfile stores for `userId` (same settings, no profile yet). */
  async function reference(userId: string, rawTargets: Record<string, number> | null) {
    if (rawTargets) {
      await s.prisma.userMuscleBalanceSettings.create({ data: { userId, targets: rawTargets } })
    }
    const mod = (await load('@/lib/user-training-profile')) as typeof import('@/lib/user-training-profile')
    await mod.getOrCreateUserTrainingProfile(s.prisma, userId)
    return await ratioOf(userId)
  }

  async function approveAnchorChangeWithNoProfile() {
    expect(await s.prisma.userTrainingProfile.count({ where: { userId: s.userId } })).toBe(0)
    const id = await pendingAnchors({ hinge: [s.rdl.id] })
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
  }

  it('settings with quads 1.5 and no profile: ratioTargets match the Settings targets', async () => {
    await setSettings({ targets: { quads: 1.5, lats: 0.8 } })
    const expected = await reference(s.otherUserId, { ...defaultTargets(), quads: 1.5, lats: 0.8 })
    expect(expected.quads).toBe(1.5)
    await approveAnchorChangeWithNoProfile()
    const got = await ratioOf(s.userId)
    expect(got.quads).toBe(1.5)
    expect(got.lats).toBe(0.8)
    expect(got).toEqual(expected)
  })

  it('no settings and no profile: ratioTargets are the default seed', async () => {
    const expected = await reference(s.otherUserId, null)
    expect(Object.keys(expected).sort()).toEqual([...ALL_FAUS].sort())
    await approveAnchorChangeWithNoProfile()
    expect(await ratioOf(s.userId)).toEqual(expected)
  })

  it('settings whose targets lack some FAUs: the seed is filled out like the oracle fills it', async () => {
    await setSettings({ targets: { quads: 1.5 } })
    // Replace the full row with a sparse one, as an older row may be.
    await s.prisma.userMuscleBalanceSettings.update({ where: { userId: s.userId }, data: { targets: { quads: 1.5 } } })
    const expected = await reference(s.otherUserId, { quads: 1.5 })
    expect(Object.keys(expected).sort()).toEqual([...ALL_FAUS].sort())
    await approveAnchorChangeWithNoProfile()
    expect(await ratioOf(s.userId)).toEqual(expected)
  })

  it('the seed is not the calc settings or anything else from the settings row', async () => {
    await setSettings({ targets: { quads: 1.5 }, lookbackDays: 30, secondaryWeight: 0.2 })
    await approveAnchorChangeWithNoProfile()
    const got = await ratioOf(s.userId)
    expect(Object.keys(got).sort()).toEqual([...ALL_FAUS].sort())
    expect(got.quads).toBe(1.5)
  })

  it('an existing profile keeps its ratioTargets (control: passes today)', async () => {
    await setSettings({ targets: { quads: 1.5 } })
    const own = { ...defaultTargets(), quads: 0.5, glutes: 1.2 }
    await s.prisma.userTrainingProfile.create({ data: { userId: s.userId, ratioTargets: own, targetMovements: {} } })
    const id = await pendingAnchors({ hinge: [s.rdl.id] })
    expectOk(await decide('approveProposal', id), 'approve')
    expect(await ratioOf(s.userId)).toEqual(own)
    expect(await anchorsFor('hinge')).toEqual([s.rdl.id])
  })

  it('revert of an approve that created the profile leaves the seeded ratioTargets alone', async () => {
    await setSettings({ targets: { quads: 1.5 } })
    const expected = await reference(s.otherUserId, { ...defaultTargets(), quads: 1.5 })
    const id = await pendingAnchors({ hinge: [s.rdl.id] })
    expectOk(await decide('approveProposal', id), 'approve')
    expectOk(await decide('revertProposal', id), 'revert')
    expect(await anchorsFor('hinge')).toEqual([])
    expect(await ratioOf(s.userId)).toEqual(expected)
  })
})
