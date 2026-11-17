// @vitest-environment node
/**
 * Bug report with screenshot, server side (features/admin/bug-report-screenshot.feature, work 222).
 * Real test DB; route handlers called directly.
 *
 * The full pinned contract is at the top of __tests__/features/admin/bug-report-support.ts. Here:
 *   POST /api/feedback (multipart): admins only for a screenshot; JPEG/PNG/WebP by their bytes, at most
 *     MAX_SCREENSHOT_BYTES (lib/feedback/screenshot.ts); refused uploads save nothing; context stored.
 *   GET /api/feedback: items carry hasScreenshot and context, never the image bytes.
 *   GET /api/feedback/[feedbackId]/screenshot: the stored bytes and type, editors and admins only.
 * The schema for storing the image and context is the implementer's choice; tests read it back only
 * through these routes.
 */

import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import {
  blobBytes,
  bugReport,
  type FilePart,
  gifBytes,
  jpeg,
  multipartRequest,
  png,

  sameBytes,
  sampleContext,
  textBytes,
  webp,
} from '../features/admin/bug-report-support'

const auth = vi.hoisted(() => ({ userId: '', role: 'admin' }))
const discord = vi.hoisted(() => ({ send: vi.fn() }))

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
vi.mock('@/lib/discord', () => ({ sendDiscordNotification: discord.send }))
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<object>()),
  checkRateLimit: async () => null,
}))

const load = (spec: string) => import(/* @vite-ignore */ spec)
type Handler = (r: NextRequest, c?: unknown) => Promise<Response>
type Json = Record<string, unknown>

let prisma: PrismaClient
let admin: string
let other: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  admin = (await createTestUser()).id
  other = (await createTestUser()).id
  auth.userId = admin
  auth.role = 'admin'
  discord.send.mockClear()
})

async function maxBytes(): Promise<number> {
  return ((await load('@/lib/feedback/screenshot')) as { MAX_SCREENSHOT_BYTES: number }).MAX_SCREENSHOT_BYTES
}

async function send(screenshot?: FilePart, overrides = {}) {
  const { POST } = (await load('@/app/api/feedback/route')) as { POST: Handler }
  const res = await POST(multipartRequest(bugReport(screenshot, overrides)))
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json }
}

async function list(): Promise<Json[]> {
  const { GET } = (await load('@/app/api/feedback/route')) as { GET: Handler }
  const res = await GET(new NextRequest('http://localhost/api/feedback?limit=100'))
  expect(res.status).toBe(200)
  return ((await res.json()) as { feedback: Json[] }).feedback
}

async function screenshot(feedbackId: string) {
  const { GET } = (await load('@/app/api/feedback/[feedbackId]/screenshot/route')) as { GET: Handler }
  const res = await GET(new NextRequest(`http://localhost/api/feedback/${feedbackId}/screenshot`), {
    params: Promise.resolve({ feedbackId }),
  })
  const bytes = res.status === 200 ? await blobBytes(await res.blob()) : new Uint8Array()
  return { status: res.status, type: res.headers.get('content-type') ?? '', bytes }
}

const saved = () => prisma.feedback.count()

