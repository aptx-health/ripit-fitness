'use client'

import { useCallback, useRef } from 'react'

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  minDistance?: number
  maxVerticalRatio?: number
  /** When false, the returned handlers no-op. Default true. */
  enabled?: boolean
}

const DEFAULT_MIN_DISTANCE = 50
const DEFAULT_MAX_VERTICAL_RATIO = 0.75 // tan(~37deg) — reject diagonal swipes

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  minDistance = DEFAULT_MIN_DISTANCE,
  maxVerticalRatio = DEFAULT_MAX_VERTICAL_RATIO,
  enabled = true,
}: SwipeOptions) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) {
      touchStart.current = null
      return
    }
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [enabled])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return
      if (!touchStart.current) return

      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStart.current.x
      const dy = touch.clientY - touchStart.current.y
      touchStart.current = null

      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // Must exceed minimum distance
      if (absDx < minDistance) return

      // Must be mostly horizontal (reject diagonal/vertical swipes)
      if (absDy / absDx > maxVerticalRatio) return

      if (dx < 0) {
        onSwipeLeft?.()
      } else {
        onSwipeRight?.()
      }
    },
    [enabled, minDistance, maxVerticalRatio, onSwipeLeft, onSwipeRight]
  )

  return { onTouchStart, onTouchEnd }
}
