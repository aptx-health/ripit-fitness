/**
 * Progress S3 (pinned lifts): which lifts are pinned, and saving them (work item 116). Real
 * test DB. Spec: features/analytics/pinned-lifts.feature, "Defaults", "Pinning", "Pin limit",
 * "Pins are per user".
 *
 * Pinned interface (`@/lib/insights/pinned-lifts`):
 *   resolvePins(db, userId)       -> Promise<string[]>  exercise definition ids, in order
 *   savePins(db, userId, ids)     -> Promise<void>      replaces the pins in the order given
 *                                                       and marks the user as customized
 *   MAX_PINS                      12
 * Data (prisma): model PinnedExercise { id, userId, exerciseDefinitionId, position Int,
 * createdAt }, unique (userId, exerciseDefinitionId); UserSettings.pinnedLiftsCustomized
 * Boolean @default(false).
 *
 * Until the user has saved pins (pinnedLiftsCustomized false, or no settings row), the pins
 * are the anchor lifts: UserTrainingProfile.targetMovements ({ [pattern]: id[] }), patterns in
 * ANCHOR_PATTERNS order (not the order the JSON happens to be stored in), each pattern's ids
 * in the order listed, an id that is anchored twice only once (its first place), at most 12.
 * Once customized, the pins are the PinnedExercise rows by position, and the anchors no
 * longer matter; an empty list is a real answer (nothing pinned).
 * savePins validation (unknown ids, duplicates, more than 12) is the route's job
 * (progress-pins.test.ts); here it gets valid input.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const load = (spec: string) => import(/* @vite-ignore */ spec)
type Mod = {
  resolvePins: (db: PrismaClient, userId: string) => Promise<string[]>
  savePins: (db: PrismaClient, userId: string, ids: string[]) => Promise<void>
  MAX_PINS: number
}
const mod = () => load('@/lib/insights/pinned-lifts') as Promise<Mod>

/** The new model, before the generated client knows it. */
type Px = {
  findMany: (a: unknown) => Promise<Array<{ userId: string; exerciseDefinitionId: string; position: number }>>
  create: (a: { data: Record<string, unknown> }) => Promise<unknown>
  count: (a?: unknown) => Promise<number>
}
const px = (db: PrismaClient) => (db as unknown as { pinnedExercise: Px }).pinnedExercise

let prisma: PrismaClient
let userId: string
let otherUserId: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
})

const defs = async (...names: string[]) =>
  Promise.all(names.map(async (name) => (await createTestExerciseDefinition(prisma, { name, primaryFAUs: ['chest'] })).id))
const resolve = async (forUser = userId) => (await mod()).resolvePins(prisma, forUser)
const save = async (ids: string[], forUser = userId) => (await mod()).savePins(prisma, forUser, ids)
const anchors = (targetMovements: Record<string, string[]> | null, forUser = userId) =>
  prisma.userTrainingProfile.create({ data: { userId: forUser, ratioTargets: {}, targetMovements: targetMovements ?? undefined } })
const customized = async (forUser = userId) =>
  (await prisma.userSettings.findUnique({ where: { userId: forUser } })) as unknown as { pinnedLiftsCustomized: boolean } | null

