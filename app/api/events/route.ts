import type { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  checkRateLimitWithHeaders,
  eventIngestionLimiter,
  withRateLimitHeaders,
} from '@/lib/rate-limit'

/** Maximum events accepted per request. */
const MAX_BATCH_SIZE = 25

/** Maximum length for the event name field. */
const MAX_EVENT_NAME_LENGTH = 100

/** Maximum length for the pageUrl field. */
const MAX_PAGE_URL_LENGTH = 2048

/** Maximum JSON stringified size of properties per event (bytes). */
const MAX_PROPERTIES_SIZE = 4096

interface EventPayload {
  event: string
  properties?: Record<string, unknown>
  pageUrl?: string
  sessionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimitWithHeaders(eventIngestionLimiter, user.id, {
      endpoint: 'POST /api/events',
    })
    if (rl.response) return rl.response

    const body = await request.json()
    const { events } = body as { events?: EventPayload[] }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'events array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (events.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} events per request` },
        { status: 400 }
      )
    }

    // Validate and sanitize events
    const validEvents = []
    for (const evt of events) {
      if (!evt.event || typeof evt.event !== 'string') continue
      if (evt.event.length > MAX_EVENT_NAME_LENGTH) continue

      const pageUrl = typeof evt.pageUrl === 'string'
        ? evt.pageUrl.slice(0, MAX_PAGE_URL_LENGTH)
        : undefined

      const sessionId = typeof evt.sessionId === 'string'
        ? evt.sessionId.slice(0, 64)
        : undefined

      // Cap properties size
      let properties: Prisma.InputJsonValue | undefined
      if (evt.properties && typeof evt.properties === 'object') {
        const serialized = JSON.stringify(evt.properties)
        if (serialized.length <= MAX_PROPERTIES_SIZE) {
          properties = evt.properties as Prisma.InputJsonValue
        }
      }

      validEvents.push({
        userId: user.id,
        event: evt.event,
        properties,
        pageUrl,
        sessionId,
      })
    }

    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: 'No valid events in batch' },
        { status: 400 }
      )
    }

    await prisma.appEvent.createMany({ data: validEvents })

    logger.debug(
      { userId: user.id, count: validEvents.length },
      'Analytics events ingested'
    )

    return withRateLimitHeaders(
      NextResponse.json({ accepted: validEvents.length }),
      rl
    )
  } catch (error) {
    logger.error({ error, context: 'events-ingest' }, 'Failed to ingest events')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
