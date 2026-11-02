/**
 * Step definitions for features/agent-tools/balance-targets-source.feature.
 *
 * One source of truth for muscle-balance targets: UserMuscleBalanceSettings.targets.
 * The old copy, UserTrainingProfile.ratioTargets, is no longer read or written.
 * The two staleness scenarios ride along in the same PR.
 *
 * Real test DB. "Settings" edits go through updateMuscleBalanceSettings, the
 * helper the Settings route calls. Approvals go through the MCP tool and the
 * proposals service, as the balance-proposals steps do.
 *
 * Modules under test are loaded lazily inside steps so a missing export fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so state is created once
 * per scenario in the first Background step. Never reset it in afterEach.
 *
 * Sessions are seeded "N days ago" plus one hour, so the age is N whole days
 * whatever time the suite runs.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { expect, vi } from 'vitest'
import { ALL_FAUS } from '@/lib/fau-volume'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

// getAnchorStaleness reads through the shared client.
vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})

const feature = await loadFeature('features/agent-tools/balance-targets-source.feature')

type Targets = Record<string, number>
type Json = Record<string, unknown>
type Def = { id: string; name: string }

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  notify: ReturnType<typeof vi.fn>
  chest?: Def
  lats?: Def
  /** The profile's old copy as the Background wrote it. */
  staleCopy: Targets
  // scenario scratch
  payloadTargets?: Targets
  aggregates?: Awaited<ReturnType<typeof computeAggs>>
  settingsRowsAfterReads?: number
  created?: Array<{ label: string; column: unknown }>
  columnAfter?: unknown
  staleness?: Array<{ pattern: string; lastLoggedDaysAgo: number | null }>
}

let s = {} as State

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const ago = (days: number) => new Date(Date.now() - days * DAY - HOUR)

const REQUEST = {
  time_budget_minutes: 45,
  intensity_vibe: 'solid',
  deprioritize_freetext: null,
  prioritize_freetext: null,
  equipment_override: null,
} as const

const RATIONALE = 'Your hamstrings have been thin for six weeks'

const load = (spec: string) => import(/* @vite-ignore */ spec)
const balance = async () => (await load('@/lib/muscle-balance')) as typeof import('@/lib/muscle-balance')
const profileLib = async () => (await load('@/lib/user-training-profile')) as typeof import('@/lib/user-training-profile')
const builder = async () => (await load('@/lib/suggest/training-state-builder')) as typeof import('@/lib/suggest/training-state-builder')
const recompute = async () => (await load('@/lib/aggregates/recompute')) as typeof import('@/lib/aggregates/recompute')
const staleness = async () => (await load('@/lib/recommendations/anchor-staleness')) as typeof import('@/lib/recommendations/anchor-staleness')
const tools = async () => (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
const service = async () => (await load('@/lib/proposals/service')) as typeof import('@/lib/proposals/service')
const agentTokens = async () => (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')

const allOnes = (): Targets => Object.fromEntries(ALL_FAUS.map((f) => [f, 1]))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Dustin edits one target in Settings (the route's helper; the rest stay put). */
async function settingsSet(fau: string, value: number, userId = s.userId) {
  const { updateMuscleBalanceSettings, getOrCreateMuscleBalanceSettings } = await balance()
  const current = await getOrCreateMuscleBalanceSettings(s.prisma, userId)
  await updateMuscleBalanceSettings(s.prisma, userId, { targets: { ...current.targets, [fau]: value } })
}

async function settingsRowCount(userId = s.userId) {
  return s.prisma.userMuscleBalanceSettings.count({ where: { userId } })
}

async function storedColumn(userId: string): Promise<unknown> {
  return (await s.prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId } })).ratioTargets
}

async function plannerTargets(): Promise<Targets> {
  const { buildTrainingStatePayload } = await builder()
  // The payload contract wants at least one candidate exercise.
  if ((await s.prisma.exerciseDefinition.count()) === 0) {
    await createTestExerciseDefinition(s.prisma, { name: 'Goblet Squat', primaryFAUs: ['quads'] })
  }
  const { payload } = await buildTrainingStatePayload(s.prisma, s.userId, REQUEST as never, new Date())
  return payload.durable_profile.ratio_targets as Targets
}

async function computeAggs() {
  const { computeUserAggregates } = await recompute()
  return computeUserAggregates(s.prisma, s.userId, new Date())
}

