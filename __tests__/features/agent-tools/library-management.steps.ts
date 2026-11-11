/**
 * Step definitions for features/agent-tools/library-management.feature
 * (work item 158). Written before the implementation (159) exists.
 *
 * Contract these tests pin (spec.md has no library section yet; the names
 * below are the test builder's choices where the feature is silent):
 *
 *   lib/mcp/tools.ts  admin-only tools (listTools('admin') shows them, a
 *   non-admin gets { code: 'forbidden' } before argument checks):
 *     library_exercise_search({ query, limit? })
 *       -> { exercises: [{ id, name, aliases, equipment, primaryFAUs,
 *            secondaryFAUs, isSystem, ownerId, usage }] }
 *          Searches every definition (shared and anyone's custom).
 *          ownerId: the owner's user id for a custom one, null for shared.
 *     library_exercise_create({ definition, scope?: 'shared' | 'mine', rationale? })
 *          Applies at once. 'shared' (default) -> isSystem true; 'mine' ->
 *          the admin's custom exercise (isSystem false, userId admin).
 *     library_exercise_update({ id, changes, rationale? })
 *          Applies at once; response carries `usage`.
 *     propose_exercise_delete({ id, rationale })
 *     propose_exercise_merge({ fromId, intoId, rationale })
 *   usage = { users, loggedSets, programExercises, savedWorkoutExercises, ... }
 *     users: distinct users with a logged set of it; loggedSets: LoggedSet rows;
 *     programExercises: Exercise rows with a workoutId; savedWorkoutExercises:
 *     SavedWorkout.workoutData entries. Extra keys (pins, preferences) allowed.
 *   Direct changes write a Proposal with status 'applied', userId = admin,
 *     agentTokenId = the token, targetId = the exercise id, `before` holding the
 *     old values; revertProposal undoes them (create: delete unless an
 *     Exercise uses it, else code 'in_use').
 *   Labels (PROPOSAL_KIND_LABELS): create 'New library exercise', delete
 *     'Delete exercise', merge 'Merge exercises'. Kind strings are not pinned.
 *   Delete/merge proposals keep a `usage` object somewhere in payload/before.
 *   Approved delete/merge: revertProposal refuses (ok: false), stays applied.
 *   Logs: every library write and refusal logs (info/warn/error) an object
 *     with tokenId, tool, exerciseId and outcome.
 *
 * Modules are imported lazily so each scenario fails on its own while the
 * implementation is missing.
 */
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { expect, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestProgram, createTestUser } from '@/lib/test/factories'

// The MCP route (Rate limited scenario) reads these.
const rl = vi.hoisted(() => ({ refuse: false, calls: [] as Array<{ limiter: string; key: string }> }))
vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock(
  '@/lib/rate-limit',
  () =>
    new Proxy(
      {},
      {
        has: () => true,
        get: (_t, key) => {
          const record = (limiter: unknown, k: unknown) =>
            rl.calls.push({ limiter: String((limiter as { name?: string })?.name), key: String(k) })
          const tooMany = () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
          if (key === 'checkRateLimit')
            return async (limiter: unknown, k: unknown) => {
              record(limiter, k)
              return rl.refuse ? tooMany() : null
            }
          if (key === 'checkRateLimitWithHeaders')
            return async (limiter: unknown, k: unknown) => {
              record(limiter, k)
              return { response: rl.refuse ? tooMany() : null, headers: {} }
            }
          if (key === 'then' || key === '__esModule') return undefined
          return { name: String(key) }
        },
      }
    )
)

const feature = await loadFeature('features/agent-tools/library-management.feature')

// ---------------------------------------------------------------------------
type Json = Record<string, unknown>
type Outcome = { isError: boolean; value: Json; text: string }

interface State {
  prisma: PrismaClient
  adminId: string
  userId: string // a regular user
  tokenId: string
  token: string
  benchId: string
  role: string
  notify: ReturnType<typeof vi.fn>
  logs: Json[]
  tools: string[]
  last?: Outcome
  ids: Record<string, string>
  proposalId?: string
  decision?: { ok?: boolean; code?: string; error?: string; threw?: unknown }
  snapshot?: unknown
}
let s = {} as State

const BENCH_INSTRUCTIONS = 'Press the bar from the chest.'
const NEW_INSTRUCTIONS = 'Retract the shoulder blades, then press.'
const LIBRARY_TOOLS = [
  'library_exercise_search',
  'library_exercise_create',
  'library_exercise_update',
  'propose_exercise_delete',
  'propose_exercise_merge',
]
const UPRIGHT_ROW = {
  name: 'Cable Cross Upright Row',
  equipment: ['cable'],
  primaryFAUs: ['front-delts'],
  secondaryFAUs: ['traps'],
}

