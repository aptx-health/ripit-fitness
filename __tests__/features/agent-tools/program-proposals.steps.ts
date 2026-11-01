/**
 * Step definitions for features/agent-tools/program-proposals.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md ("Programs" and
 * "Return shapes").
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so mocks are created once
 * per scenario in the first Background step. Never reset them in afterEach.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import {
  createTestExerciseDefinition,
  createTestUser,
} from '@/lib/test/factories'

const feature = await loadFeature('features/agent-tools/program-proposals.feature')

type Outcome = { failed: boolean; value: unknown; text: string; thrown: boolean; raw?: unknown }

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  benchId: string
  squatId: string
  notify: ReturnType<typeof vi.fn>
  last?: Outcome
  second?: Outcome
  proposalId?: string
  programId?: string
  decidedAtBefore?: Date | null
}

let s = {} as State

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
type SetIn = { reps: string; weight?: string; rpe?: number; rir?: number; isWarmup?: boolean }
type ExIn = { exerciseDefinitionId: string; notes?: string; prescribedSets: SetIn[] }
type WorkoutIn = { name: string; exercises: ExIn[] }
type WeekIn = { name?: string; workouts: WorkoutIn[] }
type ProgramIn = { name: string; description?: string; weeks: WeekIn[] }

const BLOCK_NAME = 'Agent Block'
const DEF_NAMES = () => ({ [s.benchId]: 'Barbell Bench Press', [s.squatId]: 'Back Squat' }) as Record<string, string>

/** 2 weeks, 3 workouts, 4 exercises, 6 sets. Optional fields vary on purpose. */
function agentBlock(): ProgramIn {
  return {
    name: BLOCK_NAME,
    description: 'Two-week block from an agent',
    weeks: [
      {
        name: 'Week One',
        workouts: [
          {
            name: 'Push',
            exercises: [
              {
                exerciseDefinitionId: s.benchId,
                notes: 'Pause on chest',
                prescribedSets: [
                  { reps: '5', weight: '100', rpe: 7 },
                  { reps: '5', weight: '105', rpe: 8, rir: 2 },
                  { reps: '10', isWarmup: true },
                ],
              },
            ],
          },
          {
            name: 'Legs',
            exercises: [
              { exerciseDefinitionId: s.squatId, prescribedSets: [{ reps: '3', weight: '140', rpe: 9 }] },
              { exerciseDefinitionId: s.benchId, prescribedSets: [{ reps: '8' }] },
            ],
          },
        ],
      },
      {
        workouts: [{ name: 'Full', exercises: [{ exerciseDefinitionId: s.squatId, prescribedSets: [{ reps: '5' }] }] }],
      },
    ],
  }
}
const BLOCK_COUNTS = { weeks: 2, workouts: 3, exercises: 4, sets: 6 }

/** What the database should hold for a proposal input: numbers come from position. */
function expectedTree(p: ProgramIn) {
  const names = DEF_NAMES()
  return {
    name: p.name,
    description: p.description ?? null,
    weeks: p.weeks.map((w, wi) => ({
      weekNumber: wi + 1,
      name: w.name ?? null,
      workouts: w.workouts.map((wo, di) => ({
        dayNumber: di + 1,
        name: wo.name,
        exercises: wo.exercises.map((e, oi) => ({
          order: oi + 1,
          exerciseDefinitionId: e.exerciseDefinitionId,
          name: names[e.exerciseDefinitionId],
          notes: e.notes ?? null,
          prescribedSets: e.prescribedSets.map((ps, si) => ({
            setNumber: si + 1,
            reps: ps.reps,
            weight: ps.weight ?? null,
            rpe: ps.rpe ?? null,
            rir: ps.rir ?? null,
            isWarmup: ps.isWarmup ?? false,
          })),
        })),
      })),
    })),
  }
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

const proposeProgram = (program: unknown) =>
  callAgentTool('propose_program_create', { program, rationale: 'A block built from Dustin\'s recent training' })

async function latestProposal() {
  return await s.prisma.proposal.findFirstOrThrow({ where: { userId: s.userId }, orderBy: { createdAt: 'desc' } })
}

async function proposalById() {
  return await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId! } })
}