async function seedFauDefs() {
  s.chest = await createTestExerciseDefinition(s.prisma, { name: 'Bench Press', primaryFAUs: ['chest'] })
  s.lats = await createTestExerciseDefinition(s.prisma, { name: 'Lat Pulldown', primaryFAUs: ['lats'] })
}

/** A completed session with `sets` working sets of `def`, `days` ago. */
async function logSession(
  def: Def,
  days: number,
  o: { sets?: number; archived?: boolean; userId?: string } = {}
) {
  const userId = o.userId ?? s.userId
  const date = ago(days)
  const completion = await s.prisma.workoutCompletion.create({
    data: { userId, status: 'completed', completedAt: date, isArchived: o.archived ?? false, isAdHoc: true },
  })
  const exercise = await s.prisma.exercise.create({
    data: { name: def.name, exerciseDefinitionId: def.id, order: 1, userId, workoutCompletionId: completion.id, isOneOff: true },
  })
  await s.prisma.loggedSet.createMany({
    data: Array.from({ length: o.sets ?? 1 }, (_, i) => ({
      setNumber: i + 1,
      reps: 5,
      weight: 100,
      weightUnit: 'lbs',
      isWarmup: false,
      exerciseId: exercise.id,
      completionId: completion.id,
      userId,
      createdAt: date,
    })),
  })
}

/** Enough history that both FAUs are "present" for the target shares. */
async function seedBalanceHistory() {
  await seedFauDefs()
  await logSession(s.chest!, 2, { sets: 5 })
  await logSession(s.chest!, 5, { sets: 5 })
  await logSession(s.lats!, 9, { sets: 5 })
}

const shareOf = (aggs: { perFau: Array<{ fau: string; target_share: number }> }, fau: string) =>
  aggs.perFau.find((f) => f.fau === fau)?.target_share

async function tokenFor(userId: string): Promise<string> {
  const { createAgentToken } = await agentTokens()
  return (await createAgentToken(s.prisma, userId, 'coach')).record.id
}

