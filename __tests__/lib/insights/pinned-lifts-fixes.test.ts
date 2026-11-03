/**
 * Pinned lifts fixes from review 118 (work item 119): overlapping saves for one user must not
 * fail on the (userId, exerciseDefinitionId) unique index, and must leave exactly one of the
 * saved lists, whole and in order (the last save wins, never a mix). Real test DB.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePins, savePins } from '@/lib/insights/pinned-lifts'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const h = vi.hoisted(() => ({ userId: '' as string }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: h.userId, role: 'user', email: 'a@b.c' }, error: null }),
}))
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<typeof import('@/lib/rate-limit')>()),
  checkRateLimitWithHeaders: async () => ({ response: null, headers: {} }),
}))

let prisma: PrismaClient
let userId: string
let lifts: string[]

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  h.userId = userId
  lifts = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => (await createTestExerciseDefinition(prisma, { name: `Lift ${i}`, isSystem: true })).id),
  )
})

/** Overlapping lists: every pair shares lifts, so unserialized saves collide on the index. */
const lists = () => [
  [lifts[0], lifts[1], lifts[2]],
  [lifts[2], lifts[1], lifts[0]],
  [lifts[1], lifts[3], lifts[0], lifts[4]],
  [lifts[0], lifts[5]],
  [lifts[4], lifts[0], lifts[1], lifts[2], lifts[3], lifts[5]],
  [lifts[1]],
  [lifts[0], lifts[1], lifts[2]],
  [lifts[3], lifts[2], lifts[1], lifts[0]],
]

describe('concurrent saves', () => {
  it('overlapping savePins calls all succeed and leave one whole list', async () => {
    for (let round = 0; round < 3; round++) {
      const sent = lists()
      const results = await Promise.allSettled(sent.map((ids) => savePins(prisma, userId, ids)))
      expect(results.filter((r) => r.status === 'rejected')).toEqual([])
      const now = await resolvePins(prisma, userId)
      expect(sent).toContainEqual(now)
      expect(await prisma.pinnedExercise.count({ where: { userId } })).toBe(now.length)
    }
  })

  it('overlapping PUTs are all 200, never 500', async () => {
    const { PUT } = await import('@/app/api/progress/pins/route')
    const put = (ids: string[]) =>
      PUT(
        new NextRequest('http://localhost/api/progress/pins', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ exerciseDefinitionIds: ids }),
        }),
      )
    const sent = lists()
    const statuses = (await Promise.all(sent.map(put))).map((r) => r.status)
    expect(statuses).toEqual(sent.map(() => 200))
    expect(sent).toContainEqual(await resolvePins(prisma, userId))
  })

  it('saves that follow one another: the last one wins', async () => {
    await savePins(prisma, userId, [lifts[0], lifts[1]])
    await savePins(prisma, userId, [lifts[2]])
    expect(await resolvePins(prisma, userId)).toEqual([lifts[2]])
  })

  it('the lock is per user: another user\'s save runs alongside and keeps its own list', async () => {
    const other = (await createTestUser()).id
    await Promise.all([savePins(prisma, userId, [lifts[0], lifts[1]]), savePins(prisma, other, [lifts[1], lifts[0]])])
    expect(await resolvePins(prisma, userId)).toEqual([lifts[0], lifts[1]])
    expect(await resolvePins(prisma, other)).toEqual([lifts[1], lifts[0]])
  })
})
