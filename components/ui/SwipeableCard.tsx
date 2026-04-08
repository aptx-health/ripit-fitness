'use client'

import { useCallback, useRef, useState } from 'react'

type SwipeAction = {
  label: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
}

type Props = {
  children: React.ReactNode
  actions: SwipeAction[]
  className?: string
  /** Width in px of the revealed action area */
  revealWidth?: number
}

const SNAP_THRESHOLD = 80
const VELOCITY_THRESHOLD = 0.5

export default function SwipeableCard({
  children,
  actions,
  className = '',
  revealWidth = 140,
}: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const touchRef = useRef<{
    startX: number
    startY: number
    startTime: number
    startOffset: number
    directionLocked: boolean | null
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const animateTo = useCallback((target: number) => {
    setOffsetX(target)
    setIsRevealed(target < 0)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      startOffset: offsetX,
      directionLocked: null,
    }
    setIsDragging(true)
  }, [offsetX])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return

    const touch = e.touches[0]
    const dx = touch.clientX - touchRef.current.startX
    const dy = touch.clientY - touchRef.current.startY

    // Lock direction on first significant movement
    if (touchRef.current.directionLocked === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      // If vertical movement is dominant, let the page scroll
      if (Math.abs(dy) > Math.abs(dx)) {
        touchRef.current.directionLocked = false
        setIsDragging(false)
        return
      }
      touchRef.current.directionLocked = true
    }

    if (!touchRef.current.directionLocked) return

    e.preventDefault()

    const raw = touchRef.current.startOffset + dx
    // Clamp: no right-overflow, max left = revealWidth
    const clamped = Math.max(-revealWidth, Math.min(0, raw))
    setOffsetX(clamped)
  }, [revealWidth])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current?.directionLocked) {
      touchRef.current = null
      setIsDragging(false)
      return
    }

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchRef.current.startX
    const elapsed = (Date.now() - touchRef.current.startTime) / 1000
    const velocity = Math.abs(dx) / elapsed

    // Decide: snap open or snap closed
    const shouldReveal =
      (offsetX < -SNAP_THRESHOLD) ||
      (velocity > VELOCITY_THRESHOLD && dx < 0)

    animateTo(shouldReveal ? -revealWidth : 0)
    touchRef.current = null
    setIsDragging(false)
  }, [offsetX, revealWidth, animateTo])

  const handleClose = useCallback(() => {
    animateTo(0)
  }, [animateTo])

  if (actions.length === 0) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
      {/* Action buttons revealed behind the card */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: `${revealWidth}px` }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              action.onClick()
              handleClose()
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              action.className || 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Sliding card content */}
      <div
        className={`relative bg-card ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Tap-to-close overlay when revealed */}
      {isRevealed && !isDragging && (
        <button
          type="button"
          className="absolute inset-0 z-10"
          style={{ width: `calc(100% - ${revealWidth}px)` }}
          onClick={handleClose}
          aria-label="Close actions"
        />
      )}
    </div>
  )
}
