/**
 * DB-level tests for lib/export/ripit-export.ts (format: docs/RIPIT_EXPORT_FORMAT.md).
 * The scenarios are in __tests__/features/data-export/data-export.steps.ts;
 * these pin the details and the query count.
 *
 * WRITE_EXPORT_FIXTURE=1 also rewrites docs/fixtures/ripit-export-v1.json.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildRipitExport, exportFilename, RIPIT_EXPORT_FORMAT, RIPIT_EXPORT_VERSION } from '@/lib/export/ripit-export'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import { countQueries } from '@/lib/test/query-count'
import { seedSystemExercises, seedTrainingData, seedWorkouts } from '../features/data-export/seed'

const FIXTURE = path.resolve(__dirname, '../../docs/fixtures/ripit-export-v1.json')
const NOW = new Date('2026-11-07T18:04:05.123Z')

type Json = Record<string, unknown>

let prisma: PrismaClient

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
})

/** The file as a client gets it: built, then through JSON. */
async function exportFor(userId: string): Promise<Json> {
  return JSON.parse(JSON.stringify(await buildRipitExport(prisma, userId, NOW)))
}

/** Every object anywhere in the value, depth first. */
function objects(value: unknown, out: Json[] = []): Json[] {
  if (Array.isArray(value)) for (const v of value) objects(v, out)
  else if (value && typeof value === 'object') {
    out.push(value as Json)
    for (const v of Object.values(value)) objects(v, out)
  }
  return out
}

