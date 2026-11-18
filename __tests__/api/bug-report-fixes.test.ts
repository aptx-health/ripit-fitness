// @vitest-environment node
/**
 * Bug report review fixes, server side (work 224, finding 5): an upload whose
 * declared Content-Length is over the body cap is refused before the body is read.
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import { bugReport, multipart, png } from '../features/admin/bug-report-support'

const auth = vi.hoisted(() => ({ userId: '', role: 'admin' }))

vi.mock('@/lib/db', async () => {
  const { getTestDatabase: db } = await import('@/lib/test/database')
  const prisma = (await db()).getPrismaClient()
  return { prisma, default: prisma }
})
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () =>
    auth.userId
      ? { user: { id: auth.userId, role: auth.role, email: `${auth.userId}@x.test` }, error: null }
      : { user: null, error: null },
}))
vi.mock('@/lib/discord', () => ({ sendDiscordNotification: vi.fn() }))
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<object>()),
  checkRateLimit: async () => null,
}))

const { POST } = await import('@/app/api/feedback/route')

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  auth.userId = (await createTestUser()).id
  auth.role = 'user'
})

/** A request whose body fails if anything reads it. */
function unreadableRequest(contentLength: number) {
  const body = new ReadableStream({
    pull() {
      throw new Error('body was read')
    },
  })
  return new NextRequest('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(contentLength) },
    body,
    duplex: 'half',
  } as ConstructorParameters<typeof NextRequest>[1])
}

describe('Oversized uploads are refused before the body is read', () => {
  it('returns 413 for a declared length over the cap, without reading the body', async () => {
    const res = await POST(unreadableRequest(700_000))
    expect(res.status).toBe(413)
    const prisma = (await getTestDatabase()).getPrismaClient()
    expect(await prisma.feedback.count()).toBe(0)
  })

  it('still reads a normal report that declares its length', async () => {
    auth.role = 'admin'
    const { body, contentType } = multipart(bugReport(png(5000)))
    const res = await POST(
      new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'content-type': contentType, 'content-length': String(body.length) },
        body,
      })
    )
    expect(res.status).toBe(200)
  })
})
