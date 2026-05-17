'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Timestamp-based rest timer that survives browser backgrounding and phone sleep.
 *
 * Uses Date.now() difference instead of counting intervals, so elapsed time
 * is always accurate regardless of tab throttling or suspension.
 *
 * Resets whenever a new set is logged — including extra sets beyond the
 * prescribed count and re-logged sets after deletion.
 *
 * Start timestamps are cached at module scope keyed by exerciseId so the timer
 * survives in-app tab switches (e.g. Log Sets → Info → Log Sets), which would
 * otherwise unmount this hook and lose the start time.
 */

// Module-level cache: exerciseId -> { startedAt epoch ms, setCount when started }
const timerCache = new Map<string, { startedAt: number; setCount: number }>()

// Exposed for tests
export function __clearRestTimerCache() {
  timerCache.clear()
}

export function useRestTimer(
  loggedSetCount: number,
  exerciseId: string
) {
  // Lazy initializer (runs once per mount) — recognized as side-effect-safe by react-hooks/purity.
  const [initialStart] = useState<number | null>(() => {
    const cached = timerCache.get(exerciseId)
    if (cached && cached.setCount === loggedSetCount && loggedSetCount > 0) {
      return cached.startedAt
    }
    if (loggedSetCount > 0) {
      const now = Date.now()
      timerCache.set(exerciseId, { startedAt: now, setCount: loggedSetCount })
      return now
    }
    return null
  })

  const [elapsed, setElapsed] = useState(() =>
    initialStart !== null ? Math.floor((Date.now() - initialStart) / 1000) : 0
  )
  const [isRunning, setIsRunning] = useState(initialStart !== null)
  const startRef = useRef<number | null>(initialStart)
  const prevExerciseRef = useRef(exerciseId)
  const prevCountRef = useRef(loggedSetCount)

  // Reset when exercise changes or sets change
  useEffect(() => {
    // Exercise changed — reset tracking (but don't clobber other exercises' caches)
    if (exerciseId !== prevExerciseRef.current) {
      prevExerciseRef.current = exerciseId
      prevCountRef.current = loggedSetCount

      const next = timerCache.get(exerciseId)
      const useCached =
        next && next.setCount === loggedSetCount && loggedSetCount > 0
      startRef.current = useCached ? next.startedAt : null
      const frame = requestAnimationFrame(() => {
        setElapsed(useCached ? Math.floor((Date.now() - next.startedAt) / 1000) : 0)
        setIsRunning(!!useCached)
      })
      return () => cancelAnimationFrame(frame)
    }

    // New set logged — reset the timer
    if (loggedSetCount > prevCountRef.current) {
      const now = Date.now()
      startRef.current = now
      timerCache.set(exerciseId, { startedAt: now, setCount: loggedSetCount })
      const frame = requestAnimationFrame(() => {
        setElapsed(0)
        setIsRunning(true)
      })
      prevCountRef.current = loggedSetCount
      return () => cancelAnimationFrame(frame)
    }

    // Set deleted — if no logged sets remain, stop the timer
    if (loggedSetCount === 0 && prevCountRef.current > 0) {
      startRef.current = null
      timerCache.delete(exerciseId)
      const frame = requestAnimationFrame(() => {
        setElapsed(0)
        setIsRunning(false)
      })
      prevCountRef.current = loggedSetCount
      return () => cancelAnimationFrame(frame)
    }

    prevCountRef.current = loggedSetCount
  }, [loggedSetCount, exerciseId])

  // Tick the display every second
  useEffect(() => {
    if (!isRunning) return

    const tick = () => {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }

    tick() // Immediate update
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // Recalculate immediately when tab becomes visible again
  useEffect(() => {
    const handler = () => {
      if (!document.hidden && startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  const formatTime = useCallback((totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [])

  return {
    elapsed,
    formatted: formatTime(elapsed),
    isRunning,
  }
}
