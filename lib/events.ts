import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Record an analytics event server-side (fire-and-forget).
 * Used in API routes where we already have the userId.
 * Does not throw — failures are logged and swallowed.
 */
export function recordEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  prisma.appEvent
    .create({
      data: {
        userId,
        event,
        properties: (properties as Prisma.InputJsonValue) ?? undefined,
      },
    })
    .catch((error) => {
      logger.error({ error, event, userId }, 'Failed to record analytics event')
    })
}
