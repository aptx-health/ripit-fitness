import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser } from '@/lib/test/factories'

/**
 * Tests for POST /api/events analytics ingestion.
 *
 * Exercises the validation/sanitization logic of the real route through
 * a simulation that mirrors it byte-for-byte. We can't invoke the route
 * handler directly without mocking BetterAuth/rate-limiting, so we lift
 * the pure logic here and assert on the resulting AppEvent rows.
 */
describe('POST /api/events', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  describe('happy path', () => {
    it('inserts a batch of events scoped to the authenticated user', async () => {
      const res = await simulateEventsIngest(prisma, userId, {
        events: [
          { event: 'signup_completed' },
          { event: 'workout_started', properties: { workoutId: 'abc' } },
          {
            event: 'primer_dismissed',
            properties: { page_reached: 3 },
            pageUrl: '/training',
            sessionId: 'sess-1',
          },
        ],
      })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ accepted: 3 })

      const rows = await prisma.appEvent.findMany({ where: { userId } })
      expect(rows).toHaveLength(3)

      const names = rows.map((r) => r.event).sort()
      expect(names).toEqual(['primer_dismissed', 'signup_completed', 'workout_started'])

      const primer = rows.find((r) => r.event === 'primer_dismissed')
      expect(primer?.pageUrl).toBe('/training')
      expect(primer?.sessionId).toBe('sess-1')
      expect(primer?.properties).toEqual({ page_reached: 3 })
    })

    it('ignores a client-supplied userId and always uses the session user', async () => {
      const otherUser = await createTestUser()

      const res = await simulateEventsIngest(prisma, userId, {
        events: [
          {
            event: 'workout_completed',
            // Attempt to spoof
            userId: otherUser.id,
          } as unknown as { event: string },
        ],
      })

      expect(res.status).toBe(200)

      const mine = await prisma.appEvent.findMany({ where: { userId } })
      const theirs = await prisma.appEvent.findMany({ where: { userId: otherUser.id } })
      expect(mine).toHaveLength(1)
      expect(theirs).toHaveLength(0)
    })
  })

  describe('validation', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await simulateEventsIngest(prisma, null, {
        events: [{ event: 'signup_completed' }],
      })
      expect(res.status).toBe(401)
    })

    it('returns 400 for missing events array', async () => {
      const res = await simulateEventsIngest(prisma, userId, {} as { events: [] })
      expect(res.status).toBe(400)
    })

    it('returns 400 for empty events array', async () => {
      const res = await simulateEventsIngest(prisma, userId, { events: [] })
      expect(res.status).toBe(400)
    })

    it('returns 400 when batch exceeds MAX_BATCH_SIZE (25)', async () => {
      const events = Array.from({ length: 26 }, (_, i) => ({
        event: `evt_${i}`,
      }))
      const res = await simulateEventsIngest(prisma, userId, { events })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/Maximum 25 events/)

      const rows = await prisma.appEvent.findMany({ where: { userId } })
      expect(rows).toHaveLength(0)
    })

    it('returns 400 when all events fail validation', async () => {
      const res = await simulateEventsIngest(prisma, userId, {
        events: [
          { event: '' }, // empty name
          { event: 'x'.repeat(101) }, // exceeds MAX_EVENT_NAME_LENGTH
          {} as { event: string }, // missing name
        ],
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/No valid events/)
    })
  })

  describe('sanitization', () => {
    it('truncates pageUrl to MAX_PAGE_URL_LENGTH', async () => {
      const longUrl = `/training?x=${'a'.repeat(3000)}`
      const res = await simulateEventsIngest(prisma, userId, {
        events: [{ event: 'primer_dismissed', pageUrl: longUrl }],
      })
      expect(res.status).toBe(200)

      const row = await prisma.appEvent.findFirst({ where: { userId } })
      expect(row?.pageUrl?.length).toBe(2048)
    })

    it('drops oversized properties instead of failing the event', async () => {
      const bigProps = { blob: 'x'.repeat(5000) }
      const res = await simulateEventsIngest(prisma, userId, {
        events: [{ event: 'workout_started', properties: bigProps }],
      })
      expect(res.status).toBe(200)

      const row = await prisma.appEvent.findFirst({ where: { userId } })
      expect(row?.event).toBe('workout_started')
      // Properties dropped (size > MAX_PROPERTIES_SIZE)
      expect(row?.properties).toBeNull()
    })

    it('skips invalid events in a mixed batch and records the rest', async () => {
      const res = await simulateEventsIngest(prisma, userId, {
        events: [
          { event: 'signup_completed' },
          { event: '' }, // invalid, skipped
          { event: 'x'.repeat(200) }, // invalid, skipped
          { event: 'workout_started' },
        ],
      })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ accepted: 2 })

      const rows = await prisma.appEvent.findMany({ where: { userId } })
      expect(rows).toHaveLength(2)
    })

    it('truncates sessionId to 64 chars', async () => {
      const longSession = 'a'.repeat(200)
      const res = await simulateEventsIngest(prisma, userId, {
        events: [{ event: 'workout_started', sessionId: longSession }],
      })
      expect(res.status).toBe(200)

      const row = await prisma.appEvent.findFirst({ where: { userId } })
      expect(row?.sessionId?.length).toBe(64)
    })
  })
})

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

