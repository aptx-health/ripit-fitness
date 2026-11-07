/**
 * Step definitions for features/agent-tools/proposal-supersets.feature (work/140).
 * Program and saved-workout proposals take an optional `group` per exercise
 * (1–3 letters, at least two adjacent exercises per group, in one workout).
 * Approving stores it as `exerciseGroup`, the field the logger reads to show
 * "Superset A".
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file. State is created once per
 * scenario in its first step: every vitest-cucumber step is its own test.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { cleanup, render, screen, within } from '@testing-library/react'
import { type ComponentType, createElement, type ReactElement } from 'react'
import { expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: auth.userId, role: 'admin' }, error: null }),
}))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}))

const feature = await loadFeature('features/agent-tools/proposal-supersets.feature')

type Def = { id: string; name: string }
type Json = Record<string, unknown>
type Ex = { def: Def; group?: string }

interface State {
  prisma: PrismaClient
  userId: string
  tokenId: string
  bench: Def
  row: Def
  squat: Def
  curl: Def
  proposalId?: string
  targetId?: string | null
}

let s = {} as State

const load = (spec: string) => import(/* @vite-ignore */ spec)
const tools = async () => (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
const service = async () => (await load('@/lib/proposals/service')) as typeof import('@/lib/proposals/service')

async function freshState() {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const user = await createTestUser()
  const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
  const tokenId = (await createAgentToken(prisma, user.id, 'coach')).record.id
  s = {
    prisma,
    userId: user.id,
    tokenId,
    bench: await createTestExerciseDefinition(prisma, { name: 'Bench Press' }),
    row: await createTestExerciseDefinition(prisma, { name: 'Barbell Row' }),
    squat: await createTestExerciseDefinition(prisma, { name: 'Back Squat' }),
    curl: await createTestExerciseDefinition(prisma, { name: 'Curl' }),
  }
  auth.userId = user.id
}

async function call(name: string, args: Json): Promise<{ isError: boolean; body: Json }> {
  const { callTool } = await tools()
  const ctx = { userId: s.userId, tokenId: s.tokenId, role: 'admin', notify: vi.fn(async () => {}) }
  const raw = await callTool(s.prisma, ctx as never, name, args as never)
  return { isError: raw.isError === true, body: JSON.parse(raw.content[0].text) as Json }
}

const programExercises = (list: Ex[]) =>
  list.map((e) => ({ exerciseDefinitionId: e.def.id, prescribedSets: [{ reps: '8' }], ...(e.group !== undefined && { group: e.group }) }))
const workoutExercises = (list: Ex[]) =>
  list.map((e) => ({ exerciseDefinitionId: e.def.id, sets: [{ reps: '8' }], ...(e.group !== undefined && { group: e.group }) }))

const programArgs = (list: Ex[]) => ({
  program: { name: 'Push Pull', weeks: [{ workouts: [{ name: 'Day 1', exercises: programExercises(list) }] }] },
  rationale: 'Supersets save time',
})
const workoutArgs = (list: Ex[]) => ({ name: 'Upper', exercises: workoutExercises(list), rationale: 'Supersets save time' })

async function proposeProgram(list: Ex[]) {
  const r = await call('propose_program_create', programArgs(list))
  expect(r.isError, JSON.stringify(r.body)).toBe(false)
  s.proposalId = String(r.body.proposalId)
}
async function proposeWorkout(list: Ex[]) {
  const r = await call('propose_workout_create', workoutArgs(list))
  expect(r.isError, JSON.stringify(r.body)).toBe(false)
  s.proposalId = String(r.body.proposalId)
}

async function approve() {
  const { approveProposal } = await service()
  const result = (await approveProposal(s.prisma, s.proposalId as string, s.userId)) as { ok: boolean }
  expect(result.ok, JSON.stringify(result)).toBe(true)
  s.targetId = (await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId } })).targetId
}

async function createdProgramExercises() {
  return s.prisma.exercise.findMany({
    where: { workout: { week: { programId: s.targetId as string } } },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, notes: true, exerciseGroup: true },
  })
}

