/**
 * Bulk tag guards in the UPDATE itself (review 231, finding 2): a workout that
 * reached 8 tags, or got the tag, after the route read it is left alone, so two
 * tag requests at once can't leave 9 tags or the same tag twice.
 *
 * `stale.on` makes the route's savedWorkout.findMany see every workout with no
 * tags, as if another request tagged them after the read.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))
const stale = vi.hoisted(() => ({ on: false }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const real = (await db()).getPrismaClient()
  const savedWorkout = new Proxy(real.savedWorkout, {
    get(target, key) {
      if (key === 'findMany' && stale.on)
        return async (args: unknown) =>
          ((await target.findMany(args as never)) as Array<Record<string, unknown>>).map((r) => ({ ...r, tags: [] }))
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  const prisma = new Proxy(real, {
    get(target, key) {
      if (key === 'savedWorkout') return savedWorkout
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => (auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null }),
}))
vi.mock('@/lib/rate-limit', async (orig) => ({ ...(await orig<object>()), checkRateLimit: async () => null }))

import { POST } from '@/app/api/workouts/saved/bulk/route'

let prisma: PrismaClient

const EIGHT = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Core', 'Cardio', 'Mobility']
const seed = async (name: string, tags: string[]) =>
  (await prisma.savedWorkout.create({ data: { userId: auth.userId, name, workoutData: [], exerciseCount: 0, tags } })).id
const tagsOf = async (id: string) => (await prisma.savedWorkout.findUniqueOrThrow({ where: { id } })).tags
const tag = async (ids: string[], name: string) => {
  const res = await POST(
    new NextRequest('http://localhost/api/workouts/saved/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'tag', ids, tag: name }),
    })
  )
  return { status: res.status, body: (await res.json()) as { ids: string[]; skipped: string[] } }
}

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  auth.userId = (await createTestUser()).id
  stale.on = false
})

describe('bulk tag: the UPDATE checks the limits again', () => {
  it('leaves a workout that reached 8 tags after the read', async () => {
    const full = await seed('Full', EIGHT)
    const room = await seed('Room', ['Push'])
    stale.on = true
    const res = await tag([full, room], 'Quick')
    expect(res.status).toBe(200)
    expect(res.body.ids).toEqual([room])
    expect(await tagsOf(full)).toEqual(EIGHT)
    expect(await tagsOf(room)).toEqual(['Push', 'Quick'])
  })

  it('leaves a workout that got the tag (any case) after the read', async () => {
    const has = await seed('Has', ['legs day'])
    stale.on = true
    const res = await tag([has], 'LEGS DAY')
    expect(res.status).toBe(200)
    expect(res.body.ids).toEqual([])
    expect(await tagsOf(has)).toEqual(['legs day'])
  })

  it('two tag requests at once never take a workout past 8', async () => {
    const seven = await seed('Seven', EIGHT.slice(0, 7))
    const [a, b] = await Promise.all([tag([seven], 'Quick'), tag([seven], 'Full body')])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(await tagsOf(seven)).toHaveLength(8)
    expect(a.body.ids.length + b.body.ids.length).toBe(1)
  })

  it('still tags as before when nothing raced', async () => {
    const one = await seed('One', ['Push'])
    expect((await tag([one], 'Quick')).body.ids).toEqual([one])
    expect(await tagsOf(one)).toEqual(['Push', 'Quick'])
  })
})