describe('buildRipitExport', () => {
  it('writes the header and the file name', async () => {
    const { id } = await createTestUser()
    const file = await exportFor(id)
    expect(file).toMatchObject({ format: 'ripit-export', version: 1, exportedAt: '2026-11-07T18:04:05.123Z', userId: id })
    expect(RIPIT_EXPORT_FORMAT).toBe('ripit-export')
    expect(RIPIT_EXPORT_VERSION).toBe(1)
    expect(exportFilename(NOW)).toBe('ripit-export-2026-11-07.json')
  })

  it('gives empty lists and null settings for a user with no data', async () => {
    const { id } = await createTestUser()
    expect(await exportFor(id)).toMatchObject({
      settings: null,
      balanceSettings: null,
      customExercises: [],
      exerciseRefs: [],
      programs: [],
      workoutCompletions: [],
      savedWorkouts: [],
      pinnedExercises: [],
    })
  })

  it('nests programs down to prescribed sets, in order, with supersets', async () => {
    const { id } = await createTestUser()
    const sys = await seedSystemExercises(prisma)
    const seeded = await seedTrainingData(prisma, id, sys)
    const file = await exportFor(id)
    const programs = file.programs as Json[]
    expect(programs.map((p) => p.name)).toEqual(['Old Hypertrophy', 'Strength Block'])

    const active = programs[1] as Json & { weeks: Array<Json & { workouts: Array<Json & { exercises: Json[] }> }> }
    expect(active).toMatchObject({ id: seeded.active.program.id, isActive: true, isArchived: false, createdAt: '2026-10-01T15:00:00.000Z' })
    expect(programs[0]).toMatchObject({ isActive: false, isArchived: true, archivedAt: '2026-09-30T12:00:00.000Z' })
    expect(active.weeks.map((w) => w.weekNumber)).toEqual([1, 2])
    expect(active.weeks[0].workouts.map((w) => w.dayNumber)).toEqual([1, 2])

    const day1 = active.weeks[0].workouts[0].exercises as Array<Json & { prescribedSets: Json[] }>
    expect(day1.map((e) => [e.order, e.exerciseGroup, e.exerciseDefinitionId, e.name])).toEqual([
      [1, null, sys.squat.id, sys.squat.name],
      [2, 'A', sys.bench.id, sys.bench.name],
      [3, 'A', sys.row.id, sys.row.name],
    ])
    expect(day1[0].prescribedSets.map((s) => [s.setNumber, s.reps, s.weight, s.isWarmup, s.rir])).toEqual([
      [1, '5', '135lbs', true, null],
      [2, '5', '225lbs', false, 2],
      [3, '5', '225lbs', false, 2],
    ])
    expect(day1[1].prescribedSets[0]).toMatchObject({ weight: '65%', rpe: 8 })
    // Plan only: no logged sets under a program.
    for (const o of objects(file.programs)) expect(o).not.toHaveProperty('loggedSets')
  })

  it('exports finished, abandoned and ad-hoc sessions with their logged sets, units unconverted', async () => {
    const { id } = await createTestUser()
    const sys = await seedSystemExercises(prisma)
    const seeded = await seedTrainingData(prisma, id, sys)
    const file = await exportFor(id)
    type Completion = Json & { exercises: Array<Json & { prescribedSets: Json[] }>; loggedSets: Json[] }
    const completions = file.workoutCompletions as Completion[]
    expect(completions.map((c) => [c.id, c.status, c.isAdHoc, c.completedAt])).toEqual([
      [seeded.finished.id, 'completed', false, '2026-10-06T14:05:00.000Z'],
      [seeded.abandoned.id, 'abandoned', false, '2026-10-08T13:20:00.000Z'],
      [seeded.adHoc.id, 'completed', true, '2026-10-11T16:45:00.000Z'],
    ])
    const [finished, abandoned, adHoc] = completions
    expect(finished).toMatchObject({ workoutId: seeded.active.workouts[0].id, durationSeconds: 3900, sessionRpe: 7, notes: 'Felt quick.' })
    expect(abandoned).toMatchObject({ workoutId: seeded.active.workouts[1].id, cycleNumber: 2 })
    expect(adHoc).toMatchObject({ workoutId: null, name: 'Saturday Garage' })

    // Program-linked sets point at the program's exercises, in exercise then set order.
    const day1 = seeded.active.workouts[0].exerciseIds
    expect(finished.exercises).toEqual([])
    expect(finished.loggedSets.map((s) => [s.exerciseId, s.setNumber, s.reps, s.weight, s.weightUnit])).toEqual([
      [day1[0], 1, 5, 135, 'lbs'],
      [day1[0], 2, 5, 225, 'lbs'],
      [day1[0], 3, 5, 225, 'lbs'],
      [day1[1], 1, 8, 155, 'lbs'],
      [day1[1], 2, 7, 155, 'lbs'],
      [day1[2], 1, 10, 135, 'lbs'],
      [day1[2], 2, 10, 135, 'lbs'],
    ])
    expect(finished.loggedSets[0]).toMatchObject({ isWarmup: true, completionId: seeded.finished.id })

    // Ad-hoc sessions carry their one-off exercises, with their own plan.
    expect(adHoc.exercises.map((e) => [e.order, e.name, e.isOneOff, e.workoutId, e.workoutCompletionId])).toEqual([
      [1, 'Sled Push', true, null, seeded.adHoc.id],
      [2, sys.pullup.name, true, null, seeded.adHoc.id],
    ])
    expect(adHoc.exercises[0].prescribedSets.map((s) => s.reps)).toEqual(['20m', '20m'])
    expect(adHoc.loggedSets.map((s) => [s.weight, s.weightUnit])).toEqual([
      [80, 'kg'],
      [100, 'kg'],
      [0, 'kg'],
      [10, 'kg'],
    ])
    const own = new Set(adHoc.exercises.map((e) => e.id))
    for (const s of adHoc.loggedSets) expect(own.has(s.exerciseId as string)).toBe(true)
  })

  it('exports saved workouts, pins, settings and custom exercises; references system exercises by id and name', async () => {
    const { id } = await createTestUser()
    const sys = await seedSystemExercises(prisma)
    const seeded = await seedTrainingData(prisma, id, sys)
    const file = await exportFor(id)

    expect(file.savedWorkouts).toEqual([
      expect.objectContaining({ id: seeded.saved.id, name: 'Garage Day', sourceCompletionId: seeded.adHoc.id, exerciseCount: 2 }),
    ])
    const data = (file.savedWorkouts as Json[])[0].workoutData as Json[]
    expect(data.map((e) => e.exerciseDefinitionId)).toEqual([seeded.sledPush.id, sys.pullup.id])
    expect((file.pinnedExercises as Json[]).map((p) => [p.position, p.exerciseDefinitionId])).toEqual([
      [0, sys.squat.id],
      [1, sys.deadlift.id],
    ])
    expect(file.settings).toMatchObject({ userId: id, displayName: 'Dana', weeklyWorkoutTarget: 4, intensityEnabled: true })
    expect(file.balanceSettings).toMatchObject({ userId: id, targets: { chest: 12, lats: 14, quads: 12, hamstrings: 10 }, lookbackDays: 14 })

    expect(file.customExercises).toEqual([
      expect.objectContaining({ id: seeded.sledPush.id, name: 'Sled Push', isSystem: false, userId: id, instructions: 'Drive the sled 20 m, low hips.' }),
    ])
    // Every system exercise used anywhere, once, as { id, name } only.
    const refs = file.exerciseRefs as Json[]
    expect(refs).toEqual(
      [sys.squat, sys.bench, sys.row, sys.pullup, sys.deadlift]
        .map((d) => ({ id: d.id, name: d.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    const known = new Set([...refs, ...(file.customExercises as Json[])].map((d) => d.id))
    const used = objects(file).flatMap((o) => (typeof o.exerciseDefinitionId === 'string' ? [o.exerciseDefinitionId] : []))
    expect(used.length).toBeGreaterThan(10)
    for (const defId of used) expect(known.has(defId)).toBe(true)
  })

  it('holds only the user’s rows', async () => {
    const me = (await createTestUser()).id
    const other = (await createTestUser()).id
    const sys = await seedSystemExercises(prisma)
    await seedTrainingData(prisma, me, sys)
    const theirs = await seedTrainingData(prisma, other, sys, ' (other)')
    const file = await exportFor(me)
    const text = JSON.stringify(file)
    expect(text).not.toContain(other)
    expect(text).not.toContain('(other)')
    for (const theirId of [theirs.sledPush.id, theirs.active.program.id, theirs.adHoc.id, theirs.saved.id, theirs.finished.id]) {
      expect(text).not.toContain(theirId)
    }
    for (const o of objects(file)) if ('userId' in o) expect(o.userId).toBe(me)
  })

  it('runs the same number of queries for 1 and for 10 workouts', async () => {
    const sys = await seedSystemExercises(prisma)
    const one = (await createTestUser()).id
    const ten = (await createTestUser()).id
    await seedWorkouts(prisma, one, sys, 1)
    await seedWorkouts(prisma, ten, sys, 10)
    const a = await countQueries(prisma, () => buildRipitExport(prisma, one, NOW))
    const b = await countQueries(prisma, () => buildRipitExport(prisma, ten, NOW))
    expect((b.result.workoutCompletions as unknown[]).length).toBe(20)
    expect(b.count).toBe(a.count)
    expect(a.count).toBeLessThanOrEqual(16)
  })

  it('matches the committed fixture’s shape (rebuild with WRITE_EXPORT_FIXTURE=1)', async () => {
    const { id } = await createTestUser()
    const sys = await seedSystemExercises(prisma)
    await seedTrainingData(prisma, id, sys)
    const file = await exportFor(id)
    const text = `${JSON.stringify(file, null, 2)}\n`
    if (process.env.WRITE_EXPORT_FIXTURE === '1') writeFileSync(FIXTURE, text)

    // Ids and updatedAt differ per build, so compare everything else.
    const strip = (v: unknown, ids: Map<string, string>): unknown => {
      if (Array.isArray(v)) return v.map((x) => strip(x, ids))
      if (v && typeof v === 'object') {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'updatedAt' ? 'time' : strip(x, ids)]))
      }
      if (typeof v === 'string' && /^(c[a-z0-9]{20,}|test-user-[a-z0-9]+)$/.test(v)) {
        if (!ids.has(v)) ids.set(v, `id${ids.size}`)
        return ids.get(v)
      }
      return v
    }
    const committed = JSON.parse(readFileSync(FIXTURE, 'utf8'))
    expect(strip(committed, new Map())).toEqual(strip(file, new Map()))
  })
})
