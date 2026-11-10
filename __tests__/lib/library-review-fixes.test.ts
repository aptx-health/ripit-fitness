import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAgentToken } from '@/lib/agent-tokens'
import { callTool } from '@/lib/mcp/tools'
import {
  createLibraryExercise,
  libraryUsage,
  proposeExerciseDelete,
  proposeExerciseMerge,
} from '@/lib/proposals/library'
import { approveProposal, type CreateProposalInput, createProposal, revertProposal } from '@/lib/proposals/service'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

// Fixes from the 160 review (work 161): bans, community names, alias search,
// revert of a create whose exercise is gone, and pending proposals that point
// at a merged-away exercise.

let prisma: PrismaClient
let adminId: string
let tokenId: string
let fromId: string
let intoId: string

const notify = async () => {}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  adminId = (await createTestUser()).id
  tokenId = (await createAgentToken(prisma, adminId, 'mac-claude')).record.id
  fromId = (await createTestExerciseDefinition(prisma, { name: 'DB Bench', isSystem: true })).id
  intoId = (
    await createTestExerciseDefinition(prisma, { name: 'Dumbbell Bench Press', isSystem: true, aliases: ['db press'] })
  ).id
})

async function merge() {
  const proposed = await proposeExerciseMerge(prisma, { userId: adminId, agentTokenId: tokenId, rationale: 'dup', fromId, intoId }, notify)
  if (!proposed.ok) throw new Error(proposed.error)
  return { proposed, approved: await approveProposal(prisma, proposed.proposal.id, adminId) }
}

function bans(userId: string, bannedExerciseIds: string[]) {
  return prisma.userTrainingProfile.create({ data: { userId, ratioTargets: {}, bannedExerciseIds } })
}

const bansOf = async (userId: string) =>
  (await prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId } })).bannedExerciseIds

describe('bans', () => {
  it('usage counts bans, but a ban alone does not block a delete, and approving the delete drops the ban', async () => {
    const u = await createTestUser()
    await bans(u.id, [fromId, intoId])
    const usage = (await libraryUsage(prisma, [fromId])).get(fromId)
    expect(usage?.bans).toBe(1)

    const proposed = await proposeExerciseDelete(prisma, { userId: adminId, agentTokenId: tokenId, rationale: 'r', id: fromId }, notify)
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(proposed.usage.bans).toBe(1)
    expect(await approveProposal(prisma, proposed.proposal.id, adminId)).toMatchObject({ ok: true })
    expect(await bansOf(u.id)).toEqual([intoId])
  })

  it('a merge moves bans to into, deduped where a user banned both', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    await bans(a.id, [fromId])
    await bans(b.id, [intoId, fromId])
    const { proposed, approved } = await merge()
    expect(proposed.usage.bans).toBe(2)
    expect(approved).toMatchObject({ ok: true })
    expect(await bansOf(a.id)).toEqual([intoId])
    expect(await bansOf(b.id)).toEqual([intoId])
  })
})

describe('community programs after a merge', () => {
  it('a sibling name showing from becomes into, and the nested definition takes into name and aliases', async () => {
    const programData = {
      weeks: [
        {
          workouts: [
            {
              name: 'DB Bench',
              exercises: [
                {
                  name: 'DB Bench',
                  exerciseDefinitionId: fromId,
                  exerciseDefinition: { id: fromId, name: 'DB Bench', aliases: [] },
                },
                { name: 'My DB Bench', exerciseDefinitionId: fromId },
              ],
            },
          ],
        },
      ],
    }
    const cp = await prisma.communityProgram.create({
      data: { name: 'P', description: '', displayName: 'D', programData, weekCount: 1, workoutCount: 1, exerciseCount: 2 },
    })
    expect((await merge()).approved).toMatchObject({ ok: true })
    const after = (await prisma.communityProgram.findUniqueOrThrow({ where: { id: cp.id } })).programData as typeof programData
    const workout = after.weeks[0].workouts[0]
    // A workout that happens to share the name is not an exercise reference.
    expect(workout.name).toBe('DB Bench')
    expect(workout.exercises[0]).toEqual({
      name: 'Dumbbell Bench Press',
      exerciseDefinitionId: intoId,
      exerciseDefinition: { id: intoId, name: 'Dumbbell Bench Press', aliases: ['db press', 'db bench'] },
    })
    // Renamed on purpose: kept.
    expect(workout.exercises[1]).toEqual({ name: 'My DB Bench', exerciseDefinitionId: intoId })
  })
})