async function programsNamed(name: string, userId = s.userId) {
  return await s.prisma.program.findMany({ where: { userId, name } })
}

async function snapshot(programId: string) {
  const p = await s.prisma.program.findUniqueOrThrow({
    where: { id: programId },
    include: { weeks: { include: { workouts: { include: { exercises: { include: { prescribedSets: true } } } } } } },
  })
  return {
    name: p.name,
    description: p.description,
    weeks: [...p.weeks]
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map((w) => ({
        weekNumber: w.weekNumber,
        name: w.name,
        workouts: [...w.workouts]
          .sort((a, b) => a.dayNumber - b.dayNumber)
          .map((wo) => ({
            dayNumber: wo.dayNumber,
            name: wo.name,
            exercises: [...wo.exercises]
              .sort((a, b) => a.order - b.order)
              .map((e) => ({
                order: e.order,
                exerciseDefinitionId: e.exerciseDefinitionId,
                name: e.name,
                notes: e.notes,
                prescribedSets: [...e.prescribedSets]
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((ps) => ({
                    setNumber: ps.setNumber,
                    reps: ps.reps,
                    weight: ps.weight,
                    rpe: ps.rpe,
                    rir: ps.rir,
                    isWarmup: ps.isWarmup,
                  })),
              })),
          })),
      })),
  }
}

async function rowCounts(programId: string) {
  const where = { workout: { week: { programId } } }
  return {
    weeks: await s.prisma.week.count({ where: { programId } }),
    workouts: await s.prisma.workout.count({ where: { week: { programId } } }),
    exercises: await s.prisma.exercise.count({ where }),
    sets: await s.prisma.prescribedSet.count({ where: { exercise: where } }),
  }
}

/**
 * Seed a program straight into the database, inserting later weeks, days,
 * exercises and sets first so that ordering must come from the numbers.
 */
async function seedProgram(userId: string, name: string, extra: Record<string, unknown> = {}) {
  const program = await s.prisma.program.create({ data: { name, userId, description: `${name} description`, ...extra } })
  const expected = {
    name,
    description: `${name} description`,
    weeks: [] as Array<Record<string, unknown>>,
  }
  const defs = [s.benchId, s.squatId]
  const weekNumbers = [2, 1]
  for (const weekNumber of weekNumbers) {
    const week = await s.prisma.week.create({
      data: { programId: program.id, userId, weekNumber, name: `Week ${weekNumber}` },
    })
    const workoutsExpected: Array<Record<string, unknown>> = []
    for (const dayNumber of [2, 1]) {
      const workout = await s.prisma.workout.create({
        data: { weekId: week.id, userId, dayNumber, name: `W${weekNumber}D${dayNumber}` },
      })
      const exercisesExpected: Array<Record<string, unknown>> = []
      for (const order of [2, 1]) {
        const defId = defs[order - 1]
        const defName = DEF_NAMES()[defId]
        const ex = await s.prisma.exercise.create({
          data: {
            workoutId: workout.id,
            userId,
            exerciseDefinitionId: defId,
            name: defName,
            order,
            notes: `note ${weekNumber}${dayNumber}${order}`,
          },
        })
        const setsExpected: Array<Record<string, unknown>> = []
        for (const setNumber of [3, 2, 1]) {
          const data = {
            exerciseId: ex.id,
            userId,
            setNumber,
            reps: String(setNumber + 4),
            weight: `${setNumber * 10}`,
            rpe: setNumber + 5,
            rir: setNumber,
            isWarmup: setNumber === 1,
          }
          await s.prisma.prescribedSet.create({ data })
          setsExpected.push({
            setNumber,
            reps: data.reps,
            weight: data.weight,
            rpe: data.rpe,
            rir: data.rir,
            isWarmup: data.isWarmup,
          })
        }
        exercisesExpected.push({
          order,
          exerciseDefinitionId: defId,
          name: defName,
          notes: `note ${weekNumber}${dayNumber}${order}`,
          prescribedSets: setsExpected.sort((a, b) => (a.setNumber as number) - (b.setNumber as number)),
        })
      }
      workoutsExpected.push({
        dayNumber,
        name: `W${weekNumber}D${dayNumber}`,
        exercises: exercisesExpected.sort((a, b) => (a.order as number) - (b.order as number)),
      })
    }
    expected.weeks.push({
      weekNumber,
      name: `Week ${weekNumber}`,
      workouts: workoutsExpected.sort((a, b) => (a.dayNumber as number) - (b.dayNumber as number)),
    })
  }
  expected.weeks.sort((a, b) => (a.weekNumber as number) - (b.weekNumber as number))
  return { program, expected }
}

