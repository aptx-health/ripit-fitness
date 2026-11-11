/**
 * Golden file for the iOS slice 8 tests (work item 189, features/ios-app/picker-custom.feature).
 *
 * Seeds the Postgres test database with the bundled catalog (prisma/seeds/exercise-definitions.json,
 * as system rows) and records what the web's own routes do:
 *   app/api/exercises/search                     GET, with the params ExerciseSearchInterface.tsx sends
 *                                                (query trimmed, faus, equipment, limit 50)
 *   app/api/exercise-definitions                 POST (create a custom exercise)
 *   app/api/exercise-definitions/check-duplicate GET
 *   app/api/exercise-definitions/[id]            PATCH (edit)
 * Ids the web makes (cuid) are replaced by "custom:<name>" so the golden is stable.
 *
 * The phone departs from the web on three points (Dustin, 2026-11-08, work item 189 follow-up 1).
 * The golden records the phone's answer, still made by the web's own code where it can be:
 *   1. Names are trimmed on save (create and edit): the trimmed name is what's sent to the routes.
 *   2. Search sorts by score, then cuts: the route runs with no row limit (its findMany `take` is
 *      dropped) and its answer is cut to the limit afterwards.
 *   3. A letter or digit is required. A name without one is refused with NO_LETTER, plus whatever
 *      validateExerciseDefinition finds in the other fields; it is never sent to the route. A
 *      query without one is sent as no query.
 * Everything else is as on the web.
 *
 * Regenerate (from the repo root, Docker running):
 *   npx vitest run --config scripts/ios/vitest.goldens.config.ts scripts/ios/picker.goldens.ts
 * It writes ios/RipitCore/Tests/Fixtures/picker/picker.json. Deterministic: run it twice and
 * `git diff` shows nothing. The Swift tests (Picker*Tests) are locked; unlock them if a golden
 * changes on purpose.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { describe, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'

const auth = vi.hoisted(() => ({ userId: 'golden-user' }))
// While set, the search route's findMany runs without `take` (departure 2).
const uncut = vi.hoisted(() => ({ on: false }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const real = (await db()).getPrismaClient()
  const definitions = new Proxy(real.exerciseDefinition, {
    get: (target, key, receiver) =>
      key === 'findMany' && uncut.on
        ? (args: { take?: number }) => target.findMany({ ...args, take: undefined })
        : Reflect.get(target, key, receiver),
  })
  const prisma = new Proxy(real, {
    get: (target, key, receiver) => (key === 'exerciseDefinition' ? definitions : Reflect.get(target, key, receiver)),
  })
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: auth.userId, role: 'user', email: 'u@x.test' }, error: null }),
}))
vi.mock('@/lib/logger', () => {
  const l = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
  return { logger: { ...l, child: () => l }, default: l }
})

const OUT = join(process.cwd(), 'ios/RipitCore/Tests/Fixtures/picker')
const BASE = 'http://localhost'

type Seed = {
  id: string
  name: string
  normalizedName: string
  aliases: string[]
  category?: string
  equipment: string[]
  primaryFAUs: string[]
  secondaryFAUs: string[]
  instructions?: string
}

type Draft = {
  name: string
  equipment: string[]
  primaryFAUs: string[]
  secondaryFAUs: string[]
  instructions: string | null
}

const draft = (name: string, equipment: string[], primaryFAUs: string[], extra: Partial<Draft> = {}): Draft => ({
  name, equipment, primaryFAUs, secondaryFAUs: [], instructions: null, ...extra,
})

/** Custom exercises present for every search case (synthetic). */
const CUSTOMS: Draft[] = [
  draft('My Bench Squeeze', ['bench'], ['chest'], { secondaryFAUs: ['triceps'], instructions: 'Squeeze.' }),
  draft('Sled Push', ['sled'], ['quads'], { secondaryFAUs: ['glutes', 'calves'] }),
  draft('Band Pull Apart Plus', ['resistance_band'], ['rear-delts']),
  draft('Zz Press Machine', ['machine'], ['front-delts']),
]

