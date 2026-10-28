/**
 * Step definitions for features/agent-tools/training-export.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md ("Training data
 * export"): the MCP tool `export_training_data` and the route
 * `GET /api/agent/export.csv`.
 *
 * The route is tested by calling its exported GET handler with a Request.
 * `@/lib/db` is mocked to hand the route the testcontainers client, so the
 * route, token lookup and queries are all real. Rate limiting is bypassed
 * under NODE_ENV=test, so it isn't covered here.
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so state is created once
 * per scenario in the first Background step. Never reset it in afterEach.
 *
 * Dates are seeded as WorkoutCompletion.completedAt. Ranges that must not
 * depend on today's date use explicit `until` values, so rows may lie in the
 * future of whenever the suite runs.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestProgram, createTestUser } from '@/lib/test/factories'

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})

const feature = await loadFeature('features/agent-tools/training-export.feature')

type Outcome = { failed: boolean; value: unknown; text: string; thrown: boolean; raw?: unknown }
type Row = Record<string, unknown>

interface Def {
  id: string
  name: string
}

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  token: string
  squat: Def
  pullup: Def
  last?: Outcome
  response?: Response
}

let s = {} as State

const COLUMNS = [
  'date',
  'completionId',
  'workoutName',
  'isAdHoc',
  'status',
  'sessionRpe',
  'durationSeconds',
  'exerciseDefinitionId',
  'exerciseName',
  'exerciseOrder',
  'setNumber',
  'reps',
  'weight',
  'unit',
  'rpe',
  'rir',
  'isWarmup',
]

const DAY = 24 * 60 * 60 * 1000
const NOW_YEAR = new Date().getUTCFullYear()
const utc = (y: number, m: number, d: number, h = 12) => new Date(Date.UTC(y, m, d, h))
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

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
async function agentTokens() {
  return (await load('@/lib/agent-tokens')) as typeof import('@/lib/agent-tokens')
}
async function route() {
  return (await load('@/app/api/agent/export.csv/route')) as { GET: (req: Request) => Promise<Response> }
}

function ctx() {
  return { userId: s.userId, tokenId: s.tokenId, notify: async () => {} }
}

async function callAgentTool(name: string, args: Record<string, unknown> = {}): Promise<Outcome> {
  const { callTool } = await tools()
  return attempt(() => callTool(s.prisma as never, ctx() as never, name, args as never))
}

function mustSucceed(o: Outcome, what: string) {
  expect(o.failed, `${what} should succeed but got: ${o.text}`).toBe(false)
}

function toolPayload(o: Outcome): Record<string, unknown> {
  expect((o.raw as { isError?: boolean })?.isError, `tool should set isError: ${o.text}`).toBe(true)
  return o.value as Record<string, unknown>
}

interface Page {
  columns: string[]
  rows: unknown[][]
  nextCursor: string | null
  rowCount: number
}

async function exportPage(args: Record<string, unknown>): Promise<Page> {
  const o = await callAgentTool('export_training_data', args)
  mustSucceed(o, `export_training_data ${textOf(args)}`)
  s.last = o
  const page = o.value as Page
  expect(page.columns, 'columns, in spec order').toEqual(COLUMNS)
  expect(Array.isArray(page.rows)).toBe(true)
  expect(page.rowCount).toBe(page.rows.length)
  return page
}

/** Every page of a range, following nextCursor. */
async function exportAll(args: Record<string, unknown>): Promise<{ pages: Page[]; rows: unknown[][] }> {
  const pages: Page[] = []
  let cursor: string | null = null
  do {
    const page: Page = await exportPage({ ...args, ...(cursor ? { cursor } : {}) })
    pages.push(page)
    cursor = page.nextCursor
    expect(pages.length, 'paging should end').toBeLessThan(200)
  } while (cursor)
  return { pages, rows: pages.flatMap((p) => p.rows) }
}

function asObjects(rows: unknown[][]): Row[] {
  return rows.map((r) => {
    expect(r, 'every row has one value per column').toHaveLength(COLUMNS.length)
    return Object.fromEntries(COLUMNS.map((c, i) => [c, r[i]]))
  })
}

const cell = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function bearer(token = s.token): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

async function getCsv(query: string, headers: Record<string, string> = bearer()): Promise<Response> {
  const { GET } = await route()
  return GET(new Request(`http://localhost/api/agent/export.csv${query}`, { headers }))
}

/** RFC 4180: quoted fields, doubled quotes, CRLF or LF line ends. */
function parseCsv(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      out.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    out.push(row)
  }
  return out
}

interface SetSpec {
  weight: number
  reps?: number
  unit?: 'lbs' | 'kg'
  rpe?: number | null
  rir?: number | null
  warmup?: boolean
}

interface SessionSpec {
  id?: string
  userId?: string
  date: Date
  status?: string
  archived?: boolean
  adHoc?: boolean
  name?: string | null
  workoutId?: string | null
  sessionRpe?: number | null
  durationSeconds?: number | null
  exercises: Array<{ def: Def; sets: SetSpec[]; order?: number }>
}