describe('Sending a bug report with a screenshot', () => {
  it.each([
    ['PNG', png(6000, 11)],
    ['JPEG', jpeg(6000, 12)],
    ['WebP', webp(6000, 13)],
  ])('accepts a %s from an admin and serves back the same bytes and type', async (_label, file) => {
    const { status, json } = await send(file)
    expect(status, JSON.stringify(json)).toBe(200)
    expect(json.success).toBe(true)
    const row = await prisma.feedback.findUnique({ where: { id: json.id as string } })
    expect(row).toMatchObject({ userId: admin, category: 'bug', message: "Rest timer didn't start" })

    const got = await screenshot(json.id as string)
    expect(got.status).toBe(200)
    expect(got.type).toContain(file.type)
    expect(sameBytes(got.bytes, file.bytes)).toBe(true)
  })

  it('stores the context and lists the item with hasScreenshot, without the image bytes', async () => {
    const file = png(200_000, 5)
    const { json } = await send(file)
    const item = (await list()).find((f) => f.id === json.id)
    expect(item).toBeTruthy()
    expect(item?.hasScreenshot).toBe(true)
    expect(item?.context).toEqual(sampleContext())
    expect(item?.pageUrl).toBe('http://localhost/training')
    // 200 KB of image would be far bigger than this as JSON.
    expect(JSON.stringify(item).length).toBeLessThan(20_000)
  })

  it('accepts a bug report without a screenshot (capture failed)', async () => {
    const { status, json } = await send(undefined)
    expect(status, JSON.stringify(json)).toBe(200)
    const item = (await list()).find((f) => f.id === json.id)
    expect(item?.hasScreenshot).toBe(false)
    expect(item?.context).toEqual(sampleContext())
    expect((await screenshot(json.id as string)).status).toBe(404)
  })

  it('says in the Discord notice that the report has a screenshot', async () => {
    await send(png())
    expect(discord.send).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(discord.send.mock.calls[0][0])).toMatch(/screenshot/i)
  })

  it('still requires a message', async () => {
    const { status } = await send(png(), { message: '' })
    expect(status).toBe(400)
    expect(await saved()).toBe(0)
  })

  it('keeps the JSON feedback body working for everyone', async () => {
    auth.userId = other
    auth.role = 'user'
    const { POST } = (await load('@/app/api/feedback/route')) as { POST: Handler }
    const res = await POST(
      new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category: 'general', message: 'Love it', pageUrl: '/training' }),
      })
    )
    expect(res.status).toBe(200)
    expect(await prisma.feedback.count({ where: { userId: other, category: 'general' } })).toBe(1)
  })
})

describe('Only admins can attach screenshots', () => {
  it('refuses a screenshot from a non-admin and saves nothing', async () => {
    auth.userId = other
    auth.role = 'user'
    const { status } = await send(png())
    expect(status).toBe(403)
    expect(await saved()).toBe(0)
    expect(discord.send).not.toHaveBeenCalled()
  })

  it('refuses a signed-out request', async () => {
    auth.userId = ''
    const { status } = await send(png())
    expect(status).toBe(401)
    expect(await saved()).toBe(0)
  })
})

describe('The server checks the image', () => {
  it('has a 500 KB limit', async () => {
    const max = await maxBytes()
    expect(max).toBeGreaterThanOrEqual(500_000)
    expect(max).toBeLessThanOrEqual(512_000)
  })

  it('accepts an image of exactly the limit', async () => {
    const { status } = await send(jpeg(await maxBytes()))
    expect(status).toBe(200)
    expect(await saved()).toBe(1)
  })

  it('refuses an image one byte over the limit and saves nothing', async () => {
    const { status } = await send(jpeg((await maxBytes()) + 1))
    expect([400, 413]).toContain(status)
    expect(await saved()).toBe(0)
  })

  it.each([
    ['a GIF', { bytes: gifBytes(), type: 'image/gif', filename: 'a.gif' }],
    ['a text file', { bytes: textBytes('not an image'), type: 'text/plain', filename: 'a.txt' }],
    ['text pretending to be a PNG', { bytes: textBytes('definitely not a png file'), type: 'image/png', filename: 'a.png' }],
  ])('refuses %s and saves nothing', async (_label, file) => {
    const { status } = await send(file)
    expect(status).toBe(400)
    expect(await saved()).toBe(0)
    expect(discord.send).not.toHaveBeenCalled()
  })
})

describe('Reading the screenshot back', () => {
  it('is not served to a non-editor', async () => {
    const { json } = await send(png())
    auth.userId = other
    auth.role = 'user'
    const got = await screenshot(json.id as string)
    expect([401, 403]).toContain(got.status)
    expect(got.bytes.length).toBe(0)
  })

  it('is not served when signed out', async () => {
    const { json } = await send(png())
    auth.userId = ''
    expect((await screenshot(json.id as string)).status).toBe(401)
  })

  it('is 404 for an unknown feedback id', async () => {
    expect((await screenshot('no-such-feedback')).status).toBe(404)
  })
})