/** Search cases: label, then what the picker has typed or picked. */
// The web's filters are single-choice (FilterChoiceSheet): one muscle group, one equipment type.
const SEARCHES: { label: string; query?: string; fau?: string; equipment?: string; limit?: number }[] = [
  // Text: name, normalized name, aliases, case, spaces, order by score
  { label: 'text: bench (name and score order)', query: 'bench' },
  { label: 'text: exact name scores first', query: 'Bench Press' },
  { label: 'text: case ignored', query: 'BENCH PRESS' },
  { label: 'text: surrounding spaces trimmed', query: '  squat  ' },
  { label: 'text: press (alias-contains scores)', query: 'press' },
  { label: 'text: e (more than 50 matches: sorted by score, then cut)', query: 'e' },
  { label: 'text: a, limit 100 (more than 100 matches: sorted by score, then cut)', query: 'a', limit: 100 },
  { label: 'text: alias equal outscores name contains (flat bench)', query: 'flat bench' },
  { label: 'text: curl', query: 'curl' },
  { label: 'text: row (substring inside words)', query: 'row' },
  { label: 'text: alias exact only (cgbp)', query: 'cgbp' },
  { label: 'text: alias exact (rdl)', query: 'rdl' },
  { label: 'text: alias partial does not match (bench dip)', query: 'bench di' },
  { label: 'text: alias exact (bench dip)', query: 'bench dip' },
  { label: 'text: hyphen in query (pull-up)', query: 'pull-up' },
  { label: 'text: space for hyphen (pull up)', query: 'pull up' },
  { label: 'text: squashed (pullup)', query: 'pullup' },
  { label: 'text: apostrophe dropped (farmers walk)', query: 'farmers walk' },
  { label: "text: apostrophe kept (farmer's walk)", query: "farmer's walk" },
  { label: 'text: punctuation only (acts as no query)', query: '!!' },
  { label: 'text: punctuation only, with a filter (acts as no query)', query: ' - ', equipment: 'barbell' },
  { label: 'text: digits are enough (90)', query: '90' },
  { label: 'text: no match', query: 'zzzz' },
  { label: 'text: finds a custom (squeeze)', query: 'squeeze' },
  { label: 'text: customs after system on equal score (press)', query: 'zz press' },
  // Muscle group (FAU, primary only)
  { label: 'fau: chest', fau: 'chest' },
  { label: 'fau: calves (secondary on a custom does not count)', fau: 'calves' },
  { label: 'fau: forearms', fau: 'forearms' },
  // Equipment, "other" expands to every specialized type
  { label: 'equipment: barbell', equipment: 'barbell' },
  { label: 'equipment: kettlebell', equipment: 'kettlebell' },
  { label: 'equipment: other', equipment: 'other' },
  { label: 'equipment: other, limit 100 (reaches the customs)', equipment: 'other', limit: 100 },
  { label: 'equipment: bench is common, not other', equipment: 'bench' },
  // Together
  { label: 'both: press + front-delts', query: 'press', fau: 'front-delts' },
  { label: 'both: curl + dumbbell', query: 'curl', equipment: 'dumbbell' },
  { label: 'both: row + mid-back + cable', query: 'row', fau: 'mid-back', equipment: 'cable' },
  { label: 'both: bench + other', query: 'bench', equipment: 'other' },
  { label: 'both: squat + chest (none)', query: 'squat', fau: 'chest' },
  // Nothing typed (the picker preloads)
  { label: 'none: first 50', },
  { label: 'none: limit 100', limit: 100 },
]

const long = (n: number) => 'x'.repeat(n)

// The phone's departures (see the header).
const hasLetterOrDigit = (s: string) => /[\p{L}\p{N}]/u.test(s)
const NO_LETTER = { field: 'name', message: 'Name must include a letter or number' }
/** The body the phone saves: the name trimmed. */
const phoneBody = (body: Record<string, unknown>) =>
  typeof body.name === 'string' ? { ...body, name: body.name.trim() } : body
/** The phone's own name problem, which the web doesn't have: a name, once trimmed, with no letter or digit. */
const phoneNameProblem = (name: unknown) =>
  typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 100 && !hasLetterOrDigit(name) ? NO_LETTER : null