async function seedSession(o: SessionSpec) {
  const userId = o.userId ?? s.userId
  const completion = await s.prisma.workoutCompletion.create({
    data: {
      ...(o.id ? { id: o.id } : {}),
      userId,
      status: o.status ?? 'completed',
      completedAt: o.date,
      isArchived: o.archived ?? false,
      isAdHoc: o.adHoc ?? true,
      name: o.name ?? null,
      workoutId: o.workoutId ?? null,
      sessionRpe: o.sessionRpe ?? null,
      durationSeconds: o.durationSeconds ?? null,
    },
  })
  let position = 1
  for (const ex of o.exercises) {
    const order = ex.order ?? position++
    const exercise = await s.prisma.exercise.create({
      data: {
        name: ex.def.name,
        exerciseDefinitionId: ex.def.id,
        order,
        userId,
        workoutCompletionId: completion.id,
        isOneOff: true,
      },
    })
    await s.prisma.loggedSet.createMany({
      data: ex.sets.map((set, i) => ({
        setNumber: i + 1,
        reps: set.reps ?? 5,
        weight: set.weight,
        weightUnit: set.unit ?? 'lbs',
        rpe: set.rpe ?? null,
        rir: set.rir ?? null,
        isWarmup: set.warmup ?? false,
        exerciseId: exercise.id,
        completionId: completion.id,
        userId,
        createdAt: o.date,
      })),
    })
  }
  return completion
}

/** The weights of rows for a def, in the order returned. */
const weightsOf = (rows: unknown[][]) => asObjects(rows).map((r) => r.weight)

