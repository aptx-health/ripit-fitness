/**
 * Progress S1: the weekly workout target, server side. Real test DB.
 * Spec: features/analytics/weekly-report.feature, "Weekly target setting"
 * (work item 107).
 *
 * Pinned: `UserSettings.weeklyWorkoutTarget Int @default(3)`, read and written
 * through the existing GET/PUT /api/settings (app/api/settings/route.ts), whole
 * numbers 1 to 14. An invalid value is a 400 and changes nothing. Other
 * settings saves never touch it, and it can be set before any settings row
 * exists. (The column comes with a test-DB migration only.)
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

const auth = vi.hoisted(() => ({ userId: '' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId ? { user: { id: auth.userId, role: 'user' }, error: null } : { user: null, error: null },
}))

import { GET, PUT } from '@/app/api/settings/route'

let prisma: PrismaClient
let userId: string
let otherUserId: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  userId = (await createTestUser()).id
  otherUserId = (await createTestUser()).id
  auth.userId = userId
})

type Json = { settings?: Record<string, unknown>; error?: string }
const put = async (data: Record<string, unknown>) => {
  const res = await PUT(new NextRequest('http://localhost/api/settings', { method: 'PUT', body: JSON.stringify(data) }))
  return { status: res.status, json: (await res.json()) as Json }
}
const get = async () => {
  const res = await GET(new NextRequest('http://localhost/api/settings'))
  return { status: res.status, json: (await res.json()) as Json }
}
const stored = async (owner = userId) =>
  ((await prisma.userSettings.findUnique({ where: { userId: owner } })) as unknown as { weeklyWorkoutTarget: number } | null)
    ?.weeklyWorkoutTarget

describe('Weekly target setting', () => {
  it('defaults to 3, for a brand-new user and in the stored row', async () => {
    const { status, json } = await get()
    expect(status).toBe(200)
    expect(json.settings?.weeklyWorkoutTarget).toBe(3)
    expect(await stored()).toBe(3)
  })

  it('saves 4 and reads it back', async () => {
    const { status, json } = await put({ weeklyWorkoutTarget: 4 })
    expect(status).toBe(200)
    expect(json.settings?.weeklyWorkoutTarget).toBe(4)
    expect(await stored()).toBe(4)
    expect((await get()).json.settings?.weeklyWorkoutTarget).toBe(4)
  })

  it('can be set before the user has any settings row', async () => {
    expect(await prisma.userSettings.count({ where: { userId } })).toBe(0)
    const { status, json } = await put({ weeklyWorkoutTarget: 6 })
    expect(status).toBe(200)
    expect(json.settings?.weeklyWorkoutTarget).toBe(6)
    expect(await stored()).toBe(6)
  })

  it.each([1, 7, 14])('accepts %i', async (n) => {
    expect((await put({ weeklyWorkoutTarget: n })).status).toBe(200)
    expect(await stored()).toBe(n)
  })

  it.each([
    ['0', 0],
    ['15', 15],
    ['negative', -1],
    ['a fraction', 2.5],
    ['a string', '4'],
    ['null', null],
    ['a boolean', true],
    ['huge', 1_000_000],
  ])('rejects %s with a 400 and changes nothing', async (_name, value) => {
    await put({ weeklyWorkoutTarget: 5 })
    const { status, json } = await put({ weeklyWorkoutTarget: value })
    expect(status).toBe(400)
    expect(typeof json.error).toBe('string')
    expect(await stored()).toBe(5)
  })

  it('a rejected target saves nothing else from the same request', async () => {
    await put({ weeklyWorkoutTarget: 5, intensityEnabled: false })
    const { status } = await put({ weeklyWorkoutTarget: 99, intensityEnabled: true })
    expect(status).toBe(400)
    const row = await prisma.userSettings.findUniqueOrThrow({ where: { userId } })
    expect(row.intensityEnabled).toBe(false)
  })

  it('other settings saves leave the target alone', async () => {
    await put({ weeklyWorkoutTarget: 5 })
    await put({ intensityEnabled: true })
    await put({ defaultWeightUnit: 'kg', loggingMode: 'follow_along' })
    expect(await stored()).toBe(5)
  })

  it('a target save leaves the other settings alone', async () => {
    await get() // makes the row; a first PUT would only create it with the weight unit and rating
    await put({ defaultWeightUnit: 'kg', intensityEnabled: true, loggingMode: 'follow_along' })
    await put({ weeklyWorkoutTarget: 4 })
    const row = await prisma.userSettings.findUniqueOrThrow({ where: { userId } })
    expect(row).toMatchObject({ defaultWeightUnit: 'kg', intensityEnabled: true, loggingMode: 'follow_along' })
  })

  it('is per user', async () => {
    await put({ weeklyWorkoutTarget: 9 })
    auth.userId = otherUserId
    expect((await get()).json.settings?.weeklyWorkoutTarget).toBe(3)
    await put({ weeklyWorkoutTarget: 2 })
    expect(await stored(userId)).toBe(9)
    expect(await stored(otherUserId)).toBe(2)
  })
})