/** Create cases, run in order against one database holding the catalog and CUSTOMS. */
const CREATES: { label: string; body: Record<string, unknown> }[] = [
  { label: 'ok: minimal', body: draft('Garage Press', ['dumbbell'], ['front-delts']) },
  { label: 'ok: every field', body: draft('Tempo Goblet Squat', ['kettlebell'], ['quads'], { secondaryFAUs: ['glutes', 'abs'], instructions: 'Three seconds down.' }) },
  { label: 'ok: spaces around the name (stored trimmed)', body: draft('  Spaced Name  ', ['cable'], ['lats']) },
  { label: 'ok: name of 100', body: draft(`N${long(99)}`, ['machine'], ['quads']) },
  { label: 'ok: name of 100 once trimmed', body: draft(`  M${long(99)}  `, ['machine'], ['quads']) },
  { label: 'ok: instructions of 4000', body: draft('Long Notes Lift', ['machine'], ['quads'], { instructions: long(4000) }) },
  { label: 'ok: instructions of 1001 (over the old limit of 1000)', body: draft('Old Limit Notes', ['machine'], ['quads'], { instructions: long(1001) }) },
  { label: 'ok: specialized equipment', body: draft('Trap Bar Shrug Hold', ['trap_bar'], ['traps']) },
  { label: 'invalid: no name', body: draft('', ['dumbbell'], ['chest']) },
  { label: 'invalid: blank name', body: draft('   ', ['dumbbell'], ['chest']) },
  { label: 'invalid: name of 101', body: draft(`N${long(100)}`, ['dumbbell'], ['chest']) },
  { label: 'invalid: no equipment', body: draft('No Gear', [], ['chest']) },
  { label: 'invalid: unknown equipment', body: draft('Spoon Lift', ['spoon'], ['chest']) },
  { label: 'invalid: no primary', body: draft('No Muscle', ['dumbbell'], []) },
  { label: 'invalid: unknown primary', body: draft('Bad Muscle', ['dumbbell'], ['heart']) },
  { label: 'invalid: unknown secondary', body: draft('Bad Second', ['dumbbell'], ['chest'], { secondaryFAUs: ['tail'] }) },
  { label: 'invalid: instructions of 4001', body: draft('Too Long Notes', ['dumbbell'], ['chest'], { instructions: long(4001) }) },
  { label: 'invalid: everything at once', body: draft('', [], [], { secondaryFAUs: ['tail'], instructions: long(4001) }) },
  { label: 'invalid beats duplicate', body: draft('Barbell Bench Press', [], ['chest']) },
  { label: 'duplicate: built-in, other case', body: draft('barbell bench press', ['barbell'], ['chest']) },
  { label: 'duplicate: built-in plus punctuation', body: draft('Barbell Bench Press!', ['barbell'], ['chest']) },
  { label: 'duplicate: built-in, extra spaces', body: draft(' Barbell   Bench Press ', ['barbell'], ['chest']) },
  { label: 'duplicate: built-in with hyphen', body: draft('PULL-UP', ['pull_up_bar'], ['lats']) },
  { label: 'duplicate: my own custom', body: draft('sled push', ['sled'], ['quads']) },
  { label: 'duplicate: one just created', body: draft('Garage Press', ['dumbbell'], ['front-delts']) },
  { label: 'not duplicate: hyphen instead of space', body: draft('Barbell-Bench Press', ['barbell'], ['chest']) },
  { label: "not duplicate: built-in stored with apostrophe (Farmer's Walk)", body: draft("Farmer's Walk", ['dumbbell'], ['forearms']) },
  { label: 'invalid: punctuation-only name', body: draft('!!!', ['dumbbell'], ['chest']) },
  { label: 'invalid: punctuation-only name, spaces around', body: draft('  ?? -  ', ['dumbbell'], ['chest']) },
  { label: 'invalid: punctuation-only name plus another problem', body: draft('???', [], ['chest']) },
  { label: 'ok: a single digit is enough', body: draft('7', ['dumbbell'], ['chest']) },
  { label: 'ok: a letter outside a-z is enough', body: draft('Ñ', ['dumbbell'], ['chest']) },
  { label: 'duplicate: trimmed name of one just created', body: draft(' Spaced Name ', ['cable'], ['lats']) },
]

/** check-duplicate cases, after CUSTOMS exist. `exclude` names a custom (or a seed id). */
const DUPLICATES: { label: string; name: string; exclude?: string }[] = [
  { label: 'built-in exact', name: 'Barbell Bench Press' },
  { label: 'built-in other case and spaces', name: '  barbell  BENCH press ' },
  { label: 'built-in plus punctuation', name: 'Barbell Bench Press?!' },
  { label: 'hyphen differs', name: 'Barbell-Bench Press' },
  { label: 'built-in stored with apostrophe', name: "Farmer's Walk" },
  { label: 'built-in stored with apostrophe, typed without', name: 'Farmers Walk' },
  { label: 'my custom', name: 'SLED PUSH' },
  { label: 'my custom, excluding itself', name: 'Sled Push', exclude: 'Sled Push' },
  { label: 'my custom, excluding another', name: 'Sled Push', exclude: 'Zz Press Machine' },
  { label: 'new name', name: 'Totally New Lift' },
]

