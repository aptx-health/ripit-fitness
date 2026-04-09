'use client'

import { clientLogger } from '@/lib/client-logger'

interface QueuedEvent {
  event: string
  properties?: Record<string, unknown>
  pageUrl?: string
  sessionId?: string
}

/** Flush interval in milliseconds. */
const FLUSH_INTERVAL_MS = 5_000

/** Maximum events before an automatic flush. */
const MAX_BUFFER_SIZE = 10

let buffer: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let sessionId: string | null = null

function getSessionId(): string {
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
  return sessionId
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_INTERVAL_MS)
}

async function flush() {
  if (buffer.length === 0) return

  const events = buffer
  buffer = []

  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    })

    if (!response.ok) {
      clientLogger.error(`Failed to flush events: ${response.status}`)
    }
  } catch (error) {
    clientLogger.error('Failed to flush analytics events:', error)
  }
}

/**
 * Track a named event. Events are buffered and flushed in batches
 * every 5 seconds or when the buffer reaches 10 events.
 *
 * Usage:
 * ```ts
 * trackEvent('workout_completed', { workoutId: '123' })
 * ```
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return

  const entry: QueuedEvent = {
    event,
    properties,
    pageUrl: window.location.pathname,
    sessionId: getSessionId(),
  }

  buffer.push(entry)

  if (buffer.length >= MAX_BUFFER_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flush()
  } else {
    scheduleFlush()
  }
}

/**
 * Force-flush any buffered events. Call this before navigation
 * or page unload when you need delivery guarantees.
 */
export function flushEvents(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  flush()
}

// Flush on page hide (covers tab close, navigation, etc.)
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents()
    }
  })
}
