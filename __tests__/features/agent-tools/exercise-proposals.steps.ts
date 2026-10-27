/**
 * Step definitions for features/agent-tools/exercise-proposals.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md.
 *
 * Modules under test are imported dynamically inside steps so that, while the
 * implementation is missing, each scenario fails on its own with a
 * "cannot find module" error rather than the whole file failing at load.
 *
 * Assumptions where the spec is silent (isolated in the helpers below so the
 * implementer and lead can see them in one place):
 *  - Service decision calls are (prisma, proposalId, userId).
 *  - Refusals/validation errors surface either as a thrown Error or as a
 *    returned value with isError/error/ok:false/success:false.
 *  - callTool results may be raw values or MCP-style { content: [{ text: JSON }] }.
 *  - ctx.notify receives something whose JSON contains the new proposal id.
 */
import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestExerciseDefinition,
  createTestLoggedSets,
  createTestProgram,
  createTestUser,
  createTestWorkoutCompletion,
} from '@/lib/test/factories'

const feature = await loadFeature('features/agent-tools/exercise-proposals.feature')

// ---------------------------------------------------------------------------
// Shared scenario state (reset before every scenario)
// ---------------------------------------------------------------------------
type Outcome = { failed: boolean; value: unknown; text: string; thrown: boolean; raw?: unknown }

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  token: string
  tokenId: string
  benchId: string
  notify: ReturnType<typeof vi.fn>
  notifyFails: boolean
  last?: Outcome
  resolved?: { userId: string; tokenId: string } | null
  tools: string[]
  proposalId?: string
  benchBefore?: Record<string, unknown>
  dustinWorkoutName: string
  otherWorkoutName: string
  otherCompletionId?: string
  dustinCompletionId?: string
}

let s = {} as State

const ORIGINAL_NOTES = 'Original notes'
const PROPOSED_NOTES = 'Proposed notes'
const LARSEN = {
  name: 'Larsen Press',
  equipment: ['barbell'],
  primaryFAUs: ['chest'],
  secondaryFAUs: ['triceps'],
}

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
  const r = raw as { content?: Array<{ text?: string }> } | null
  const t = r?.content?.[0]?.text
  if (typeof t === 'string') {
    try {
      return JSON.parse(t)
    } catch {
      return t
    }
  }
  return raw
}

function looksFailed(raw: unknown): boolean {
  const r = raw as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return false
  const inner = unwrap(raw) as Record<string, unknown> | null
  return (
    r.isError === true ||
    r.ok === false ||
    r.success === false ||
    (r.error != null && r.error !== false) ||
    (!!inner && typeof inner === 'object' && (inner.ok === false || inner.success === false || (inner.error != null && inner.error !== false)))
  )
}

async function attempt(fn: () => Promise<unknown>): Promise<Outcome> {
  try {
    const raw = await fn()
    return { failed: looksFailed(raw), value: unwrap(raw), text: textOf(raw) + ' ' + textOf(unwrap(raw)), thrown: false, raw }
  } catch (e) {
    return { failed: true, value: e, text: textOf(e), thrown: true }
  }
}

function ctx() {
  return { userId: s.userId, tokenId: s.tokenId, notify: s.notify }
}

// Variable specifiers stop Vite resolving these at transform time, so a missing
// module fails the scenario that needs it instead of the whole file.
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

async function callAgentTool(name: string, args: Record<string, unknown>): Promise<Outcome> {
  const { callTool } = await tools()
  return attempt(() => callTool(s.prisma, ctx() as never, name, args as never))
}

type Decision = 'approveProposal' | 'rejectProposal' | 'revertProposal'
async function decide(fn: Decision, proposalId: string): Promise<Outcome> {
  const svc = (await service()) as unknown as Record<Decision, (...a: unknown[]) => Promise<unknown>>
  // Spec pins { ok: true, proposal } | { ok: false, code, error }; a throw is a failure.
  const raw = (await svc[fn](s.prisma, proposalId, s.userId)) as { ok?: boolean }
  return { failed: raw?.ok !== true, value: raw, text: textOf(raw), thrown: false, raw }
}

