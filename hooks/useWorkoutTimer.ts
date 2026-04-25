'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Timestamp-based elapsed workout timer that survives browser backgrounding.
 * Starts when the hook mounts (workout opens) and counts up.
 */
export function useWorkoutTimer() {
  const startRef = useRef<number>(0)
  const [elapsed, setElapsed] = useState(0)

  // Initialize start time on mount
  useEffect(() => {
    startRef.current = Date.now()
  }, [])

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
