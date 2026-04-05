'use client'

import { useEffect, useState } from 'react'
import { useMounted } from '@/hooks/useMounted'
import { createPortal } from 'react-dom'

interface TourOverlayProps {
  targetSelector: string | null
  visible: boolean
  onClickOverlay?: () => void
}

function getClipPath(rect: DOMRect, padding: number = 6): string {
  const top = rect.top - padding
  const left = rect.left - padding
  const bottom = rect.bottom + padding
  const right = rect.right + padding

  return `polygon(
    0% 0%, 0% 100%, ${left}px 100%, ${left}px ${top}px,
    ${right}px ${top}px, ${right}px ${bottom}px,
    ${left}px ${bottom}px, ${left}px 100%, 100% 100%, 100% 0%
  )`
}

export function TourOverlay({ targetSelector, visible, onClickOverlay }: TourOverlayProps) {
  const [clipPath, setClipPath] = useState<string | null>(null)
  const mounted = useMounted()

  useEffect(() => {
    if (!targetSelector || !visible) {
      // Defer the reset to avoid synchronous setState in useEffect
      const frame = requestAnimationFrame(() => setClipPath(null))
      return () => cancelAnimationFrame(frame)
    }

    const updateClip = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null
      if (el) {
        setClipPath(getClipPath(el.getBoundingClientRect()))
      }
    }

    updateClip()

    // Update on scroll/resize
    window.addEventListener('scroll', updateClip, true)
    window.addEventListener('resize', updateClip)

    return () => {
      window.removeEventListener('scroll', updateClip, true)
      window.removeEventListener('resize', updateClip)
    }
  }, [targetSelector, visible])

  if (!mounted || !visible) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        clipPath: clipPath || undefined,
        transition: 'clip-path 300ms ease, opacity 200ms ease',
        opacity: clipPath ? 1 : 0,
        pointerEvents: 'auto',
      }}
      className="bg-black/40 backdrop-blur-[1px]"
      onClick={onClickOverlay}
      aria-hidden="true"
    />,
    document.body
  )
}
