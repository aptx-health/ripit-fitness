/**
 * Support for features/workout-library/tidy-update.feature (work 229, slice 4).
 * Design: initiatives/workout-library/docs/141-discovery.md. Builds on slice 2
 * (tags, search: tags-search.steps.ts) and slice 3 (archive and Undo).
 *
 * Contract the tests pin (the implementer builds it; existing files change
 * unless marked new):
 *
 *   lib/saved-workouts/match.ts (new)
 *     sameExercisesAndSets(a: SavedWorkoutData, b: SavedWorkoutData): boolean
 *       The "matches" rule for "Nothing changed". Each side's exercises are
 *       taken in `order`, and each exercise's sets in `setNumber` order. True
 *       when both have the same number of exercises, each pair has the same
 *       exerciseDefinitionId and the same number of sets, and each pair of
 *       sets has the same reps (compared as trimmed strings), rir, rpe and
 *       isWarmup (null is a value: null and 8 differ). That is exactly what
 *       Update would write. Everything else is ignored: names, notes,
 *       exerciseGroup, the setNumber values themselves, and weight (never stored).
 *     (__tests__/lib/saved-workout-match.test.ts)
 *
 *   lib/stats/workout-rollup.ts
 *     WorkoutRollup gains
 *       fromSaved: { id: string; name: string; gone: boolean; matches: boolean } | null
 *     null when the completion's savedWorkoutId is null (a freestyle session).
 *     Otherwise id is that savedWorkoutId and:
 *       gone: true when that saved workout no longer exists, isn't the
 *         user's, or is archived. name is then the completion's name and
 *         matches is false.
 *       gone: false: name is the saved workout's current name, and matches is
 *         sameExercisesAndSets(the saved workoutData, the snapshot Save would
 *         build from this completion).
 *
 *   POST /api/workouts/saved/[id]/update (new)  body { completionId: string }
 *     Replaces the saved workout's workoutData with the snapshot
 *     POST /api/workouts/saved builds from that completion, and exerciseCount
 *     with its length. Keeps everything else: id, name, notes, tags, pinnedAt,
 *     origin, createdAt, archivedAt, dismissedAt and sourceCompletionId (so a
 *     later Save as new from the same session still creates a new row).
 *     200 { saved: { ...list fields } }.
 *     400 (no write): body isn't { completionId: non-empty string }; the
 *       completion isn't completed; the completion's savedWorkoutId isn't [id].
 *     404: the saved workout or the completion is unknown or another user's.
 *     409 (no write): the saved workout is archived.
 *     401 signed out; refused by checkRateLimit (keyed on the user id) with no
 *     write; 500 and logger.error when the database fails.
 *
 *   POST /api/workouts/saved/bulk (new)  MAX_BULK = 100
 *     { action: 'archive', ids }      archives each of the user's unarchived
 *       ids as the row Archive does (archivedAt now, pinnedAt null;
 *       dismissedAt untouched). 200 { ids, previous: { [id]: { pinnedAt, dismissedAt } } }
 *     { action: 'undoArchive', previous }  Undo: for each of the user's
 *       archived ids in `previous`, archivedAt null and pinnedAt, dismissedAt
 *       put back as given (ISO dates or null). 200 { ids }
 *     { action: 'tag', ids, tag }      tag = normaliseTag(tag, [user's tags,
 *       ...STARTER_TAGS]) (slice 2). Added to each of the user's ids, keeping
 *       its other tags; a workout already carrying it (ignoring case) is left
 *       alone; a workout already at 8 tags is skipped. 200 { ids, skipped }
 *       400 { error, limit } and nothing written: over 24 characters
 *       (limit 'length'); the user would have over 50 different tags
 *       (limit 'perUser'). 400 when tag isn't a string or is empty once tidied.
 *     { action: 'delete', ids }        deletes the user's ids. Sessions done
 *       from them (WorkoutCompletion rows) stay. 200 { ids }
 *     In every response `ids` lists the workouts actually changed; `skipped`
 *     (tag only) lists the ids skipped for being at 8 tags.
 *     Another user's id, or an unknown one, is ignored (never in `ids`) and the
 *     rest of the request still applies.
 *     400 (no write): unknown action; ids (or previous's keys) not an array of
 *     1 to 100 strings. 401 signed out; refused by checkRateLimit (keyed on the
 *     user id) with no write; 500 and logger.error when the database fails.
 *     archive, tag and delete send the same number of queries for 1 id as for 10.
 *
 *   components/features/saved-workouts/SavedWorkoutsList (select mode)
 *     A "Select" button. In select mode:
 *       each shown row's <li> holds a checkbox named "Select <name>"; tapping
 *         the row's name toggles it and opens nothing (no panel, no navigation);
 *       "Select all" checks exactly the rows that show (with a search or tag
 *         chip active, only the matches, Older's included);
 *       a role="toolbar" named "Selected workouts" shows "<n> selected" and
 *         buttons "Archive", "Tag" and "Delete";
 *       "Done" leaves select mode and clears the selection.
 *     Archive: the rows leave the list; a toast with an "Undo" button that
 *       restores them all as they were (pins included).
 *     Tag: a dialog named "Tag <n> workouts" with one button per tag (the
 *       user's tags and the starter tags, each once), a textbox "New tag" and
 *       an "Add" button. Tapping a tag, or Add with typed text, tags them all
 *       (bulk tag) and closes the dialog. When any were skipped, a toast says
 *       "<k> skipped".
 *     Delete: a role="alertdialog" saying exactly
 *       "Delete <n> workouts? Your workout history stays." with a "Delete"
 *       button that deletes them; Cancel deletes nothing.
 *     New buttons are 48px tap targets and use theme colours only.
 *
 *   components/features/training/WorkoutRollupModal (the summary)
 *     fromSaved null: as today, "Save workout to repeat".
 *     fromSaved, not gone, not matches: no "Save workout to repeat"; buttons
 *       "Update <name>" and "Save as new". Update posts the update route, then
 *       the summary says "Updated <name>". Save as new opens the save view as
 *       today (Name, Save) and posts /api/workouts/saved.
 *     fromSaved, not gone, matches: says "Matches <name>"; no Update button.
 *     fromSaved, gone: "Save as new" and no Update.
 *
 * Here the UI talks to the real route handlers: fetch is stubbed to call them.
 * vitest-cucumber runs every step as its own test and Testing Library cleans up
 * between tests, so each UI step renders and does everything it checks.
 */

