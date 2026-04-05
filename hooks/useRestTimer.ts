'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Timestamp-based rest timer that survives browser backgrounding and phone sleep.
 *
 * Uses Date.now() difference instead of counting intervals, so elapsed time
 * is always accurate regardless of tab throttling or suspension.
 *
 * Resets when a non-final set is logged. Stops when all sets are complete.
 */
export function useRestTimer(
  loggedSetCount: number,
  prescribedSetCount: number,
  exerciseId: string
) {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const startRef = useRef<number | null>(null)
  const prevExerciseRef = useRef(exerciseId)
  const prevCountRef = useRef(loggedSetCount)

  // Determine if the timer should be running
  const isComplete = loggedSetCount >= prescribedSetCount && prescribedSetCount > 0

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

    // New set logged (and not all sets complete) — reset the timer
    if (loggedSetCount > prevCountRef.current && !isComplete) {
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

    // All sets complete — stop the timer
    if (isComplete && startRef.current !== null) {
      startRef.current = null
      const frame = requestAnimationFrame(() => setIsRunning(false))
      prevCountRef.current = loggedSetCount
      return () => cancelAnimationFrame(frame)
    }

    prevCountRef.current = loggedSetCount
  }, [loggedSetCount, exerciseId, isComplete])

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
