/**
 * Step definitions for features/agent-tools/feedback-to-proposals.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md ("Feedback" and
 * "Return shapes").
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * Proposal.feedbackId is read with raw SQL so that the missing column (before
 * item 008) fails the assertion instead of failing to type-check.
 *
 * vitest-cucumber runs every step as its own test, so mocks are created once
 * per scenario in the first Background step. Never reset them in afterEach.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const feature = await loadFeature('features/agent-tools/feedback-to-proposals.feature')

type Outcome = { failed: boolean; value: unknown; text: string; thrown: boolean; raw?: unknown }

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  benchId: string
  feedbackId: string
  otherFeedbackId?: string
  notify: ReturnType<typeof vi.fn>
  last?: Outcome
  unknownIdResult?: Outcome
  tools: string[]
  proposalId?: string
}

let s = {} as State

const NEW_MESSAGE = 'Bench press is missing the bp alias'
const OLD_MESSAGE = 'Old timer bug'
const OLD_OTHER_CATEGORY_MESSAGE = 'Old feature idea'
const OTHERS_MESSAGE = "Someone else's idea"
const USER_AGENT_SECRET = 'UA-SECRET-Mozilla-5.0'
const EXISTING_NOTE = 'Existing admin note'

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

async function callAgentTool(name: string, args: Record<string, unknown>): Promise<Outcome> {
  const { callTool } = await tools()
  return attempt(() => callTool(s.prisma, ctx() as never, name, args as never))
}

function mustSucceed(o: Outcome, what: string) {
  expect(o.failed, `${what} should succeed but got: ${o.text}`).toBe(false)
}

function toolPayload(o: Outcome): Record<string, unknown> {
  expect((o.raw as { isError?: boolean })?.isError, `tool should set isError: ${o.text}`).toBe(true)
  return o.value as Record<string, unknown>
}

function expectOk(o: Outcome, what: string) {
  expect((o.value as { ok?: boolean })?.ok, `${what} should be ok: ${o.text}`).toBe(true)
}

type Decision = 'approveProposal' | 'rejectProposal'
async function decide(fn: Decision, proposalId: string): Promise<Outcome> {
  const svc = (await service()) as unknown as Record<Decision, (...a: unknown[]) => Promise<unknown>>
  const raw = (await svc[fn](s.prisma, proposalId, s.userId)) as { ok?: boolean }
  return { failed: raw?.ok !== true, value: raw, text: textOf(raw), thrown: false, raw }
}

/** Every object anywhere in the tree that has the given string `id`. */
function findById(node: unknown, id: string, out: Array<Record<string, unknown>> = []) {
  if (Array.isArray(node)) node.forEach((n) => findById(n, id, out))
  else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>
    if (o.id === id) out.push(o)
    for (const v of Object.values(o)) findById(v, id, out)
  }
  return out
}

async function seedFeedback(userId: string, message: string, extra: Record<string, unknown> = {}) {
  return await s.prisma.feedback.create({
    data: {
      userId,
      category: 'bug',
      message,
      pageUrl: '/dashboard',
      userAgent: USER_AGENT_SECRET,
      status: 'new',
      ...extra,
    },
  })
}

async function feedbackRow(id = s.feedbackId) {
  return await s.prisma.feedback.findUniqueOrThrow({ where: { id } })
}

async function proposalFeedbackId(proposalId: string): Promise<string | null> {
  const rows = await s.prisma.$queryRaw<Array<{ feedbackId: string | null }>>`
    SELECT "feedbackId" FROM "Proposal" WHERE id = ${proposalId}`
  return rows[0]?.feedbackId ?? null
}