function refusal(o: Outcome): { ok?: boolean; code?: string; error?: string } {
  return o.value as { ok?: boolean; code?: string; error?: string }
}

function expectRefused(o: Outcome, code: string) {
  const v = refusal(o)
  expect(v.ok, `expected refusal, got: ${o.text}`).toBe(false)
  expect(v.code).toBe(code)
  expect(typeof v.error).toBe('string')
}

function toolPayload(o: Outcome): Record<string, unknown> {
  expect((o.raw as { isError?: boolean })?.isError, `tool should set isError: ${o.text}`).toBe(true)
  return o.value as Record<string, unknown>
}

function mustSucceed(o: Outcome, what: string) {
  expect(o.failed, `${what} should succeed but got: ${o.text}`).toBe(false)
}

async function bench() {
  return await s.prisma.exerciseDefinition.findUniqueOrThrow({ where: { id: s.benchId } })
}

async function larsen() {
  return await s.prisma.exerciseDefinition.findFirst({ where: { normalizedName: 'larsen press' } })
}

async function proposalFor(name: string) {
  const all = await s.prisma.proposal.findMany({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' } })
  return all.find((p) => textOf(p.payload).includes(name)) ?? null
}

async function latestProposal() {
  return await s.prisma.proposal.findFirstOrThrow({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' } })
}

async function proposeLarsen() {
  const o = await callAgentTool('propose_exercise_create', {
    definition: LARSEN,
    rationale: 'Bench variation with a feet-off-floor setup',
  })
  mustSucceed(o, 'propose Larsen Press')
  const p = await latestProposal()
  s.proposalId = p.id
  return p
}

async function proposeNotesChange() {
  const o = await callAgentTool('propose_exercise_update', {
    id: s.benchId,
    changes: { notes: PROPOSED_NOTES },
    rationale: 'Clarify setup cue',
  })
  mustSucceed(o, 'propose notes change')
  const p = await latestProposal()
  s.proposalId = p.id
  return p
}

function collectArrays(node: unknown, keys: string[], out: unknown[][] = []): unknown[][] {
  if (Array.isArray(node)) node.forEach((n) => collectArrays(n, keys, out))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (keys.includes(k) && Array.isArray(v)) out.push(v)
      collectArrays(v, keys, out)
    }
  }
  return out
}

async function seedWorkout(userId: string, workoutName: string, sets: number) {
  const prog = await createTestProgram(s.prisma, userId, { name: `${workoutName} program` })
  const workout = prog.weeks[0].workouts[0]
  const exercise = workout.exercises[0]
  await s.prisma.workout.update({ where: { id: workout.id }, data: { name: workoutName } })
  await s.prisma.exercise.update({
    where: { id: exercise.id },
    data: { exerciseDefinitionId: s.benchId, name: 'Barbell Bench Press' },
  })
  const completion = await createTestWorkoutCompletion(s.prisma, workout.id, userId, 'completed')
  await createTestLoggedSets(s.prisma, completion.id, exercise.id, userId, sets)
  return completion.id
}

async function wipeAgentTables(prisma: PrismaClient) {
  // The shared reset() does not know the new tables; clear them here.
  for (const t of ['Proposal', 'AgentToken']) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`)
    } catch {
      /* table does not exist until the schema change lands */
    }
  }
}

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given, And }) => {
    Given('Dustin has an agent token named "mac-claude"', async () => {
      // vitest-cucumber runs every step as its own test, so per-scenario state
      // is (re)built here, in the first step of the shared Background.
      const db = await getTestDatabase()
      await db.reset()
      const prisma = db.getPrismaClient()
      await wipeAgentTables(prisma)
      const user = await createTestUser()
      const other = await createTestUser()
      s = {
        prisma,
        userId: user.id,
        otherUserId: other.id,
        token: '',
        tokenId: '',
        benchId: '',
        notify: vi.fn(async () => {
          if (s.notifyFails) throw new Error('bark is down')
        }),
        notifyFails: false,
        tools: [],
        dustinWorkoutName: 'Dustin Push Day',
        otherWorkoutName: 'OTHER-USER-WORKOUT',
      }

      const { createAgentToken } = await agentTokens()
      const created = await createAgentToken(s.prisma, s.userId, 'mac-claude')
      s.token = created.token
      s.tokenId = created.record.id
      expect(s.token).toBeTruthy()
    })
    And('the exercise library contains "Barbell Bench Press"', async () => {
      const def = await createTestExerciseDefinition(s.prisma, {
        name: 'Barbell Bench Press',
        userId: s.userId,
        aliases: ['bench'],
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        secondaryFAUs: ['triceps'],
        instructions: 'Press the bar from the chest.',
        notes: ORIGINAL_NOTES,
      })
      s.benchId = def.id
    })
  })

  Rule('Agents authenticate with a personal access token', ({ RuleScenario }) => {
    RuleScenario('A valid token identifies Dustin', ({ When, Then, And }) => {
      When('the token is resolved', async () => {
        const { resolveAgentToken } = await agentTokens()
        s.resolved = await resolveAgentToken(s.prisma, s.token)
      })
      Then('it resolves to Dustin', () => {
        expect(s.resolved).toEqual({ userId: s.userId, tokenId: s.tokenId })
      })
      And("the token's last-used time is recorded", async () => {
        const row = await s.prisma.agentToken.findUniqueOrThrow({ where: { id: s.tokenId } })
        expect(row.lastUsedAt).toBeInstanceOf(Date)
        // Only a hash is stored, never the plaintext token.
        expect(row.tokenHash).not.toBe(s.token)
        const hex = createHash('sha256').update(s.token).digest('hex')
        const b64 = createHash('sha256').update(s.token).digest('base64')
        expect([hex, b64]).toContain(row.tokenHash)
      })
    })

    RuleScenario('A revoked token is refused', ({ Given, When, Then }) => {
      Given('the "mac-claude" token has been revoked', async () => {
        await s.prisma.agentToken.update({ where: { id: s.tokenId }, data: { revokedAt: new Date() } })
      })
      When('the token is resolved', async () => {
        const { resolveAgentToken } = await agentTokens()
        s.resolved = await resolveAgentToken(s.prisma, s.token)
      })
      Then('it resolves to nobody', async () => {
        expect(s.resolved).toBeNull()
        const row = await s.prisma.agentToken.findUniqueOrThrow({ where: { id: s.tokenId } })
        expect(row.lastUsedAt).toBeNull()
      })
    })

    RuleScenario('The agent tool list has no way to approve its own proposals', ({ When, Then, And }) => {
      When('the agent lists its tools', async () => {
        const { listTools } = await tools()
        const raw = (await listTools()) as unknown
        const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? [])
        s.tools = (list as Array<{ name: string }>).map((t) => t.name)
      })
      Then('it sees "propose_exercise_create" and "propose_exercise_update"', () => {
        expect(s.tools).toContain('propose_exercise_create')
        expect(s.tools).toContain('propose_exercise_update')
      })
      And('it sees no tool that approves, rejects or reverts a proposal', () => {
        expect(s.tools.length).toBeGreaterThan(0)
        const forbidden = s.tools.filter((n) => /approve|reject|revert|decide|apply|undo/i.test(n))
        expect(forbidden).toEqual([])
      })
    })
  })

  Rule("Agents can read Dustin's data", ({ RuleScenario }) => {
    RuleScenario('Searching the exercise library', ({ When, Then }) => {
      When('the agent calls "search_exercises" with query "bench"', async () => {
        s.last = await callAgentTool('search_exercises', { query: 'bench' })
      })
      Then('the results include "Barbell Bench Press"', () => {
        mustSucceed(s.last!, 'search_exercises')
        expect(s.last!.text).toContain('Barbell Bench Press')
        expect(s.last!.text).toContain(s.benchId)
      })
    })

    RuleScenario('Reading recent workout history', ({ Given, And, When, Then }) => {
      Given('Dustin completed a workout with 3 logged sets of "Barbell Bench Press"', async () => {
        s.dustinCompletionId = await seedWorkout(s.userId, s.dustinWorkoutName, 3)
      })
      And('another user completed a workout', async () => {
        s.otherCompletionId = await seedWorkout(s.otherUserId, s.otherWorkoutName, 2)
      })
      When('the agent calls "get_workout_history"', async () => {
        s.last = await callAgentTool('get_workout_history', {})
      })
      Then("it returns Dustin's workout with its 3 logged sets", () => {
        mustSucceed(s.last!, 'get_workout_history')
        expect(s.last!.text).toContain(s.dustinWorkoutName)
        const setArrays = collectArrays(s.last!.value, ['loggedSets', 'sets'])
        const total = setArrays.reduce((n, a) => n + a.length, 0)
        expect(total).toBe(3)
      })
      And("it does not return the other user's workout", () => {
        expect(s.last!.text).not.toContain(s.otherWorkoutName)
        expect(s.last!.text).not.toContain(s.otherCompletionId!)
        expect(s.last!.text).not.toContain(s.otherUserId)
      })
    })
  })

  Rule('Proposals change nothing until approved', ({ RuleScenario }) => {
    RuleScenario('Proposing a new exercise', ({ When, Then, And }) => {
      When('the agent proposes creating "Larsen Press" with a rationale', async () => {
        s.last = await callAgentTool('propose_exercise_create', {
          definition: LARSEN,
          rationale: 'Bench variation with a feet-off-floor setup',
        })
      })
      Then('a pending proposal exists for "Larsen Press"', async () => {
        mustSucceed(s.last!, 'propose_exercise_create')
        const p = await proposalFor('Larsen Press')
        expect(p).not.toBeNull()
        expect(p!.status).toBe('pending')
        expect(p!.kind).toBe('exercise_definition.create')
        expect(p!.userId).toBe(s.userId)
        expect(p!.agentTokenId).toBe(s.tokenId)
        expect(p!.rationale).toContain('feet-off-floor')
        expect(p!.decidedAt).toBeNull()
        s.proposalId = p!.id
      })
      And('the exercise library does not contain "Larsen Press"', async () => {
        expect(await larsen()).toBeNull()
      })
      And('Dustin is notified with a link to the proposal', () => {
        expect(s.notify).toHaveBeenCalledTimes(1)
        const payload = s.notify.mock.calls[0][0] as Record<string, unknown>
        expect(Object.keys(payload).sort()).toEqual(['body', 'proposalId', 'title', 'url'])
        expect(payload.proposalId).toBe(s.proposalId)
        expect(typeof payload.title).toBe('string')
        expect(typeof payload.body).toBe('string')
        expect(String(payload.url)).toMatch(new RegExp(`/admin/proposals/${s.proposalId}$`))
      })
    })

    RuleScenario('An invalid proposal is refused', ({ When, Then, And }) => {
      When('the agent proposes creating an exercise with an unknown muscle group', async () => {
        s.last = await callAgentTool('propose_exercise_create', {
          definition: { name: 'Mystery Lift', equipment: ['barbell'], primaryFAUs: ['not-a-muscle'] },
          rationale: 'testing validation',
        })
      })
      Then('the tool returns a validation error naming the field', () => {
        const payload = toolPayload(s.last!)
        expect(typeof payload.error).toBe('string')
        expect(payload.field).toBe('primaryFAUs')
      })
      And('no proposal is created', async () => {
        expect(await s.prisma.proposal.count()).toBe(0)
        expect(s.notify).not.toHaveBeenCalled()
      })
    })

    RuleScenario('A duplicate exercise is refused', ({ When, Then, And }) => {
      When('the agent proposes creating "Barbell Bench Press"', async () => {
        s.last = await callAgentTool('propose_exercise_create', {
          definition: { name: 'Barbell Bench Press', equipment: ['barbell'], primaryFAUs: ['chest'] },
          rationale: 'duplicate attempt',
        })
      })
      Then('the tool returns an error that points to the existing exercise', () => {
        const payload = toolPayload(s.last!)
        expect(typeof payload.error).toBe('string')
        expect(payload.existingId).toBe(s.benchId)
      })
      And('no proposal is created', async () => {
        expect(await s.prisma.proposal.count()).toBe(0)
      })
    })

    RuleScenario('A notification failure does not block the proposal', ({ Given, When, Then }) => {
      Given('notifications are failing', () => {
        s.notifyFails = true
      })
      When('the agent proposes creating "Larsen Press" with a rationale', async () => {
        s.last = await callAgentTool('propose_exercise_create', {
          definition: LARSEN,
          rationale: 'Bench variation with a feet-off-floor setup',
        })
      })
      Then('a pending proposal exists for "Larsen Press"', async () => {
        expect(s.notify).toHaveBeenCalled() // it was attempted and threw
        expect(s.last!.thrown, `tool must not throw: ${s.last!.text}`).toBe(false)
        mustSucceed(s.last!, 'propose_exercise_create')
        const p = await proposalFor('Larsen Press')
        expect(p).not.toBeNull()
        expect(p!.status).toBe('pending')
      })
    })
  })

  Rule('Dustin decides', ({ RuleScenario }) => {
    RuleScenario('Approving a new exercise', ({ Given, When, Then, And }) => {
      Given('a pending proposal to create "Larsen Press"', async () => {
        await proposeLarsen()
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the exercise library contains "Larsen Press"', async () => {
        mustSucceed(s.last!, 'approve')
        const def = await larsen()
        expect(def).not.toBeNull()
        expect(def!.userId).toBe(s.userId)
        expect(def!.equipment).toEqual(['barbell'])
        expect(def!.primaryFAUs).toEqual(['chest'])
      })
      And('the proposal is applied', async () => {
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('applied')
        expect(p.decidedAt).toBeInstanceOf(Date)
        expect(p.inverse).not.toBeNull()
      })
    })

    RuleScenario('Approving an update changes only the proposed fields', ({ Given, When, Then, And }) => {
      Given('a pending proposal to change the notes of "Barbell Bench Press"', async () => {
        s.benchBefore = { ...(await bench()) }
        await proposeNotesChange()
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the notes of "Barbell Bench Press" are updated', async () => {
        mustSucceed(s.last!, 'approve')
        expect((await bench()).notes).toBe(PROPOSED_NOTES)
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('applied')
      })
      And('its other fields are unchanged', async () => {
        const now = (await bench()) as Record<string, unknown>
        const before = s.benchBefore!
        for (const key of Object.keys(before)) {
          if (key === 'notes' || key === 'updatedAt') continue
          expect(now[key], `field ${key} changed`).toEqual(before[key])
        }
      })
    })

    RuleScenario('An update that went stale is not applied', ({ Given, And, When, Then }) => {
      Given('a pending proposal to change the notes of "Barbell Bench Press"', async () => {
        await proposeNotesChange()
      })
      And('"Barbell Bench Press" was edited after the proposal was made', async () => {
        await new Promise((r) => setTimeout(r, 25))
        await s.prisma.exerciseDefinition.update({ where: { id: s.benchId }, data: { notes: 'Later edit' } })
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the proposal is marked as a conflict', async () => {
        expectRefused(s.last!, 'conflict')
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('conflict')
      })
      And('"Barbell Bench Press" keeps the later edit', async () => {
        expect((await bench()).notes).toBe('Later edit')
      })
    })

    RuleScenario('Rejecting a proposal', ({ Given, When, Then, And }) => {
      Given('a pending proposal to create "Larsen Press"', async () => {
        await proposeLarsen()
      })
      When('Dustin rejects it', async () => {
        s.last = await decide('rejectProposal', s.proposalId!)
      })
      Then('the proposal is rejected', async () => {
        mustSucceed(s.last!, 'reject')
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('rejected')
        expect(p.decidedAt).toBeInstanceOf(Date)
      })
      And('the exercise library does not contain "Larsen Press"', async () => {
        expect(await larsen()).toBeNull()
      })
    })

    RuleScenario('A proposal is applied only once', ({ Given, And, When, Then }) => {
      Given('a pending proposal to create "Larsen Press"', async () => {
        await proposeLarsen()
      })
      And('Dustin has approved it', async () => {
        mustSucceed(await decide('approveProposal', s.proposalId!), 'first approve')
      })
      When('Dustin approves it again', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('it is refused because the proposal is not pending', async () => {
        expectRefused(s.last!, 'not_pending')
        expect(refusal(s.last!).error).toMatch(/pending/i)
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('applied')
        expect(await s.prisma.exerciseDefinition.count({ where: { normalizedName: 'larsen press' } })).toBe(1)
      })
    })
  })

  Rule('Approved changes can be undone', ({ RuleScenario }) => {
    RuleScenario('Reverting an applied update', ({ Given, When, Then, And }) => {
      Given('an applied proposal changed the notes of "Barbell Bench Press"', async () => {
        await proposeNotesChange()
        mustSucceed(await decide('approveProposal', s.proposalId!), 'approve')
        expect((await bench()).notes).toBe(PROPOSED_NOTES)
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('"Barbell Bench Press" has its original notes', async () => {
        mustSucceed(s.last!, 'revert')
        expect((await bench()).notes).toBe(ORIGINAL_NOTES)
      })
      And('the proposal is reverted', async () => {
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('reverted')
      })
    })

    RuleScenario('Reverting an update is refused when the exercise changed afterwards', ({ Given, And, When, Then }) => {
      Given('an applied proposal changed the notes of "Barbell Bench Press"', async () => {
        await proposeNotesChange()
        mustSucceed(await decide('approveProposal', s.proposalId!), 'approve')
        expect((await bench()).notes).toBe(PROPOSED_NOTES)
      })
      And('"Barbell Bench Press" was edited after the proposal was applied', async () => {
        await new Promise((r) => setTimeout(r, 25))
        await s.prisma.exerciseDefinition.update({ where: { id: s.benchId }, data: { notes: 'Later edit' } })
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('it is refused because the exercise changed since it was applied', () => {
        expectRefused(s.last!, 'conflict')
      })
      And('"Barbell Bench Press" keeps the later edit', async () => {
        expect((await bench()).notes).toBe('Later edit')
      })
      And('the proposal is still applied', async () => {
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('applied')
      })
    })

    RuleScenario('Reverting an unused new exercise removes it', ({ Given, When, Then }) => {
      Given('an applied proposal created "Larsen Press"', async () => {
        await proposeLarsen()
        mustSucceed(await decide('approveProposal', s.proposalId!), 'approve')
        expect(await larsen()).not.toBeNull()
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('the exercise library does not contain "Larsen Press"', async () => {
        mustSucceed(s.last!, 'revert')
        expect(await larsen()).toBeNull()
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('reverted')
      })
    })

    RuleScenario('Reverting a new exercise already used in a workout is refused', ({ Given, And, When, Then }) => {
      Given('an applied proposal created "Larsen Press"', async () => {
        await proposeLarsen()
        mustSucceed(await decide('approveProposal', s.proposalId!), 'approve')
      })
      And('"Larsen Press" is used in one of Dustin\'s workouts', async () => {
        const def = await larsen()
        expect(def).not.toBeNull()
        await s.prisma.exercise.create({
          data: { name: 'Larsen Press', exerciseDefinitionId: def!.id, order: 1, userId: s.userId },
        })
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('it is refused because the exercise is in use', () => {
        expectRefused(s.last!, 'in_use')
      })
      And('the exercise library still contains "Larsen Press"', async () => {
        expect(await larsen()).not.toBeNull()
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('applied')
      })
    })
  })
})