/** Propose through the MCP tool as `userId`, then approve. Returns the approval result. */
async function proposeAndApprove(
  tool: 'propose_target_update' | 'propose_anchor_update',
  changes: Json,
  userId = s.userId,
  tokenId = s.tokenId
) {
  const { callTool } = await tools()
  const ctx = { userId, tokenId, role: 'admin', notify: s.notify }
  const raw = (await callTool(s.prisma, ctx as never, tool, { changes, rationale: RATIONALE } as never)) as {
    isError?: boolean
    content?: Array<{ text?: string }>
  }
  expect(raw.isError, `${tool} should succeed: ${JSON.stringify(raw)}`).not.toBe(true)
  const proposal = await s.prisma.proposal.findFirstOrThrow({ where: { userId }, orderBy: { createdAt: 'desc' } })
  const svc = await service()
  const result = (await svc.approveProposal(s.prisma, proposal.id, userId)) as { ok?: boolean }
  expect(result.ok, `approve should be ok: ${JSON.stringify(result)}`).toBe(true)
  return proposal.id
}

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a user with a training profile created when targets were all 1.0', async () => {
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
        notify: vi.fn(async () => {}),
        staleCopy: allOnes(),
      } as State
      s.tokenId = await tokenFor(s.userId)
      await prisma.userTrainingProfile.create({ data: { userId: s.userId, ratioTargets: s.staleCopy } })
    })
  })

  Scenario('A Settings edit reaches the workout planner', ({ When, Then }) => {
    When('the user sets quads to 1.4 in Settings', async () => {
      await settingsSet('quads', 1.4)
    })
    Then("the suggest-workout payload's ratio_targets has quads 1.4", async () => {
      const targets = await plannerTargets()
      expect(targets.quads).toBeCloseTo(1.4, 5)
      // The untouched targets come through as they are.
      expect(targets.chest).toBe(1)
      expect(Object.keys(targets).sort()).toEqual([...ALL_FAUS].sort())
    })
  })

  Scenario("A Settings edit reaches the aggregates' target shares", ({ When, Then }) => {
    When('the user sets chest to 2.0 in Settings', async () => {
      await seedBalanceHistory()
      await settingsSet('chest', 2)
    })
    Then('computed aggregates use chest weight 2.0 for its target share', async () => {
      // Chest 2.0 against lats 1.0 over the two FAUs trained: 2/3 and 1/3.
      const aggs = await computeAggs()
      expect(shareOf(aggs, 'chest')).toBeCloseTo(2 / 3, 4)
      expect(shareOf(aggs, 'lats')).toBeCloseTo(1 / 3, 4)

      // The stored row the recompute job writes agrees.
      const { recomputeUserAggregates } = await recompute()
      await recomputeUserAggregates(s.prisma, s.userId, new Date())
      const row = await s.prisma.userTrainingAggregates.findUniqueOrThrow({ where: { userId: s.userId } })
      const stored = row.perFau as Array<{ fau: string; target_share: number }>
      expect(shareOf({ perFau: stored }, 'chest')).toBeCloseTo(2 / 3, 4)
    })
  })

  Scenario('An approved agent proposal reaches the planner', ({ When, Then }) => {
    When("an agent's balance_targets.update proposal for hamstrings 1.2 is approved", async () => {
      await proposeAndApprove('propose_target_update', { hamstrings: 1.2 })
    })
    Then("the suggest-workout payload's ratio_targets has hamstrings 1.2", async () => {
      const targets = await plannerTargets()
      expect(targets.hamstrings).toBeCloseTo(1.2, 5)
      expect(targets.quads).toBe(1)
    })
  })

  Scenario('The profile read shows the Settings targets', ({ When, Then }) => {
    When('the user sets calves to 0.5 in Settings', async () => {
      await settingsSet('calves', 0.5)
    })
    Then('reading the training profile returns ratioTargets with calves 0.5', async () => {
      const { getOrCreateUserTrainingProfile, updateUserTrainingProfile } = await profileLib()
      const read = await getOrCreateUserTrainingProfile(s.prisma, s.userId)
      expect(read.ratioTargets.calves).toBe(0.5)
      expect(read.ratioTargets.chest).toBe(1)

      // A profile update hands back the same view.
      const updated = await updateUserTrainingProfile(s.prisma, s.userId, { goalSentences: ['Bigger legs'] })
      expect(updated.ratioTargets.calves).toBe(0.5)
    })
  })

  Scenario('No settings row means the default targets', ({ Given, Then, And }) => {
    Given('the user has no muscle-balance settings row', async () => {
      // Make the old copy differ from the defaults, so reading it would show.
      await s.prisma.userTrainingProfile.update({
        where: { userId: s.userId },
        data: { ratioTargets: { ...allOnes(), chest: 3, calves: 0.2 } },
      })
      await seedBalanceHistory()
      expect(await settingsRowCount()).toBe(0)
    })
    Then('the planner and the aggregates use the default targets', async () => {
      const targets = await plannerTargets()
      expect(targets).toEqual(allOnes())

      const aggs = await computeAggs()
      expect(shareOf(aggs, 'chest')).toBeCloseTo(0.5, 4)
      expect(shareOf(aggs, 'lats')).toBeCloseTo(0.5, 4)

      const { getOrCreateUserTrainingProfile } = await profileLib()
      expect((await getOrCreateUserTrainingProfile(s.prisma, s.userId)).ratioTargets).toEqual(allOnes())
    })
    And('reading targets does not create a settings row', async () => {
      // The reads above ran on this user; none of them may have written a row.
      expect(await settingsRowCount()).toBe(0)
    })
  })

  Scenario('Nothing writes the old copy', ({ When, Then, And }) => {
    When(
      'a profile is created, the profile is updated with ratioTargets, or a targets proposal is approved',
      async () => {
        const { getOrCreateUserTrainingProfile, updateUserTrainingProfile } = await profileLib()
        s.created = []

        // Created via the profile read, for a user whose Settings differ from the defaults ...
        await settingsSet('quads', 1.5, s.otherUserId)
        await getOrCreateUserTrainingProfile(s.prisma, s.otherUserId)
        s.created.push({ label: 'read, settings quads 1.5', column: await storedColumn(s.otherUserId) })

        // ... and for one with no settings at all (the control).
        const plain = await createTestUser()
        await getOrCreateUserTrainingProfile(s.prisma, plain.id)
        s.created.push({ label: 'read, no settings', column: await storedColumn(plain.id) })

        // Created by approving an anchors proposal, which makes a missing profile.
        const anchorUser = await createTestUser()
        await settingsSet('quads', 1.5, anchorUser.id)
        const def = await createTestExerciseDefinition(s.prisma, { name: 'Romanian Deadlift', primaryFAUs: ['hamstrings'] })
        await proposeAndApprove('propose_anchor_update', { hinge: [def.id] }, anchorUser.id, await tokenFor(anchorUser.id))
        s.created.push({ label: 'anchors approve, settings quads 1.5', column: await storedColumn(anchorUser.id) })

        // The profile that already exists: updated with ratioTargets, then a targets proposal.
        await updateUserTrainingProfile(s.prisma, s.userId, { ratioTargets: { chest: 1.9 } })
        await proposeAndApprove('propose_target_update', { quads: 0.8 })
        s.columnAfter = await storedColumn(s.userId)
      }
    )
    Then('UserTrainingProfile.ratioTargets is not changed', async () => {
      // The Background's copy is exactly as it was after the update and the approval.
      expect(s.columnAfter).toEqual(s.staleCopy)

      // A new profile does not take the Settings targets, and does not depend on them.
      const [fromRead, control, fromAnchors] = s.created!
      for (const made of s.created!) {
        const col = made.column as Targets | null
        expect(col?.quads, `${made.label} must not carry the Settings value`).not.toBe(1.5)
      }
      expect(fromRead.column, 'read with settings vs without').toEqual(control.column)
      expect(fromAnchors.column, 'anchors approve vs plain read').toEqual(control.column)
    })
    And('a profile update with ratioTargets updates the settings targets instead', async () => {
      const row = await s.prisma.userMuscleBalanceSettings.findUniqueOrThrow({ where: { userId: s.userId } })
      const targets = row.targets as Targets
      expect(targets.chest).toBe(1.9)
      // The proposal then moved quads; the earlier edit is still there.
      expect(targets.quads).toBe(0.8)
      expect(targets.lats).toBe(1)
    })
  })

  Scenario('Anchor staleness ignores archived workouts', ({ Given, And, Then }) => {
    let hingeDef: Def
    let squatDef: Def
    Given('an anchor exercise last logged in an archived workout 3 days ago', async () => {
      hingeDef = await createTestExerciseDefinition(s.prisma, { name: 'Romanian Deadlift', primaryFAUs: ['hamstrings'] })
      squatDef = await createTestExerciseDefinition(s.prisma, { name: 'Back Squat', primaryFAUs: ['quads'] })
      await logSession(hingeDef, 3, { archived: true })
      // A second anchor whose only log is archived.
      await logSession(squatDef, 4, { archived: true })
    })
    And('logged in a non-archived workout 20 days ago', async () => {
      await logSession(hingeDef, 20)
    })
    Then('its staleness says 20 days', async () => {
      const { getAnchorStaleness } = await staleness()
      const rows = await getAnchorStaleness(s.userId, { hinge: [hingeDef.id], squat: [squatDef.id] })
      const byPattern = new Map(rows.map((r) => [r.pattern, r.lastLoggedDaysAgo]))
      expect(byPattern.get('hinge')).toBe(20)
      // Only archived logs reads as never logged.
      expect(byPattern.get('squat')).toBeNull()
    })
  })

  Scenario('Anchor staleness looks past the last 50 workouts', ({ Given, Then }) => {
    let oldAnchor: Def
    let busyAnchor: Def
    Given('an anchor exercise last logged 60 workouts ago', async () => {
      oldAnchor = await createTestExerciseDefinition(s.prisma, { name: 'Romanian Deadlift', primaryFAUs: ['hamstrings'] })
      busyAnchor = await createTestExerciseDefinition(s.prisma, { name: 'Back Squat', primaryFAUs: ['quads'] })
      // 59 newer workouts of the other anchor, so the old one is the 60th.
      for (let day = 1; day <= 59; day++) await logSession(busyAnchor, day)
      await logSession(oldAnchor, 60)
    })
    Then('its staleness uses that date, not "never logged"', async () => {
      const { getAnchorStaleness } = await staleness()
      const rows = await getAnchorStaleness(s.userId, { hinge: [oldAnchor.id], squat: [busyAnchor.id] })
      const byPattern = new Map(rows.map((r) => [r.pattern, r.lastLoggedDaysAgo]))
      expect(byPattern.get('hinge')).toBe(60)
      expect(byPattern.get('squat')).toBe(1)
    })
  })
})
