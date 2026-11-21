// @vitest-environment node
/**
 * Agents can see bug report screenshots (features/admin/bug-report-screenshot.feature, work 222).
 * Real test DB. Reports are created through POST /api/feedback, the only pinned way to store one.
 *
 * PINNED (full contract: __tests__/features/admin/bug-report-support.ts)
 *   list_feedback items gain hasScreenshot: boolean (and never carry the image).
 *   get_feedback_screenshot({ feedbackId }): content holds { type: 'image', data: <base64>, mimeType } and
 *   { type: 'text', text: JSON with id (or feedbackId), message, pageUrl, context }. Feedback of another
 *   user, or an unknown id: isError true and no image.
 */

import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'
import { base64, bugReport, type FilePart, multipartRequest, png, sampleContext } from '../features/admin/bug-report-support'

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

const load = (spec: string) => import(/* @vite-ignore */ spec)
type Content = { type: string; text?: string; data?: string; mimeType?: string }
type Result = { content: Content[]; isError?: boolean }

let prisma: PrismaClient
let admin: string
let other: string

beforeEach(async () => {
  const db = await getTestDatabase()
  await db.reset()
  prisma = db.getPrismaClient()
  admin = (await createTestUser()).id
  other = (await createTestUser()).id
})

async function report(owner: string, file?: FilePart, message = "Rest timer didn't start"): Promise<string> {
  auth.userId = owner
  auth.role = 'admin'
  const { POST } = (await load('@/app/api/feedback/route')) as { POST: (r: Request) => Promise<Response> }
  const res = await POST(multipartRequest(bugReport(file, { message })))
  const json = (await res.json()) as { id: string }
  expect(res.status, JSON.stringify(json)).toBe(200)
  return json.id
}

const ctx = (userId: string, role = 'admin') => ({ userId, tokenId: `token-${userId}`, role, notify: vi.fn(async () => {}) })

async function call(userId: string, name: string, args: Record<string, unknown>, role = 'admin'): Promise<Result> {
  const { callTool } = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
  return (await callTool(prisma, ctx(userId, role) as never, name, args as never)) as unknown as Result
}

const textOf = (r: Result) => r.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n')
const images = (r: Result) => r.content.filter((c) => c.type === 'image')

describe('The MCP feedback list says which items have a screenshot', () => {
  it('marks hasScreenshot true and false, without image data', async () => {
    const withShot = await report(admin, png(150_000, 21), 'With a picture')
    const without = await report(admin, undefined, 'Without a picture')
    const r = await call(admin, 'list_feedback', { category: 'bug' })
    expect(r.isError).toBeFalsy()
    const { feedback } = JSON.parse(textOf(r)) as { feedback: Array<Record<string, unknown>> }
    expect(feedback.find((f) => f.id === withShot)?.hasScreenshot).toBe(true)
    expect(feedback.find((f) => f.id === without)?.hasScreenshot).toBe(false)
    expect(textOf(r).length).toBeLessThan(20_000)
    expect(images(r)).toHaveLength(0)
  })
})

describe('An agent can fetch the screenshot as an image, with its context', () => {
  it('is listed as a tool', async () => {
    const { listTools } = (await load('@/lib/mcp/tools')) as typeof import('@/lib/mcp/tools')
    const tool = listTools('admin').find((t) => t.name === 'get_feedback_screenshot')
    expect(tool).toBeTruthy()
    expect(Object.keys((tool?.inputSchema.properties ?? {}) as object)).toContain('feedbackId')
  })

  it('returns the exact image and the context', async () => {
    const file = png(9000, 22)
    const id = await report(admin, file)
    const r = await call(admin, 'get_feedback_screenshot', { feedbackId: id })
    expect(r.isError, textOf(r)).toBeFalsy()

    expect(images(r)).toHaveLength(1)
    expect(images(r)[0].mimeType).toBe('image/png')
    expect(images(r)[0].data).toBe(base64(file.bytes))

    const info = JSON.parse(textOf(r)) as Record<string, unknown>
    expect(info.id ?? info.feedbackId).toBe(id)
    expect(info.message).toBe("Rest timer didn't start")
    expect(info.pageUrl).toBe('http://localhost/training')
    expect(info.context).toEqual(sampleContext())
  })
})

describe("Only for feedback the agent's user can see", () => {
  it("refuses another user's screenshot with no image", async () => {
    const id = await report(admin, png(5000, 23), 'Private admin report')
    const r = await call(other, 'get_feedback_screenshot', { feedbackId: id }, 'user')
    expect(r.isError).toBe(true)
    expect(images(r)).toHaveLength(0)
    expect(textOf(r)).not.toContain('Private admin report')
  })

  it('refuses an unknown feedback id', async () => {
    const r = await call(admin, 'get_feedback_screenshot', { feedbackId: 'no-such-feedback' })
    expect(r.isError).toBe(true)
    expect(images(r)).toHaveLength(0)
  })
})