let seeded: { program: { id: string }; expected: Record<string, unknown> } | undefined


async function proposeBlockAndApprove() {
  mustSucceed(await proposeProgram(agentBlock()), 'propose Agent Block')
  s.proposalId = (await latestProposal()).id
  expectOk(await decide('approveProposal', s.proposalId), 'approve Agent Block')
  const created = await programsNamed(BLOCK_NAME)
  expect(created).toHaveLength(1)
  s.programId = created[0].id
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
        squatId: '',
        notify: vi.fn(async () => {}),
      }
      seeded = undefined
      const { createAgentToken } = await agentTokens()
      const created = await createAgentToken(s.prisma, s.userId, 'mac-claude')
      s.tokenId = created.record.id
    })
    And('the exercise library contains "Barbell Bench Press" and "Back Squat"', async () => {
      s.benchId = (
        await createTestExerciseDefinition(s.prisma, { name: 'Barbell Bench Press', userId: s.userId, equipment: ['barbell'] })
      ).id
      s.squatId = (
        await createTestExerciseDefinition(s.prisma, { name: 'Back Squat', userId: s.userId, equipment: ['barbell'] })
      ).id
    })
  })

  Rule('Agents can read a program in full', ({ RuleScenario }) => {
    RuleScenario('Reading one of Dustin\'s programs', ({ Given, When, Then }) => {
      Given('Dustin has a 2-week program "Base Strength"', async () => {
        seeded = await seedProgram(s.userId, 'Base Strength', { isActive: true })
      })
      When('the agent calls "get_program" for "Base Strength"', async () => {
        s.last = await callAgentTool('get_program', { id: seeded!.program.id })
      })
      Then('it returns both weeks with their workouts, exercises and prescribed sets', () => {
        mustSucceed(s.last!, 'get_program')
        const program = (s.last!.value as { program?: Record<string, unknown> }).program
        expect(program, `payload should be { program }: ${s.last!.text}`).toBeDefined()
        expect(program!.id).toBe(seeded!.program.id)
        expect(program!.isActive).toBe(true)
        // Ordered by week, day, order and set number even though rows were inserted backwards.
        expect(program).toMatchObject(seeded!.expected)
        const weeks = program!.weeks as Array<{ workouts: Array<{ exercises: Array<{ prescribedSets: unknown[] }> }> }>
        expect(weeks).toHaveLength(2)
        expect(weeks.flatMap((w) => w.workouts)).toHaveLength(4)
        expect(weeks.flatMap((w) => w.workouts).flatMap((wo) => wo.exercises)).toHaveLength(8)
        expect(
          weeks.flatMap((w) => w.workouts).flatMap((wo) => wo.exercises).flatMap((e) => e.prescribedSets),
        ).toHaveLength(24)
      })
    })

    RuleScenario('Another user\'s program is not found', ({ Given, When, Then }) => {
      Given('another user has a program "Their Plan"', async () => {
        seeded = await seedProgram(s.otherUserId, 'Their Plan')
        // A soft-deleted program of Dustin's must be hidden the same way.
        s.programId = (await seedProgram(s.userId, 'Deleted Plan', { deletedAt: new Date() })).program.id
      })
      When('the agent calls "get_program" for "Their Plan"', async () => {
        s.last = await callAgentTool('get_program', { id: seeded!.program.id })
        s.second = await callAgentTool('get_program', { id: s.programId })
      })
      Then('the tool returns a not-found error', () => {
        const payload = toolPayload(s.last!)
        expect(String(payload.error)).toMatch(/program not found/i)
        expect(s.last!.text).not.toContain('Their Plan')
        const deleted = toolPayload(s.second!)
        expect(String(deleted.error)).toMatch(/program not found/i)
      })
    })
  })

  Rule('Proposing a program changes nothing until approved', ({ RuleScenario }) => {
    RuleScenario('Proposing a valid program', ({ When, Then, And }) => {
      When(
        'the agent proposes a 2-week program "Agent Block" using "Barbell Bench Press" and "Back Squat"',
        async () => {
          s.last = await proposeProgram(agentBlock())
        },
      )
      Then('a pending program proposal exists', async () => {
        mustSucceed(s.last!, 'propose_program_create')
        const p = await latestProposal()
        expect(p.status).toBe('pending')
        expect(p.kind).toBe('program.create')
        expect(p.userId).toBe(s.userId)
        expect(p.agentTokenId).toBe(s.tokenId)
        expect(p.summary).toBe('New program: Agent Block (2 weeks)')
        expect(p.rationale).toContain('recent training')
        expect(p.decidedAt).toBeNull()
        expect(p.targetId).toBeNull()
        s.proposalId = p.id
      })
      And('Dustin has no program named "Agent Block"', async () => {
        expect(await programsNamed(BLOCK_NAME)).toHaveLength(0)
        expect(await s.prisma.program.count()).toBe(0)
        expect(await s.prisma.week.count()).toBe(0)
        expect(await s.prisma.prescribedSet.count()).toBe(0)
      })
      And('Dustin is notified with a link to the proposal', () => {
        expect(s.notify).toHaveBeenCalledTimes(1)
        const payload = s.notify.mock.calls[0][0] as Record<string, unknown>
        expect(Object.keys(payload).sort()).toEqual(['body', 'proposalId', 'title', 'url'])
        expect(payload.proposalId).toBe(s.proposalId)
        expect(String(payload.url)).toMatch(new RegExp(`/admin/proposals/${s.proposalId}$`))
        expect(textOf(payload)).toContain('New program: Agent Block (2 weeks)')
      })
    })

    RuleScenario('A program that uses an unknown exercise is refused', ({ When, Then, And }) => {
      When('the agent proposes a program that uses an exercise id that does not exist', async () => {
        const bad = agentBlock()
        bad.weeks[0].workouts[0].exercises[0].exerciseDefinitionId = 'no-such-definition'
        s.last = await proposeProgram(bad)
        // Another user's private definition is not visible to Dustin either.
        const theirs = await createTestExerciseDefinition(s.prisma, {
          name: 'Their Private Lift',
          userId: s.otherUserId,
          isSystem: false,
        })
        const hidden = agentBlock()
        hidden.weeks[1].workouts[0].exercises[0].exerciseDefinitionId = theirs.id
        s.second = await proposeProgram(hidden)
      })
      Then('the tool returns an error naming the field "exerciseDefinitionId"', () => {
        const payload = toolPayload(s.last!)
        expect(typeof payload.error).toBe('string')
        expect(payload.field).toBe('exerciseDefinitionId')
        expect(toolPayload(s.second!).field).toBe('exerciseDefinitionId')
      })
      And('no proposal is created', async () => {
        expect(await s.prisma.proposal.count()).toBe(0)
        expect(s.notify).not.toHaveBeenCalled()
      })
    })

    RuleScenario('A program with an empty workout is refused', ({ When, Then, And }) => {
      When('the agent proposes a program with a workout that has no exercises', async () => {
        const bad = agentBlock()
        bad.weeks[0].workouts[1].exercises = []
        s.last = await proposeProgram(bad)
        // A program with no weeks fails on `weeks`.
        s.second = await proposeProgram({ ...agentBlock(), weeks: [] })
      })
      Then('the tool returns an error naming the field "exercises"', () => {
        const payload = toolPayload(s.last!)
        expect(typeof payload.error).toBe('string')
        expect(payload.field).toBe('exercises')
        expect(toolPayload(s.second!).field).toBe('weeks')
      })
      And('no proposal is created', async () => {
        expect(await s.prisma.proposal.count()).toBe(0)
        expect(s.notify).not.toHaveBeenCalled()
      })
    })

    RuleScenario('A program with out-of-range effort is refused', ({ When, Then, And }) => {
      When('the agent proposes a program with a set at RPE 11', async () => {
        const bad = agentBlock()
        bad.weeks[0].workouts[0].exercises[0].prescribedSets[0].rpe = 11
        s.last = await proposeProgram(bad)
        // RIR has its own bounds (0-10).
        const badRir = agentBlock()
        badRir.weeks[0].workouts[0].exercises[0].prescribedSets[0].rir = 11
        s.second = await proposeProgram(badRir)
      })
      Then('the tool returns an error naming the field "rpe"', () => {
        const payload = toolPayload(s.last!)
        expect(typeof payload.error).toBe('string')
        expect(payload.field).toBe('rpe')
        expect(toolPayload(s.second!).field).toBe('rir')
      })
      And('no proposal is created', async () => {
        expect(await s.prisma.proposal.count()).toBe(0)
        expect(s.notify).not.toHaveBeenCalled()
      })
    })
  })

  Rule('Approving creates the program, inactive', ({ RuleScenario }) => {
    RuleScenario('Approving a program proposal', ({ Given, When, Then, And }) => {
      Given('a pending proposal for the 2-week program "Agent Block"', async () => {
        mustSucceed(await proposeProgram(agentBlock()), 'propose Agent Block')
        s.proposalId = (await latestProposal()).id
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then(
        'Dustin has a program "Agent Block" with 2 weeks, its workouts, exercises and prescribed sets',
        async () => {
          expectOk(s.last!, 'approve')
          const created = await programsNamed(BLOCK_NAME)
          expect(created).toHaveLength(1)
          s.programId = created[0].id
          expect(await snapshot(s.programId)).toEqual(expectedTree(agentBlock()))
          expect(await rowCounts(s.programId)).toEqual(BLOCK_COUNTS)
          // Every row belongs to Dustin.
          expect(await s.prisma.week.count({ where: { programId: s.programId, userId: s.userId } })).toBe(2)
          expect(await s.prisma.workout.count({ where: { week: { programId: s.programId }, userId: s.userId } })).toBe(3)
          expect(await s.prisma.exercise.count({ where: { workout: { week: { programId: s.programId } }, userId: s.userId } })).toBe(4)
          expect(
            await s.prisma.prescribedSet.count({
              where: { exercise: { workout: { week: { programId: s.programId } } }, userId: s.userId },
            }),
          ).toBe(6)
        },
      )
      And('the program is not active and is marked user-created', async () => {
        const program = await s.prisma.program.findUniqueOrThrow({ where: { id: s.programId! } })
        expect(program.isActive).toBe(false)
        expect(program.isUserCreated).toBe(true)
        expect(program.programType).toBe('strength')
        expect(program.copyStatus).toBe('ready')
        expect(program.userId).toBe(s.userId)
        expect(program.deletedAt).toBeNull()
        expect(program.isArchived).toBe(false)
      })
      And('the proposal is applied', async () => {
        const p = await proposalById()
        expect(p.status).toBe('applied')
        expect(p.decidedAt).toBeInstanceOf(Date)
        expect(p.targetId).toBe(s.programId)
        expect(p.inverse).toBeNull()
        expect(p.error).toBeNull()
      })
    })

    RuleScenario('Approving fails cleanly when an exercise has since disappeared', ({ Given, And, When, Then }) => {
      Given('a pending proposal for the 2-week program "Agent Block"', async () => {
        mustSucceed(await proposeProgram(agentBlock()), 'propose Agent Block')
        s.proposalId = (await latestProposal()).id
      })
      And('"Back Squat" is deleted from the library', async () => {
        await s.prisma.exerciseDefinition.delete({ where: { id: s.squatId } })
      })
      When('Dustin approves it', async () => {
        s.last = await decide('approveProposal', s.proposalId!)
      })
      Then('the result code is "invalid"', () => {
        expectRefused(s.last!, 'invalid')
      })
      And('Dustin has no program named "Agent Block"', async () => {
        expect(await programsNamed(BLOCK_NAME)).toHaveLength(0)
        // The transaction left nothing behind, not even the first week or workout.
        expect(await s.prisma.week.count()).toBe(0)
        expect(await s.prisma.workout.count()).toBe(0)
        expect(await s.prisma.exercise.count()).toBe(0)
        expect(await s.prisma.prescribedSet.count()).toBe(0)
      })
      And('the proposal is still pending', async () => {
        const p = await proposalById()
        expect(p.status).toBe('pending')
        expect(p.decidedAt).toBeNull()
        expect(p.targetId).toBeNull()
        expect(typeof p.error).toBe('string')
        expect((p.error ?? '').length).toBeGreaterThan(0)
      })
    })

    RuleScenario('Rejecting a program proposal', ({ Given, When, Then, And }) => {
      Given('a pending proposal for the 2-week program "Agent Block"', async () => {
        mustSucceed(await proposeProgram(agentBlock()), 'propose Agent Block')
        s.proposalId = (await latestProposal()).id
      })
      When('Dustin rejects it', async () => {
        s.last = await decide('rejectProposal', s.proposalId!)
      })
      Then('the proposal is rejected', async () => {
        expectOk(s.last!, 'reject')
        const p = await proposalById()
        expect(p.status).toBe('rejected')
        expect(p.decidedAt).toBeInstanceOf(Date)
      })
      And('Dustin has no program named "Agent Block"', async () => {
        expect(await programsNamed(BLOCK_NAME)).toHaveLength(0)
        expect(await s.prisma.program.count()).toBe(0)
      })
    })
  })

  Rule('An approved program is managed like any other program', ({ RuleScenario }) => {
    RuleScenario('Reverting a program proposal is refused', ({ Given, When, Then, And }) => {
      Given('Dustin approved the program "Agent Block"', async () => {
        await proposeBlockAndApprove()
        expect(await rowCounts(s.programId!)).toEqual(BLOCK_COUNTS)
        s.decidedAtBefore = (await proposalById()).decidedAt
        expect(s.decidedAtBefore).toBeInstanceOf(Date)
      })
      When('Dustin reverts it', async () => {
        s.last = await decide('revertProposal', s.proposalId!)
      })
      Then('the result code is "invalid"', () => {
        expectRefused(s.last!, 'invalid')
        expect((s.last!.value as { error?: string }).error).toBe(
          "program proposals can't be reverted; delete the program from Programs instead",
        )
      })
      And('Dustin still has the program "Agent Block"', async () => {
        expect(await programsNamed(BLOCK_NAME)).toHaveLength(1)
        expect(await snapshot(s.programId!)).toEqual(expectedTree(agentBlock()))
        expect(await rowCounts(s.programId!)).toEqual(BLOCK_COUNTS)
        // The exercise library is untouched.
        expect(await s.prisma.exerciseDefinition.count({ where: { id: { in: [s.benchId, s.squatId] } } })).toBe(2)
      })
      And('the proposal is still applied', async () => {
        const p = await proposalById()
        expect(p.status).toBe('applied')
        expect(p.decidedAt?.getTime()).toBe(s.decidedAtBefore?.getTime())
        expect(p.targetId).toBe(s.programId)
        expect(p.inverse).toBeNull()
      })
    })
  })
})