describe('the default pins are the anchor lifts', () => {
  it('Anchor lifts are the starting pins: Back Squat, Bench Press and Deadlift', async () => {
    const [squat, bench, dead] = await defs('Back Squat', 'Bench Press', 'Deadlift')
    await anchors({ hinge: [dead], squat: [squat], horizontal_push: [bench] })
    expect(await resolve()).toEqual([dead, squat, bench])
  })

  it('anchor order is the pattern order of ANCHOR_PATTERNS, not the order the JSON is stored in', async () => {
    // jsonb stores keys shortest first, so vertical_push comes back before horizontal_push.
    const [bench, ohp, row, pull] = await defs('Bench Press', 'Overhead Press', 'Row', 'Pull-up')
    await anchors({ vertical_pull: [pull], vertical_push: [ohp], horizontal_pull: [row], horizontal_push: [bench] })
    expect(await resolve()).toEqual([bench, row, ohp, pull])
  })

  it('several lifts for one pattern keep the order they were listed in', async () => {
    const [a, b, c] = await defs('Squat C', 'Squat A', 'Squat B')
    await anchors({ squat: [b, c, a] })
    expect(await resolve()).toEqual([b, c, a])
  })

  it('Anchor duplicates appear once: Back Squat anchoring two patterns is pinned once, at its first place', async () => {
    const [squat, dead, bench] = await defs('Back Squat', 'Deadlift', 'Bench Press')
    await anchors({ hinge: [squat, dead], squat: [squat], horizontal_push: [bench] })
    expect(await resolve()).toEqual([squat, dead, bench])
  })

  it('no anchors: nothing is pinned (no profile, a profile without anchors, an empty map)', async () => {
    expect(await resolve()).toEqual([])
    await anchors(null)
    expect(await resolve()).toEqual([])
    await prisma.userTrainingProfile.update({ where: { userId }, data: { targetMovements: {} } })
    expect(await resolve()).toEqual([])
  })

  it('keys that are not anchor patterns are ignored', async () => {
    const [squat, other] = await defs('Back Squat', 'Other')
    await anchors({ squat: [squat], accessory: [other], lunge: [other] })
    expect(await resolve()).toEqual([squat])
  })

  it('at most 12: six patterns with three lifts each pin the first twelve in order', async () => {
    const ids = await defs(...Array.from({ length: 18 }, (_, i) => `Lift ${String(i).padStart(2, '0')}`))
    const [p0, p1, p2, p3, p4, p5] = [0, 1, 2, 3, 4, 5].map((p) => ids.slice(p * 3, p * 3 + 3))
    await anchors({ hinge: p0, squat: p1, horizontal_push: p2, horizontal_pull: p3, vertical_push: p4, vertical_pull: p5 })
    expect(await resolve()).toEqual(ids.slice(0, 12))
  })

  it('the limit counts distinct lifts: duplicates do not use up places', async () => {
    const ids = await defs(...Array.from({ length: 13 }, (_, i) => `Lift ${String(i).padStart(2, '0')}`))
    // 5 + 5 + 5 listed, but pattern 2 repeats pattern 1's first two, and pattern 3 repeats pattern 1's last
    await anchors({
      hinge: ids.slice(0, 5),
      squat: [ids[0], ids[1], ...ids.slice(5, 8)],
      horizontal_push: [ids[4], ...ids.slice(8, 13)].slice(0, 5),
    })
    expect(await resolve()).toEqual([...ids.slice(0, 8), ...ids.slice(8, 12)])
    expect(await resolve()).toHaveLength(12)
  })

  it('MAX_PINS is 12', async () => {
    expect((await mod()).MAX_PINS).toBe(12)
  })
})

describe('saving pins', () => {
  it('Edit tracked lifts: saving keeps that order', async () => {
    const [a, b, c, d] = await defs('A', 'B', 'C', 'D')
    await save([c, a, d, b])
    expect(await resolve()).toEqual([c, a, d, b])
  })

  it('saving replaces the pins that were there, whole', async () => {
    const [a, b, c] = await defs('A', 'B', 'C')
    await save([a, b])
    await save([c, a])
    expect(await resolve()).toEqual([c, a])
    expect(await px(prisma).count({ where: { userId } })).toBe(2)
  })

  it('reordering the same pins is a new order, not the old one', async () => {
    const [a, b, c] = await defs('A', 'B', 'C')
    await save([a, b, c])
    await save([c, b, a])
    expect(await resolve()).toEqual([c, b, a])
  })

  it('saving marks the user as customized, and creates settings when there are none', async () => {
    const [a] = await defs('A')
    expect(await customized()).toBeNull()
    await save([a])
    expect((await customized())?.pinnedLiftsCustomized).toBe(true)
  })

  it('saving keeps the user\'s other settings', async () => {
    const [a] = await defs('A')
    await prisma.userSettings.create({ data: { userId, weeklyWorkoutTarget: 5, defaultWeightUnit: 'kg' } })
    await save([a])
    const s = await prisma.userSettings.findUnique({ where: { userId } })
    expect(s).toMatchObject({ weeklyWorkoutTarget: 5, defaultWeightUnit: 'kg' })
    expect((s as unknown as { pinnedLiftsCustomized: boolean }).pinnedLiftsCustomized).toBe(true)
  })

  it('a user who never saved is not customized', async () => {
    await prisma.userSettings.create({ data: { userId } })
    expect((await customized())?.pinnedLiftsCustomized).toBe(false)
  })

  it('twelve pins are fine', async () => {
    const ids = await defs(...Array.from({ length: 12 }, (_, i) => `Lift ${String(i).padStart(2, '0')}`))
    await save(ids)
    expect(await resolve()).toEqual(ids)
  })

  it('the same lift cannot be pinned twice for one user (unique per user and lift)', async () => {
    const [a] = await defs('A')
    await px(prisma).create({ data: { userId, exerciseDefinitionId: a, position: 0 } })
    await expect(px(prisma).create({ data: { userId, exerciseDefinitionId: a, position: 1 } })).rejects.toThrow()
  })

  it('but two users can pin the same lift', async () => {
    const [a] = await defs('A')
    await save([a])
    await save([a], otherUserId)
    expect(await resolve()).toEqual([a])
    expect(await resolve(otherUserId)).toEqual([a])
  })
})