/** The logger's header for one exercise: it reads exerciseGroup and labels it "Superset X". */
async function loggerHeader(exercise: { id: string; name: string; notes: string | null; exerciseGroup: string | null }) {
  cleanup()
  const { default: ExerciseNavigation } = (await load('@/components/workout-logging/ExerciseNavigation')) as {
    default: ComponentType<Json>
  }
  render(
    createElement(ExerciseNavigation, {
      currentExercise: exercise,
      currentExerciseIndex: 0,
      totalExercises: 3,
      onPrevious: () => {},
      onNext: () => {},
    })
  )
  return document.body.textContent ?? ''
}

/** The rendered block for a superset: a group named "Superset <label>". */
const superset = (label: string) => screen.getByRole('group', { name: `Superset ${label}` })

function expectGroupedTogether(label: string, inside: string[], outside: string[]) {
  const box = superset(label)
  for (const name of inside) expect(within(box).getByText(new RegExp(name)), `${name} in Superset ${label}`).toBeTruthy()
  for (const name of outside) expect(within(box).queryByText(new RegExp(name)), `${name} not in Superset ${label}`).toBeNull()
}

async function renderSuggestion() {
  cleanup()
  const { suggestionBody } = (await load('@/lib/suggestions/bodies')) as typeof import('@/lib/suggestions/bodies')
  const { default: SuggestionBody } = (await load('@/components/suggestions/SuggestionBody')) as {
    default: ComponentType<Json>
  }
  const proposal = await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId } })
  const body = await suggestionBody(proposal, s.userId)
  render(createElement(SuggestionBody, { body }))
}

async function renderAdminPage() {
  cleanup()
  const mod = (await load('@/app/(app)/admin/proposals/[id]/page')) as {
    default: (p: { params: Promise<{ id: string }> }) => Promise<ReactElement>
  }
  render(await mod.default({ params: Promise.resolve({ id: s.proposalId as string }) }))
}