import type { PrismaClient } from '@prisma/client'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextRequest } from 'next/server'
import { type ComponentType, createElement } from 'react'
import { expect, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

export const load = (spec: string) => import(/* @vite-ignore */ spec)
export type Json = Record<string, unknown>
type Delegate = Record<string, (args?: unknown) => Promise<unknown>>
const DAY = 24 * 60 * 60 * 1000
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY)
export const STARTERS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Core', 'Cardio', 'Quick']

export const auth = { userId: '' }
export const nav = { to: [] as string[] }

export interface State {
  prisma: PrismaClient
  user: string
  other: string
  ids: Record<string, string>
  defs: string[]
  completion?: string
}
export const s = {} as State

export const saved = () => (s.prisma as unknown as Record<string, Delegate>).savedWorkout
export const row = async (id: string) => (await saved().findUnique({ where: { id } })) as Json | null
export const byName = async (name: string, userId = s.user) =>
  (await saved().findMany({ where: { name, userId } })) as Json[]
export const tagsOf = async (name: string) => ((await byName(name))[0]?.tags ?? []) as string[]
export const sorted = (a: unknown) => [...(a as string[])].sort()

type SetRow = { setNumber: number; reps: string; rir: number | null; rpe: number | null; isWarmup: boolean }
export type Plan = Array<{ name: string; exerciseDefinitionId: string; order: number; notes: string | null; exerciseGroup: string | null; sets: SetRow[] }>
const sets = (reps: string[], warm = 0): SetRow[] =>
  reps.map((r, i) => ({ setNumber: i + 1, reps: r, rir: null, rpe: null, isWarmup: i < warm }))

/** Push A's plan: Bench 3 x 8, Fly 2 x 12. */
export const pushPlan = (): Plan => [
  { name: 'Bench', exerciseDefinitionId: s.defs[0], order: 1, notes: 'Pause reps', exerciseGroup: null, sets: sets(['8', '8', '8']) },
  { name: 'Fly', exerciseDefinitionId: s.defs[1], order: 2, notes: null, exerciseGroup: null, sets: sets(['12', '12']) },
]

