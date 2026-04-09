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

async function flush(useBeacon = false): Promise<void> {
  if (buffer.length === 0) return

  const events = buffer
  buffer = []

  const payload = JSON.stringify({ events })

  // Prefer sendBeacon for unload/navigation — it survives page transitions
  // where in-flight fetch() calls would be cancelled by the browser.
  if (
    useBeacon &&
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    try {
      const blob = new Blob([payload], { type: 'application/json' })
      const ok = navigator.sendBeacon('/api/events', blob)
      if (!ok) {
        clientLogger.error('sendBeacon returned false for analytics flush')
      }
      return
    } catch (error) {
      clientLogger.error('sendBeacon failed for analytics flush:', error)
      // Fall through to fetch as a best-effort fallback.
    }
  }

  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
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
 *
 * Pass `useBeacon: true` when called in an unload/navigation path —
 * this uses `navigator.sendBeacon` which survives page transitions
 * where in-flight fetch() calls would be cancelled.
 */
export function flushEvents(useBeacon = false): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  return flush(useBeacon)
}

// Flush on page hide (covers tab close, navigation, etc.)
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents(true)
    }
  })
}