async function expectRefused(name: string, args: Json, field: RegExp, reason: RegExp) {
  const before = await s.prisma.proposal.count()
  const r = await call(name, args)
  expect(r.isError, `should be refused: ${JSON.stringify(r.body)}`).toBe(true)
  expect(String(r.body.field)).toMatch(field)
  expect(String(r.body.error)).toMatch(reason)
  expect(await s.prisma.proposal.count()).toBe(before)
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Agent proposes a superset', ({ Given, When, Then }) => {
    Given('an agent proposes a program whose day has Bench Press and Row in group "A"', async () => {
      await freshState()
      await proposeProgram([
        { def: s.bench, group: 'A' },
        { def: s.row, group: 'A' },
        { def: s.squat },
      ])
    })
    When('the user approves it', async () => {
      await approve()
    })
    Then("the created workout's Bench Press and Row share an exerciseGroup and the logger shows them as a superset", async () => {
      const [bench, row, squat] = await createdProgramExercises()
      expect(bench.exerciseGroup).toBe('A')
      expect(row.exerciseGroup).toBe('A')
      expect(squat.exerciseGroup).toBeNull()
      expect(await loggerHeader(bench)).toContain('Superset A')
      expect(await loggerHeader(row)).toContain('Superset A')
      expect(await loggerHeader(squat)).not.toContain('Superset')
    })
  })

  Scenario('Saved workout proposals too', ({ Given, When, Then }) => {
    Given('an agent proposes a saved workout with two exercises in group "A"', async () => {
      await freshState()
      await proposeWorkout([{ def: s.squat }, { def: s.bench, group: 'A' }, { def: s.row, group: 'A' }])
    })
    When('the user approves it', async () => {
      await approve()
    })
    Then('the saved workout keeps the group, and starting it keeps the superset', async () => {
      const saved = await s.prisma.savedWorkout.findUniqueOrThrow({ where: { id: s.targetId as string } })
      const data = saved.workoutData as Array<{ exerciseGroup: string | null }>
      expect(data.map((e) => e.exerciseGroup)).toEqual([null, 'A', 'A'])

      const { startDraftFromPlan } = (await load('@/lib/workouts/start-draft')) as typeof import('@/lib/workouts/start-draft')
      const started = (await startDraftFromPlan({
        userId: s.userId,
        name: saved.name,
        plan: saved.workoutData as never,
        savedWorkoutId: saved.id,
      })) as { ok: boolean }
      expect(started.ok, JSON.stringify(started)).toBe(true)
      const draft = await s.prisma.workoutCompletion.findFirstOrThrow({
        where: { userId: s.userId, status: 'draft' },
        include: { exercises: { orderBy: { order: 'asc' } } },
      })
      expect(draft.exercises.map((e) => e.exerciseGroup)).toEqual([null, 'A', 'A'])

      // An update proposal carries groups too, and approving it writes them.
      const r = await call('propose_workout_update', {
        savedWorkoutId: saved.id,
        exercises: workoutExercises([{ def: s.curl, group: 'B' }, { def: s.squat, group: 'B' }]),
        rationale: 'Pair them',
      })
      expect(r.isError, JSON.stringify(r.body)).toBe(false)
      s.proposalId = String(r.body.proposalId)
      await approve()
      const updated = await s.prisma.savedWorkout.findUniqueOrThrow({ where: { id: saved.id } })
      expect((updated.workoutData as Array<{ exerciseGroup: string | null }>).map((e) => e.exerciseGroup)).toEqual(['B', 'B'])
    })
  })

  Scenario('Groups are checked', ({ Then, And }) => {
    Then(
      'a group label is 1–3 letters, a group needs at least two exercises in the same workout, and grouped exercises sit next to each other',
      async () => {
        await freshState()
        // Accepted: 1–3 letters, any case (stored upper case, the way the logger shows it).
        await proposeProgram([
          { def: s.bench, group: 'abc' },
          { def: s.row, group: 'ABC' },
        ])
        const payload = (await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId } })).payload as Json
        const stored = (payload as { weeks: Array<{ workouts: Array<{ exercises: Array<{ group?: string }> }> }> }).weeks[0]
          .workouts[0].exercises
        expect(stored.map((e) => e.group)).toEqual(['ABC', 'ABC'])
        await proposeWorkout([
          { def: s.bench, group: 'A' },
          { def: s.row, group: 'A' },
          { def: s.squat, group: 'B' },
          { def: s.curl, group: 'B' },
        ])
      }
    )
    And('a proposal that breaks this is refused as invalid with the reason', async () => {
      const label = /1.?3 letters/i
      const two = /at least two/i
      const together = /next to each other/i
      for (const bad of ['', 'ABCD', 'A1', '1', 'A B']) {
        await expectRefused('propose_program_create', programArgs([{ def: s.bench, group: bad }, { def: s.row, group: bad }]), /^group$/, label)
        await expectRefused('propose_workout_create', workoutArgs([{ def: s.bench, group: bad }, { def: s.row, group: bad }]), /^exercises\[0\]\.group$/, label)
      }
      await expectRefused('propose_program_create', programArgs([{ def: s.bench, group: 'A' }, { def: s.row }]), /^group$/, two)
      await expectRefused('propose_workout_create', workoutArgs([{ def: s.bench }, { def: s.row, group: 'A' }]), /^exercises\[1\]\.group$/, two)
      const split: Ex[] = [{ def: s.bench, group: 'A' }, { def: s.squat }, { def: s.row, group: 'A' }]
      await expectRefused('propose_program_create', programArgs(split), /^group$/, together)
      await expectRefused('propose_workout_create', workoutArgs(split), /^exercises\[2\]\.group$/, together)
      // Case-insensitive: "a" and "A" are one group, so this one is split too.
      await expectRefused(
        'propose_workout_create',
        workoutArgs([{ def: s.bench, group: 'a' }, { def: s.squat }, { def: s.row, group: 'A' }]),
        /^exercises\[2\]\.group$/,
        together
      )
      await expectRefused(
        'propose_workout_update',
        { savedWorkoutId: 'any', exercises: workoutExercises([{ def: s.bench, group: 'A' }]), rationale: 'x' },
        /^exercises\[0\]\.group$/,
        two
      )

      // Same workout only: one A on day 1 and one A on day 2 is two lone exercises.
      const twoDays = {
        program: {
          name: 'Split',
          weeks: [
            {
              workouts: [
                { name: 'Day 1', exercises: programExercises([{ def: s.bench, group: 'A' }, { def: s.squat }]) },
                { name: 'Day 2', exercises: programExercises([{ def: s.row, group: 'A' }, { def: s.curl }]) },
              ],
            },
          ],
        },
        rationale: 'x',
      }
      await expectRefused('propose_program_create', twoDays, /^group$/, two)

      // Approve re-checks the stored payload with the same rule.
      const { checkProgram } = await import('@/lib/proposals/program')
      const check = await checkProgram(s.prisma, programArgs(split).program, s.userId)
      expect(check.ok).toBe(false)
      if (!check.ok) expect(check.error).toMatch(together)
    })
  })

  Scenario('Review screen shows it', ({ Then }) => {
    Then('the suggestion review and the admin proposal page show grouped exercises together, labelled as a superset', async () => {
      await freshState()
      const list: Ex[] = [{ def: s.squat }, { def: s.bench, group: 'A' }, { def: s.row, group: 'A' }]

      await proposeProgram(list)
      await renderSuggestion()
      expectGroupedTogether('A', ['Bench Press', 'Barbell Row'], ['Back Squat'])
      await renderAdminPage()
      expectGroupedTogether('A', ['Bench Press', 'Barbell Row'], ['Back Squat'])

      await proposeWorkout(list)
      await renderSuggestion()
      expectGroupedTogether('A', ['Bench Press', 'Barbell Row'], ['Back Squat'])
      await renderAdminPage()
      expectGroupedTogether('A', ['Bench Press', 'Barbell Row'], ['Back Squat'])

      // An update shows its exercise list as text: the grouped lines say so.
      await approve()
      const r = await call('propose_workout_update', {
        savedWorkoutId: s.targetId,
        exercises: workoutExercises([{ def: s.curl, group: 'B' }, { def: s.squat, group: 'B' }]),
        rationale: 'Pair them',
      })
      s.proposalId = String(r.body.proposalId)
      await renderSuggestion()
      expect(document.body.textContent).toMatch(/Curl[^\n]*Superset B/)
      expect(document.body.textContent).toMatch(/Back Squat[^\n]*Superset B/)
      // The before side (the approved workout) shows its superset A.
      expect(document.body.textContent).toMatch(/Bench Press[^\n]*Superset A/)
      cleanup()
    })
  })

  Scenario('Agents know about it', ({ Then }) => {
    Then('the MCP tool descriptions for propose_program_create, propose_workout_create and propose_workout_update describe the optional group field', async () => {
      const { listTools } = await tools()
      const all = listTools('admin')
      for (const name of ['propose_program_create', 'propose_workout_create', 'propose_workout_update']) {
        const tool = all.find((t) => t.name === name)
        expect(tool, name).toBeTruthy()
        expect(tool?.description, `${name} description`).toMatch(/\bgroup\b/)
        expect(tool?.description, `${name} description`).toMatch(/superset/i)
        const schema = JSON.stringify(tool?.inputSchema)
        const group = schema.slice(schema.indexOf('"group":'), schema.indexOf('"group":') + 400)
        expect(group, `${name} input schema has group`).toMatch(/^"group":\{"type":"string".*?"description":"[^"]*superset/i)
        expect(schema).not.toMatch(/"required":\[[^\]]*"group"/)
      }
    })
  })

  Scenario('Old proposals still work', ({ Then }) => {
    Then('proposals without groups behave exactly as before', async () => {
      await freshState()
      // A payload stored before this change: no group keys anywhere.
      await proposeProgram([{ def: s.bench }, { def: s.row }])
      const payload = (await s.prisma.proposal.findUniqueOrThrow({ where: { id: s.proposalId } })).payload
      expect(JSON.stringify(payload)).not.toMatch(/group/i)
      await renderSuggestion()
      expect(screen.queryByRole('group', { name: /superset/i })).toBeNull()
      await approve()
      expect((await createdProgramExercises()).map((e) => e.exerciseGroup)).toEqual([null, null])

      await proposeWorkout([{ def: s.bench }, { def: s.row }])
      await renderSuggestion()
      expect(screen.queryByRole('group', { name: /superset/i })).toBeNull()
      expect(document.body.textContent).not.toMatch(/superset/i)
      await approve()
      const saved = await s.prisma.savedWorkout.findUniqueOrThrow({ where: { id: s.targetId as string } })
      expect((saved.workoutData as Array<{ exerciseGroup: string | null }>).map((e) => e.exerciseGroup)).toEqual([null, null])
      cleanup()
    })
  })
})
