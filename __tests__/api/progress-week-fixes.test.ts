/**
 * Progress S1 fixes from review 109 (work item 110): GET /api/progress/week
 * returns 400 for a `start` after the current week in `tz`, and reads nothing.
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

const h = vi.hoisted(() => ({ userId: '', reportCalls: 0 }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  return { prisma: (await db()).getPrismaClient() }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({ user: { id: h.userId, role: 'user', email: 'a@b.c' }, error: null }),
}))
vi.mock('@/lib/insights/progress', async (orig) => {
  const real = await orig<typeof import('@/lib/insights/progress')>()
  return {
    ...real,
    getWeeklyReport: (...args: Parameters<typeof real.getWeeklyReport>) => {
      h.reportCalls++
      return real.getWeeklyReport(...args)
    },
  }
})

import { GET } from '@/app/api/progress/week/route'

const call = (query: string) => GET(new NextRequest(`http://localhost/api/progress/week${query}`))

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  h.userId = (await createTestUser()).id
  h.reportCalls = 0
  vi.useFakeTimers({ toFake: ['Date'] })
  // Sunday 2026-11-01 19:00 Denver = Monday 2026-11-02 02:00 UTC = Monday 15:00 Auckland.
  vi.setSystemTime(new Date('2026-11-02T02:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Future weeks', () => {
  it('a week after the current one is a 400 and reads nothing', async () => {
    const res = await call('?start=2026-11-02&tz=America%2FDenver')
    expect(res.status).toBe(400)
    expect(typeof ((await res.json()) as { error?: string }).error).toBe('string')
    expect(h.reportCalls).toBe(0)
  })

  it('far in the future is a 400 too', async () => {
    expect((await call('?start=2030-01-07&tz=America%2FDenver')).status).toBe(400)
  })

  it('the current week in the zone is fine', async () => {
    const res = await call('?start=2026-10-26&tz=America%2FDenver')
    expect(res.status).toBe(200)
    expect(((await res.json()) as { report: { isCurrentWeek: boolean } }).report.isCurrentWeek).toBe(true)
  })

  it('the zone decides: the same Monday is already current in Auckland', async () => {
    expect((await call('?start=2026-11-02&tz=Pacific%2FAuckland')).status).toBe(200)
    expect((await call('?start=2026-11-02&tz=America%2FDenver')).status).toBe(400)
  })

  it('earlier weeks are still fine', async () => {
    expect((await call('?start=2026-10-19&tz=America%2FDenver')).status).toBe(200)
  })
})