type Seed = {
  origin?: string
  lastUsedAt?: Date | null
  createdAt?: Date
  pinnedAt?: Date | null
  archivedAt?: Date | null
  notes?: string | null
  tags?: string[]
  userId?: string
  workoutData?: unknown
  sourceCompletionId?: string | null
}
export async function seed(name: string, o: Seed = {}): Promise<string> {
  const made = (await saved().create({
    data: {
      userId: o.userId ?? s.user,
      name,
      notes: o.notes ?? null,
      workoutData: o.workoutData ?? [],
      exerciseCount: Array.isArray(o.workoutData) ? o.workoutData.length : 0,
      lastUsedAt: o.lastUsedAt === undefined ? null : o.lastUsedAt,
      createdAt: o.createdAt ?? daysAgo(30),
      pinnedAt: o.pinnedAt ?? null,
      tags: o.tags ?? [],
      sourceCompletionId: o.sourceCompletionId ?? null,
      ...(o.origin !== undefined && { origin: o.origin }),
      ...(o.archivedAt !== undefined && { archivedAt: o.archivedAt }),
    },
  })) as Json
  s.ids[name] = String(made.id)
  return String(made.id)
}

export const EIGHT = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Core', 'Cardio', 'Mobility']

export async function freshState(): Promise<State> {
  const db = await getTestDatabase()
  await db.reset()
  const prisma = db.getPrismaClient()
  const [user, other] = [(await createTestUser()).id, (await createTestUser()).id]
  auth.userId = user
  nav.to.length = 0
  Object.assign(s, { prisma, user, other, ids: {}, defs: [], completion: undefined })
  for (const n of ['Bench Press', 'Cable Fly', 'Dips', 'Back Squat'])
    s.defs.push((await createTestExerciseDefinition(prisma, { name: `${n} ${Math.random().toString(36).slice(2, 7)}`, isSystem: true } as never)).id)
  // Pinned: Push A. Recent: Leg Day, Bench Blast, Squat Focus, Full Eight. Older: Old Pull, Squat Classic.
  await seed('Push A', {
    origin: 'agent',
    lastUsedAt: daysAgo(20),
    createdAt: daysAgo(60),
    pinnedAt: daysAgo(10),
    notes: 'Chest day',
    tags: ['Push', 'Quick'],
    workoutData: pushPlan(),
  })
  await seed('Leg Day', { lastUsedAt: daysAgo(2), tags: ['Legs'] })
  await seed('Bench Blast', { lastUsedAt: daysAgo(4), pinnedAt: null })
  await seed('Squat Focus', { lastUsedAt: daysAgo(6), tags: ['Legs'] })
  await seed('Full Eight', { lastUsedAt: daysAgo(8), tags: EIGHT })
  await seed('Old Pull', { lastUsedAt: daysAgo(45), createdAt: daysAgo(100), tags: ['Pull'] })
  await seed('Squat Classic', { lastUsedAt: daysAgo(70), createdAt: daysAgo(100) })
  await seed('Their Push', { userId: other, lastUsedAt: daysAgo(1), tags: ['Push'] })
  return s
}

// --- routes -------------------------------------------------------------------
type Ctx = { params: Promise<{ id: string }> }
type Handler = (r: NextRequest, c?: Ctx) => Promise<Response>
export const listRoute = async () => (await load('@/app/api/workouts/saved/route')) as { GET: Handler; POST: Handler }
const idRoute = async () => (await load('@/app/api/workouts/saved/[id]/route')) as Record<string, Handler>
const startRoute = async () => (await load('@/app/api/workouts/saved/[id]/start/route')) as { POST: Handler }
const updateRoute = async () => (await load('@/app/api/workouts/saved/[id]/update/route')) as { POST: Handler }
const bulkRoute = async () => (await load('@/app/api/workouts/saved/bulk/route')) as { POST: Handler }
export const result = async (res: Response) => ({ status: res.status, body: (await res.json().catch(() => ({}))) as Json })
export const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
const ctx = (id: string): Ctx => ({ params: Promise.resolve({ id }) })
export const bulk = async (body: unknown) =>
  result(await (await bulkRoute()).POST(req('/api/workouts/saved/bulk', 'POST', body)))
export const update = async (id: string, body: unknown) =>
  result(await (await updateRoute()).POST(req(`/api/workouts/saved/${id}/update`, 'POST', body), ctx(id)))
export const idsOf = (...names: string[]) => names.map((n) => s.ids[n])

