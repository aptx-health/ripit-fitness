/**
 * Tests for features/agent-tools/equipment.feature: the read-only MCP tool
 * `get_equipment`. Plain describe/it (not vitest-cucumber): each describe is a
 * scenario from the feature, named the same.
 *
 * PINNED CONTRACT (implementers build to this; do not edit these tests)
 *
 *   tool name     get_equipment, registered in lib/mcp/tools.ts (schemas,
 *                 descriptions, handlers), so listTools(role) lists it for
 *                 every role and callTool(prisma, ctx, 'get_equipment', {})
 *                 runs it
 *   input         empty object (extra keys are ignored, like get_anchors)
 *   annotations   { readOnlyHint: true }
 *   result        JSON in content[0].text:
 *                   { equipment: string[], isSet: boolean }
 *                 (extra raw fields are allowed, verdict-like ones are not)
 *     isSet true   the user has a record. `equipment` is their own selection
 *                  as the app stores and normalises it: canonical
 *                  EQUIPMENT_LABELS keys (the names exercise definitions use),
 *                  deduped, in canonical enum order, unknowns dropped. It can
 *                  be empty (a real "I own nothing").
 *                  "Has a record" is exactly profile.equipmentAvailableSet
 *                  from normalizeUserTrainingProfile: the flag, OR a non-empty
 *                  normalised list (legacy rows).
 *     isSet false  no record: the app assumes a full commercial gym.
 *                  `equipment` is then EQUIPMENT_CHECKLIST_VALUES from
 *                  lib/equipment-availability.ts, the list behind the
 *                  "Commercial Gym" preset, in that order.
 *   scope         the token's user only (ctx.userId)
 *   read-only     never creates or changes a UserTrainingProfile row
 *
 * Modules under test are loaded lazily so a missing tool fails the test that
 * needs it, not the whole file.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import {
  EQUIPMENT_AVAILABILITY_VALUES,
  EQUIPMENT_CHECKLIST_VALUES,
} from '@/lib/equipment-availability'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

type Result = { equipment: string[]; isSet: boolean } & Record<string, unknown>
type Raw = { content: Array<{ type: string; text: string }>; isError?: boolean }

const load = (spec: string) => import(/* @vite-ignore */ spec)
const tools = async () => (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')

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

const ctxFor = (id: string, role = 'user') => ({ userId: id, tokenId: 'tok', role, notify: async () => {} })

async function callRaw(id: string, args?: unknown, role = 'user'): Promise<Raw> {
  const { callTool } = await tools()
  return (await callTool(prisma, ctxFor(id, role) as never, 'get_equipment', args as never)) as Raw
}

async function read(id = userId, args: unknown = {}): Promise<Result> {
  const raw = await callRaw(id, args)
  expect(raw.isError, `get_equipment should succeed: ${raw.content?.[0]?.text}`).not.toBe(true)
  return JSON.parse(raw.content[0].text) as Result
}

/** What the equipment settings page saves: the list, and the "set" flag. */
async function setEquipment(id: string, equipmentAvailable: string[], equipmentAvailableSet = true) {
  await prisma.userTrainingProfile.upsert({
    where: { userId: id },
    create: { userId: id, ratioTargets: {}, equipmentAvailable, equipmentAvailableSet },
    update: { equipmentAvailable, equipmentAvailableSet },
  })
}

const profileRows = () => prisma.userTrainingProfile.findMany({ orderBy: { userId: 'asc' } })

describe('Scenario: The user has chosen their equipment', () => {
  it('returns exactly the chosen items, as exercise-definition names, marked as their own selection', async () => {
    await setEquipment(userId, ['dumbbell', 'resistance_band'])
    const out = await read()
    expect(out.equipment).toEqual(['dumbbell', 'resistance_band'])
    expect(out.isSet).toBe(true)
  })

  it('every name is an exercise-definition equipment key', async () => {
    await setEquipment(userId, ['barbell', 'bench', 'pull_up_bar', 'cable'])
    const out = await read()
    expect(out.equipment.length).toBe(4)
    for (const name of out.equipment) expect(Object.keys(EQUIPMENT_LABELS)).toContain(name)
  })

  it('is the selection, not the full gym: one item stays one item', async () => {
    await setEquipment(userId, ['kettlebell'])
    const out = await read()
    expect(out.equipment).toEqual(['kettlebell'])
    expect(out.isSet).toBe(true)
  })

  it('reports the list in canonical enum order whatever order it was saved in', async () => {
    const saved = ['resistance_band', 'dumbbell', 'bench']
    await setEquipment(userId, saved)
    const out = await read()
    expect(out.equipment).toEqual(EQUIPMENT_AVAILABILITY_VALUES.filter((v) => saved.includes(v)))
  })

  it('normalises loose stored vocabulary the way the app does (plurals and spaced names, unknowns dropped, duplicates merged)', async () => {
    await setEquipment(userId, ['dumbbells', 'resistance band', 'not_a_real_thing', 'dumbbell'])
    const out = await read()
    expect(out.equipment).toEqual(
      EQUIPMENT_AVAILABILITY_VALUES.filter((v) => v === 'dumbbell' || v === 'resistance_band')
    )
    expect(out.isSet).toBe(true)
  })

  it('a legacy row with items but the flag still false counts as the user\'s own selection', async () => {
    await setEquipment(userId, ['barbell', 'bench'], false)
    const out = await read()
    expect(out.isSet).toBe(true)
    expect(out.equipment).toEqual(['barbell', 'bench'])
  })

  it('returns the live value: a later change shows up on the next call', async () => {
    await setEquipment(userId, ['dumbbell'])
    expect((await read()).equipment).toEqual(['dumbbell'])
    await setEquipment(userId, ['barbell'])
    expect((await read()).equipment).toEqual(['barbell'])
  })

  it('returns plain JSON text with the two documented fields and no verdict-like fields', async () => {
    await setEquipment(userId, ['dumbbell'])
    const raw = await callRaw(userId)
    expect(raw.content).toHaveLength(1)
    expect(raw.content[0].type).toBe('text')
    const out = JSON.parse(raw.content[0].text) as Result
    expect(Array.isArray(out.equipment)).toBe(true)
    expect(typeof out.isSet).toBe('boolean')
    for (const key of Object.keys(out)) {
      expect(key, 'raw data only').not.toMatch(/verdict|status|recommend|warn|missing|suggest|ok$/i)
    }
  })
})

describe('Scenario: The user has never set their equipment', () => {
  it('with no record at all: told nothing has been set, and given the full-gym list the app uses', async () => {
    expect(await profileRows()).toHaveLength(0)
    const out = await read()
    expect(out.isSet).toBe(false)
    expect(out.equipment).toEqual([...EQUIPMENT_CHECKLIST_VALUES])
  })

  it('the full-gym list is not empty and is made of exercise-definition names', async () => {
    const out = await read()
    expect(out.equipment.length).toBeGreaterThan(10)
    for (const name of out.equipment) expect(Object.keys(EQUIPMENT_LABELS)).toContain(name)
  })

  it('a profile row that never touched equipment is the same as no record', async () => {
    await prisma.userTrainingProfile.create({ data: { userId, ratioTargets: {} } })
    const out = await read()
    expect(out.isSet).toBe(false)
    expect(out.equipment).toEqual([...EQUIPMENT_CHECKLIST_VALUES])
  })

  it('an empty list with the flag still false is "not set", not "owns nothing"', async () => {
    await setEquipment(userId, [], false)
    const out = await read()
    expect(out.isSet).toBe(false)
    expect(out.equipment).toEqual([...EQUIPMENT_CHECKLIST_VALUES])
  })

  it('a stored list of only unknown names, flag false, is still "not set"', async () => {
    await setEquipment(userId, ['not_a_real_thing'], false)
    const out = await read()
    expect(out.isSet).toBe(false)
    expect(out.equipment).toEqual([...EQUIPMENT_CHECKLIST_VALUES])
  })

  it('reading does not create a record', async () => {
    await read()
    await read()
    expect(await profileRows()).toHaveLength(0)
  })
})

describe('Scenario: The user owns almost nothing', () => {
  it('an empty selection is returned as empty and marked as their real selection', async () => {
    await setEquipment(userId, [], true)
    const out = await read()
    expect(out.equipment).toEqual([])
    expect(out.isSet).toBe(true)
  })

  it('a selection of only bodyweight is returned as that one item, not as empty or full', async () => {
    await setEquipment(userId, ['bodyweight'])
    const out = await read()
    expect(out.equipment).toEqual(['bodyweight'])
    expect(out.isSet).toBe(true)
  })

  it('empty-and-set is not confused with never-set on the very same row shape', async () => {
    await setEquipment(userId, [], true)
    const set = await read()
    await setEquipment(userId, [], false)
    const unset = await read()
    expect(set.isSet).toBe(true)
    expect(unset.isSet).toBe(false)
    expect(set.equipment).not.toEqual(unset.equipment)
  })
})

describe('Scenario: One user\'s equipment stays private', () => {
  it('sees only their own selection when another user has set theirs', async () => {
    await setEquipment(otherUserId, ['barbell', 'trap_bar'])
    await setEquipment(userId, ['dumbbell'])
    const mine = await read(userId)
    expect(mine.equipment).toEqual(['dumbbell'])
    const theirs = await read(otherUserId)
    expect(theirs.equipment).toEqual(['barbell', 'trap_bar'])
  })

  it('a user with no record gets the full-gym default, never the other user\'s selection', async () => {
    await setEquipment(otherUserId, ['barbell'])
    const out = await read(userId)
    expect(out.isSet).toBe(false)
    expect(out.equipment).toEqual([...EQUIPMENT_CHECKLIST_VALUES])
  })

  it('a user who owns nothing gets an empty list, never the other user\'s selection', async () => {
    await setEquipment(otherUserId, ['barbell'])
    await setEquipment(userId, [], true)
    expect((await read(userId)).equipment).toEqual([])
  })

  it('a userId in the arguments cannot reach another user\'s equipment', async () => {
    await setEquipment(otherUserId, ['barbell', 'trap_bar'])
    await setEquipment(userId, ['dumbbell'])
    const raw = await callRaw(userId, { userId: otherUserId })
    const body = raw.content[0].text
    expect(body).not.toContain('trap_bar')
    expect(body).not.toContain('barbell')
    expect(raw.isError).not.toBe(true)
    expect((JSON.parse(body) as Result).equipment).toEqual(['dumbbell'])
  })

  it('reading as one user never changes the other user\'s record', async () => {
    await setEquipment(otherUserId, ['barbell'])
    const before = await profileRows()
    await read(userId)
    await read(otherUserId)
    expect(await profileRows()).toEqual(before)
  })
})

describe('Scenario: The tool is read-only', () => {
  it('is listed, marked read-only, for a regular user and for admin and editor roles', async () => {
    const { listTools } = await tools()
    for (const role of ['user', 'admin', 'editor']) {
      const tool = listTools(role).find((t) => t.name === 'get_equipment')
      expect(tool, `get_equipment listed for ${role}`).toBeDefined()
      expect(tool?.annotations.readOnlyHint).toBe(true)
      expect(tool?.annotations.destructiveHint ?? false).toBe(false)
    }
  })

  it('has a description, and an input schema that takes no arguments', async () => {
    const { listTools } = await tools()
    const tool = listTools('user').find((t) => t.name === 'get_equipment')
    expect(typeof tool?.description).toBe('string')
    expect((tool?.description ?? '').trim().length).toBeGreaterThan(20)
    expect(tool?.inputSchema.type).toBe('object')
    expect(Object.keys((tool?.inputSchema.properties as object | undefined) ?? {})).toEqual([])
    expect((tool?.inputSchema.required as string[] | undefined) ?? []).toEqual([])
  })

  it('is still the only equipment tool: nothing lets an agent change equipment', async () => {
    const { listTools } = await tools()
    const names = listTools('admin').map((t) => t.name)
    expect(names.filter((n) => /equipment/i.test(n))).toEqual(['get_equipment'])
  })

  it('works with no arguments at all, and with an empty object', async () => {
    await setEquipment(userId, ['dumbbell'])
    for (const args of [undefined, {}]) {
      const raw = await callRaw(userId, args)
      expect(raw.isError).not.toBe(true)
      expect((JSON.parse(raw.content[0].text) as Result).equipment).toEqual(['dumbbell'])
    }
  })

  it('works for a regular user (it is not an admin-only tool)', async () => {
    await setEquipment(userId, ['dumbbell'])
    const raw = await callRaw(userId, {}, 'user')
    expect(raw.isError).not.toBe(true)
  })

  it('calling it any number of times changes nothing in the database', async () => {
    await setEquipment(userId, ['dumbbell'])
    const before = await profileRows()
    for (let i = 0; i < 3; i++) await read()
    expect(await profileRows()).toEqual(before)
  })
})