async function wipeTables(prisma: PrismaClient) {
  for (const t of ['AgentToken', 'LoggedSet', 'Exercise', 'WorkoutCompletion']) {
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
  const { createAgentToken } = await agentTokens()
  const created = await createAgentToken(prisma, user.id, 'sandbox')
  return {
    prisma,
    userId: user.id,
    otherUserId: other.id,
    tokenId: created.record.id,
    token: created.token,
    squat: await createTestExerciseDefinition(prisma, { name: 'Back Squat' }),
    pullup: await createTestExerciseDefinition(prisma, { name: 'Pull-up' }),
  }
}

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------
describeFeature(feature, ({ Background, Rule }) => {
  Background(({ Given, And }) => {
    Given('Dustin has an agent token named "sandbox"', async () => {
      const db = await getTestDatabase()
      await db.reset()
      const prisma = db.getPrismaClient()
      await wipeTables(prisma)
      const user = await createTestUser()
      const other = await createTestUser()
      s = { prisma, userId: user.id, otherUserId: other.id, tokenId: '', token: '' } as State
      const { createAgentToken } = await agentTokens()
      const created = await createAgentToken(s.prisma, s.userId, 'sandbox')
      s.tokenId = created.record.id
      s.token = created.token
    })
    And('the exercise library contains "Back Squat" and "Pull-up"', async () => {
      s.squat = await createTestExerciseDefinition(s.prisma, { name: 'Back Squat' })
      s.pullup = await createTestExerciseDefinition(s.prisma, { name: 'Pull-up' })
    })
  })

  Rule('The MCP tool returns raw rows in pages', ({ RuleScenario }) => {
    RuleScenario('Every set in the range, warmups included and flagged', ({ Given, When, Then, And }) => {
      const now = new Date()
      const monthStart = utc(now.getUTCFullYear(), now.getUTCMonth(), 1, 0)
      const nextMonth = utc(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0)
      const squatDate = new Date(monthStart.getTime() + 1 * DAY + 12 * 3600_000)
      const pullupDate = new Date(monthStart.getTime() + 2 * DAY + 12 * 3600_000)
      let programWorkoutName = ''
      let squatCompletionId = ''
      let pullupCompletionId = ''

      Given(
        'Dustin logged a "Back Squat" session with 2 warmup sets and 3 working sets in kg, and a "Pull-up" session at 0 weight',
        async () => {
          const squatSession = await seedSession({
            date: squatDate,
            name: 'Leg Day',
            sessionRpe: 8,
            durationSeconds: 3600,
            exercises: [
              {
                def: s.squat,
                sets: [
                  { weight: 20, reps: 5, unit: 'kg', warmup: true },
                  { weight: 30, reps: 3, unit: 'kg', warmup: true },
                  { weight: 60, reps: 5, unit: 'kg', rpe: 8 },
                  { weight: 65, reps: 5, unit: 'kg', rpe: 8, rir: 2 },
                  { weight: 70, reps: 3, unit: 'kg', rpe: 9 },
                ],
              },
            ],
          })
          squatCompletionId = squatSession.id
          // A program session with no name of its own: the row takes the program workout's name.
          const program = await createTestProgram(s.prisma, s.userId)
          const workout = program.weeks[0].workouts[0]
          programWorkoutName = workout.name
          const pullupSession = await seedSession({
            date: pullupDate,
            status: 'abandoned',
            adHoc: false,
            workoutId: workout.id,
            exercises: [{ def: s.pullup, sets: [{ weight: 0, reps: 8 }, { weight: 0, reps: 8 }, { weight: 0, reps: 6 }] }],
          })
          pullupCompletionId = pullupSession.id
          expect(await s.prisma.loggedSet.count({ where: { userId: s.userId } })).toBe(8)
        }
      )
      When('the agent calls "export_training_data" since the start of the month', async () => {
        s.last = await callAgentTool('export_training_data', {
          since: monthStart.toISOString(),
          until: nextMonth.toISOString(),
        })
      })
      Then('it returns 5 squat rows and the pull-up rows, in date, exercise and set order', async () => {
        const page = await exportPage({ since: monthStart.toISOString(), until: nextMonth.toISOString() })
        expect(page.rowCount).toBe(8)
        expect(page.nextCursor).toBeNull()
        const rows = asObjects(page.rows)
        expect(rows.map((r) => r.exerciseName)).toEqual([
          ...Array(5).fill('Back Squat'),
          ...Array(3).fill('Pull-up'),
        ])
        expect(rows.map((r) => r.setNumber)).toEqual([1, 2, 3, 4, 5, 1, 2, 3])
        expect(rows.map((r) => r.completionId)).toEqual([...Array(5).fill(squatCompletionId), ...Array(3).fill(pullupCompletionId)])
        expect(new Date(rows[0].date as string).getTime()).toBe(squatDate.getTime())
        expect(new Date(rows[5].date as string).getTime()).toBe(pullupDate.getTime())
        // Whole-row check on the first squat row: every column, in spec order.
        expect(page.rows[0]).toEqual([
          rows[0].date,
          squatCompletionId,
          'Leg Day',
          true,
          'completed',
          8,
          3600,
          s.squat.id,
          'Back Squat',
          1,
          1,
          5,
          20,
          'kg',
          null,
          null,
          true,
        ])
        expect(rows[3]).toMatchObject({ setNumber: 4, reps: 5, weight: 65, unit: 'kg', rpe: 8, rir: 2, isWarmup: false })
        // Pull-up rows: an abandoned program session, named after the program workout, nulls kept as null.
        expect(rows[5]).toMatchObject({
          workoutName: programWorkoutName,
          isAdHoc: false,
          status: 'abandoned',
          sessionRpe: null,
          durationSeconds: null,
          exerciseDefinitionId: s.pullup.id,
          exerciseName: 'Pull-up',
          exerciseOrder: 1,
          reps: 8,
          weight: 0,
          unit: 'lbs',
          rpe: null,
          rir: null,
          isWarmup: false,
        })
      })
      And('the warmups have isWarmup true, and weights are as logged in kg', async () => {
        const rows = asObjects((await exportPage({ since: monthStart.toISOString(), until: nextMonth.toISOString() })).rows)
        const squat = rows.slice(0, 5)
        expect(squat.map((r) => r.isWarmup)).toEqual([true, true, false, false, false])
        expect(squat.map((r) => r.weight)).toEqual([20, 30, 60, 65, 70])
        expect(squat.every((r) => r.unit === 'kg')).toBe(true)
        expect(rows.slice(5).map((r) => r.weight)).toEqual([0, 0, 0])
      })
    })

    RuleScenario('Large ranges come back in pages without gaps or repeats', ({ Given, When, Then, And }) => {
      const since = utc(NOW_YEAR, 0, 1, 0).toISOString()
      const until = utc(NOW_YEAR + 1, 0, 1, 0).toISOString()
      let expectedKeys: string[] = []
      let pages: Page[] = []
      let rows: unknown[][] = []

      Given('Dustin has 2500 logged sets this year', async () => {
        // 36 sessions: 35 of 70 sets and one of 50 = 2500. Page boundaries (1000, 2000) fall
        // inside sessions. Sessions come in pairs on the same date, and their ids sort
        // differently from creation order, so only (date, completionId, order, setNumber) gives the order.
        const sizes = Array.from({ length: 36 }, (_, i) => (i === 35 ? 50 : 70))
        const sessions = sizes.map((size, i) => ({
          id: `cmp${String((i * 7) % 36).padStart(3, '0')}`,
          date: new Date(utc(NOW_YEAR, 0, 2 + Math.floor(i / 2)).getTime()),
          size,
        }))
        await s.prisma.workoutCompletion.createMany({
          data: sessions.map((x) => ({ id: x.id, userId: s.userId, status: 'completed', completedAt: x.date, isAdHoc: true })),
        })
        await s.prisma.exercise.createMany({
          data: sessions.map((x) => ({
            id: `ex${x.id}`,
            name: 'Back Squat',
            exerciseDefinitionId: s.squat.id,
            order: 1,
            userId: s.userId,
            workoutCompletionId: x.id,
            isOneOff: true,
          })),
        })
        await s.prisma.loggedSet.createMany({
          data: sessions.flatMap((x) =>
            Array.from({ length: x.size }, (_, k) => ({
              setNumber: k + 1,
              reps: (k % 10) + 1,
              weight: 100 + k,
              weightUnit: 'lbs',
              exerciseId: `ex${x.id}`,
              completionId: x.id,
              userId: s.userId,
              createdAt: x.date,
            }))
          ),
        })
        expect(await s.prisma.loggedSet.count({ where: { userId: s.userId } })).toBe(2500)
        expectedKeys = [...sessions]
          .sort((a, b) => a.date.getTime() - b.date.getTime() || (a.id < b.id ? -1 : 1))
          .flatMap((x) => Array.from({ length: x.size }, (_, k) => `${x.id}:${k + 1}`))
      })
      When('the agent pages through "export_training_data" with a limit of 1000', async () => {
        const all = await exportAll({ since, until, limit: 1000 })
        pages = all.pages
        rows = all.rows
      })
      Then('it gets pages of 1000, 1000 and 500, and the last page has no next cursor', async () => {
        expect(pages.map((p) => p.rows.length)).toEqual([1000, 1000, 500])
        expect(pages.map((p) => p.rowCount)).toEqual([1000, 1000, 500])
        expect(typeof pages[0].nextCursor).toBe('string')
        expect(typeof pages[1].nextCursor).toBe('string')
        expect(pages[0].nextCursor).not.toBe(pages[1].nextCursor)
        expect(pages[2].nextCursor).toBeNull()
        // The default limit is 1000, the maximum is 2000.
        const dflt = await exportPage({ since, until })
        expect(dflt.rows).toHaveLength(1000)
        expect(dflt.nextCursor).not.toBeNull()
        const max = await exportPage({ since, until, limit: 2000 })
        expect(max.rows).toHaveLength(2000)
        expect(max.nextCursor).not.toBeNull()
      })
      And('together they hold every set exactly once', () => {
        const keys = asObjects(rows).map((r) => `${r.completionId}:${r.setNumber}`)
        expect(keys).toHaveLength(2500)
        expect(new Set(keys).size).toBe(2500)
        // And in the documented order: date, completionId, exercise order, set number.
        expect(keys).toEqual(expectedKeys)
      })
    })

    RuleScenario('The range and session rules are applied', ({ Given, When, Then }) => {
      const since = utc(NOW_YEAR, 2, 1, 0)
      const until = utc(NOW_YEAR, 2, 10, 0)
      const at = (ms: number) => new Date(since.getTime() + ms)

      Given(
        'Dustin has sets before "since", on "since" and after "until", plus an archived workout, a draft and another user\'s workout',
        async () => {
          const one = (weight: number, date: Date, extra: Partial<SessionSpec> = {}) =>
            seedSession({ date, exercises: [{ def: s.squat, sets: [{ weight }] }], ...extra })
          await one(100, at(-1)) // 1 ms before since: out
          await one(110, at(0)) // exactly since: in
          await one(120, at(1 * DAY)) // in
          await one(170, at(2 * DAY), { status: 'abandoned' }) // abandoned: in
          await one(130, until) // exactly until: out
          await one(140, new Date(until.getTime() + DAY)) // after until: out
          await one(150, at(3 * DAY), { archived: true }) // archived: out
          await one(160, at(3 * DAY), { status: 'draft' }) // draft: out
          await one(165, at(3 * DAY), { status: 'skipped' }) // skipped: out
          await one(180, at(3 * DAY), { userId: s.otherUserId }) // another user: out
        }
      )
      When('the agent calls "export_training_data" for that range', async () => {
        s.last = await callAgentTool('export_training_data', { since: since.toISOString(), until: until.toISOString() })
      })
      Then("only Dustin's completed and abandoned, unarchived sets from since up to until are returned", async () => {
        const page = await exportPage({ since: since.toISOString(), until: until.toISOString() })
        expect(weightsOf(page.rows)).toEqual([110, 120, 170])
        expect(asObjects(page.rows).map((r) => r.status)).toEqual(['completed', 'completed', 'abandoned'])
        expect(page.rowCount).toBe(3)
        expect(page.nextCursor).toBeNull()
        expect(s.last!.text).not.toContain(s.otherUserId)
      })
    })

    RuleScenario('A bad range or cursor is refused', ({ When, Then }) => {
      When('the agent calls "export_training_data" with "until" before "since"', async () => {
        s.last = await callAgentTool('export_training_data', {
          since: '2026-06-01T00:00:00.000Z',
          until: '2026-05-01T00:00:00.000Z',
        })
      })
      Then('the tool returns an error naming the field "until"', () => {
        expect(toolPayload(s.last!).field).toBe('until')
        expect(typeof toolPayload(s.last!).error).toBe('string')
      })
    })
  })

  Rule('A script can download the same rows as CSV', ({ RuleScenario }) => {
    RuleScenario('Downloading a year as CSV', ({ Given, When, Then }) => {
      const first = new Date(Date.now() - 5 * DAY)
      first.setUTCHours(12, 0, 0, 0)
      const sinceDate = `${first.getUTCFullYear()}-01-01`

      Given('Dustin logged sets this year', async () => {
        await seedSession({
          date: first,
          name: 'Leg Day',
          sessionRpe: 7,
          durationSeconds: 2400,
          exercises: [
            {
              def: s.squat,
              sets: [
                { weight: 45, reps: 10, warmup: true },
                { weight: 62.5, reps: 5, unit: 'kg', rpe: 8 },
                { weight: 100, reps: 3, rir: 1 },
              ],
            },
          ],
        })
        await seedSession({
          date: new Date(first.getTime() + 2 * DAY),
          adHoc: true,
          exercises: [{ def: s.pullup, sets: [{ weight: 0, reps: 8 }, { weight: 0, reps: 7 }] }],
        })
        // Not in the export: another user's, and an archived session.
        await seedSession({ userId: s.otherUserId, date: first, exercises: [{ def: s.squat, sets: [{ weight: 999 }] }] })
        await seedSession({ date: first, archived: true, exercises: [{ def: s.squat, sets: [{ weight: 888 }] }] })
      })
      When('a script requests "/api/agent/export.csv" since January 1st with the sandbox token', async () => {
        s.response = await getCsv(`?since=${sinceDate}`)
      })
      Then(
        'the response is a CSV attachment with the column header and one line per set, matching the MCP rows',
        async () => {
          const res = s.response!
          expect(res.status).toBe(200)
          expect(res.headers.get('content-type')?.toLowerCase()).toBe('text/csv; charset=utf-8')
          expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="ripit-training-[^"/\\]+\.csv"$/)
          const text = await res.text()
          expect(text.split(/\r?\n/)[0]).toBe(COLUMNS.join(','))
          const table = parseCsv(text).filter((r) => !(r.length === 1 && r[0] === ''))
          expect(table[0]).toEqual(COLUMNS)
          expect(table).toHaveLength(1 + 5)

          const mcp = (await exportAll({ since: sinceDate })).rows
          expect(mcp).toHaveLength(5)
          expect(table.slice(1)).toEqual(mcp.map((r) => r.map(cell)))
          // Spot checks: warmups kept and flagged, nulls are empty, weights as logged.
          const body = table.slice(1).map((r) => Object.fromEntries(COLUMNS.map((c, i) => [c, r[i]])))
          expect(body.map((r) => r.isWarmup)).toEqual(['true', 'false', 'false', 'false', 'false'])
          expect(body[1]).toMatchObject({ weight: '62.5', unit: 'kg', rpe: '8', rir: '' })
          expect(body[2]).toMatchObject({ weight: '100', unit: 'lbs', rpe: '', rir: '1' })
          expect(body[3]).toMatchObject({ workoutName: '', sessionRpe: '', durationSeconds: '', weight: '0' })
          expect(text).not.toContain('999')
          expect(text).not.toContain('888')
        }
      )
    })

    RuleScenario('No valid token, no data', ({ When, Then }) => {
      let responses: Response[] = []
      When('a script requests "/api/agent/export.csv" with no token, or with a revoked token', async () => {
        await seedSession({ date: utc(NOW_YEAR, 0, 15), name: 'Secret Leg Day', exercises: [{ def: s.squat, sets: [{ weight: 100 }] }] })
        const { createAgentToken, revokeAgentToken } = await agentTokens()
        const revoked = await createAgentToken(s.prisma, s.userId, 'old sandbox')
        await revokeAgentToken(s.prisma, revoked.record.id, s.userId)
        const q = `?since=${NOW_YEAR}-01-01&until=${NOW_YEAR + 1}-01-01`
        responses = [
          await getCsv(q, {}),
          await getCsv(q, bearer(revoked.token)),
          await getCsv(q, bearer('ripit_at_not-a-real-token')),
          await getCsv(q, { authorization: 'Bearer' }),
          await getCsv(q, { authorization: `Basic ${s.token}` }),
          // The token is not accepted in the URL.
          await getCsv(`${q}&token=${s.token}`, {}),
          // Auth comes before validation, so a bad range gives no hints either.
          await getCsv('?since=nonsense', {}),
        ]
      })
      Then('the response is 401', async () => {
        expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401, 401])
        for (const r of responses) {
          const text = await r.text()
          expect(text).not.toContain('Secret Leg Day')
          expect(text).not.toContain(COLUMNS.join(','))
        }
        // And the valid token still works.
        const ok = await getCsv(`?since=${NOW_YEAR}-01-01&until=${NOW_YEAR + 1}-01-01`)
        expect(ok.status).toBe(200)
        expect(await ok.text()).toContain('Secret Leg Day')
      })
    })

    RuleScenario('A range over 3 years is refused', ({ When, Then }) => {
      When('a script requests "/api/agent/export.csv" for a 4-year range', async () => {
        s.response = await getCsv(`?since=${NOW_YEAR - 4}-01-01&until=${NOW_YEAR}-01-01`)
      })
      Then('the response is 400 naming the field "since"', async () => {
        const res = s.response!
        expect(res.status).toBe(400)
        expect(res.headers.get('content-type')).toContain('application/json')
        const body = await res.json()
        expect(body.field).toBe('since')
        expect(typeof body.error).toBe('string')
        expect(res.headers.get('content-disposition')).toBeNull()
      })
    })

    RuleScenario('Text that looks like a formula is made safe', ({ Given, When, Then }) => {
      let rows: string[][] = []
      let raw = ''
      const col = (row: string[], name: string) => row[COLUMNS.indexOf(name)]
      const date = utc(NOW_YEAR, 0, 15)

      Given('Dustin named an ad-hoc workout "=HYPERLINK(1)"', async () => {
        const oneSet = (def: Def, weight = 100): SessionSpec['exercises'] => [{ def, sets: [{ weight }] }]
        const at = (d: number) => new Date(date.getTime() + d * DAY)
        await seedSession({ date: at(0), name: '=HYPERLINK(1)', exercises: oneSet(s.squat) })
        await seedSession({ date: at(1), name: '+1 day', exercises: oneSet(s.squat) })
        await seedSession({ date: at(2), name: '-leg day', exercises: oneSet(s.squat) })
        await seedSession({ date: at(3), name: '@home', exercises: oneSet(s.squat) })
        await seedSession({ date: at(4), name: '=SUM(1,2)', exercises: oneSet(s.squat) })
        await seedSession({ date: at(5), name: 'Push, Pull "A"', exercises: oneSet(s.squat) })
        await seedSession({ date: at(6), name: 'Plain Day', exercises: oneSet(s.squat) })
        // An exercise name that starts with a formula character.
        const cable = await createTestExerciseDefinition(s.prisma, { name: '-Cable Fly' })
        await seedSession({ date: at(7), name: 'Cables', exercises: oneSet(cable) })
        // A number that starts with "-": all-numeric cells are never touched. Not possible in
        // real use, but the guard must not quote or prefix it.
        await seedSession({ date: at(8), name: 'Negative', exercises: [{ def: s.squat, sets: [{ weight: -2.5, reps: 5 }] }] })
      })
      When('a script downloads the CSV', async () => {
        const res = await getCsv(`?since=${NOW_YEAR}-01-01&until=${NOW_YEAR + 1}-01-01`)
        expect(res.status).toBe(200)
        raw = await res.text()
        rows = parseCsv(raw)
          .filter((r) => !(r.length === 1 && r[0] === ''))
          .slice(1)
        expect(rows).toHaveLength(9)
      })
      Then('that workout name starts with a single quote', () => {
        expect(rows.map((r) => col(r, 'workoutName'))).toEqual([
          "'=HYPERLINK(1)",
          "'+1 day",
          "'-leg day",
          "'@home",
          "'=SUM(1,2)",
          'Push, Pull "A"',
          'Plain Day',
          'Cables',
          'Negative',
        ])
        expect(col(rows[7], 'exerciseName')).toBe("'-Cable Fly")
        expect(col(rows[0], 'exerciseName')).toBe('Back Squat')
        // RFC 4180 quoting on the wire: commas and quotes are quoted, and the guard comes before the quoting.
        expect(raw).toContain(`"'=SUM(1,2)"`)
        expect(raw).toContain('"Push, Pull ""A"""')
        // Numbers are never guarded or quoted.
        expect(col(rows[8], 'weight')).toBe('-2.5')
        expect(raw).toMatch(/,-2\.5,lbs,/)
        expect(raw).not.toContain("'-2.5")
        expect(raw).not.toContain('"-2.5"')
        // Dates, ids and booleans are left alone too.
        expect(col(rows[0], 'date')).toBe(date.toISOString())
        expect(col(rows[0], 'isWarmup')).toBe('false')
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Edges the feature file doesn't spell out (spec: "Training data export").
// ---------------------------------------------------------------------------
describe('training export edges', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('lists export_training_data and points agents at the CSV endpoint', async () => {
    const { listTools } = await tools()
    const raw = (await listTools()) as unknown
    const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? [])
    const tool = (list as Array<{ name: string; description: string }>).find((t) => t.name === 'export_training_data')
    expect(tool, 'export_training_data should be listed').toBeDefined()
    expect(tool!.description).toContain('/api/agent/export.csv')
  })

  it.each([
    ['no since', {}, 'since'],
    ['unparseable since', { since: 'last tuesday' }, 'since'],
    ['an empty since', { since: '' }, 'since'],
    ['unparseable until', { since: '2026-01-01', until: 'soon' }, 'until'],
    ['until equal to since', { since: '2026-01-01', until: '2026-01-01' }, 'until'],
    ['until before since', { since: '2026-02-01', until: '2026-01-01' }, 'until'],
    ['an invalid cursor', { since: '2026-01-01', until: '2026-02-01', cursor: 'not-a-cursor' }, 'cursor'],
    ['limit 0', { since: '2026-01-01', until: '2026-02-01', limit: 0 }, 'limit'],
    ['limit 2001', { since: '2026-01-01', until: '2026-02-01', limit: 2001 }, 'limit'],
  ])('refuses %s with a tool error naming the field', async (_label, args, field) => {
    const o = await callAgentTool('export_training_data', args)
    expect(toolPayload(o).field).toBe(field)
  })

  describe('with history', () => {
    const since = utc(2026, 4, 1, 0)
    const until = utc(2026, 5, 1, 0)
    const args = { since: since.toISOString(), until: until.toISOString() }

    beforeEach(async () => {
      const d = (n: number) => new Date(since.getTime() + n * DAY + 12 * 3600_000)
      // Two sessions share a date, and their ids sort opposite to creation order.
      await seedSession({ id: 'zzz1', date: d(1), exercises: [{ def: s.squat, sets: [{ weight: 100 }, { weight: 105 }] }] })
      await seedSession({ id: 'aaa1', date: d(1), exercises: [{ def: s.squat, sets: [{ weight: 200 }] }] })
      // One session with two exercises, listed in the opposite order to their ids.
      await seedSession({
        date: d(2),
        exercises: [
          { def: s.squat, sets: [{ weight: 300 }], order: 2 },
          { def: s.pullup, sets: [{ weight: 0 }, { weight: 5 }], order: 1 },
        ],
      })
    })

    it('orders by date, completionId, exercise order, then set number', async () => {
      const rows = asObjects((await exportPage(args)).rows)
      expect(rows.map((r) => [r.completionId, r.exerciseName, r.setNumber])).toEqual([
        ['aaa1', 'Back Squat', 1],
        ['zzz1', 'Back Squat', 1],
        ['zzz1', 'Back Squat', 2],
        [rows[3].completionId, 'Pull-up', 1],
        [rows[3].completionId, 'Pull-up', 2],
        [rows[3].completionId, 'Back Squat', 1],
      ])
      expect(rows.map((r) => r.weight)).toEqual([200, 100, 105, 0, 5, 300])
    })

    it('paging one row at a time returns the same rows, none skipped or repeated', async () => {
      const whole = (await exportPage(args)).rows
      const walked = await exportAll({ ...args, limit: 1 })
      expect(walked.pages).toHaveLength(6)
      expect(walked.pages.slice(0, 5).every((p) => p.rows.length === 1 && p.nextCursor !== null)).toBe(true)
      expect(walked.pages[5].nextCursor).toBeNull()
      expect(walked.rows).toEqual(whole)
      // Pages of 4 as well: a boundary inside a session.
      expect((await exportAll({ ...args, limit: 4 })).rows).toEqual(whole)
    })

    it('a date-only range is the same as the ISO timestamps at midnight UTC', async () => {
      const whole = (await exportPage(args)).rows
      const dates = await exportPage({ since: isoDate(since), until: isoDate(until) })
      expect(dates.rows).toEqual(whole)
    })

    it('until defaults to now, and is exclusive', async () => {
      await seedSession({ date: new Date(Date.now() - DAY), exercises: [{ def: s.squat, sets: [{ weight: 410 }] }] })
      await seedSession({ date: new Date(Date.now() + DAY), exercises: [{ def: s.squat, sets: [{ weight: 420 }] }] })
      const page = await exportPage({ since: isoDate(since) })
      const weights = weightsOf(page.rows)
      expect(weights).toContain(410)
      expect(weights).not.toContain(420)
    })

    it('an empty until behaves as absent: ending now, exclusive', async () => {
      await seedSession({ date: new Date(Date.now() - DAY), exercises: [{ def: s.squat, sets: [{ weight: 410 }] }] })
      await seedSession({ date: new Date(Date.now() + DAY), exercises: [{ def: s.squat, sets: [{ weight: 420 }] }] })
      const page = await exportPage({ since: isoDate(since), until: '' })
      const weights = weightsOf(page.rows)
      expect(weights).toContain(410)
      expect(weights).not.toContain(420)
      expect(page.rows).toEqual((await exportPage({ since: isoDate(since) })).rows)
    })

    it('limit 1 and 2000 are accepted', async () => {
      expect((await exportPage({ ...args, limit: 1 })).rows).toHaveLength(1)
      expect((await exportPage({ ...args, limit: 2000 })).rows).toHaveLength(6)
    })

    it('rows are as logged: nothing is guarded, converted or derived', async () => {
      await seedSession({
        date: new Date(since.getTime() + 5 * DAY),
        name: '=HYPERLINK(1)',
        exercises: [{ def: s.squat, sets: [{ weight: 50, unit: 'kg', reps: 3 }] }],
      })
      const rows = asObjects((await exportPage(args)).rows)
      const last = rows[rows.length - 1]
      expect(last).toMatchObject({ workoutName: '=HYPERLINK(1)', weight: 50, unit: 'kg', reps: 3 })
      expect(Object.keys(last)).toEqual(COLUMNS)
    })

    it('a program session without its own name takes the program workout name, and an own name wins', async () => {
      const program = await createTestProgram(s.prisma, s.userId)
      const workout = program.weeks[0].workouts[0]
      const when = (n: number) => new Date(since.getTime() + n * DAY + 12 * 3600_000)
      await seedSession({ date: when(10), adHoc: false, workoutId: workout.id, exercises: [{ def: s.squat, sets: [{ weight: 11 }] }] })
      await seedSession({ date: when(11), adHoc: false, workoutId: workout.id, name: 'Renamed', exercises: [{ def: s.squat, sets: [{ weight: 12 }] }] })
      await seedSession({ date: when(12), exercises: [{ def: s.squat, sets: [{ weight: 13 }] }] })
      const rows = asObjects((await exportPage(args)).rows).filter((r) => [11, 12, 13].includes(r.weight as number))
      expect(rows.map((r) => r.workoutName)).toEqual([workout.name, 'Renamed', null])
    })
  })

  describe('the CSV route', () => {
    it('names the file after the range', async () => {
      const res = await getCsv('?since=2026-01-01&until=2026-02-01')
      expect(res.status).toBe(200)
      expect(res.headers.get('content-disposition')).toBe('attachment; filename="ripit-training-2026-01-01-2026-02-01.csv"')
    })

    it('an empty range is a header line and no rows', async () => {
      const res = await getCsv('?since=2026-01-01&until=2026-02-01')
      const table = parseCsv(await res.text()).filter((r) => !(r.length === 1 && r[0] === ''))
      expect(table).toEqual([COLUMNS])
    })

    it('has no paging: it returns every row in one response', async () => {
      const day0 = utc(2026, 0, 5)
      await seedSession({
        date: day0,
        exercises: [{ def: s.squat, sets: Array.from({ length: 2100 }, (_, i) => ({ weight: 100 + (i % 7) })) }],
      })
      const res = await getCsv('?since=2026-01-01&until=2026-02-01')
      const table = parseCsv(await res.text()).filter((r) => !(r.length === 1 && r[0] === ''))
      expect(table).toHaveLength(1 + 2100)
    })

    it.each([
      ['a tab', '\t=1'],
      ['a tab before text', '\tnote'],
      ['a carriage return', '\r=1'],
      ['a carriage return before text', '\rnote'],
      ['a space before =', ' =1+1'],
      ['two spaces before @', '  @x'],
      ['a space before +', ' +1'],
      ['a space before -', ' -x'],
    ])('guards text starting with %s', async (_label, name) => {
      await seedSession({ date: utc(2026, 0, 15), name, exercises: [{ def: s.squat, sets: [{ weight: 100 }] }] })
      const res = await getCsv('?since=2026-01-01&until=2026-02-01')
      expect(res.status).toBe(200)
      const rows = parseCsv(await res.text())
        .filter((r) => !(r.length === 1 && r[0] === ''))
        .slice(1)
      expect(rows).toHaveLength(1)
      expect(rows[0][COLUMNS.indexOf('workoutName')]).toBe(`'${name}`)
    })

    it('leaves plain text with a leading space alone', async () => {
      await seedSession({ date: utc(2026, 0, 15), name: ' hello', exercises: [{ def: s.squat, sets: [{ weight: 100 }] }] })
      await seedSession({ date: utc(2026, 0, 16), name: 'a =b', exercises: [{ def: s.squat, sets: [{ weight: 100 }] }] })
      const text = await (await getCsv('?since=2026-01-01&until=2026-02-01')).text()
      const rows = parseCsv(text)
        .filter((r) => !(r.length === 1 && r[0] === ''))
        .slice(1)
      expect(rows.map((r) => r[COLUMNS.indexOf('workoutName')])).toEqual([' hello', 'a =b'])
    })

    it('treats an empty until= as absent: 200, ending now', async () => {
      await seedSession({ date: new Date(Date.now() - DAY), name: 'Yesterday', exercises: [{ def: s.squat, sets: [{ weight: 100 }] }] })
      await seedSession({ date: new Date(Date.now() + DAY), name: 'Tomorrow', exercises: [{ def: s.squat, sets: [{ weight: 100 }] }] })
      const res = await getCsv('?since=2026-01-01&until=')
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('Yesterday')
      expect(text).not.toContain('Tomorrow')
      // The same as leaving until out altogether.
      expect(await (await getCsv('?since=2026-01-01')).text()).toBe(text)
    })

    it('treats an empty since= as absent, so it is still required', async () => {
      const res = await getCsv('?since=&until=2026-02-01')
      expect(res.status).toBe(400)
      expect((await res.json()).field).toBe('since')
    })

    it('accepts exactly 1096 days and refuses 1097', async () => {
      const start = utc(2023, 0, 1, 0)
      const end = (days: number) => isoDate(new Date(start.getTime() + days * DAY))
      expect((await getCsv(`?since=${isoDate(start)}&until=${end(1096)}`)).status).toBe(200)
      const over = await getCsv(`?since=${isoDate(start)}&until=${end(1097)}`)
      expect(over.status).toBe(400)
      expect((await over.json()).field).toBe('since')
    })

    it.each([
      ['no since', '', 'since'],
      ['an unparseable since', '?since=nonsense', 'since'],
      ['an unparseable until', '?since=2026-01-01&until=nonsense', 'until'],
      ['until equal to since', '?since=2026-01-01&until=2026-01-01', 'until'],
      ['until before since', '?since=2026-02-01&until=2026-01-01', 'until'],
    ])('answers %s with 400 and a JSON error naming the field', async (_label, query, field) => {
      const res = await getCsv(query)
      expect(res.status).toBe(400)
      expect(res.headers.get('content-type')).toContain('application/json')
      const body = await res.json()
      expect(body.field).toBe(field)
      expect(typeof body.error).toBe('string')
    })

    it("never returns another user's rows", async () => {
      await seedSession({ userId: s.otherUserId, date: utc(2026, 0, 10), name: 'Not Dustin', exercises: [{ def: s.squat, sets: [{ weight: 777 }] }] })
      const text = await (await getCsv('?since=2026-01-01&until=2026-02-01')).text()
      expect(text).not.toContain('Not Dustin')
      expect(text).not.toContain('777')
    })
  })
})