async function latestProposal() {
  return await s.prisma.proposal.findFirstOrThrow({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' } })
}

function proposeBpAlias(feedbackId: string | undefined) {
  return callAgentTool('propose_exercise_update', {
    id: s.benchId,
    changes: { aliases: ['bench', 'bp'] },
    rationale: 'Dustin asked for the bp alias',
    ...(feedbackId ? { feedbackId } : {}),
  })
}


// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given, And }) => {
    Given('Dustin has an agent token named "mac-claude"', async () => {
      const db = await getTestDatabase()
      await db.reset()
      const prisma = db.getPrismaClient()
      const user = await createTestUser()
      const other = await createTestUser()
      s = {
        prisma,
        userId: user.id,
        otherUserId: other.id,
        tokenId: '',
        benchId: '',
        feedbackId: '',
        notify: vi.fn(async () => {}),
        tools: [],
      }
      const { createAgentToken } = await agentTokens()
      const created = await createAgentToken(s.prisma, s.userId, 'mac-claude')
      s.tokenId = created.record.id
    })
    And('the exercise library contains "Barbell Bench Press"', async () => {
      const def = await createTestExerciseDefinition(s.prisma, {
        name: 'Barbell Bench Press',
        userId: s.userId,
        aliases: ['bench'],
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        secondaryFAUs: ['triceps'],
      })
      s.benchId = def.id
    })
    And('Dustin left new bug feedback "Bench press is missing the bp alias"', async () => {
      s.feedbackId = (await seedFeedback(s.userId, NEW_MESSAGE)).id
    })
  })

  Rule('Agents can read Dustin\'s feedback', ({ RuleScenario }) => {
    RuleScenario('Listing new feedback', ({ Given, When, Then, And }) => {
      Given('Dustin also has resolved feedback "Old timer bug"', async () => {
        await seedFeedback(s.userId, OLD_MESSAGE, { status: 'resolved' })
      })
      When('the agent calls "list_feedback"', async () => {
        s.last = await callAgentTool('list_feedback', {})
      })
      Then('it returns "Bench press is missing the bp alias"', () => {
        mustSucceed(s.last!, 'list_feedback')
        expect(s.last!.text).toContain(NEW_MESSAGE)
        const items = findById(s.last!.value, s.feedbackId)
        expect(items).toHaveLength(1)
        const item = items[0]
        for (const key of ['id', 'category', 'message', 'pageUrl', 'rating', 'refinements', 'status', 'adminNote', 'createdAt']) {
          expect(item, `item should have ${key}`).toHaveProperty(key)
        }
        expect(item.category).toBe('bug')
        expect(item.status).toBe('new')
        // No userAgent, in any form.
        expect(item).not.toHaveProperty('userAgent')
        expect(s.last!.text).not.toContain(USER_AGENT_SECRET)
      })
      And('it does not return "Old timer bug"', () => {
        expect(s.last!.text).not.toContain(OLD_MESSAGE)
      })
    })

    RuleScenario('Filtering feedback by status and category', ({ Given, When, Then, And }) => {
      Given('Dustin also has resolved feedback "Old timer bug"', async () => {
        await seedFeedback(s.userId, OLD_MESSAGE, { status: 'resolved' })
        // Same status, different category: only the category filter can exclude it.
        await seedFeedback(s.userId, OLD_OTHER_CATEGORY_MESSAGE, { status: 'resolved', category: 'feature' })
      })
      When('the agent calls "list_feedback" for resolved bug feedback', async () => {
        s.last = await callAgentTool('list_feedback', { status: 'resolved', category: 'bug' })
      })
      Then('it returns "Old timer bug"', () => {
        mustSucceed(s.last!, 'list_feedback')
        expect(s.last!.text).toContain(OLD_MESSAGE)
      })
      And('it does not return "Bench press is missing the bp alias"', () => {
        expect(s.last!.text).not.toContain(NEW_MESSAGE)
        expect(s.last!.text).not.toContain(OLD_OTHER_CATEGORY_MESSAGE)
      })
    })

    RuleScenario("Other users' feedback is never returned", ({ Given, When, Then }) => {
      Given('another user left new feedback "Someone else\'s idea"', async () => {
        s.otherFeedbackId = (await seedFeedback(s.otherUserId, OTHERS_MESSAGE)).id
      })
      When('the agent calls "list_feedback"', async () => {
        s.last = await callAgentTool('list_feedback', {})
      })
      Then('it does not return "Someone else\'s idea"', () => {
        mustSucceed(s.last!, 'list_feedback')
        // Dustin's own item proves the call returned real data.
        expect(s.last!.text).toContain(NEW_MESSAGE)
        expect(s.last!.text).not.toContain(OTHERS_MESSAGE)
        expect(s.last!.text).not.toContain(s.otherFeedbackId!)
        expect(s.last!.text).not.toContain(s.otherUserId)
      })
    })

    RuleScenario('Agents have no tool that changes feedback', ({ When, Then, And }) => {
      When('the agent lists its tools', async () => {
        const { listTools } = await tools()
        const raw = (await listTools('admin')) as unknown
        const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? [])
        s.tools = (list as Array<{ name: string }>).map((t) => t.name)
      })
      Then('it sees "list_feedback"', () => {
        expect(s.tools).toContain('list_feedback')
      })
      And('it sees no tool that updates, resolves or deletes feedback', () => {
        expect(s.tools.filter((n) => /feedback/i.test(n))).toEqual(['list_feedback'])
        expect(s.tools.filter((n) => /resolve|dismiss|close|delete|remove/i.test(n))).toEqual([])
      })
    })
  })

  Rule('A proposal can say which feedback it addresses', ({ RuleScenario }) => {
    RuleScenario('Proposing a fix for feedback', ({ When, Then, And }) => {
      When(
        'the agent proposes adding the alias "bp" to "Barbell Bench Press" for that feedback',
        async () => {
          s.last = await proposeBpAlias(s.feedbackId)
        },
      )
      Then('a pending proposal exists that is linked to that feedback', async () => {
        mustSucceed(s.last!, 'propose_exercise_update with feedbackId')
        const p = await latestProposal()
        expect(p.status).toBe('pending')
        expect(p.kind).toBe('exercise_definition.update')
        expect(await proposalFeedbackId(p.id)).toBe(s.feedbackId)
        s.proposalId = p.id
      })
      And('the feedback is still new', async () => {
        const row = await feedbackRow()
        expect(row.status).toBe('new')
        expect(row.adminNote).toBeNull()
      })
    })

    RuleScenario('Linking unknown or someone else\'s feedback is refused', ({ Given, When, Then, And }) => {
      Given('another user left new feedback "Someone else\'s idea"', async () => {
        s.otherFeedbackId = (await seedFeedback(s.otherUserId, OTHERS_MESSAGE)).id
      })
      When('the agent proposes a change linked to "Someone else\'s idea"', async () => {
        s.last = await proposeBpAlias(s.otherFeedbackId)
        // An id that exists for nobody is refused the same way.
        s.unknownIdResult = await proposeBpAlias('feedback-that-does-not-exist')
      })
      Then('the tool returns an error naming the field "feedbackId"', () => {
        const payload = toolPayload(s.last!)
        expect(typeof payload.error).toBe('string')
        expect(payload.field).toBe('feedbackId')
        const unknown = toolPayload(s.unknownIdResult!)
        expect(unknown.field).toBe('feedbackId')
      })
      And('no proposal is created', async () => {
        expect(await s.prisma.proposal.count()).toBe(0)
        expect(s.notify).not.toHaveBeenCalled()
        // The other user's feedback is untouched.
        expect((await feedbackRow(s.otherFeedbackId)).status).toBe('new')
      })
    })

    RuleScenario('Approving a linked proposal resolves the feedback', ({ Given, When, Then, And }) => {
      Given('a pending proposal for that feedback', async () => {
        // A pre-existing note must be kept when the resolution line is appended.
        await s.prisma.feedback.update({ where: { id: s.feedbackId }, data: { adminNote: EXISTING_NOTE } })
        mustSucceed(await proposeBpAlias(s.feedbackId), 'propose with feedbackId')
        s.proposalId = (await latestProposal()).id
        expect(await proposalFeedbackId(s.proposalId)).toBe(s.feedbackId)
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the feedback is resolved', async () => {
        expectOk(s.last!, 'approve')
        expect((await feedbackRow()).status).toBe('resolved')
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('applied')
      })
      And("the feedback's admin note mentions the proposal", async () => {
        const note = (await feedbackRow()).adminNote ?? ''
        expect(note).toContain(`Resolved by agent proposal ${s.proposalId}`)
        expect(note).toContain(EXISTING_NOTE)
      })
    })

    RuleScenario('Rejecting a linked proposal leaves the feedback open', ({ Given, When, Then }) => {
      Given('a pending proposal for that feedback', async () => {
        mustSucceed(await proposeBpAlias(s.feedbackId), 'propose with feedbackId')
        s.proposalId = (await latestProposal()).id
        expect(await proposalFeedbackId(s.proposalId)).toBe(s.feedbackId)
      })
      When('Dustin rejects it', async () => {
        s.last = await decide('rejectProposal', s.proposalId!)
      })
      Then('the feedback is still new', async () => {
        expectOk(s.last!, 'reject')
        const p = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
        expect(p.status).toBe('rejected')
        const row = await feedbackRow()
        expect(row.status).toBe('new')
        expect(row.adminNote).toBeNull()
      })
    })
  })
})