describe('once edited, the anchors no longer apply', () => {
  it('Once edited, anchors no longer apply: the user unpinned every lift', async () => {
    const [squat, bench] = await defs('Back Squat', 'Bench Press')
    await anchors({ squat: [squat], horizontal_push: [bench] })
    expect(await resolve()).toEqual([squat, bench])
    await save([])
    expect(await resolve()).toEqual([])
    expect((await customized())?.pinnedLiftsCustomized).toBe(true)
  })

  it('later anchor changes do not change the pins', async () => {
    const [squat, bench, dead, ohp] = await defs('Back Squat', 'Bench Press', 'Deadlift', 'Overhead Press')
    await anchors({ squat: [squat] })
    await save([bench])
    await prisma.userTrainingProfile.update({ where: { userId }, data: { targetMovements: { squat: [squat, dead], vertical_push: [ohp] } } })
    expect(await resolve()).toEqual([bench])
  })

  it('saved pins win over anchors, and replace them rather than add to them', async () => {
    const [squat, bench, leg] = await defs('Back Squat', 'Bench Press', 'Leg Press')
    await anchors({ squat: [squat], horizontal_push: [bench] })
    await save([leg])
    expect(await resolve()).toEqual([leg])
  })

  it('the saved order is by position, whatever order the rows were created in', async () => {
    const [a, b, c] = await defs('A', 'B', 'C')
    await prisma.userSettings.create({ data: { userId, ...({ pinnedLiftsCustomized: true } as object) } })
    await px(prisma).create({ data: { userId, exerciseDefinitionId: b, position: 2 } })
    await px(prisma).create({ data: { userId, exerciseDefinitionId: c, position: 0 } })
    await px(prisma).create({ data: { userId, exerciseDefinitionId: a, position: 1 } })
    expect(await resolve()).toEqual([c, a, b])
  })

  it('pin rows without the customized flag are not used (the flag decides, not the rows)', async () => {
    const [squat, a] = await defs('Back Squat', 'A')
    await anchors({ squat: [squat] })
    await px(prisma).create({ data: { userId, exerciseDefinitionId: a, position: 0 } })
    expect(await resolve()).toEqual([squat])
  })
})

describe('Pins are per user', () => {
  it('another user pinning Hack Squat does not put it in this user\'s pins', async () => {
    const [hack, squat] = await defs('Hack Squat', 'Back Squat')
    await save([hack], otherUserId)
    await save([squat])
    expect(await resolve()).toEqual([squat])
    expect(await resolve(otherUserId)).toEqual([hack])
  })

  it('saving for one user leaves another user\'s pins and customized flag alone', async () => {
    const [a, b, c] = await defs('A', 'B', 'C')
    await save([a, b], otherUserId)
    await save([c])
    expect(await resolve(otherUserId)).toEqual([a, b])
    expect(await px(prisma).count({ where: { userId: otherUserId } })).toBe(2)
  })

  it('another user\'s anchors are not mine, and mine are not theirs', async () => {
    const [squat, bench] = await defs('Back Squat', 'Bench Press')
    await anchors({ squat: [squat] }, otherUserId)
    expect(await resolve()).toEqual([])
    await anchors({ horizontal_push: [bench] })
    expect(await resolve()).toEqual([bench])
    expect(await resolve(otherUserId)).toEqual([squat])
  })

  it('one user customizing does not turn the anchors off for another', async () => {
    const [squat] = await defs('Back Squat')
    await anchors({ squat: [squat] }, otherUserId)
    await save([], userId)
    expect(await resolve(otherUserId)).toEqual([squat])
  })
})