const load = (spec: string) => import(/* @vite-ignore */ spec)
async function tools() {
  return (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
}
async function service() {
  return (await load('@/lib/proposals/service')) as typeof import('@/lib/proposals/service')
}

const textOf = (v: unknown) => {
  try {
    return JSON.stringify(v) ?? String(v)
  } catch {
    return String(v)
  }
}

function ctx(role = s.role, userId = s.adminId) {
  return { userId, tokenId: s.tokenId, role, notify: s.notify }
}

async function call(name: string, args: unknown, as: { role?: string; userId?: string } = {}): Promise<Outcome> {
  const { callTool } = await tools()
  const raw = await callTool(s.prisma, ctx(as.role ?? s.role, as.userId ?? s.adminId) as never, name, args)
  const t = raw.content?.[0]?.text ?? ''
  let value: Json = {}
  try {
    value = JSON.parse(t) as Json
  } catch {
    value = { raw: t }
  }
  return { isError: raw.isError === true, value, text: t }
}

function ok(o: Outcome, what: string): Json {
  expect(o.isError, `${what} should succeed: ${o.text}`).toBe(false)
  return o.value
}

function err(o: Outcome, what: string): Json {
  expect(o.isError, `${what} should be refused: ${o.text}`).toBe(true)
  expect(typeof o.value.error, `${what} needs an error message: ${o.text}`).toBe('string')
  expect(String(o.value.error).length).toBeGreaterThan(0)
  return o.value
}

/** First object under `key` anywhere in a JSON tree. */
function findKey(node: unknown, key: string): Json | undefined {
  if (!node || typeof node !== 'object') return undefined
  if (!Array.isArray(node) && key in (node as Json) && typeof (node as Json)[key] === 'object') {
    return (node as Json)[key] as Json
  }
  for (const v of Object.values(node as Json)) {
    const hit = findKey(v, key)
    if (hit) return hit
  }
  return undefined
}

async function labelOf(kind: string) {
  const { PROPOSAL_KIND_LABELS } = await service()
  return (PROPOSAL_KIND_LABELS as Record<string, string>)[kind]
}

async function proposals() {
  return s.prisma.proposal.findMany({ where: { userId: s.adminId }, orderBy: { createdAt: 'desc' } })
}

async function def(id: string) {
  return s.prisma.exerciseDefinition.findUnique({ where: { id } })
}

async function byName(name: string) {
  return s.prisma.exerciseDefinition.findFirst({ where: { name } })
}

type Decision = 'approveProposal' | 'rejectProposal' | 'revertProposal'
async function decide(fn: Decision, proposalId: string) {
  const svc = (await service()) as unknown as Record<Decision, (...a: unknown[]) => Promise<unknown>>
  try {
    s.decision = (await svc[fn](s.prisma, proposalId, s.adminId)) as State['decision']
  } catch (threw) {
    s.decision = { ok: false, threw }
  }
  return s.decision as NonNullable<State['decision']>
}

// --- usage fixtures -------------------------------------------------------
/** A program workout using defId, with a completed session of `sets` logged sets. */
async function programUse(defId: string, userId: string, sets: number) {
  const prog = await createTestProgram(s.prisma, userId, { name: `prog-${defId}-${userId}` })
  const workout = prog.weeks[0].workouts[0]
  const exercise = workout.exercises[0]
  await s.prisma.exercise.update({ where: { id: exercise.id }, data: { exerciseDefinitionId: defId } })
  if (sets > 0) {
    const completion = await s.prisma.workoutCompletion.create({
      data: { workoutId: workout.id, userId, status: 'completed', completedAt: new Date() },
    })
    await logSets(completion.id, exercise.id, userId, sets)
  }
  return exercise.id
}

/** An ad-hoc completed session (no program) with `sets` logged sets of defId. */
async function adHocUse(defId: string, userId: string, sets: number) {
  const completion = await s.prisma.workoutCompletion.create({
    data: { userId, status: 'completed', isAdHoc: true, name: 'Freestyle', completedAt: new Date() },
  })
  const exercise = await s.prisma.exercise.create({
    data: { name: 'x', exerciseDefinitionId: defId, order: 1, userId, isOneOff: true, workoutCompletionId: completion.id },
  })
  await logSets(completion.id, exercise.id, userId, sets)
  return exercise.id
}

async function logSets(completionId: string, exerciseId: string, userId: string, n: number) {
  for (let i = 1; i <= n; i++) {
    await s.prisma.loggedSet.create({
      data: { completionId, exerciseId, userId, setNumber: i, reps: 8, weight: 100, weightUnit: 'lbs' },
    })
  }
}

/** A saved workout with `entries` exercises, all defId. */
async function savedUse(defId: string, userId: string, name: string, entries = 1) {
  return s.prisma.savedWorkout.create({
    data: {
      userId,
      name,
      exerciseCount: entries,
      workoutData: Array.from({ length: entries }, (_, i) => ({
        name: 'x',
        exerciseDefinitionId: defId,
        order: i + 1,
        notes: null,
        exerciseGroup: null,
        sets: [{ setNumber: 1, reps: '8', rir: 2, rpe: null, isWarmup: false }],
      })),
    },
  })
}

async function pin(defId: string, userId: string, position = 0) {
  return s.prisma.pinnedExercise.create({ data: { userId, exerciseDefinitionId: defId, position } })
}

async function pref(defId: string, userId: string) {
  return s.prisma.userExercisePreference.create({ data: { userId, exerciseDefinitionId: defId, alpha: 2, beta: 1 } })
}

async function shared(name: string, extra: Partial<Parameters<typeof createTestExerciseDefinition>[1]> = {}) {
  const d = await createTestExerciseDefinition(s.prisma, { name, isSystem: true, equipment: ['dumbbell'], primaryFAUs: ['chest'], ...extra })
  s.ids[name] = d.id
  return d.id
}

function expectLogged(tool: string, exerciseId: string) {
  const hit = s.logs.find((o) => o.tool === tool && o.tokenId === s.tokenId && o.exerciseId === exerciseId && o.outcome != null)
  expect(hit, `no log with tokenId, tool ${tool}, exerciseId and outcome; saw ${textOf(s.logs.filter((o) => 'tool' in o))}`).toBeDefined()
  return hit as Json
}

const TRIGGER_FN = 'lm_block_delete'
async function dropDeleteTrigger() {
  await s.prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${TRIGGER_FN} ON "ExerciseDefinition"`)
}

// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given, And }) => {
    Given('Dustin is an admin with an agent token', async () => {
      // vitest-cucumber runs each step as its own test: rebuild state and mocks here, once per scenario.
      vi.restoreAllMocks()
      const db = await getTestDatabase()
      await db.reset()
      const prisma = db.getPrismaClient()
      const admin = await createTestUser()
      const user = await createTestUser()
      s = {
        prisma,
        adminId: admin.id,
        userId: user.id,
        tokenId: '',
        token: '',
        benchId: '',
        role: 'admin',
        notify: vi.fn(async () => {}),
        logs: [],
        tools: [],
        ids: {},
      }
      const capture = (obj: unknown) => {
        if (obj && typeof obj === 'object') s.logs.push(obj as Json)
      }
      for (const level of ['info', 'warn', 'error'] as const) {
        vi.spyOn(logger, level).mockImplementation(((obj: unknown) => capture(obj)) as never)
      }
      rl.refuse = false
      rl.calls = []
      const { createAgentToken } = (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
      const created = await createAgentToken(prisma, admin.id, 'mac-claude')
      s.token = created.token
      s.tokenId = created.record.id
      await dropDeleteTrigger()
    })
    And('the shared library contains "Barbell Bench Press"', async () => {
      const d = await createTestExerciseDefinition(s.prisma, {
        name: 'Barbell Bench Press',
        isSystem: true,
        aliases: ['bench'],
        equipment: ['barbell'],
        primaryFAUs: ['chest'],
        secondaryFAUs: ['triceps'],
        instructions: BENCH_INSTRUCTIONS,
      })
      s.benchId = d.id
      s.ids['Barbell Bench Press'] = d.id
    })
  })

  Rule('Only admin tokens see or use the library tools', ({ RuleScenario }) => {
    RuleScenario('Admin token lists the library tools', ({ When, Then, And }) => {
      When('the agent lists its tools', async () => {
        const { listTools } = await tools()
        s.tools = listTools('admin').map((t) => t.name)
      })
      Then(
        'it sees "library_exercise_search", "library_exercise_create", "library_exercise_update", "propose_exercise_delete" and "propose_exercise_merge"',
        () => {
          for (const name of LIBRARY_TOOLS) expect(s.tools).toContain(name)
        }
      )
      And('it still sees no tool that approves, rejects or reverts a proposal', () => {
        expect(s.tools.filter((n) => /approve|reject|revert|decide|undo/i.test(n))).toEqual([])
      })
    })

    RuleScenario('Non-admin token', ({ Given, Then, And }) => {
      Given('a token owned by a regular user', () => {
        s.role = 'user'
      })
      Then('the library tools are not listed', async () => {
        const { listTools } = await tools()
        const names = listTools('user').map((t) => t.name)
        expect(names.length).toBeGreaterThan(0)
        for (const name of LIBRARY_TOOLS) expect(names).not.toContain(name)
      })
      And('calling one returns "forbidden" without checking its arguments', async () => {
        for (const name of LIBRARY_TOOLS) {
          const o = await call(name, { nonsense: true }, { role: 'user', userId: s.userId })
          expect(err(o, name).code, `${name}: ${o.text}`).toBe('forbidden')
        }
        expect(await s.prisma.exerciseDefinition.count()).toBe(1)
        expect(await s.prisma.proposal.count()).toBe(0)
      })
    })
  })

  Rule('Search shows usage before a change', ({ RuleScenario }) => {
    RuleScenario('Search returns definitions with usage', ({ When, Then, And }) => {
      When('the agent searches the library for "bench"', async () => {
        // Bench: Dustin's program (3 sets), the user's ad-hoc session (2 sets), 3 entries in 2 saved workouts.
        await programUse(s.benchId, s.adminId, 3)
        await adHocUse(s.benchId, s.userId, 2)
        await savedUse(s.benchId, s.adminId, 'Push A', 2)
        await savedUse(s.benchId, s.userId, 'Push B')
        const custom = await createTestExerciseDefinition(s.prisma, {
          name: 'Bench Dip Custom',
          userId: s.userId,
          isSystem: false,
          equipment: ['bodyweight'],
          primaryFAUs: ['triceps'],
        })
        s.ids['Bench Dip Custom'] = custom.id
        s.last = await call('library_exercise_search', { query: 'bench' })
      })
      Then(
        'each result has id, name, aliases, equipment, primary and secondary muscles, whether it is shared or custom (and whose)',
        () => {
          const list = ok(s.last as Outcome, 'search').exercises as Json[]
          expect(Array.isArray(list)).toBe(true)
          const bench = list.find((e) => e.id === s.benchId) as Json
          expect(bench, 'shared bench in results').toBeDefined()
          expect(bench).toMatchObject({
            name: 'Barbell Bench Press',
            aliases: ['bench'],
            equipment: ['barbell'],
            primaryFAUs: ['chest'],
            secondaryFAUs: ['triceps'],
            isSystem: true,
            ownerId: null,
          })
          const custom = list.find((e) => e.id === s.ids['Bench Dip Custom']) as Json
          expect(custom, "another user's custom exercise in results").toBeDefined()
          expect(custom).toMatchObject({ isSystem: false, ownerId: s.userId })
        }
      )
      And('usage counts: users who logged it, logged sets, program exercises, saved workout exercises', () => {
        const list = (s.last as Outcome).value.exercises as Json[]
        const bench = list.find((e) => e.id === s.benchId) as Json
        expect(bench.usage).toMatchObject({ users: 2, loggedSets: 5, programExercises: 1, savedWorkoutExercises: 3 })
        const custom = list.find((e) => e.id === s.ids['Bench Dip Custom']) as Json
        expect(custom.usage).toMatchObject({ users: 0, loggedSets: 0, programExercises: 0, savedWorkoutExercises: 0 })
      })
    })
  })

  Rule('Create and update apply at once', ({ RuleScenario }) => {
    RuleScenario('Create a shared exercise', ({ When, Then, And }) => {
      When('the agent creates "Cable Cross Upright Row" with equipment and primary muscles', async () => {
        s.last = await call('library_exercise_create', { definition: UPRIGHT_ROW, rationale: 'Missing from the library' })
      })
      Then('it is a shared library exercise every user can find', async () => {
        ok(s.last as Outcome, 'create')
        const row = await byName('Cable Cross Upright Row')
        expect(row, 'created').not.toBeNull()
        expect(row?.isSystem).toBe(true)
        expect(row?.equipment).toEqual(['cable'])
        expect(row?.primaryFAUs).toEqual(['front-delts'])
        s.ids.row = row?.id as string
        const found = await call('search_exercises', { query: 'upright row' }, { role: 'user', userId: s.userId })
        expect((ok(found, 'regular user search').exercises as Json[]).map((e) => e.id)).toContain(row?.id)
      })
      And('Admin → Proposals shows it as an applied "New library exercise" by that agent', async () => {
        const p = (await proposals()).find((x) => x.targetId === s.ids.row)
        expect(p, 'a proposal targeting the new exercise').toBeDefined()
        expect(p?.status).toBe('applied')
        expect(p?.agentTokenId).toBe(s.tokenId)
        expect(p?.decidedAt).not.toBeNull()
        expect(await labelOf(p?.kind as string)).toBe('New library exercise')
      })
      And('the admin Discord notification says it was applied, not that it waits for review', () => {
        expect(s.notify).toHaveBeenCalledTimes(1)
        const sent = textOf(s.notify.mock.calls[0][0])
        expect(sent).toMatch(/applied/i)
        expect(sent).not.toMatch(/waiting|awaiting|review|pending/i)
      })
    })

    RuleScenario('Create as a personal custom exercise', ({ When, Then }) => {
      When('the agent creates an exercise with scope "mine"', async () => {
        s.last = await call('library_exercise_create', {
          definition: { ...UPRIGHT_ROW, name: 'My Odd Row' },
          scope: 'mine',
          rationale: 'Just for me',
        })
      })
      Then("it is Dustin's custom exercise, not shared", async () => {
        ok(s.last as Outcome, 'create mine')
        const row = await byName('My Odd Row')
        expect(row?.isSystem).toBe(false)
        expect(row?.userId).toBe(s.adminId)
        const found = await call('search_exercises', { query: 'odd row' }, { role: 'user', userId: s.userId })
        expect((ok(found, 'regular user search').exercises as Json[]).length).toBe(0)
      })
    })

    RuleScenario('Duplicate name refused', ({ When, Then }) => {
      When('the agent creates "barbell bench press"', async () => {
        s.last = await call('library_exercise_create', {
          definition: { ...UPRIGHT_ROW, name: 'barbell bench press' },
          rationale: 'dup',
        })
      })
      Then('it gets an error naming the existing exercise and its id, and nothing is created', async () => {
        const e = err(s.last as Outcome, 'duplicate create')
        expect(e.existingId).toBe(s.benchId)
        expect(String(e.error)).toContain('Barbell Bench Press')
        expect(await s.prisma.exerciseDefinition.count()).toBe(1)
        expect(await s.prisma.proposal.count()).toBe(0)
      })
    })

    RuleScenario('Update any library exercise', ({ When, Then, And }) => {
      When('the agent changes the instructions of "Barbell Bench Press"', async () => {
        await adHocUse(s.benchId, s.userId, 4)
        s.last = await call('library_exercise_update', {
          id: s.benchId,
          changes: { instructions: NEW_INSTRUCTIONS },
          rationale: 'Better cue',
        })
      })
      Then('the change is saved for every user', async () => {
        ok(s.last as Outcome, 'update')
        expect((await def(s.benchId))?.instructions).toBe(NEW_INSTRUCTIONS)
        const seen = await call('get_exercise', { id: s.benchId }, { role: 'user', userId: s.userId })
        expect((ok(seen, 'regular user get').exercise as Json).instructions).toBe(NEW_INSTRUCTIONS)
      })
      And('Admin → Proposals shows it applied, with before and after', async () => {
        const p = (await proposals()).find((x) => x.targetId === s.benchId)
        expect(p, 'a proposal targeting bench').toBeDefined()
        expect(p?.status).toBe('applied')
        expect(p?.agentTokenId).toBe(s.tokenId)
        expect((p?.before as Json)?.instructions).toBe(BENCH_INSTRUCTIONS)
        expect(textOf(p?.payload)).toContain(NEW_INSTRUCTIONS)
      })
      And('the response includes the usage counts', () => {
        const usage = (s.last as Outcome).value.usage as Json
        expect(usage).toMatchObject({ users: 1, loggedSets: 4, programExercises: 0, savedWorkoutExercises: 0 })
      })
    })

    RuleScenario('Revert a direct change', ({ When, Then, And }) => {
      When('Dustin reverts an applied library update in Admin', async () => {
        ok(await call('library_exercise_update', { id: s.benchId, changes: { instructions: NEW_INSTRUCTIONS }, rationale: 'r' }), 'update')
        const p = (await proposals()).find((x) => x.targetId === s.benchId)
        expect(p).toBeDefined()
        await decide('revertProposal', p?.id as string)
      })
      Then('the exercise returns to its before values', async () => {
        expect(s.decision?.ok, textOf(s.decision)).toBe(true)
        expect((await def(s.benchId))?.instructions).toBe(BENCH_INSTRUCTIONS)
      })
      And(
        'reverting an applied create removes the exercise if nothing uses it yet, otherwise the revert is refused with why',
        async () => {
          ok(await call('library_exercise_create', { definition: UPRIGHT_ROW, rationale: 'r' }), 'create unused')
          const unused = await byName('Cable Cross Upright Row')
          const p1 = (await proposals()).find((x) => x.targetId === unused?.id)
          expect((await decide('revertProposal', p1?.id as string)).ok, textOf(s.decision)).toBe(true)
          expect(await def(unused?.id as string)).toBeNull()

          ok(await call('library_exercise_create', { definition: { ...UPRIGHT_ROW, name: 'Used Row' }, rationale: 'r' }), 'create used')
          const used = await byName('Used Row')
          await adHocUse(used?.id as string, s.userId, 1)
          const p2 = (await proposals()).find((x) => x.targetId === used?.id)
          const d = await decide('revertProposal', p2?.id as string)
          expect(d.ok).toBe(false)
          expect(d.code).toBe('in_use')
          expect(String(d.error)).toMatch(/use/i)
          expect(await def(used?.id as string)).not.toBeNull()
          expect((await s.prisma.proposal.findUnique({ where: { id: p2?.id } }))?.status).toBe('applied')
        }
      )
    })

    RuleScenario('Invalid fields refused', ({ When, Then }) => {
      When('the agent sends an unknown muscle or equipment value', async () => {
        s.snapshot = await def(s.benchId)
        s.last = await call('library_exercise_create', {
          definition: { ...UPRIGHT_ROW, name: 'Wing Row', primaryFAUs: ['wings'] },
          rationale: 'r',
        })
      })
      Then('it gets the field and the reason, and nothing changes', async () => {
        expect(err(s.last as Outcome, 'bad muscle').field).toBe('primaryFAUs')
        const eq = await call('library_exercise_create', { definition: { ...UPRIGHT_ROW, name: 'Jet Row', equipment: ['jetpack'] }, rationale: 'r' })
        expect(err(eq, 'bad equipment').field).toBe('equipment')
        const upd = await call('library_exercise_update', { id: s.benchId, changes: { secondaryFAUs: ['wings'] }, rationale: 'r' })
        expect(err(upd, 'bad update').field).toBe('secondaryFAUs')
        expect(await s.prisma.exerciseDefinition.count()).toBe(1)
        expect(await def(s.benchId)).toEqual(s.snapshot)
        expect(await s.prisma.proposal.count()).toBe(0)
      })
    })
  })

  Rule('Delete and merge wait for Dustin', ({ RuleScenario }) => {
    RuleScenario('Propose deleting an unused exercise', ({ Given, When, Then, And }) => {
      Given('"Old Row" has no logged sets, program, saved workout, pin or preference uses', async () => {
        await shared('Old Row')
      })
      When('the agent proposes deleting it with a reason', async () => {
        s.last = await call('propose_exercise_delete', { id: s.ids['Old Row'], rationale: 'Duplicate of Seated Row' })
      })
      Then('a pending "Delete exercise" proposal appears in Admin with the reason and its usage (all zero)', async () => {
        ok(s.last as Outcome, 'propose delete')
        const [p] = await proposals()
        expect(p, 'a proposal').toBeDefined()
        s.proposalId = p.id
        expect(p.status).toBe('pending')
        expect(p.agentTokenId).toBe(s.tokenId)
        expect(p.rationale).toBe('Duplicate of Seated Row')
        expect(await labelOf(p.kind)).toBe('Delete exercise')
        expect(textOf(p.payload) + textOf(p.summary) + textOf(p.targetId)).toContain(s.ids['Old Row'])
        const usage = findKey({ payload: p.payload, before: p.before }, 'usage')
        expect(usage, 'usage on the proposal').toBeDefined()
        expect(usage).toMatchObject({ users: 0, loggedSets: 0, programExercises: 0, savedWorkoutExercises: 0 })
        for (const v of Object.values(usage as Json)) if (typeof v === 'number') expect(v).toBe(0)
      })
      And('nothing is deleted until Dustin approves', async () => {
        expect(await def(s.ids['Old Row'])).not.toBeNull()
        const d = await decide('approveProposal', s.proposalId as string)
        expect(d.ok, textOf(d)).toBe(true)
        expect(await def(s.ids['Old Row'])).toBeNull()
        expect((await s.prisma.proposal.findUnique({ where: { id: s.proposalId } }))?.status).toBe('applied')
      })
    })

    RuleScenario('Delete refused when in use', ({ Given, When, Then }) => {
      Given('"Old Row" has logged sets', async () => {
        await adHocUse(await shared('Old Row'), s.userId, 2)
        // Other kinds of use, each on its own exercise.
        await programUse(await shared('Program Row'), s.userId, 0)
        await savedUse(await shared('Saved Row'), s.userId, 'Pull')
        await pin(await shared('Pinned Row'), s.userId)
        await pref(await shared('Preferred Row'), s.userId)
      })
      When('the agent proposes deleting it', async () => {
        s.last = await call('propose_exercise_delete', { id: s.ids['Old Row'], rationale: 'r' })
      })
      Then('it is refused with the usage counts and a hint to propose a merge instead', async () => {
        const e = err(s.last as Outcome, 'delete in use')
        expect(findKey(e, 'usage')).toMatchObject({ users: 1, loggedSets: 2 })
        expect(String(e.error)).toMatch(/merge/i)
        for (const name of ['Program Row', 'Saved Row', 'Pinned Row', 'Preferred Row']) {
          err(await call('propose_exercise_delete', { id: s.ids[name], rationale: 'r' }), `delete ${name}`)
        }
        expect(await s.prisma.proposal.count()).toBe(0)
        expect(await def(s.ids['Old Row'])).not.toBeNull()
      })
    })

    RuleScenario('Usage appears between proposal and approval', ({ Given, And, When, Then }) => {
      Given('a pending delete for "Old Row"', async () => {
        await shared('Old Row')
        ok(await call('propose_exercise_delete', { id: s.ids['Old Row'], rationale: 'r' }), 'propose delete')
        s.proposalId = (await proposals())[0].id
      })
      And('someone logs "Old Row" before Dustin approves', async () => {
        await adHocUse(s.ids['Old Row'], s.userId, 1)
      })
      When('Dustin approves', async () => {
        await decide('approveProposal', s.proposalId as string)
      })
      Then('the delete fails with why, nothing is removed, and the proposal shows the failure', async () => {
        expect(s.decision?.ok).toBe(false)
        expect(s.decision?.threw, 'refused, not thrown').toBeUndefined()
        expect(String(s.decision?.error)).toMatch(/use/i)
        expect(await def(s.ids['Old Row'])).not.toBeNull()
        const p = await s.prisma.proposal.findUnique({ where: { id: s.proposalId } })
        expect(p?.status).not.toBe('applied')
        expect(p?.error).toBeTruthy()
      })
    })

    RuleScenario('Propose a merge', ({ When, Then }) => {
      When('the agent proposes merging "DB Bench" into "Dumbbell Bench Press" with a reason', async () => {
        await adHocUse(await shared('DB Bench'), s.userId, 3)
        await shared('Dumbbell Bench Press')
        s.last = await call('propose_exercise_merge', {
          fromId: s.ids['DB Bench'],
          intoId: s.ids['Dumbbell Bench Press'],
          rationale: 'Same lift, abbreviated name',
        })
      })
      Then('a pending "Merge exercises" proposal shows both, the usage that would move, and the reason', async () => {
        ok(s.last as Outcome, 'propose merge')
        const [p] = await proposals()
        expect(p.status).toBe('pending')
        expect(p.agentTokenId).toBe(s.tokenId)
        expect(await labelOf(p.kind)).toBe('Merge exercises')
        expect(p.rationale).toBe('Same lift, abbreviated name')
        const all = textOf(p)
        expect(all).toContain(s.ids['DB Bench'])
        expect(all).toContain(s.ids['Dumbbell Bench Press'])
        expect(findKey({ payload: p.payload, before: p.before }, 'usage')).toMatchObject({ users: 1, loggedSets: 3 })
        expect(await def(s.ids['DB Bench'])).not.toBeNull()
      })
    })

    RuleScenario('Approve a merge', ({ When, Then, And }) => {
      When('Dustin approves the merge', async () => {
        const from = await shared('DB Bench')
        const into = await shared('Dumbbell Bench Press', { aliases: ['db press'] })
        // Every kind of use of DB Bench.
        s.ids.prog = await programUse(from, s.adminId, 2)
        s.ids.adhoc = await adHocUse(from, s.userId, 3)
        s.ids.saved = (await savedUse(from, s.userId, 'Chest', 2)).id
        await pin(from, s.adminId)
        await pref(from, s.adminId)
        // The regular user already pins and rates both.
        await pin(from, s.userId, 0)
        await pin(into, s.userId, 1)
        await pref(from, s.userId)
        await pref(into, s.userId)
        ok(await call('propose_exercise_merge', { fromId: from, intoId: into, rationale: 'dup' }), 'propose merge')
        s.proposalId = (await proposals())[0].id
        await decide('approveProposal', s.proposalId)
      })
      Then(
        'every logged set, program exercise, saved workout exercise, pin and preference that used "DB Bench" now uses "Dumbbell Bench Press"',
        async () => {
          expect(s.decision?.ok, textOf(s.decision)).toBe(true)
          const into = s.ids['Dumbbell Bench Press']
          for (const id of [s.ids.prog, s.ids.adhoc]) {
            expect((await s.prisma.exercise.findUnique({ where: { id } }))?.exerciseDefinitionId).toBe(into)
          }
          expect(await s.prisma.loggedSet.count({ where: { exercise: { exerciseDefinitionId: into } } })).toBe(5)
          const saved = await s.prisma.savedWorkout.findUniqueOrThrow({ where: { id: s.ids.saved } })
          expect((saved.workoutData as Json[]).map((e) => e.exerciseDefinitionId)).toEqual([into, into])
          expect(await s.prisma.pinnedExercise.count({ where: { userId: s.adminId, exerciseDefinitionId: into } })).toBe(1)
          expect(await s.prisma.userExercisePreference.count({ where: { userId: s.adminId, exerciseDefinitionId: into } })).toBe(1)
          expect(await s.prisma.proposal.findUnique({ where: { id: s.proposalId } })).toMatchObject({ status: 'applied' })
        }
      )
      And('where a user already had a pin or preference on both, one remains and nothing errors', async () => {
        expect(await s.prisma.pinnedExercise.count({ where: { userId: s.userId } })).toBe(1)
        expect(await s.prisma.pinnedExercise.count({ where: { userId: s.userId, exerciseDefinitionId: s.ids['Dumbbell Bench Press'] } })).toBe(1)
        expect(await s.prisma.userExercisePreference.count({ where: { userId: s.userId } })).toBe(1)
      })
      And('"DB Bench" is added to "Dumbbell Bench Press"\'s aliases', async () => {
        const into = await def(s.ids['Dumbbell Bench Press'])
        expect(into?.aliases.map((a) => a.toLowerCase())).toContain('db bench')
        expect(into?.aliases).toContain('db press')
      })
      And('"DB Bench" is deleted', async () => {
        expect(await def(s.ids['DB Bench'])).toBeNull()
      })
      And('it all happens in one transaction: on any failure nothing changes', async () => {
        // A second merge whose final delete is blocked by a test-only trigger.
        const from = await shared('Flat DB Press')
        const into = s.ids['Dumbbell Bench Press']
        const ex = await adHocUse(from, s.userId, 1)
        await pin(from, s.adminId, 5)
        const before = await def(into)
        ok(await call('propose_exercise_merge', { fromId: from, intoId: into, rationale: 'dup' }), 'propose merge 2')
        const pid = (await proposals())[0].id
        await s.prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION ${TRIGGER_FN}() RETURNS trigger AS $$
          BEGIN IF OLD.id = '${from}' THEN RAISE EXCEPTION 'blocked by test'; END IF; RETURN OLD; END $$ LANGUAGE plpgsql`)
        await s.prisma.$executeRawUnsafe(
          `CREATE TRIGGER ${TRIGGER_FN} BEFORE DELETE ON "ExerciseDefinition" FOR EACH ROW EXECUTE FUNCTION ${TRIGGER_FN}()`
        )
        try {
          const d = await decide('approveProposal', pid)
          expect(d.ok).toBe(false)
        } finally {
          await dropDeleteTrigger()
        }
        expect(await def(from)).not.toBeNull()
        expect((await s.prisma.exercise.findUnique({ where: { id: ex } }))?.exerciseDefinitionId).toBe(from)
        expect(await s.prisma.pinnedExercise.count({ where: { userId: s.adminId, exerciseDefinitionId: from } })).toBe(1)
        expect((await def(into))?.aliases).toEqual(before?.aliases)
        expect((await s.prisma.proposal.findUnique({ where: { id: pid } }))?.status).not.toBe('applied')
      })
    })

    RuleScenario('Merge refusals', ({ Then }) => {
      Then(
        "merging an exercise into itself, into a missing exercise, or a shared exercise into someone's custom one is refused with why",
        async () => {
          const from = await shared('DB Bench')
          const custom = await createTestExerciseDefinition(s.prisma, {
            name: 'My DB Bench',
            userId: s.userId,
            isSystem: false,
            equipment: ['dumbbell'],
            primaryFAUs: ['chest'],
          })
          err(await call('propose_exercise_merge', { fromId: from, intoId: from, rationale: 'r' }), 'into itself')
          err(await call('propose_exercise_merge', { fromId: from, intoId: 'missing-id', rationale: 'r' }), 'into missing')
          err(await call('propose_exercise_merge', { fromId: from, intoId: custom.id, rationale: 'r' }), 'shared into custom')
          expect(await s.prisma.proposal.count()).toBe(0)
          // Control: a custom exercise into a shared one is allowed.
          ok(await call('propose_exercise_merge', { fromId: custom.id, intoId: from, rationale: 'r' }), 'custom into shared')
        }
      )
    })

    RuleScenario('Merge and delete are not revertable', ({ Then }) => {
      Then('approved deletes and merges show no Revert button, and the confirm before approving says so', async () => {
        const gone = await shared('Old Row')
        const from = await shared('DB Bench')
        const into = await shared('Dumbbell Bench Press')
        ok(await call('propose_exercise_delete', { id: gone, rationale: 'r' }), 'propose delete')
        const del = (await proposals())[0].id
        ok(await call('propose_exercise_merge', { fromId: from, intoId: into, rationale: 'r' }), 'propose merge')
        const merge = (await proposals())[0].id
        for (const id of [del, merge]) {
          expect((await decide('approveProposal', id)).ok, textOf(s.decision)).toBe(true)
          const d = await decide('revertProposal', id)
          expect(d.ok).toBe(false)
          expect(d.threw).toBeUndefined()
          expect(typeof d.error).toBe('string')
          expect((await s.prisma.proposal.findUnique({ where: { id } }))?.status).toBe('applied')
        }
      })
    })
  })

  Rule('Guard rails', ({ RuleScenario }) => {
    RuleScenario('Rate limited', ({ Then }) => {
      Then('the library write tools are rate limited per token like the other proposal tools', async () => {
        await s.prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "user" (id text PRIMARY KEY, role text, email text)')
        await s.prisma.$executeRaw`INSERT INTO "user" (id, role, email) VALUES (${s.adminId}, 'admin', 'a@x.test') ON CONFLICT (id) DO UPDATE SET role = 'admin'`
        const route = (await load('@/app/api/mcp/route')) as { POST: (r: NextRequest) => Promise<Response> }
        const mcp = async (name: string, args: Json) => {
          rl.calls = []
          const res = await route.POST(
            new NextRequest('https://ripit.test/api/mcp', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                accept: 'application/json, text/event-stream',
                authorization: `Bearer ${s.token}`,
              },
              body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
            })
          )
          const body = (await res.json().catch(() => ({}))) as { result?: { isError?: boolean; content?: Array<{ text: string }> } }
          return { status: res.status, body, calls: [...rl.calls] }
        }

        const proposeCall = await mcp('propose_exercise_create', {
          definition: { ...UPRIGHT_ROW, name: 'Larsen Press', equipment: ['barbell'], primaryFAUs: ['chest'] },
          rationale: 'r',
        })
        expect(proposeCall.status).toBe(200)
        expect(proposeCall.calls.length, 'the proposal tool is rate limited').toBeGreaterThan(0)
        expect(proposeCall.calls.every((c) => c.key === s.tokenId)).toBe(true)

        const writes: Array<[string, Json]> = [
          ['library_exercise_create', { definition: UPRIGHT_ROW, rationale: 'r' }],
          ['library_exercise_update', { id: s.benchId, changes: { notes: 'n' }, rationale: 'r' }],
          ['propose_exercise_delete', { id: s.benchId, rationale: 'r' }],
          ['propose_exercise_merge', { fromId: s.benchId, intoId: s.benchId, rationale: 'r' }],
        ]
        for (const [name, args] of writes) {
          const r = await mcp(name, args)
          expect(r.status, name).toBe(200)
          // The tool exists and ran (a merge into itself is a refusal, not an unknown tool).
          expect(r.body.result?.content?.[0]?.text ?? '', name).not.toMatch(/unknown tool/)
          for (const c of proposeCall.calls) expect(r.calls, `${name} limited like the proposal tools`).toContainEqual(c)
        }
        expect(await byName('Cable Cross Upright Row'), 'library create ran through the route').not.toBeNull()

        rl.refuse = true
        const refused = await mcp('library_exercise_create', { definition: { ...UPRIGHT_ROW, name: 'Refused Row' }, rationale: 'r' })
        const limited = refused.status === 429 || (refused.body.result?.isError === true && /rate|too many/i.test(textOf(refused.body)))
        expect(limited, `refused: ${refused.status} ${textOf(refused.body)}`).toBe(true)
        expect(await byName('Refused Row')).toBeNull()
      })
    })

    RuleScenario('Logged', ({ Then }) => {
      Then('every library write and refusal is logged with the token, tool, exercise id and outcome', async () => {
        ok(await call('library_exercise_create', { definition: UPRIGHT_ROW, rationale: 'r' }), 'create')
        const created = await byName('Cable Cross Upright Row')
        expectLogged('library_exercise_create', created?.id as string)

        ok(await call('library_exercise_update', { id: s.benchId, changes: { notes: 'n' }, rationale: 'r' }), 'update')
        const applied = expectLogged('library_exercise_update', s.benchId)

        s.logs = []
        err(await call('library_exercise_update', { id: s.benchId, changes: { primaryFAUs: ['wings'] }, rationale: 'r' }), 'bad update')
        const refused = expectLogged('library_exercise_update', s.benchId)
        expect(refused.outcome).not.toEqual(applied.outcome)

        const old = await shared('Old Row')
        ok(await call('propose_exercise_delete', { id: old, rationale: 'r' }), 'propose delete')
        expectLogged('propose_exercise_delete', old)

        await adHocUse(s.benchId, s.userId, 1)
        err(await call('propose_exercise_delete', { id: s.benchId, rationale: 'r' }), 'delete in use')
        expectLogged('propose_exercise_delete', s.benchId)

        const into = await shared('Dumbbell Bench Press')
        err(await call('propose_exercise_merge', { fromId: into, intoId: into, rationale: 'r' }), 'merge into itself')
        expectLogged('propose_exercise_merge', into)
      })
    })
  })
})