/** Edit cases, each from a fresh database (catalog + CUSTOMS). `target` names a custom or a seed id. */
const EDITS: { label: string; target: string; body: Record<string, unknown> }[] = [
  { label: 'ok: rename and change fields', target: 'Sled Push', body: draft('Heavy Sled Push', ['sled'], ['quads', 'glutes'], { secondaryFAUs: ['calves'], instructions: 'Drive.' }) },
  { label: 'ok: same name, other case', target: 'Sled Push', body: draft('SLED PUSH', ['sled'], ['quads']) },
  { label: 'ok: unchanged name', target: 'Sled Push', body: draft('Sled Push', ['sled', 'bodyweight'], ['quads']) },
  { label: 'duplicate: rename to a built-in', target: 'Sled Push', body: draft('Barbell Back Squat', ['sled'], ['quads']) },
  { label: 'duplicate: rename to another custom', target: 'Sled Push', body: draft('zz press machine', ['sled'], ['quads']) },
  { label: 'invalid: no equipment', target: 'Sled Push', body: draft('Sled Push', [], ['quads']) },
  { label: 'invalid: blank name', target: 'Sled Push', body: draft(' ', ['sled'], ['quads']) },
  { label: 'invalid: rename to punctuation only', target: 'Sled Push', body: draft('!!!', ['sled'], ['quads']) },
  { label: 'ok: rename with spaces around (stored trimmed)', target: 'Sled Push', body: draft('  Heavy Sled  ', ['sled'], ['quads']) },
  { label: 'duplicate: rename to a built-in with spaces around', target: 'Sled Push', body: draft(' Barbell Back Squat ', ['sled'], ['quads']) },
  { label: 'refused: built-in', target: 'seed:Barbell Bench Press', body: draft('My Bench', ['barbell'], ['chest']) },
  { label: 'missing', target: 'seed:no-such-id', body: draft('Ghost', ['barbell'], ['chest']) },
]

const seedRows: Seed[] = JSON.parse(readFileSync(join(process.cwd(), 'prisma/seeds/exercise-definitions.json'), 'utf8'))

async function reset(prisma: PrismaClient) {
  await (await getTestDatabase()).reset()
  await prisma.exerciseDefinition.createMany({
    data: seedRows.map((s) => ({
      id: s.id, name: s.name, normalizedName: s.normalizedName, aliases: s.aliases, category: s.category,
      equipment: s.equipment, primaryFAUs: s.primaryFAUs, secondaryFAUs: s.secondaryFAUs,
      instructions: s.instructions, isSystem: true, userId: 'system',
    })),
  })
}

