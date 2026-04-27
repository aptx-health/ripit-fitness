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
 */
export function useRestTimer(
  loggedSetCount: number,
  exerciseId: string
) {
  // Start running immediately if we mount with sets already logged
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(loggedSetCount > 0)
  const startRef = useRef<number | null>(loggedSetCount > 0 ? Date.now() : null)
  const prevExerciseRef = useRef(exerciseId)
  const prevCountRef = useRef(loggedSetCount)

  // Reset when exercise changes or sets change
  useEffect(() => {
    // Exercise changed — reset tracking
    if (exerciseId !== prevExerciseRef.current) {
      prevExerciseRef.current = exerciseId
      prevCountRef.current = loggedSetCount
      startRef.current = null
      // Defer setState to avoid synchronous setState in useEffect
      const frame = requestAnimationFrame(() => {
        setElapsed(0)
        setIsRunning(false)
      })
      return () => cancelAnimationFrame(frame)
    }

    // New set logged — reset the timer
    if (loggedSetCount > prevCountRef.current) {
      startRef.current = Date.now()
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
