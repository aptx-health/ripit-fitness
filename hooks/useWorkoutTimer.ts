'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Timestamp-based elapsed workout timer that survives browser backgrounding.
 * Counts up from `startedAt` (an ISO time, to resume a draft), or from when
 * the hook mounts (workout opens) when there is none. The clock is read in
 * effects, never during render.
 */
export function useWorkoutTimer(startedAt?: string | null) {
  const startRef = useRef<number>(0)
  const [elapsed, setElapsed] = useState(0)

  // Set the start time on mount, and again if the workout's start arrives later.
  useEffect(() => {
    const started = startedAt ? Date.parse(startedAt) : Number.NaN
    startRef.current = Number.isNaN(started) ? Date.now() : Math.min(started, Date.now())
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
  }, [startedAt])

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
