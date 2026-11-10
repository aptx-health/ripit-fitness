import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAgentToken } from '@/lib/agent-tokens'
import { libraryUsage, proposeExerciseMerge } from '@/lib/proposals/library'
import { approveProposal } from '@/lib/proposals/service'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

// Approving a merge rewrites the JSON places that hold definition ids:
// anchors (UserTrainingProfile.targetMovements) and CommunityProgram.programData
// (work 160; the feature steps cover the relational uses).

let prisma: PrismaClient
let adminId: string
let tokenId: string
let fromId: string
let intoId: string
let otherId: string

const notify = async () => {}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  adminId = (await createTestUser()).id
  tokenId = (await createAgentToken(prisma, adminId, 'mac-claude')).record.id
  fromId = (await createTestExerciseDefinition(prisma, { name: 'DB Bench', isSystem: true })).id
  intoId = (await createTestExerciseDefinition(prisma, { name: 'Dumbbell Bench Press', isSystem: true })).id
  otherId = (await createTestExerciseDefinition(prisma, { name: 'Barbell Row', isSystem: true })).id
})

async function mergeAndApprove() {
  const proposed = await proposeExerciseMerge(
    prisma,
    { userId: adminId, agentTokenId: tokenId, rationale: 'duplicate', fromId, intoId },
    notify
  )
  if (!proposed.ok) throw new Error(proposed.error)
  const approved = await approveProposal(prisma, proposed.proposal.id, adminId)
  expect(approved).toMatchObject({ ok: true })
  return proposed
}

function profile(userId: string, targetMovements: Record<string, string[]>) {
  return prisma.userTrainingProfile.create({ data: { userId, ratioTargets: {}, targetMovements } })
}

describe('merge approval rewrites anchors', () => {
  it('moves the anchor to into, dedupes where a user anchored both, and leaves other patterns alone', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    await profile(a.id, { horizontal_push: [fromId, otherId], hinge: [otherId] })
    await profile(b.id, { horizontal_push: [intoId, fromId] })

    const proposed = await mergeAndApprove()
    expect(proposed.usage.anchors).toBe(2)

    const pa = await prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId: a.id } })
    const pb = await prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId: b.id } })
    expect(pa.targetMovements).toEqual({ horizontal_push: [intoId, otherId], hinge: [otherId] })
    expect(pb.targetMovements).toEqual({ horizontal_push: [intoId] })
    expect((await libraryUsage(prisma, [intoId])).get(intoId)?.anchors).toBe(2)
  })

  it('leaves a profile that never anchored from untouched', async () => {
    const c = await createTestUser()
    await profile(c.id, { hinge: [otherId] })
    await mergeAndApprove()
    const pc = await prisma.userTrainingProfile.findUniqueOrThrow({ where: { userId: c.id } })
    expect(pc.targetMovements).toEqual({ hinge: [otherId] })
  })
})

describe('merge approval rewrites community programs', () => {
  it('replaces exerciseDefinitionId and the nested exerciseDefinition.id everywhere in programData', async () => {
    const exercise = (defId: string, name: string, order: number) => ({
      name,
      order,
      exerciseDefinitionId: defId,
      exerciseDefinition: { id: defId, name },
      prescribedSets: [{ setNumber: 1, reps: '8' }],
    })
    const programData = {
      name: 'Push Pull',
      weeks: [
        { weekNumber: 1, workouts: [{ name: 'A', dayNumber: 1, exercises: [exercise(fromId, 'DB Bench', 1), exercise(otherId, 'Barbell Row', 2)] }] },
        { weekNumber: 2, workouts: [{ name: 'A', dayNumber: 1, exercises: [exercise(fromId, 'DB Bench', 1)] }] },
      ],
    }
    const cp = await prisma.communityProgram.create({
      data: { name: 'Push Pull', description: '', displayName: 'Dustin', programData, weekCount: 2, workoutCount: 2, exerciseCount: 3 },
    })

    const proposed = await mergeAndApprove()
    expect(proposed.usage.communityPrograms).toBe(1)

    const after = await prisma.communityProgram.findUniqueOrThrow({ where: { id: cp.id } })
    const text = JSON.stringify(after.programData)
    expect(text).not.toContain(fromId)
    const weeks = (after.programData as typeof programData).weeks
    const first = weeks[0].workouts[0].exercises
    expect(first[0]).toMatchObject({ exerciseDefinitionId: intoId, exerciseDefinition: { id: intoId } })
    expect(first[1]).toMatchObject({ exerciseDefinitionId: otherId, exerciseDefinition: { id: otherId } })
    expect(weeks[1].workouts[0].exercises[0].exerciseDefinitionId).toBe(intoId)
    expect(after.name).toBe('Push Pull')
    expect(await prisma.exerciseDefinition.findUnique({ where: { id: fromId } })).toBeNull()
  })
})
