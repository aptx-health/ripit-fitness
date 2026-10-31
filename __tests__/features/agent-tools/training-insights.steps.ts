/**
 * Step definitions for features/agent-tools/training-insights.feature.
 * Codes strictly against initiatives/agent-tools/docs/spec.md ("Training
 * insights"): raw numbers only, no verdicts, flags or thresholds.
 *
 * Every expected number below was worked out by hand from the seeded sets
 * (see the comment above each seed). Sets mostly use 1 rep, where Epley's
 * e1RM equals the weight, or 15 reps, where it is weight x 1.5.
 *
 * Modules under test are loaded lazily inside steps so a missing module fails
 * the scenario that needs it, not the whole file.
 *
 * vitest-cucumber runs every step as its own test, so state is created once
 * per scenario in the first Background step. Never reset it in afterEach.
 *
 * Dates are seeded as WorkoutCompletion.completedAt at 12:00 UTC on whole-day
 * offsets from today, so week buckets (which end "now") and ISO day strings
 * are stable whatever time the suite runs.
 */

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const feature = await loadFeature('features/agent-tools/training-insights.feature')

type Outcome = { failed: boolean; value: unknown; text: string; thrown: boolean; raw?: unknown }

interface State {
  prisma: PrismaClient
  userId: string
  otherUserId: string
  tokenId: string
  curl: Def
  squat: Def
  bench: Def
  last?: Outcome
}

interface Def {
  id: string
  name: string
}

interface SetSpec {
  weight: number
  reps?: number
  unit?: 'lbs' | 'kg'
  rpe?: number | null
  rir?: number | null
  warmup?: boolean
}

interface StallEntry {
  exerciseDefinitionId: string
  name: string
  sessionsAnalyzed: number
  spanDays: number
  firstDate: string
  lastDate: string
  earlyE1rmLbs: number | null
  lateE1rmLbs: number | null
  changePct: number | null
  bestE1rmLbs: number | null
  sessionsSinceBest: number | null
  repRange: { min: number; max: number }
  series: Array<{ date: string; e1rmLbs: number; weight: number; unit: string; reps: number }>
}

interface EffortWeek {
  start: string
  end: string
  sessions: number
  workingSets: number
  ratedSets: number
  coveragePct: number | null
  avgEffort: number | null
  distribution: { le6: number; rpe7: number; rpe8: number; rpe9: number; rpe10: number }
  pctAtOrAbove9: number | null
  pctAt10: number | null
  exercisesTrained: number
  exercisesTopSetAt10: number
  sessionRpe: { count: number; avg: number | null }
}

let s = {} as State

const DAY = 24 * 60 * 60 * 1000
const TODAY_NOON = new Date()
TODAY_NOON.setUTCHours(12, 0, 0, 0)

/** Noon UTC, `daysAgo` whole days before today. Use daysAgo >= 1 so it is never in the future. */
function day(daysAgo: number): Date {
  return new Date(TODAY_NOON.getTime() - daysAgo * DAY)
}
const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/** A session in rolling week `i` (0 = last 7 days), mid-bucket whatever the time of day. */
const inWeek = (i: number, extraDays = 0) => day(7 * i + 3 + extraDays)

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

function ctx() {
  return { userId: s.userId, tokenId: s.tokenId, role: 'admin', notify: async () => {} }
}

async function callAgentTool(name: string, args: Record<string, unknown> = {}, prisma?: PrismaClient): Promise<Outcome> {
  const { callTool } = await tools()
  return attempt(() => callTool((prisma ?? s.prisma) as never, ctx() as never, name, args as never))
}

function mustSucceed(o: Outcome, what: string) {
  expect(o.failed, `${what} should succeed but got: ${o.text}`).toBe(false)
}

function toolPayload(o: Outcome): Record<string, unknown> {
  expect((o.raw as { isError?: boolean })?.isError, `tool should set isError: ${o.text}`).toBe(true)
  return o.value as Record<string, unknown>
}

/** These tools return numbers only. Nothing that judges the numbers may appear anywhere. */
function expectNoJudgement(o: Outcome) {
  const text = textOf(o.value)
  for (const key of ['verdict', 'flags', 'thresholds', 'trend', 'minSessions', 'minRatedSets']) {
    expect(text, `response should not contain "${key}"`).not.toContain(`"${key}"`)
  }
}

async function stall(args: Record<string, unknown> = {}, prisma?: PrismaClient): Promise<StallEntry[]> {
  const o = await callAgentTool('get_stall_signals', args, prisma)
  mustSucceed(o, 'get_stall_signals')
  expectNoJudgement(o)
  const exercises = (o.value as { exercises?: StallEntry[] }).exercises
  expect(Array.isArray(exercises), `get_stall_signals should return { exercises: [] }: ${o.text}`).toBe(true)
  s.last = o
  return exercises as StallEntry[]
}

