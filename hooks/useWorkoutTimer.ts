'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Timestamp-based elapsed workout timer that survives browser backgrounding.
 * Starts when the hook mounts (workout opens) and counts up.
 * Accepts an optional initialElapsedSeconds to resume from a previous session.
 */
export function useWorkoutTimer(initialElapsedSeconds = 0) {
  const startRef = useRef<number>(0)
  const [elapsed, setElapsed] = useState(initialElapsedSeconds)

  // Initialize start time on mount, offset by any initial elapsed time
  useEffect(() => {
    startRef.current = Date.now() - initialElapsedSeconds * 1000
  }, [initialElapsedSeconds])

  useEffect(() => {
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Recalculate on tab visibility change (phone sleep/wake)
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  const formatted = hours > 0
    ? `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { elapsed, formatted }
}