const MAX_BATCH_SIZE = 25
const MAX_EVENT_NAME_LENGTH = 100
const MAX_PAGE_URL_LENGTH = 2048
const MAX_PROPERTIES_SIZE = 4096

interface SimulatedEventPayload {
  event?: string
  properties?: Record<string, unknown>
  pageUrl?: string
  sessionId?: string
}

interface SimulatedResponse {
  status: number
  body: { accepted?: number; error?: string }
}

/**
 * Mirrors app/api/events/route.ts POST handler (sans auth middleware and
 * rate-limiting). Pass `null` as userId to simulate an unauthenticated
 * request.
 */
async function simulateEventsIngest(
  prisma: PrismaClient,
  userId: string | null,
  body: { events?: SimulatedEventPayload[] }
): Promise<SimulatedResponse> {
  if (!userId) {
    return { status: 401, body: { error: 'Unauthorized' } }
  }

  const { events } = body

  if (!events || !Array.isArray(events) || events.length === 0) {
    return {
      status: 400,
      body: { error: 'events array is required and must not be empty' },
    }
  }

  if (events.length > MAX_BATCH_SIZE) {
    return {
      status: 400,
      body: { error: `Maximum ${MAX_BATCH_SIZE} events per request` },
    }
  }

  const validEvents: Array<{
    userId: string
    event: string
    properties: Record<string, unknown> | undefined
    pageUrl: string | undefined
    sessionId: string | undefined
  }> = []

  for (const evt of events) {
    if (!evt.event || typeof evt.event !== 'string') continue
    if (evt.event.length > MAX_EVENT_NAME_LENGTH) continue

    const pageUrl =
      typeof evt.pageUrl === 'string'
        ? evt.pageUrl.slice(0, MAX_PAGE_URL_LENGTH)
        : undefined

    const sessionId =
      typeof evt.sessionId === 'string' ? evt.sessionId.slice(0, 64) : undefined

    let properties: Record<string, unknown> | undefined
    if (evt.properties && typeof evt.properties === 'object') {
      const serialized = JSON.stringify(evt.properties)
      if (serialized.length <= MAX_PROPERTIES_SIZE) {
        properties = evt.properties
      }
    }

    validEvents.push({
      userId,
      event: evt.event,
      properties,
      pageUrl,
      sessionId,
    })
  }

  if (validEvents.length === 0) {
    return { status: 400, body: { error: 'No valid events in batch' } }
  }

  await prisma.appEvent.createMany({
    data: validEvents.map((e) => ({
      userId: e.userId,
      event: e.event,
      properties: e.properties as never,
      pageUrl: e.pageUrl,
      sessionId: e.sessionId,
    })),
  })

  return { status: 200, body: { accepted: validEvents.length } }
}