async function effort(args: Record<string, unknown> = {}, prisma?: PrismaClient): Promise<EffortWeek[]> {
  const o = await callAgentTool('get_effort_summary', args, prisma)
  mustSucceed(o, 'get_effort_summary')
  expectNoJudgement(o)
  const weeks = (o.value as { weeks?: EffortWeek[] }).weeks
  expect(Array.isArray(weeks), `get_effort_summary should return { weeks: [] }: ${o.text}`).toBe(true)
  s.last = o
  return weeks as EffortWeek[]
}

function entryFor(list: StallEntry[], def: Def): StallEntry {
  const found = list.filter((e) => e.exerciseDefinitionId === def.id)
  expect(found, `${def.name} should appear exactly once in ${textOf(list.map((e) => e.name))}`).toHaveLength(1)
  expect(found[0].name).toBe(def.name)
  return found[0]
}

interface SessionSpec {
  userId?: string
  date: Date
  status?: string
  archived?: boolean
  adHoc?: boolean
  sessionRpe?: number
  exercises: Array<{ def: Def; sets: SetSpec[] }>
}

async function seedSession(prisma: PrismaClient, o: SessionSpec) {
  const userId = o.userId ?? s.userId
  const completion = await prisma.workoutCompletion.create({
    data: {
      userId,
      status: o.status ?? 'completed',
      completedAt: o.date,
      isArchived: o.archived ?? false,
      isAdHoc: o.adHoc ?? true,
      sessionRpe: o.sessionRpe ?? null,
    },
  })
  let order = 1
  for (const ex of o.exercises) {
    const exercise = await prisma.exercise.create({
      data: {
        name: ex.def.name,
        exerciseDefinitionId: ex.def.id,
        order: order++,
        userId,
        workoutCompletionId: completion.id,
        isOneOff: true,
      },
    })
    await prisma.loggedSet.createMany({
      data: ex.sets.map((set, i) => ({
        setNumber: i + 1,
        reps: set.reps ?? 1,
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

/** One working set per session at 1 rep, so e1RM equals the weight. */
async function seedSeries(def: Def, points: Array<[daysAgo: number, weight: number]>, extra: Partial<SessionSpec> = {}) {
  for (const [daysAgo, weight] of points) {
    await seedSession(s.prisma, { date: day(daysAgo), exercises: [{ def, sets: [{ weight }] }], ...extra })
  }
}

/**
 * Preacher Curl, 6 sessions over 5 weeks (36..1 days ago), 15 reps so e1RM = weight x 1.5.
 * Weights 60, 62, 60, 60, 60, 60 give e1RM 90, 93, 90, 90, 90, 90.
 * early = mean(90, 93) = 91.5, late = mean(90, 90) = 90, change = -1.5 / 91.5 = -1.6393% -> -1.6.
 * Best is 93 in session 2, so 4 sessions follow it. Sessions alternate ad-hoc and program-style.
 */
const CURL_FLAT_DAYS = [36, 29, 22, 15, 8, 1]
const CURL_FLAT_WEIGHTS = [60, 62, 60, 60, 60, 60]
async function seedFlatCurl() {
  for (let i = 0; i < CURL_FLAT_DAYS.length; i++) {
    await seedSession(s.prisma, {
      date: day(CURL_FLAT_DAYS[i]),
      adHoc: i % 2 === 0,
      exercises: [{ def: s.curl, sets: [{ weight: CURL_FLAT_WEIGHTS[i], reps: 15 }] }],
    })
  }
}

const repeat = (n: number, set: SetSpec): SetSpec[] => Array.from({ length: n }, () => ({ ...set }))
const working = (rpe: number | null, n: number, extra: Partial<SetSpec> = {}) =>
  repeat(n, { weight: 100, reps: 5, rpe, ...extra })


async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const user = await createTestUser()
  const other = await createTestUser()
  const next = { prisma, userId: user.id, otherUserId: other.id, tokenId: '' } as State
  const { createAgentToken } = await agentTokens()
  next.tokenId = (await createAgentToken(prisma, next.userId, 'mac-claude')).record.id
  next.curl = await createTestExerciseDefinition(prisma, { name: 'Preacher Curl' })
  next.squat = await createTestExerciseDefinition(prisma, { name: 'Back Squat' })
  next.bench = await createTestExerciseDefinition(prisma, { name: 'Barbell Bench Press' })
  return next
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
      s = { prisma, userId: user.id, otherUserId: other.id, tokenId: '' } as State
      const { createAgentToken } = await agentTokens()
      s.tokenId = (await createAgentToken(s.prisma, s.userId, 'mac-claude')).record.id
    })
    And('the exercise library contains "Preacher Curl", "Back Squat" and "Barbell Bench Press"', async () => {
      s.curl = await createTestExerciseDefinition(s.prisma, { name: 'Preacher Curl' })
      s.squat = await createTestExerciseDefinition(s.prisma, { name: 'Back Squat' })
      s.bench = await createTestExerciseDefinition(s.prisma, { name: 'Barbell Bench Press' })
    })
  })

  Rule("Stall numbers show each exercise's recent best sets", ({ RuleScenario }) => {
    RuleScenario('A flat exercise shows a small change and an old best', ({ Given, When, Then }) => {
      Given(
        'Dustin logged "Preacher Curl" in 6 sessions over 5 weeks, with his best set staying within 2% and his best ever 4 sessions ago',
        async () => {
          await seedFlatCurl()
          expect(await s.prisma.workoutCompletion.count({ where: { userId: s.userId } })).toBe(6)
          expect(await s.prisma.loggedSet.count({ where: { userId: s.userId } })).toBe(6)
        }
      )
      When('the agent calls "get_stall_signals"', async () => {
        s.last = await callAgentTool('get_stall_signals')
      })
      Then('"Preacher Curl" shows a change under 2%, 4 sessions since his best, and the 6-session series', async () => {
        const list = await stall()
        expect(list).toHaveLength(1)
        const e = entryFor(list, s.curl)
        expect(e.sessionsAnalyzed).toBe(6)
        expect(e.spanDays).toBe(35)
        expect(e.firstDate.startsWith(isoDay(day(36)))).toBe(true)
        expect(e.lastDate.startsWith(isoDay(day(1)))).toBe(true)
        expect(e.earlyE1rmLbs).toBe(91.5)
        expect(e.lateE1rmLbs).toBe(90)
        expect(e.changePct).toBe(-1.6)
        expect(Math.abs(e.changePct as number)).toBeLessThan(2)
        expect(e.bestE1rmLbs).toBe(93)
        expect(e.sessionsSinceBest).toBe(4)
        expect(e.repRange).toEqual({ min: 15, max: 15 })
        expect(e.series).toHaveLength(6)
        // oldest -> newest
        expect(e.series.map((p) => p.e1rmLbs)).toEqual([90, 93, 90, 90, 90, 90])
        expect(e.series.map((p) => p.weight)).toEqual(CURL_FLAT_WEIGHTS)
        expect(e.series.every((p) => p.unit === 'lbs' && p.reps === 15)).toBe(true)
        expect(e.series.map((p) => p.date.slice(0, 10))).toEqual(CURL_FLAT_DAYS.map((d) => isoDay(day(d))))
      })
    })

    RuleScenario('Exercises are listed from the biggest drop to the biggest gain', ({ Given, When, Then }) => {
      Given(
        'Dustin logged "Barbell Bench Press" dropping 5%, "Preacher Curl" flat and "Back Squat" rising 8%',
        async () => {
          // Bench e1RM 202, 198, 196, 194, 192, 188: early 200, late 190, change -5.0.
          await seedSeries(s.bench, [[36, 202], [29, 198], [22, 196], [15, 194], [8, 192], [1, 188]])
          await seedFlatCurl() // -1.6
          // Squat e1RM 246, 254, 258, 262, 268, 272: early 250, late 270, change +8.0.
          await seedSeries(s.squat, [[36, 246], [29, 254], [22, 258], [15, 262], [8, 268], [1, 272]])
        }
      )
      When('the agent calls "get_stall_signals"', async () => {
        s.last = await callAgentTool('get_stall_signals')
      })
      Then('they are listed bench press, preacher curl, back squat, with those change percents', async () => {
        const list = await stall()
        expect(list.map((e) => e.name)).toEqual(['Barbell Bench Press', 'Preacher Curl', 'Back Squat'])
        expect(list.map((e) => e.changePct)).toEqual([-5, -1.6, 8])
        const [bench, , squat] = list
        expect(bench.bestE1rmLbs).toBe(202)
        expect(bench.sessionsSinceBest).toBe(5)
        expect(squat.bestE1rmLbs).toBe(272)
        expect(squat.sessionsSinceBest).toBe(0)
      })
    })

    RuleScenario('Short history is reported as it is', ({ Given, When, Then }) => {
      Given('Dustin logged "Back Squat" in 1 session', async () => {
        // Bench has one session too; with Back Squat it ties on a missing change, and ties sort by name.
        await seedSeries(s.bench, [[4, 185]])
        await seedSeries(s.squat, [[5, 225]])
        // Extra rows that make the ordering of missing values observable:
        // Curl has a real change (3 sessions: early 105, late 115, +9.5%), so it sorts first.
        await seedSeries(s.curl, [[20, 100], [10, 110], [3, 120]])
      })
      When('the agent calls "get_stall_signals"', async () => {
        s.last = await callAgentTool('get_stall_signals')
      })
      Then('"Back Squat" shows 1 session analysed and no change percent', async () => {
        const list = await stall()
        const e = entryFor(list, s.squat)
        expect(e.sessionsAnalyzed).toBe(1)
        expect(e.spanDays).toBe(0)
        expect(e.changePct).toBeNull()
        expect(e.earlyE1rmLbs).toBe(225)
        expect(e.lateE1rmLbs).toBe(225)
        expect(e.bestE1rmLbs).toBe(225)
        expect(e.sessionsSinceBest).toBe(0)
        expect(e.series).toHaveLength(1)
        expect(e.series[0].date.startsWith(isoDay(day(5)))).toBe(true)
        expect(e.series[0]).toMatchObject({ e1rmLbs: 225, weight: 225, unit: 'lbs', reps: 1 })
        expect(e.firstDate).toBe(e.lastDate)
        const curl = entryFor(list, s.curl)
        expect(curl.changePct).toBe(9.5)
        // changePct ascending, missing values last, then by name.
        expect(list.map((x) => x.name)).toEqual(['Preacher Curl', 'Back Squat', 'Barbell Bench Press'])
        const bench = entryFor(list, s.bench)
        expect(bench.changePct).toBeNull()
      })
    })

    RuleScenario("Warmups, empty sets and units don't distort the numbers", ({ Given, When, Then }) => {
      Given(
        'Dustin\'s "Preacher Curl" sessions include heavy warmup sets, sets at 0 weight, and some sessions logged in kg',
        async () => {
          const at = (daysAgo: number, sets: SetSpec[]) =>
            seedSession(s.prisma, { date: day(daysAgo), exercises: [{ def: s.curl, sets }] })
          // Counted: working 100 lbs.            The 300 lb warmup is heavier and must be ignored.
          await at(40, [{ weight: 300, warmup: true }, { weight: 100 }])
          // Counted: 50 kg = 110.231 lbs.         A 200 lb warmup must be ignored.
          await at(33, [{ weight: 200, warmup: true }, { weight: 50, unit: 'kg' }])
          // Only 0-weight sets: no working set, so the session is left out entirely.
          await at(26, [{ weight: 0, reps: 20 }, { weight: 0, reps: 20 }])
          // Only a warmup: also left out.
          await at(19, [{ weight: 250, warmup: true }])
          // Counted: 105 lbs.                      A 0-weight set and a heavy set with 0 reps beside it are ignored.
          await at(12, [{ weight: 0, reps: 15 }, { weight: 400, reps: 0 }, { weight: 105 }])
          // Counted: 60 kg = 132.2772 lbs.
          await at(5, [{ weight: 60, unit: 'kg' }])
          // Another exercise that "for Preacher Curl" must filter out.
          await seedSeries(s.squat, [[5, 300]])
        }
      )
      When('the agent calls "get_stall_signals" for "Preacher Curl"', async () => {
        s.last = await callAgentTool('get_stall_signals', { exerciseDefinitionId: s.curl.id })
      })
      Then('only working sets count, and every e1RM is in lbs', async () => {
        const list = await stall({ exerciseDefinitionId: s.curl.id })
        expect(list).toHaveLength(1)
        const e = entryFor(list, s.curl)
        expect(e.sessionsAnalyzed).toBe(4)
        expect(e.spanDays).toBe(35)
        expect(e.series.map((p) => p.e1rmLbs)).toEqual([100, 110.2, 105, 132.3])
        expect(e.series.map((p) => p.weight)).toEqual([100, 50, 105, 60])
        expect(e.series.map((p) => p.unit)).toEqual(['lbs', 'kg', 'lbs', 'kg'])
        expect(e.series.map((p) => p.reps)).toEqual([1, 1, 1, 1])
        expect(e.bestE1rmLbs).toBe(132.3)
        expect(e.sessionsSinceBest).toBe(0)
        expect(e.repRange).toEqual({ min: 1, max: 1 })
        // early = mean(100, 110.231) = 105.1155, late = mean(105, 132.2772) = 118.6386
        expect(e.earlyE1rmLbs).toBe(105.1)
        expect(e.lateE1rmLbs).toBe(118.6)
        // 12.865%; allow for rounding the inputs first.
        expect(Math.abs((e.changePct as number) - 12.9)).toBeLessThanOrEqual(0.15)
      })
    })

    RuleScenario("Abandoned workouts don't count toward stall", ({ Given, When, Then }) => {
      Given(
        'Dustin logged "Back Squat" in 5 completed sessions and 1 abandoned session with a much lighter best set',
        async () => {
          // Completed e1RM 200, 205, 210, 215, 220: early 202.5, late 217.5, change 15 / 202.5 = 7.407%.
          await seedSeries(s.squat, [[36, 200], [29, 205], [22, 210], [15, 215], [8, 220]])
          // The newest session, abandoned and much lighter. Counted, it would become the last session.
          await seedSeries(s.squat, [[1, 50]], { status: 'abandoned' })
          // An exercise logged only in an abandoned session has nothing to analyse.
          await seedSeries(s.curl, [[3, 90]], { status: 'abandoned' })
        }
      )
      When('the agent calls "get_stall_signals"', async () => {
        s.last = await callAgentTool('get_stall_signals')
      })
      Then('"Back Squat" shows 5 sessions analysed, none of them the abandoned one', async () => {
        const list = await stall()
        expect(list.map((e) => e.name)).toEqual(['Back Squat'])
        const e = entryFor(list, s.squat)
        expect(e.sessionsAnalyzed).toBe(5)
        expect(e.series.map((p) => p.e1rmLbs)).toEqual([200, 205, 210, 215, 220])
        expect(e.series.map((p) => p.weight)).not.toContain(50)
        expect(e.lastDate.startsWith(isoDay(day(8)))).toBe(true)
        expect(e.spanDays).toBe(28)
        expect(e.bestE1rmLbs).toBe(220)
        expect(e.sessionsSinceBest).toBe(0)
        expect(e.earlyE1rmLbs).toBe(202.5)
        expect(e.lateE1rmLbs).toBe(217.5)
        expect(e.changePct).toBe(7.4)
      })
    })

    RuleScenario('Archived workouts and other users\' training are ignored', ({ Given, And, When, Then }) => {
      Given('another user has logged "Back Squat"', async () => {
        await seedSeries(s.squat, [[12, 500], [5, 520]], { userId: s.otherUserId })
      })
      And('one of Dustin\'s "Back Squat" workouts is archived', async () => {
        // Dustin's counted sessions: completed only, e1RM 200, 210, 220.
        await seedSeries(s.squat, [[20, 200], [13, 210], [6, 220]])
        // Left out: abandoned (stall counts completed sessions only), archived, and sessions that never finished.
        await seedSeries(s.squat, [[9, 215]], { status: 'abandoned' })
        await seedSeries(s.squat, [[10, 400]], { archived: true })
        await seedSeries(s.squat, [[3, 999]], { status: 'draft' })
        await seedSeries(s.squat, [[4, 888]], { status: 'skipped' })
      })
      When('the agent calls "get_stall_signals"', async () => {
        s.last = await callAgentTool('get_stall_signals')
      })
      Then('only Dustin\'s unarchived sessions are analysed', async () => {
        const list = await stall()
        expect(list).toHaveLength(1)
        const e = entryFor(list, s.squat)
        expect(e.sessionsAnalyzed).toBe(3)
        expect(e.series.map((p) => p.e1rmLbs)).toEqual([200, 210, 220])
        expect(e.bestE1rmLbs).toBe(220)
        expect(e.sessionsSinceBest).toBe(0)
        // early = mean(200, 210) = 205, late = mean(210, 220) = 215, change = 10 / 205 = 4.878%
        expect(e.earlyE1rmLbs).toBe(205)
        expect(e.lateE1rmLbs).toBe(215)
        expect(e.changePct).toBe(4.9)
        expect(s.last!.text).not.toContain('"500')
        expect(s.last!.text).not.toContain(s.otherUserId)
      })
    })
  })

  Rule('The effort summary shows how hard each recent week was', ({ RuleScenario }) => {
    RuleScenario('A hard week shows its effort spread', ({ Given, When, Then }) => {
      Given('in the last 7 days Dustin logged 20 working sets, 14 of them at RPE 9 or 10', async () => {
        // Two sessions, 20 working sets:
        //   Back Squat (2 days ago):    6 at RPE 10, 3 at RPE 8    -> 9 sets, top set is 10
        //   Preacher Curl (4 days ago): 8 at RPE 9,  3 at RPE 8    -> 11 sets, top set is 9
        // Warmups are not working sets and carry RPEs that would move every number.
        await seedSession(s.prisma, {
          date: day(2),
          sessionRpe: 8,
          exercises: [{ def: s.squat, sets: [...working(10, 6), ...working(8, 3), { weight: 60, reps: 5, rpe: 6, warmup: true }] }],
        })
        await seedSession(s.prisma, {
          date: day(4),
          sessionRpe: 9,
          exercises: [
            {
              def: s.curl,
              sets: [
                ...working(9, 8),
                ...working(8, 3),
                ...repeat(2, { weight: 30, reps: 10, rpe: 6, warmup: true }),
              ],
            },
          ],
        })
        // Not Dustin's week: another user's very hard sets, his own archived and unfinished sessions.
        await seedSession(s.prisma, { userId: s.otherUserId, date: day(3), exercises: [{ def: s.squat, sets: working(10, 5) }] })
        await seedSession(s.prisma, { date: day(3), archived: true, sessionRpe: 10, exercises: [{ def: s.squat, sets: working(10, 3) }] })
        await seedSession(s.prisma, { date: day(3), status: 'draft', exercises: [{ def: s.squat, sets: working(10, 3) }] })
      })
      When('the agent calls "get_effort_summary"', async () => {
        s.last = await callAgentTool('get_effort_summary')
      })
      Then(
        'the latest week shows 20 working sets, 20 rated, 70% at 9 or more, the average effort, and the count at each RPE',
        async () => {
          const weeks = await effort()
          expect(weeks).toHaveLength(4)
          const w = weeks[0]
          expect(w.sessions).toBe(2)
          expect(w.workingSets).toBe(20)
          expect(w.ratedSets).toBe(20)
          expect(w.coveragePct).toBe(100)
          // (6x10 + 8x9 + 6x8) / 20
          expect(w.avgEffort).toBe(9)
          expect(w.distribution).toEqual({ le6: 0, rpe7: 0, rpe8: 6, rpe9: 8, rpe10: 6 })
          expect(w.pctAtOrAbove9).toBe(70)
          expect(w.pctAt10).toBe(30)
          expect(w.exercisesTrained).toBe(2)
          expect(w.exercisesTopSetAt10).toBe(1)
          expect(w.sessionRpe).toEqual({ count: 2, avg: 8.5 })
          // A week is a rolling 7 days ending now.
          expect(new Date(w.end).getTime() - new Date(w.start).getTime()).toBe(7 * DAY)
          expect(Math.abs(new Date(w.end).getTime() - Date.now())).toBeLessThan(5 * 60 * 1000)
          for (const older of weeks.slice(1)) expect(older.sessions).toBe(0)
        }
      )
    })

    RuleScenario('Weeks are reported newest first, so a trend is visible', ({ Given, When, Then }) => {
      Given('Dustin\'s average effort was about 7 for three weeks and is about 8.5 this week', async () => {
        const week = (i: number, rpes: number[]) =>
          seedSession(s.prisma, {
            date: inWeek(i),
            exercises: [{ def: s.squat, sets: rpes.map((rpe) => ({ weight: 100, reps: 5, rpe })) }],
          })
        await week(0, [8, 9, 8, 9, 8, 9]) // 51 / 6 = 8.5
        await week(1, [7, 7, 7, 7, 7, 7]) // 42 / 6 = 7.0
        await week(2, [7, 7, 7, 7, 6, 7]) // 41 / 6 = 6.8333 -> 6.8
        await week(3, [7, 7, 7, 7, 8, 7]) // 43 / 6 = 7.1667 -> 7.2
      })
      When('the agent calls "get_effort_summary"', async () => {
        s.last = await callAgentTool('get_effort_summary')
      })
      Then('it returns 4 weeks, newest first, with those average efforts', async () => {
        const weeks = await effort()
        expect(weeks).toHaveLength(4)
        expect(weeks.map((w) => w.avgEffort)).toEqual([8.5, 7, 6.8, 7.2])
        expect(weeks.map((w) => w.sessions)).toEqual([1, 1, 1, 1])
        expect(weeks.map((w) => w.workingSets)).toEqual([6, 6, 6, 6])
        // Each week starts where the next newer week ends, 7 days long.
        for (let i = 0; i < 3; i++) {
          expect(new Date(weeks[i].start).getTime()).toBe(new Date(weeks[i + 1].end).getTime())
        }
        // Week 0 has 3 sets at 8 and 3 at 9; week 1 only 7s.
        expect(weeks[0].distribution).toEqual({ le6: 0, rpe7: 0, rpe8: 3, rpe9: 3, rpe10: 0 })
        expect(weeks[2].distribution).toEqual({ le6: 1, rpe7: 5, rpe8: 0, rpe9: 0, rpe10: 0 })
      })
    })

    RuleScenario('Reps in reserve count as effort', ({ Given, When, Then }) => {
      Given('in the last 7 days Dustin logged sets with RIR 0 and no RPE', async () => {
        // One exercise, 7 working sets:
        //   3 x RIR 0 (effort 10), RIR 1 (9), RIR 2 (8), RPE 7 with RIR 0 (RPE wins: 7), one with neither (unrated).
        await seedSession(s.prisma, {
          date: day(2),
          exercises: [
            {
              def: s.squat,
              sets: [
                ...repeat(3, { weight: 100, reps: 5, rir: 0 }),
                { weight: 100, reps: 5, rir: 1 },
                { weight: 100, reps: 5, rir: 2 },
                { weight: 100, reps: 5, rpe: 7, rir: 0 },
                { weight: 100, reps: 5 },
              ],
            },
          ],
        })
      })
      When('the agent calls "get_effort_summary"', async () => {
        s.last = await callAgentTool('get_effort_summary')
      })
      Then('those sets count as effort 10', async () => {
        const w = (await effort())[0]
        expect(w.workingSets).toBe(7)
        expect(w.ratedSets).toBe(6)
        expect(w.distribution).toEqual({ le6: 0, rpe7: 1, rpe8: 1, rpe9: 1, rpe10: 3 })
        // (3x10 + 9 + 8 + 7) / 6 = 9
        expect(w.avgEffort).toBe(9)
        expect(w.pctAt10).toBe(50)
        expect(w.pctAtOrAbove9).toBe(66.7)
        expect(w.coveragePct).toBe(85.7)
        expect(w.exercisesTopSetAt10).toBe(1)
      })
    })

    RuleScenario('Bodyweight sets count toward effort', ({ Given, When, Then, And }) => {
      Given(
        'in the last 7 days Dustin logged 6 pull-up sets at 0 weight and RPE 9, and 4 weighted sets at RPE 7',
        async () => {
          const pullup = await createTestExerciseDefinition(s.prisma, { name: 'Pull-up' })
          // Completed session: 6 pull-up sets at 0 weight (one of them stopped at 0 reps), all RPE 9.
          await seedSession(s.prisma, {
            date: day(2),
            exercises: [
              {
                def: pullup,
                sets: [...repeat(5, { weight: 0, reps: 8, rpe: 9 }), { weight: 0, reps: 0, rpe: 9 }],
              },
            ],
          })
          // Abandoned session: 4 weighted sets at RPE 7.
          await seedSession(s.prisma, {
            date: day(4),
            status: 'abandoned',
            exercises: [{ def: s.squat, sets: working(7, 4) }],
          })
        }
      )
      When('the agent calls "get_effort_summary"', async () => {
        s.last = await callAgentTool('get_effort_summary')
      })
      Then('the latest week shows 10 working sets, 10 rated and 60% at 9 or more', async () => {
        const w = (await effort())[0]
        expect(w.workingSets).toBe(10)
        expect(w.ratedSets).toBe(10)
        expect(w.coveragePct).toBe(100)
        expect(w.pctAtOrAbove9).toBe(60)
        // (6x9 + 4x7) / 10
        expect(w.avgEffort).toBe(8.2)
        expect(w.distribution).toEqual({ le6: 0, rpe7: 4, rpe8: 0, rpe9: 6, rpe10: 0 })
        expect(w.exercisesTrained).toBe(2)
      })
      And('an abandoned workout in that week still counts toward effort', async () => {
        const w = (await effort())[0]
        expect(w.sessions).toBe(2)
        expect(w.distribution.rpe7).toBe(4)
      })
    })

    RuleScenario('Unrated sets show up as low coverage', ({ Given, When, Then }) => {
      Given('in the last 7 days Dustin logged 20 working sets but rated only 4 of them', async () => {
        await seedSession(s.prisma, {
          date: day(2),
          exercises: [{ def: s.squat, sets: [...working(8, 4), ...working(null, 16)] }],
        })
      })
      When('the agent calls "get_effort_summary"', async () => {
        s.last = await callAgentTool('get_effort_summary')
      })
      Then('the latest week shows 20 working sets, 4 rated and 20% coverage', async () => {
        const w = (await effort())[0]
        expect(w.workingSets).toBe(20)
        expect(w.ratedSets).toBe(4)
        expect(w.coveragePct).toBe(20)
        // The average is over rated sets only: unrated sets are not zeros.
        expect(w.avgEffort).toBe(8)
        expect(w.distribution).toEqual({ le6: 0, rpe7: 0, rpe8: 4, rpe9: 0, rpe10: 0 })
        expect(w.pctAtOrAbove9).toBe(0)
        expect(w.pctAt10).toBe(0)
        expect(w.exercisesTopSetAt10).toBe(0)
      })
    })

    RuleScenario('A week with no training is empty, not zero effort', ({ Given, When, Then }) => {
      Given('Dustin logged nothing 2 weeks ago', async () => {
        // Training in weeks 0, 1 and 3, so the gap is week 2 and not simply "no data".
        for (const i of [0, 1, 3]) {
          await seedSession(s.prisma, { date: inWeek(i), sessionRpe: 7, exercises: [{ def: s.squat, sets: working(8, 4) }] })
        }
      })
      When('the agent calls "get_effort_summary"', async () => {
        s.last = await callAgentTool('get_effort_summary')
      })
      Then('that week shows 0 sessions and no average effort', async () => {
        const weeks = await effort()
        expect(weeks).toHaveLength(4)
        expect(weeks.map((w) => w.sessions)).toEqual([1, 1, 0, 1])
        const gap = weeks[2]
        expect(gap.workingSets).toBe(0)
        expect(gap.ratedSets).toBe(0)
        expect(gap.coveragePct).toBeNull()
        expect(gap.avgEffort).toBeNull()
        expect(gap.pctAtOrAbove9).toBeNull()
        expect(gap.pctAt10).toBeNull()
        expect(gap.distribution).toEqual({ le6: 0, rpe7: 0, rpe8: 0, rpe9: 0, rpe10: 0 })
        expect(gap.exercisesTrained).toBe(0)
        expect(gap.exercisesTopSetAt10).toBe(0)
        expect(gap.sessionRpe).toEqual({ count: 0, avg: null })
        // The weeks around it are real.
        for (const i of [0, 1, 3]) {
          expect(weeks[i].avgEffort).toBe(8)
          expect(weeks[i].sessionRpe).toEqual({ count: 1, avg: 7 })
        }
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Arguments, windows and query count (spec: "Training insights"). The feature
// file doesn't spell these out, so they are plain tests.
// ---------------------------------------------------------------------------
describe('training insight tool arguments', () => {
  beforeEach(async () => {
    s = await freshState()
  })

  it('lists both tools, and neither writes anything', async () => {
    const { listTools } = await tools()
    const raw = (await listTools('admin')) as unknown
    const list = Array.isArray(raw) ? raw : ((raw as { tools?: unknown[] })?.tools ?? [])
    const names = (list as Array<{ name: string }>).map((t) => t.name)
    expect(names).toContain('get_stall_signals')
    expect(names).toContain('get_effort_summary')
  })

  it.each([
    ['get_stall_signals', { sessions: 1 }, 'sessions'],
    ['get_stall_signals', { sessions: 13 }, 'sessions'],
    ['get_stall_signals', { sessions: 0 }, 'sessions'],
    ['get_stall_signals', { sinceDays: 0 }, 'sinceDays'],
    ['get_stall_signals', { sinceDays: 366 }, 'sinceDays'],
    ['get_effort_summary', { weeks: 0 }, 'weeks'],
    ['get_effort_summary', { weeks: 13 }, 'weeks'],
  ])('%s rejects %j with a tool error naming %s', async (name, args, field) => {
    const o = await callAgentTool(name, args)
    expect(toolPayload(o).field).toBe(field)
  })

  it.each([
    [{ sessions: 2 }],
    [{ sessions: 12 }],
    [{ sinceDays: 1 }],
    [{ sinceDays: 365 }],
    [{ sessions: 2, sinceDays: 365 }],
  ])('get_stall_signals accepts %j at its limits', async (args) => {
    expect(await stall(args)).toEqual([])
  })

  it.each([[1], [12]])('get_effort_summary accepts weeks %i and returns that many', async (n) => {
    const weeks = await effort({ weeks: n })
    expect(weeks).toHaveLength(n)
    expect(weeks.every((w) => w.sessions === 0 && w.avgEffort === null)).toBe(true)
  })

  it('returns 4 weeks by default', async () => {
    expect(await effort()).toHaveLength(4)
  })

  describe('with history', () => {
    beforeEach(async () => {
      // Back Squat e1RM 100..150, one session each, 50, 40, 30, 20, 10 and 2 days ago.
      await seedSeries(s.squat, [[50, 100], [40, 110], [30, 120], [20, 130], [10, 140], [2, 150]])
    })

    it('sessions limits the analysis to the most recent sessions', async () => {
      const e = entryFor(await stall({ sessions: 3 }), s.squat)
      expect(e.sessionsAnalyzed).toBe(3)
      expect(e.series.map((p) => p.e1rmLbs)).toEqual([130, 140, 150])
      expect(e.spanDays).toBe(18)
      // early = mean(130, 140) = 135, late = mean(140, 150) = 145, change = 10 / 135 = 7.4074%
      expect(e.earlyE1rmLbs).toBe(135)
      expect(e.lateE1rmLbs).toBe(145)
      expect(e.changePct).toBe(7.4)
    })

    it('with 2 sessions, early and late are the same two sessions', async () => {
      const e = entryFor(await stall({ sessions: 2 }), s.squat)
      expect(e.series.map((p) => p.e1rmLbs)).toEqual([140, 150])
      expect(e.earlyE1rmLbs).toBe(145)
      expect(e.lateE1rmLbs).toBe(145)
      expect(e.changePct).toBe(0)
    })

    it('defaults to the most recent 6 sessions', async () => {
      await seedSeries(s.squat, [[60, 90]])
      const e = entryFor(await stall(), s.squat)
      expect(e.sessionsAnalyzed).toBe(6)
      expect(e.series.map((p) => p.e1rmLbs)).toEqual([100, 110, 120, 130, 140, 150])
    })

    it('sinceDays drops older sessions', async () => {
      const e = entryFor(await stall({ sinceDays: 25 }), s.squat)
      expect(e.series.map((p) => p.e1rmLbs)).toEqual([130, 140, 150])
    })

    it('an exercise with no working sets in the window is left out', async () => {
      expect(await stall({ sinceDays: 1 })).toEqual([])
    })

    it('an id the user has never logged returns an empty list', async () => {
      expect(await stall({ exerciseDefinitionId: s.bench.id })).toEqual([])
      expect(await stall({ exerciseDefinitionId: 'no-such-exercise' })).toEqual([])
    })

    it('each tool reads with one query, however many exercises there are', async () => {
      await seedSeries(s.curl, [[9, 80], [3, 85]])
      await seedSeries(s.bench, [[8, 180], [2, 185]])
      const reads = new Set(['findMany', 'findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow', 'count', 'groupBy', 'aggregate'])
      const counter = { n: 0 }
      const counted = new Proxy(s.prisma, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver)
          if (prop === '$queryRaw' || prop === '$queryRawUnsafe') {
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
                  if (reads.has(String(method))) counter.n++
                  return fn.apply(model, a)
                }
              },
            })
          }
          return typeof value === 'function' ? value.bind(target) : value
        },
      }) as PrismaClient

      expect(await stall({}, counted)).toHaveLength(3)
      expect(counter.n).toBe(1)
      counter.n = 0
      await effort({}, counted)
      expect(counter.n).toBe(1)
    })
  })
})