describe('library_exercise_search', () => {
  const search = async (query: string) => {
    const res = await callTool(prisma, { userId: adminId, tokenId, role: 'admin', notify }, 'library_exercise_search', { query })
    return (JSON.parse(res.content[0].text).exercises as Array<{ id: string }>).map((e) => e.id)
  }

  it('matches part of an alias, ignoring case', async () => {
    expect(await search('DB PR')).toEqual([intoId])
    expect(await search('press')).toEqual([intoId])
    expect(await search('db')).toEqual([fromId, intoId])
  })

  it('treats % and _ as plain characters', async () => {
    expect(await search('%')).toEqual([])
    expect(await search('_')).toEqual([])
  })
})

describe('revert of an applied create whose exercise is gone', () => {
  it('is refused with not_found and the proposal stays applied', async () => {
    const created = await createLibraryExercise(
      prisma,
      {
        userId: adminId,
        agentTokenId: tokenId,
        rationale: 'r',
        scope: 'shared',
        definition: { name: 'Flat DB Press', equipment: ['dumbbell'], primaryFAUs: ['chest'] },
      },
      notify
    )
    if (!created.ok) throw new Error(created.error)
    fromId = created.exercise.id
    expect((await merge()).approved).toMatchObject({ ok: true })

    const reverted = await revertProposal(prisma, created.proposal.id, adminId)
    expect(reverted).toMatchObject({ ok: false, code: 'not_found' })
    expect((await prisma.proposal.findUniqueOrThrow({ where: { id: created.proposal.id } })).status).toBe('applied')
  })
})

describe('pending proposals that use an exercise merged away before approval', () => {
  const inputs = (): Array<[string, CreateProposalInput]> => {
    const base = { userId: adminId, agentTokenId: tokenId, rationale: 'r' }
    return [
      [
        'saved_workout.create',
        { ...base, kind: 'saved_workout.create', workout: { name: 'W', exercises: [{ exerciseDefinitionId: fromId, sets: [{ reps: '8' }] }] } },
      ],
      [
        'program.create',
        {
          ...base,
          kind: 'program.create',
          program: { name: 'P', weeks: [{ workouts: [{ name: 'A', exercises: [{ exerciseDefinitionId: fromId, prescribedSets: [{ reps: '8' }] }] }] }] },
        },
      ],
      ['exercise_definition.update', { ...base, kind: 'exercise_definition.update', id: fromId, changes: { notes: 'n' } }],
      ['anchors.update', { ...base, kind: 'anchors.update', changes: { horizontal_push: [fromId] } }],
    ]
  }

  it.each([0, 1, 2, 3])('case %i fails with a reason at approve, without throwing or applying', async (i) => {
    const [kind, input] = inputs()[i]
    const created = await createProposal(prisma, input, notify)
    expect(created.ok, kind).toBe(true)
    if (!created.ok) return
    expect((await merge()).approved).toMatchObject({ ok: true })

    const approved = await approveProposal(prisma, created.proposal.id, adminId)
    expect(approved.ok, kind).toBe(false)
    if (approved.ok) return
    expect(approved.error.length).toBeGreaterThan(0)
    const after = await prisma.proposal.findUniqueOrThrow({ where: { id: created.proposal.id } })
    expect(after.status, kind).not.toBe('applied')
    expect(after.error, kind).toBeTruthy()
  })
})
