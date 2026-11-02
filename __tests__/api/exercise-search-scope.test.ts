/**
 * GET /api/exercises/search lists only system exercises and the signed-in user's own custom
 * ones (work item 119, review 118 finding 1). Other users' custom exercises are private: they
 * never appear, whatever the query, filters or explicit ids. Real test DB.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestExerciseDefinition, createTestUser } from '@/lib/test/factories'

const h = vi.hoisted(() => ({ userId: '' as string }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    h.userId ? { user: { id: h.userId, role: 'user', email: 'a@b.c' }, error: null } : { user: null, error: null },
}))

const { GET } = await import('@/app/api/exercises/search/route')

let prisma: PrismaClient
let userId: string
let otherUserId: string
const ids: Record<string, string> = {}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  h.userId = userId
  ids.system = (await createTestExerciseDefinition(prisma, { name: 'Back Squat', isSystem: true })).id
  ids.mine = (await createTestExerciseDefinition(prisma, { name: 'My Squat Variant', userId })).id
  ids.theirs = (await createTestExerciseDefinition(prisma, { name: 'Secret Squat Variant', userId: otherUserId })).id
})

async function search(params: Record<string, string> = {}) {
  const res = await GET(new NextRequest(`http://localhost/api/exercises/search?${new URLSearchParams(params)}`))
  const body = (await res.json()) as { exercises?: Array<{ id: string; name: string }> }
  return { status: res.status, names: (body.exercises ?? []).map((e) => e.name), ids: (body.exercises ?? []).map((e) => e.id) }
}

describe('exercise search is scoped to system and own exercises', () => {
  it('a text search finds system and own exercises, not another user\'s', async () => {
    const { status, names } = await search({ query: 'squat' })
    expect(status).toBe(200)
    expect(names.sort()).toEqual(['Back Squat', 'My Squat Variant'])
  })

  it('an empty query lists no other user\'s exercise either', async () => {
    const { names } = await search()
    expect(names).toContain('Back Squat')
    expect(names).toContain('My Squat Variant')
    expect(names).not.toContain('Secret Squat Variant')
  })

  it('searching for the other user\'s exact name finds nothing', async () => {
    expect((await search({ query: 'Secret Squat Variant' })).names).toEqual([])
  })

  it('explicit ids cannot fetch another user\'s exercise', async () => {
    const { ids: found } = await search({ ids: [ids.system, ids.mine, ids.theirs].join(',') })
    expect(found.sort()).toEqual([ids.system, ids.mine].sort())
  })

  it('filters do not widen the scope', async () => {
    const { names } = await search({ query: 'squat', equipment: 'barbell', faus: 'chest' })
    expect(names).not.toContain('Secret Squat Variant')
  })

  it('the other user sees their own exercise, and not mine', async () => {
    h.userId = otherUserId
    const { names } = await search({ query: 'variant' })
    expect(names).toEqual(['Secret Squat Variant'])
  })

  it('is still 401 without a user', async () => {
    h.userId = ''
    expect((await search({ query: 'squat' })).status).toBe(401)
  })
})