describe('iOS slice 8 goldens', () => {
  it('writes picker.json', async () => {
    const prisma = (await getTestDatabase()).getPrismaClient()
    const search = await import('@/app/api/exercises/search/route')
    const create = await import('@/app/api/exercise-definitions/route')
    const check = await import('@/app/api/exercise-definitions/check-duplicate/route')
    const edit = await import('@/app/api/exercise-definitions/[id]/route')

    const labels = new Map<string, string>()
    const label = (id: string) => labels.get(id) ?? id
    const post = async (body: Record<string, unknown>) => {
      const res = await create.POST(new NextRequest(`${BASE}/api/exercise-definitions`, { method: 'POST', body: JSON.stringify(body) }))
      const json = await res.json()
      if (res.ok) labels.set(json.data.id, `custom:${json.data.name}`)
      return { res, json }
    }
    const idOf = (target: string) =>
      target.startsWith('seed:')
        ? (seedRows.find((s) => s.name === target.slice(5))?.id ?? target.slice(5))
        : [...labels].find(([, l]) => l === `custom:${target}`)?.[0] ?? target
    const stored = async (id: string) => {
      const row = await prisma.exerciseDefinition.findUniqueOrThrow({
        where: { id },
        select: { name: true, normalizedName: true, equipment: true, primaryFAUs: true, secondaryFAUs: true, instructions: true, isSystem: true },
      })
      return row
    }
    // The POST and PATCH routes answer 409 without the id they matched; ask the function they call.
    const { checkDuplicateExercise, validateExerciseDefinition } = await import('@/lib/validators/exercise-definition')
    const existing = async (status: number, name: unknown, excludeId?: string) =>
      status === 409 ? { existing: label((await checkDuplicateExercise(prisma, String(name), auth.userId, excludeId)).exerciseId ?? '') } : {}
    const fresh = async () => {
      await reset(prisma)
      labels.clear()
      for (const c of CUSTOMS) {
        const { res } = await post(c)
        if (!res.ok) throw new Error(`custom ${c.name} failed`)
      }
    }

    const [{ datcollate }] = await prisma.$queryRaw<{ datcollate: string }[]>`SELECT datcollate FROM pg_database WHERE datname = current_database()`

    // Search
    await fresh()
    const searches = []
    for (const s of SEARCHES) {
      // ExerciseSearchInterface.searchExercises builds the same params.
      const params = new URLSearchParams()
      if (s.query?.trim() && hasLetterOrDigit(s.query)) params.append('query', s.query.trim())
      if (s.fau) params.append('faus', s.fau)
      if (s.equipment) params.append('equipment', s.equipment)
      params.append('limit', String(s.limit ?? 50))
      uncut.on = true
      const res = await search.GET(new NextRequest(`${BASE}/api/exercises/search?${params}`))
      uncut.on = false
      const json = await res.json()
      const results = json.exercises.slice(0, s.limit ?? 50).map((e: { id: string; name: string }) => ({ id: label(e.id), name: e.name }))
      searches.push({ label: s.label, query: s.query ?? '', fau: s.fau ?? null, equipment: s.equipment ?? null, limit: s.limit ?? 50, results })
    }

    // Create
    await fresh()
    const creates = []
    for (const c of CREATES) {
      const body = phoneBody(c.body)
      const problem = phoneNameProblem(c.body.name)
      if (problem) {
        // Departure 3: refused before the route, so nothing is saved.
        const details = [problem, ...validateExerciseDefinition(body as never, false)]
        creates.push({ label: c.label, draft: c.body, status: 422, details, error: 'Validation failed' })
        continue
      }
      const { res, json } = await post(body)
      creates.push({
        label: c.label,
        draft: c.body,
        status: res.status,
        ...(await existing(res.status, body.name)),
        ...(res.ok ? { stored: await stored(json.data.id) } : {}),
        ...(json.details ? { details: json.details } : {}),
        ...(res.ok ? {} : { error: json.error }),
      })
    }

    // check-duplicate
    await fresh()
    const duplicates = []
    for (const d of DUPLICATES) {
      const params = new URLSearchParams({ name: d.name, ...(d.exclude ? { excludeId: idOf(d.exclude) } : {}) })
      const res = await check.GET(new NextRequest(`${BASE}/api/exercise-definitions/check-duplicate?${params}`))
      const { data } = await res.json()
      duplicates.push({ label: d.label, name: d.name, exclude: d.exclude ?? null, exists: data.exists, existing: data.exerciseId ? label(data.exerciseId) : null })
    }

    // Edit
    const edits = []
    for (const e of EDITS) {
      await fresh()
      const id = idOf(e.target)
      const body = phoneBody(e.body)
      const problem = phoneNameProblem(e.body.name)
      if (problem && !e.target.startsWith('seed:')) {
        // Departure 3, on a custom exercise (a missing or built-in one is refused first).
        const details = [problem, ...validateExerciseDefinition(body as never, true)]
        edits.push({ label: e.label, target: e.target, draft: e.body, status: 422, details, error: 'Validation failed' })
        continue
      }
      const res = await edit.PATCH(new NextRequest(`${BASE}/api/exercise-definitions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })
      const json = await res.json()
      edits.push({
        label: e.label,
        target: e.target,
        draft: e.body,
        status: res.status,
        ...(await existing(res.status, body.name, id)),
        ...(res.ok ? { stored: await stored(id) } : {}),
        ...(json.details ? { details: json.details } : {}),
        ...(res.ok ? {} : { error: json.error }),
      })
    }

    // The editor's choices (EquipmentSelector, FAUSelector) and what "other" stands for in the search.
    const { EQUIPMENT_GROUPS, EQUIPMENT_LABELS, SPECIALIZED_EQUIPMENT } = await import('@/lib/constants/program-metadata')
    const { FAU_DISPLAY_NAMES } = await import('@/lib/fau-volume')
    const choices = {
      equipment: [...EQUIPMENT_GROUPS.common, ...EQUIPMENT_GROUPS.specialized].map((key) => ({ key, label: EQUIPMENT_LABELS[key] ?? key })),
      muscles: Object.entries(FAU_DISPLAY_NAMES).map(([key, label]) => ({ key, label })),
      other: Object.values(SPECIALIZED_EQUIPMENT),
    }

    const golden = { collation: datcollate, choices, customs: CUSTOMS, searches, creates, duplicates, edits }
    mkdirSync(OUT, { recursive: true })
    writeFileSync(join(OUT, 'picker.json'), `${JSON.stringify(golden, null, 1)}\n`)
  })
})