/** fetch that runs the real saved-workout routes; anything else answers 200 {}. */
export function routedFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: { method?: string; body?: string }) => {
      const url = String(input instanceof Request ? input.url : input).replace(/^https?:\/\/[^/]+/, '')
      const method = (init?.method ?? 'GET').toUpperCase()
      const pathOnly = url.split('?')[0]
      const r = new NextRequest(`http://localhost${url}`, {
        method,
        ...(init?.body !== undefined && { headers: { 'content-type': 'application/json' }, body: init.body }),
      })
      let res: Response | null = null
      const sub = /^\/api\/workouts\/saved\/([^/]+)\/(start|update)$/.exec(pathOnly)
      const one = /^\/api\/workouts\/saved\/([^/]+)$/.exec(pathOnly)?.[1]
      if (pathOnly === '/api/workouts/saved') {
        const m = await listRoute()
        res = method === 'POST' ? await m.POST(r) : await m.GET(r)
      } else if (pathOnly === '/api/workouts/saved/bulk') res = await (await bulkRoute()).POST(r)
      else if (sub?.[2] === 'start') res = await (await startRoute()).POST(r, ctx(sub[1]))
      else if (sub?.[2] === 'update') res = await (await updateRoute()).POST(r, ctx(sub[1]))
      else if (one) {
        const m = await idRoute()
        if (m[method]) res = await m[method](r, ctx(one))
      }
      return res ?? new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    })
  )
}

// --- sessions -------------------------------------------------------------------
/** Logged sets; rpe and rir default to null, as Push A's plan has them. */
export type Logged = { reps: number[]; warm?: number; rpe?: number | null; rir?: number | null }
/**
 * Starts a session from a saved workout with the real start route, logs
 * `logged[i]` against the plan's i-th exercise (`extra` adds a new exercise),
 * and completes it. Returns the completion id.
 */
export async function sessionFrom(name: string, logged: Logged[], extra?: Logged): Promise<string> {
  const id = s.ids[name]
  const started = await result(await (await startRoute()).POST(req(`/api/workouts/saved/${id}/start`, 'POST'), ctx(id)))
  expect(started.status, JSON.stringify(started.body)).toBe(200)
  const completionId = String(started.body.completionId)
  const exercises = await s.prisma.exercise.findMany({ where: { workoutCompletionId: completionId }, orderBy: { order: 'asc' } })
  const log = async (exerciseId: string, l: Logged) =>
    s.prisma.loggedSet.createMany({
      data: l.reps.map((reps, i) => ({
        completionId,
        exerciseId,
        userId: s.user,
        setNumber: i + 1,
        reps,
        weight: 100,
        rpe: l.rpe ?? null,
        rir: l.rir ?? null,
        isWarmup: i < (l.warm ?? 0),
      })),
    })
  for (const [i, l] of logged.entries()) if (exercises[i]) await log(exercises[i].id, l)
  if (extra) {
    const ex = await s.prisma.exercise.create({
      data: { name: 'Dips', exerciseDefinitionId: s.defs[2], order: exercises.length + 1, workoutCompletionId: completionId, userId: s.user, isOneOff: true },
    })
    await log(ex.id, extra)
  }
  await s.prisma.workoutCompletion.update({ where: { id: completionId }, data: { status: 'completed', completedAt: new Date() } })
  s.completion = completionId
  return completionId
}
/** Push A done exactly as planned. */
export const asPlanned = (): Logged[] => [{ reps: [8, 8, 8] }, { reps: [12, 12] }]
/** Push A with a fourth bench set. */
export const changed = (): Logged[] => [{ reps: [8, 8, 8, 6] }, { reps: [12, 12] }]

/** A freestyle session (no saved workout). */
export async function freestyle(): Promise<string> {
  const c = await s.prisma.workoutCompletion.create({
    data: { userId: s.user, status: 'completed', isAdHoc: true, name: 'Freestyle', startedAt: daysAgo(0), completedAt: new Date() },
  })
  const ex = await s.prisma.exercise.create({
    data: { name: 'Bench', exerciseDefinitionId: s.defs[0], order: 1, workoutCompletionId: c.id, userId: s.user, isOneOff: true },
  })
  await s.prisma.loggedSet.create({
    data: { completionId: c.id, exerciseId: ex.id, userId: s.user, setNumber: 1, reps: 5, weight: 135 },
  })
  return c.id
}

export type FromSaved = { id: string; name: string; gone: boolean; matches: boolean } | null
export async function rollupOf(completionId: string) {
  const { computeWorkoutRollup } = (await load('@/lib/stats/workout-rollup')) as typeof import('@/lib/stats/workout-rollup')
  const r = await computeWorkoutRollup(s.prisma, completionId, s.user)
  expect(r, 'a rollup').toBeTruthy()
  return r as NonNullable<typeof r> & { fromSaved: FromSaved }
}

// --- UI -----------------------------------------------------------------------
export async function renderSummary(completionId: string) {
  routedFetch()
  // jsdom has no ResizeObserver; the summary measures its scroll area with one.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  const rollup = await rollupOf(completionId)
  const { WorkoutRollupModal } = (await load('@/components/features/training/WorkoutRollupModal')) as {
    WorkoutRollupModal: ComponentType<{ open: boolean; rollup: unknown; onClose: () => void }>
  }
  render(createElement(WorkoutRollupModal, { open: true, rollup, onClose: () => {} }))
  await screen.findByText(/workout complete/i)
  return rollup
}
export const button = (name: string | RegExp) => screen.queryByRole('button', { name })
export async function tap(el: HTMLElement | null, what = 'element') {
  expect(el, what).toBeTruthy()
  await act(async () => {
    fireEvent.click(el as HTMLElement)
  })
}

export async function renderList() {
  routedFetch()
  const List = ((await load('@/components/features/saved-workouts/SavedWorkoutsList')) as { default: ComponentType })
    .default
  const { ToastProvider } = (await load('@/components/ToastProvider')) as {
    ToastProvider: ComponentType<{ children: unknown }>
  }
  render(createElement(ToastProvider, null, createElement(List)))
  await screen.findAllByRole('listitem')
}
export const rowOf = (name: string) =>
  screen
    .queryAllByText(name, { exact: true })
    .map((el) => el.closest('li'))
    .find(Boolean) as HTMLElement | undefined
export const shownNames = (names: string[]) => names.filter((n) => rowOf(n))
export async function openOlder() {
  const fold = screen.queryByRole('button', { name: /^older \(\d+\)/i })
  if (fold && fold.getAttribute('aria-expanded') === 'false') await tap(fold)
}
export const box = (name: string) => screen.queryByRole('checkbox', { name: `Select ${name}` }) as HTMLInputElement | null
/** The names among `names` whose checkbox is ticked. */
export const checkedAmong = (names: string[]) => names.filter((n) => box(n)?.checked)
export const checkedCount = () => (screen.queryAllByRole('checkbox') as HTMLInputElement[]).filter((c) => c.checked).length
export const toolbar = () => screen.getByRole('toolbar', { name: /selected workouts/i })
export async function enterSelect() {
  await tap(button(/^select$/i), 'a Select button')
}
/** Tap the row's name (not its checkbox). */
export async function tapRow(name: string) {
  const li = rowOf(name)
  expect(li, `a row for ${name}`).toBeTruthy()
  const label = within(li as HTMLElement)
    .getAllByText(name, { exact: true })
    .find((el) => el.tagName !== 'INPUT') as HTMLElement
  await tap(label)
}
export async function selectRows(...names: string[]) {
  await enterSelect()
  for (const n of names) {
    if (!rowOf(n)) await openOlder()
    await tapRow(n)
  }
  await waitFor(() => expect(within(toolbar()).getByText(new RegExp(`\\b${names.length} selected`, 'i'))).toBeTruthy())
}
export async function barAction(name: 'Archive' | 'Tag' | 'Delete') {
  await tap(within(toolbar()).getByRole('button', { name: new RegExp(`^${name}$`, 'i') }))
}
export const searchBox = () => screen.getByRole('searchbox', { name: /search workouts/i }) as HTMLInputElement
export async function search(text: string) {
  await act(async () => {
    fireEvent.change(searchBox(), { target: { value: text } })
  })
}
export async function tapFilter(tag: string) {
  const group = screen.getByRole('group', { name: /filter by tag/i })
  await tap(within(group).queryByRole('button', { name: tag }), `a filter chip ${tag}`)
}
export async function untilDb(check: () => Promise<boolean>, what: string) {
  await waitFor(async () => expect(await check(), what).toBe(true))
}
export const archived = async (name: string) => (await byName(name))[0]?.archivedAt != null

export const TAP = /\b(min-)?h-12\b|\b(min-)?h-\[48px\]/
/** Raw palette colours bypass the theme tokens (light, dark and E-INK). */
export const RAW_COLOUR = /\b(bg|text|border)-(white|black|(gray|slate|zinc|neutral|red|green|blue|yellow|orange)-\d{2,3})\b|\[#[0-9a-f]{3,6}\]/i
